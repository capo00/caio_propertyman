import { Error as AppError, Captcha, Mailer } from "caio-server";
import config from "../config.js";
import crud from "./crud.js";
import { getOccupied } from "../services/availability.js";
import { assertPricingApproved, calculatePrice, listPrices } from "../services/price.js";
import { isIsoDate, nightsBetween, todayIso } from "../services/dates.js";
import { assertStayRules } from "../services/stay-rules.js";
import { createValidator, invalidDtoIn, readId, readPageInfo, renameFormFields } from "../services/dto.js";
import { STATE, STATE_LIST, ACTION_LIST } from "./states.js";
import { SCOPE_LIST } from "./scope.js";

const CODE = "caio-propertyman/reservation";
const ADMIN = ["authorities"];
const REASON_LIST = ["maintenance", "owner"];
const MAX_MESSAGE_LENGTH = 2000;

// Validation is deliberately HERE, in `fn`, and not in the `validator` field.
//
// caio-server's `validator` has a broken error path: when it throws, getDtoIn sends 400 --
// but does not stop, and `fn` is still called with the invalid dtoIn. For create that would
// mean the reservation is written anyway and the following res.json() crashes on
// ERR_HTTP_HEADERS_SENT. The `validator` field may therefore only be used for type casting,
// never for refusing.
//
// Messages are English and for logs only: the guest sees the text for the field code
// (`<CODE>/<reason>`) from the client lsi (`errors`).

/** List of states from a filter (array or a single state). Unknown state = 400, not silently ignored. */
function readStateList(v, value) {
  if (value == null || value === "") return null;
  const list = Array.isArray(value) ? value : [value];
  v.check(list.every((state) => STATE_LIST.includes(state)), "stateList");
  return list.length ? list.map(String) : null;
}

/** Optional ISO date from a GET. */
function optionalDate(v, dtoIn, key) {
  const value = dtoIn?.[key];
  if (value == null || value === "") return null;
  v.check(isIsoDate(value), key);
  return isIsoDate(value) ? value : null;
}

/** Field error of the public form: `<CODE>/invalidDtoIn` with the field code `<CODE>/<reason>`. */
function invalid(reason, message, keyMap, kind) {
  return invalidDtoIn(CODE, reason, message, keyMap, kind);
}

/**
 * A GET dtoIn arrives entirely as strings -- query parameters are not converted (only values
 * starting with `{` or `[` are tried with JSON.parse). Numbers and dates have to be converted by hand.
 */
function readDateRange(dtoIn) {
  const dateFrom = String(dtoIn?.dateFrom ?? "");
  const dateTo = String(dtoIn?.dateTo ?? "");

  const badMap = {};
  if (!isIsoDate(dateFrom)) badMap.dateFrom = true;
  if (!isIsoDate(dateTo)) badMap.dateTo = true;
  if (Object.keys(badMap).length) {
    throw invalid("invalidDate", "Dates must be in the YYYY-MM-DD format.", badMap);
  }
  if (dateFrom >= dateTo) {
    throw invalid("departureNotAfterArrival", "Departure must be after arrival.", { dateTo: true });
  }
  return { dateFrom, dateTo };
}

function validateStay(dateFrom, dateTo) {
  if (dateFrom < todayIso()) {
    throw invalid("arrivalInPast", "The stay cannot start in the past.", { dateFrom: true });
  }
  const nights = nightsBetween(dateFrom, dateTo);
  if (nights < config.minNights) {
    throw invalid("stayTooShort", `The minimum stay is ${config.minNights} nights.`, { dateTo: true });
  }
  if (nights > config.maxNights) {
    throw invalid("stayTooLong", `The maximum stay is ${config.maxNights} nights.`, { dateTo: true });
  }
  assertStayRules(dateFrom, dateTo);
  return nights;
}

function readGuestCount(dtoIn) {
  const guestCount = Number(dtoIn?.guestCount);
  const { min, max } = config.capacity;
  if (!Number.isInteger(guestCount) || guestCount < min || guestCount > max) {
    throw invalid("guestCountOutOfRange", `The number of guests must be between ${min} and ${max}.`, { guestCount: true });
  }
  return guestCount;
}

function readContact(dtoIn) {
  const contact = dtoIn?.contact ?? {};
  const name = String(contact.name ?? "").trim();
  const email = String(contact.email ?? "").trim();
  const phone = String(contact.phone ?? "").trim();

  const missing = {};
  if (!name) missing.name = true;
  if (!email) missing.email = true;
  if (!phone) missing.phone = true;
  if (Object.keys(missing).length) {
    throw invalid("contactMissing", "Contact details are missing.", missing, "missingKeyMap");
  }

  const bad = {};
  if (name.length > 200) bad.name = true;
  // The format is the stack's regex (deliberately lenient: stricter ones refuse valid
  // addresses). The domain is checked in DNS by checkEmail, after all cheap checks -- see
  // reservation/create.
  if (!Mailer.validateEmail(email) || email.length > 320) bad.email = true;
  if (!/^\+?[\d\s()-]{9,20}$/.test(phone)) bad.phone = true;
  if (Object.keys(bad).length) {
    throw invalid("invalidContact", "Check the email and phone number.", bad);
  }

  return { name, email, phone };
}

// Field code and message for the email field by the reason from Mailer.checkEmail (the format
// already passed in readContact).
const EMAIL_PROBLEMS = {
  invalidFormat: ["invalidContact", "Check the email and phone number."],
  domainNotFound: ["domainNotFound", "The email domain does not exist."],
  domainRejectsMail: ["domainRejectsMail", "The email domain does not accept mail."],
};

/**
 * The email domain must accept mail, otherwise the guest never gets the confirmation and the
 * owner has nowhere to reply. It does not verify the mailbox or a typo that lands on an
 * existing domain, and a DNS outage lets the address through (caio-server README, Mailer).
 */
async function assertEmailReceivesMail(email) {
  const problem = await Mailer.checkEmail(email);
  if (!problem) return;
  const [reason, message] = EMAIL_PROBLEMS[problem] ?? EMAIL_PROBLEMS.invalidFormat;
  throw invalid(reason, message, { email: true });
}

/**
 * Boolean from dtoIn: JSON sends true/false, a query string "true"/"false". Missing = default.
 * Anything else (1, "yes") is a field error -- not a silent false: `asConfirmed: 1` would
 * otherwise create a reservation waiting for the deposit and send the guest a payment request.
 */
function readFlag(v, dtoIn, key, defaultValue) {
  const value = dtoIn?.[key];
  if (value == null) return defaultValue;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  v.check(false, key);
  return defaultValue;
}

/** Language from dtoIn, or undefined. An unknown language is an error of the `lang` field. */
function readLang(v, dtoIn) {
  if (!Object.hasOwn(dtoIn ?? {}, "lang")) return undefined;
  return v.enumeration(dtoIn.lang, "lang", config.languages) ?? undefined;
}

/** ISO date, or null (value cleared in the form). */
function readDate(v, dtoIn, key, { required = false } = {}) {
  const value = v.string(dtoIn?.[key], key, { required, maxLength: 10 });
  if (value) v.check(isIsoDate(value), key);
  return value;
}

/** Message to the guest from a modal -- goes into the email and into the history. */
function readMessage(v, dtoIn) {
  return v.string(dtoIn?.message, "message", { maxLength: MAX_MESSAGE_LENGTH }) || undefined;
}

/**
 * Manual entry and edit from the admin. Unlike the public path, the minimum stay and the ban
 * on the past do NOT apply here -- the owner may record a stay that is already over, and
 * a one-night block.
 *
 * The admin sends a flat shape (`contactName`, `depositDueDate`, …), because the form modal of
 * `UiElements.Crud` works with first-level keys. The document shape is built from it here:
 * a nested `contact` and dotted `payment.*` paths.
 *
 * `partial` is for update: the `UiElements.Crud` modal sends only the changed fields.
 */
function readAdminReservation(dtoIn, { partial = false } = {}) {
  const v = createValidator(CODE);
  const has = (key) => Object.hasOwn(dtoIn ?? {}, key);
  const data = {};

  for (const key of ["dateFrom", "dateTo"]) {
    if (partial && !has(key)) continue;
    data[key] = readDate(v, dtoIn, key, { required: true });
  }
  // Comparable only when both dates are in dtoIn; otherwise crud checks against the stored one.
  if (data.dateFrom && data.dateTo) v.check(data.dateFrom < data.dateTo, "dateTo");

  if (has("guestCount")) data.guestCount = v.int(dtoIn.guestCount, "guestCount", { min: 1, max: config.capacity.max });
  if (has("note")) data.note = v.string(dtoIn.note, "note", { maxLength: config.maxNoteLength });
  if (has("desc")) data.desc = v.string(dtoIn.desc, "desc", { maxLength: config.maxNoteLength });
  if (has("reason")) data.reason = v.enumeration(dtoIn.reason, "reason", REASON_LIST);
  const lang = readLang(v, dtoIn);
  if (lang !== undefined) data.lang = lang;

  const contact = {};
  if (has("contactName")) contact.name = v.string(dtoIn.contactName, "contactName", { maxLength: 200 });
  if (has("contactEmail")) contact.email = v.string(dtoIn.contactEmail, "contactEmail", { maxLength: 320 });
  if (has("contactPhone")) contact.phone = v.string(dtoIn.contactPhone, "contactPhone", { maxLength: 40 });
  if (contact.email) v.check(Mailer.validateEmail(contact.email), "contactEmail");

  // Money: flat form fields → dotted paths in the document.
  const payment = {};
  if (has("totalPrice")) payment["payment.totalPrice"] = v.int(dtoIn.totalPrice, "totalPrice", { min: 0, max: 10_000_000 });
  if (has("depositAmount")) payment["payment.deposit.amount"] = v.int(dtoIn.depositAmount, "depositAmount", { min: 0, max: 10_000_000 });
  if (has("depositDueDate")) payment["payment.deposit.dueDate"] = readDate(v, dtoIn, "depositDueDate");
  if (has("depositPaidDate")) payment["payment.deposit.paidDate"] = readDate(v, dtoIn, "depositPaidDate");
  if (has("balanceDueDate")) payment["payment.balance.dueDate"] = readDate(v, dtoIn, "balanceDueDate");
  if (has("balancePaidDate")) payment["payment.balance.paidDate"] = readDate(v, dtoIn, "balancePaidDate");

  const message = readMessage(v, dtoIn);
  const flags = {
    sendEmail: readFlag(v, dtoIn, "sendEmail", true),
    force: readFlag(v, dtoIn, "force", false),
    asConfirmed: readFlag(v, dtoIn, "asConfirmed", true),
  };
  v.assert();

  return { data, contact: Object.keys(contact).length ? contact : undefined, payment, message, ...flags };
}

/**
 * App.init does not set `trust proxy`, so on App Engine req.ip is the proxy, not the guest.
 * The real address is in X-Forwarded-For, where the first entry is the client.
 */
function clientIpOf(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req?.socket?.remoteAddress ?? null;
}

export default {
  // Returns ONLY the occupied intervals -- no names, contacts or where the occupancy comes from.
  "availability/get": {
    method: "get",
    fn: async ({ dtoIn }) => {
      const { dateFrom, dateTo } = readDateRange(dtoIn);
      return { occupiedList: await getOccupied(dateFrom, dateTo) };
    },
  },

  // Informative price for the form. Only the price computed in reservation/create is binding.
  "price/calculate": {
    method: "get",
    fn: async ({ dtoIn }) => {
      const { dateFrom, dateTo } = readDateRange(dtoIn);
      validateStay(dateFrom, dateTo);
      // The price does not depend on the number of guests, but the form sends it -- a nonsense
      // number is refused the same way as on submit.
      if (dtoIn?.guestCount != null) readGuestCount(dtoIn);
      return calculatePrice(dateFrom, dateTo);
    },
  },

  // Prices for the Prices page, computed by the same function as the reservation.
  "price/list": {
    method: "get",
    fn: async () => listPrices(),
  },

  // Public POST that writes to the DB -- hence the honeypot, captcha and rate limit (design-v1.md § 6).
  "reservation/create": {
    method: "post",
    fn: async ({ dtoIn: rawDtoIn, req, useCase }) => {
      // The public form has the stay as one field `stay`; the server reports `dateFrom`/`dateTo`.
      try {
        // The very first step, before any DB query (the rate limit asks Mongo). Otherwise the
        // answer for unapproved prices would depend on whether Mongo is available.
        assertPricingApproved();

        // Honeypot: a hidden field a human does not fill in. We pretend success and write
        // nothing -- the bot does not learn it was caught and does not try another way.
        if (String(rawDtoIn?.website ?? "").trim() !== "") {
          return { id: null, state: STATE.REQUESTED, nights: 0, totalPrice: 0 };
        }

        // reCAPTCHA v3 after the honeypot (a caught bot costs no Google request) and before
        // validation (the bot does not learn which fields are wrong). The form sends the token
        // as `captchaToken` and verify removes it from dtoIn. Without GOOGLE_RECAPTCHA_SECRET it
        // passes in development and refuses with 503 in production -- a public write must not
        // silently run unprotected (caio-server README, Captcha).
        // Action = use case name; the form calls `execute("reservation/create")`.
        const dtoIn = await Captcha.verify(rawDtoIn, { action: useCase });

        const { dateFrom, dateTo } = readDateRange(dtoIn);
        validateStay(dateFrom, dateTo);
        const guestCount = readGuestCount(dtoIn);
        const contact = readContact(dtoIn);

        const note = String(dtoIn?.note ?? "").trim();
        if (note.length > config.maxNoteLength) {
          throw invalid("noteTooLong", `The note can have at most ${config.maxNoteLength} characters.`, { note: true });
        }

        // DNS after all checks that cost nothing, and before the Mongo query.
        await assertEmailReceivesMail(contact.email);

        // Rate limit by a query over the collection, not express-rate-limit in memory: a
        // middleware added after App.init never sees the request, and in-memory state would
        // neither survive an instance restart on GAE nor be shared between instances.
        const clientIp = clientIpOf(req);
        if ((await crud.countRecentFromIp(clientIp)) >= config.rateLimit.maxPerIpPerDay) {
          throw new AppError.Failed("Too many booking requests from one address. Try again tomorrow.", {
            status: 429,
            code: `${CODE}/rateLimitExceeded`,
          });
        }

        // Guest language from the FE (`useLanguage()`). Unknown or missing = Czech -- the form
        // is not refused for it, it is only the language of the emails.
        const lang = config.languages.includes(dtoIn?.lang) ? dtoIn.lang : "cs";

        // Emails (H1 to the guest, V1 to the owner) are sent by crud and written into the
        // history. Their failure does not bring down the reservation -- it is already written
        // and it is the valuable part.
        return crud.createFromWeb({ dateFrom, dateTo, guestCount, contact, note: note || null, clientIp, lang });
      } catch (e) {
        throw renameFormFields(e, { dateFrom: "stay", dateTo: "stay" });
      }
    },
  },

  // -----------------------------------------------------------------------------------------
  // Admin (v2). Everything `auth: ["authorities"]`; the public use cases above stay unchanged.
  // -----------------------------------------------------------------------------------------

  "reservation/list": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      // A GET dtoIn is all strings (an array arrives as JSON); an empty value = no filter.
      // A query value starting with "{" / "[" is parsed as JSON -- everything is therefore read
      // through an enumeration or a regex, so no Mongo operator ({"$ne": …}) can be smuggled in.
      const v = createValidator(CODE);
      const scope = v.enumeration(dtoIn?.scope, "scope", SCOPE_LIST) ?? "active";
      // The archive is by year: without a year it would return everything that ever happened.
      const year = v.int(dtoIn?.year, "year", { required: scope === "archive", min: 2000, max: 2100 });
      const stateList = readStateList(v, dtoIn?.stateList);
      const source = dtoIn?.source == null || dtoIn.source === "" ? null : String(dtoIn.source);
      v.check(source == null || /^[a-z0-9_-]{1,50}$/i.test(source), "source");
      const arrivalFrom = optionalDate(v, dtoIn, "arrivalFrom");
      const arrivalTo = optionalDate(v, dtoIn, "arrivalTo");
      // A reversed range would silently return an empty list.
      v.check(!arrivalFrom || !arrivalTo || arrivalFrom <= arrivalTo, "arrivalTo");
      v.assert();
      return crud.listForAdmin({ scope, year, stateList, source, arrivalFrom, arrivalTo, pageInfo: readPageInfo(dtoIn) });
    },
  },

  /** Detail including the history (`eventList`) -- the list does not have it. */
  "reservation/get": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.getForAdmin(readId(dtoIn, CODE)),
  },

  /**
   * Manual reservation and date block.
   *
   * A use case of its own, not a branch in `reservation/create`: the public path is
   * deliberately dumb (honeypot, captcha, rate limit, always `requested` and `source: web`), and
   * mixing an admin branch into it would mean deciding about authorization inside the use case.
   *
   * `asConfirmed` (default true): confirmed right away. false = waits for the deposit and the
   * guest gets a payment request. `sendEmail` (default true) goes to the guest only for
   * a reservation with a contact.
   */
  "reservation/createManual": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn, identity }) => {
      const { data, contact, payment, message, sendEmail, force, asConfirmed } = readAdminReservation(dtoIn);
      const hasContact = contact && (contact.name || contact.email || contact.phone);
      return crud.createManual({
        data: {
          ...data,
          contact: hasContact ? { name: contact.name ?? null, email: contact.email ?? null, phone: contact.phone ?? null } : null,
          totalPrice: payment["payment.totalPrice"] ?? null,
          plan: {
            depositAmount: payment["payment.deposit.amount"],
            depositDueDate: payment["payment.deposit.dueDate"],
            balanceDueDate: payment["payment.balance.dueDate"],
          },
        },
        asConfirmed,
        sendEmail,
        message,
        force,
        identity,
      });
    },
  },

  /**
   * Edit: stay, contact, notes, price, deposit and due dates. The state does NOT change here --
   * that is `reservation/transition`. The guest gets the "reservation changed" email (H9) only
   * when something they see changed and the reservation is accepted; `sendEmail: false` turns it off.
   */
  "reservation/update": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn, identity }) => {
      const id = readId(dtoIn, CODE);
      const { data, contact, payment, message, sendEmail, force } = readAdminReservation(dtoIn, { partial: true });
      const changes = { ...data, ...payment };
      if (contact) changes.contact = contact;
      return crud.updateOwn({ id, changes, sendEmail, message, force, identity });
    },
  },

  /**
   * Email previews for the forms: manual create (deposit request / confirmation) and edit
   * (reservation changed). Same dtoIn as `createManual` / `update`, nothing is written or
   * sent. `email: null` = the form would not send an email. POST because of the dtoIn shape
   * (nested values), not because of a write.
   */
  "reservation/createEmailPreview": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      const { data, contact, payment, message, force, asConfirmed } = readAdminReservation(dtoIn);
      const hasContact = contact && (contact.name || contact.email || contact.phone);
      return crud.createManual({
        data: {
          ...data,
          contact: hasContact ? { name: contact.name ?? null, email: contact.email ?? null, phone: contact.phone ?? null } : null,
          totalPrice: payment["payment.totalPrice"] ?? null,
          plan: {
            depositAmount: payment["payment.deposit.amount"],
            depositDueDate: payment["payment.deposit.dueDate"],
            balanceDueDate: payment["payment.balance.dueDate"],
          },
        },
        asConfirmed,
        message,
        force,
        preview: true,
      });
    },
  },

  "reservation/updateEmailPreview": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      const id = readId(dtoIn, CODE);
      const { data, contact, payment, message, force } = readAdminReservation(dtoIn, { partial: true });
      const changes = { ...data, ...payment };
      if (contact) changes.contact = contact;
      return crud.updateOwn({ id, changes, message, force, preview: true });
    },
  },

  "reservation/delete": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.deleteOwn(readId(dtoIn, CODE)),
  },

  /**
   * Preview of the email an action would send (subject, text, HTML) -- without a write. The
   * state change modal shows it so the owner sees what goes to the guest. `email: null` = the
   * action has no email.
   */
  "reservation/emailPreview": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      const id = readId(dtoIn, CODE);
      const v = createValidator(CODE);
      const action = v.enumeration(dtoIn?.action, "action", ACTION_LIST, { required: true });
      const lang = readLang(v, dtoIn);
      const message = readMessage(v, dtoIn);
      const paidDate = Object.hasOwn(dtoIn ?? {}, "paidDate") ? readDate(v, dtoIn, "paidDate") : undefined;
      v.assert();
      return crud.previewTransitionEmail({ id, action, lang, message, paidDate: paidDate || undefined });
    },
  },

  /**
   * State change (docs/proposal-reservation-flow.md § 3). The allowed actions per state are
   * returned by `reservation/list` and `get` in `actionList`; a disallowed action = 409 with
   * the current state.
   *
   * `paidDate` for "deposit / balance received" (default today), `lang` changes the language of
   * the reservation's emails, `message` goes into the email to the guest.
   */
  "reservation/transition": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn, identity }) => {
      const id = readId(dtoIn, CODE);
      const v = createValidator(CODE);
      const action = v.enumeration(dtoIn?.action, "action", ACTION_LIST, { required: true });
      const paidDate = Object.hasOwn(dtoIn ?? {}, "paidDate") ? readDate(v, dtoIn, "paidDate") : undefined;
      const lang = readLang(v, dtoIn);
      const message = readMessage(v, dtoIn);
      const sendEmail = readFlag(v, dtoIn, "sendEmail", true);
      v.assert();

      return crud.transition({
        id,
        action,
        sendEmail,
        message,
        paidDate: paidDate || undefined,
        lang,
        identity,
      });
    },
  },
};
