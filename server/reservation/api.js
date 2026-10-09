import { Error as AppError, Captcha, Mailer } from "caio-server";
import config from "../config.js";
import crud from "./crud.js";
import { getOccupied } from "../services/availability.js";
import { assertPricingApproved, calculatePrice } from "../services/price.js";
import { isIsoDate, nightsBetween, todayIso } from "../services/dates.js";
import { createValidator, readId, readPageInfo } from "../services/dto.js";
import { STATE, STATE_LIST, ACTION_LIST } from "./states.js";
import { SCOPE_LIST } from "./scope.js";

const CODE = "caio-propertyman/reservation";
const ADMIN = ["authorities"];
const REASON_LIST = ["maintenance", "owner"];
const MAX_MESSAGE_LENGTH = 2000;

// Validace je schválně TADY, ve `fn`, a ne v poli `validator`.
//
// `validator` v caio-serveru má rozbitou chybovou cestu: když hodí výjimku, getDtoIn pošle
// 400 -- ale nezastaví se a `fn` se stejně zavolá s nevalidním dtoIn. U create by to znamenalo,
// že se rezervace i tak zapíše a následné res.json() spadne na ERR_HTTP_HEADERS_SENT.
// Pole `validator` se proto smí používat nanejvýš na přetypování, nikdy na odmítnutí.

/** Seznam stavů z filtru (pole, nebo jeden stav). Neznámý stav = 400, ne tiché ignorování. */
function readStateList(v, value) {
  if (value == null || value === "") return null;
  const list = Array.isArray(value) ? value : [value];
  v.check(list.every((state) => STATE_LIST.includes(state)), "stateList");
  return list.length ? list.map(String) : null;
}

/** Nepovinné ISO datum z GETu. */
function optionalDate(v, dtoIn, key) {
  const value = dtoIn?.[key];
  if (value == null || value === "") return null;
  v.check(isIsoDate(value), key);
  return isIsoDate(value) ? value : null;
}

/** Chyba, které rozumí uu5g05-forms: paramMap klíče se namapují na konkrétní inputy. */
function invalid(message, keyMap, kind = "invalidValueKeyMap") {
  return new AppError.Failed(message, {
    status: 400,
    code: `${CODE}/invalidDtoIn`,
    paramMap: { [kind]: keyMap },
  });
}

/**
 * dtoIn z GETu přijde celý jako řetězce -- query parametry se nepřetypovávají (jen hodnoty
 * začínající `{` nebo `[` se zkusí JSON.parse). Čísla a data je proto nutné převést ručně.
 */
function readDateRange(dtoIn) {
  const dateFrom = String(dtoIn?.dateFrom ?? "");
  const dateTo = String(dtoIn?.dateTo ?? "");

  const badMap = {};
  if (!isIsoDate(dateFrom)) badMap.dateFrom = true;
  if (!isIsoDate(dateTo)) badMap.dateTo = true;
  if (Object.keys(badMap).length) {
    throw invalid("Datum musí být ve tvaru RRRR-MM-DD.", badMap);
  }
  if (dateFrom >= dateTo) {
    throw invalid("Odjezd musí být po příjezdu.", { dateTo: true });
  }
  return { dateFrom, dateTo };
}

function validateStay(dateFrom, dateTo) {
  if (dateFrom < todayIso()) {
    throw invalid("Termín nemůže začínat v minulosti.", { dateFrom: true });
  }
  const nights = nightsBetween(dateFrom, dateTo);
  if (nights < config.minNights) {
    throw invalid(`Minimální délka pobytu je ${config.minNights} nocí.`, { dateTo: true });
  }
  if (nights > config.maxNights) {
    throw invalid(`Maximální délka pobytu je ${config.maxNights} nocí.`, { dateTo: true });
  }
  return nights;
}

function readGuestCount(dtoIn) {
  const guestCount = Number(dtoIn?.guestCount);
  const { min, max } = config.capacity;
  if (!Number.isInteger(guestCount) || guestCount < min || guestCount > max) {
    throw invalid(`Počet osob musí být mezi ${min} a ${max}.`, { guestCount: true });
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
    throw invalid("Vyplňte prosím kontaktní údaje.", missing, "missingKeyMap");
  }

  const bad = {};
  if (name.length > 200) bad.name = true;
  // Formát je regex stacku (záměrně shovívavý: přísnější odmítají platné adresy). Doménu
  // ověří až checkEmail v DNS, po všech levných kontrolách -- viz reservation/create.
  if (!Mailer.validateEmail(email) || email.length > 320) bad.email = true;
  if (!/^\+?[\d\s()-]{9,20}$/.test(phone)) bad.phone = true;
  if (Object.keys(bad).length) {
    throw invalid("Zkontrolujte prosím e-mail a telefon.", bad);
  }

  return { name, email, phone };
}

// Hlášky u pole e-mailu podle důvodu z Mailer.checkEmail (formát už prošel v readContact).
const EMAIL_PROBLEM_MESSAGES = {
  invalidFormat: "Zkontrolujte prosím e-mail a telefon.",
  domainNotFound: "Doména e-mailu neexistuje. Není v adrese překlep?",
  domainRejectsMail: "Na tuhle doménu nejde poslat e-mail. Zkontrolujte prosím adresu.",
};

/**
 * Doména e-mailu musí poštu přijímat, jinak hostovi nedorazí potvrzení a vlastník nemá kam
 * odpovědět. Neověří schránku ani překlep, který padne na existující doménu, a výpadek DNS
 * adresu propustí (caio-server README, Mailer).
 */
async function assertEmailReceivesMail(email) {
  const problem = await Mailer.checkEmail(email);
  if (problem) throw invalid(EMAIL_PROBLEM_MESSAGES[problem], { email: true });
}

/**
 * Boolean z dtoIn: JSON pošle true/false, query string "true"/"false". Chybějící = výchozí.
 * Cokoli jiného (1, "yes") je chyba pole -- ne tiché false: `asConfirmed: 1` by jinak založil
 * rezervaci čekající na zálohu a poslal hostovi výzvu k platbě.
 */
function readFlag(v, dtoIn, key, defaultValue) {
  const value = dtoIn?.[key];
  if (value == null) return defaultValue;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  v.check(false, key);
  return defaultValue;
}

/** Jazyk z dtoIn, nebo undefined. Neznámý jazyk je chyba pole `lang`. */
function readLang(v, dtoIn) {
  if (!Object.hasOwn(dtoIn ?? {}, "lang")) return undefined;
  return v.enumeration(dtoIn.lang, "lang", config.languages) ?? undefined;
}

/** ISO datum, nebo null (smazání hodnoty z formuláře). */
function readDate(v, dtoIn, key, { required = false } = {}) {
  const value = v.string(dtoIn?.[key], key, { required, maxLength: 10 });
  if (value) v.check(isIsoDate(value), key);
  return value;
}

/** Zpráva hostovi z modálu -- vloží se do e-mailu a zapíše do historie. */
function readMessage(v, dtoIn) {
  return v.string(dtoIn?.message, "message", { maxLength: MAX_MESSAGE_LENGTH }) || undefined;
}

/**
 * Ruční záznam a úprava z adminu. Na rozdíl od veřejné cesty tady NEplatí minimální délka
 * pobytu ani zákaz minulosti -- vlastník smí zapsat i pobyt, který už proběhl, a blokaci
 * na jednu noc.
 *
 * Admin posílá plochý tvar (`contactName`, `depositDueDate`, …), protože formulářový modál
 * `UiElements.Crud` pracuje s klíči první úrovně. Tady se z něj skládá tvar dokumentu:
 * vnořený `contact` a tečkové cesty `payment.*`.
 *
 * `partial` je pro update: modál `UiElements.Crud` posílá jen změněná pole.
 */
function readAdminReservation(dtoIn, { partial = false } = {}) {
  const v = createValidator(CODE);
  const has = (key) => Object.hasOwn(dtoIn ?? {}, key);
  const data = {};

  for (const key of ["dateFrom", "dateTo"]) {
    if (partial && !has(key)) continue;
    data[key] = readDate(v, dtoIn, key, { required: true });
  }
  // Porovnávat jde jen tehdy, když jsou obě data v dtoIn; jinak to dořeší crud proti uloženému.
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

  // Peníze: plochá pole formuláře → tečkové cesty v dokumentu.
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
 * App.init nenastavuje `trust proxy`, takže req.ip je na App Enginu IP proxy, ne hosta.
 * Skutečnou adresu nese X-Forwarded-For, kde první položka je klient.
 */
function clientIpOf(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req?.socket?.remoteAddress ?? null;
}

export default {
  // Vrací JEN obsazené intervaly -- bez jmen, kontaktů a bez informace, odkud obsazenost je.
  "availability/get": {
    method: "get",
    fn: async ({ dtoIn }) => {
      const { dateFrom, dateTo } = readDateRange(dtoIn);
      return { occupiedList: await getOccupied(dateFrom, dateTo) };
    },
  },

  // Informativní přepočet pro formulář. Závazná je až cena spočtená v reservation/create.
  "price/calculate": {
    method: "get",
    fn: async ({ dtoIn }) => {
      const { dateFrom, dateTo } = readDateRange(dtoIn);
      validateStay(dateFrom, dateTo);
      // Počet osob teď cenu přímo ovlivňuje (do 5 / nad 5), takže je povinný.
      const guestCount = readGuestCount(dtoIn);
      return calculatePrice(dateFrom, dateTo, guestCount, "web");
    },
  },

  // Veřejný POST, který zapisuje do DB -- proto honeypot, captcha a rate limit (design-v1.md § 6).
  "reservation/create": {
    method: "post",
    fn: async ({ dtoIn: rawDtoIn, req, useCase }) => {
      // Úplně první krok, ještě před jakýmkoli dotazem do DB (rate limit se ptá do Monga).
      // Jinak by odpověď na neschválený ceník závisela na tom, jestli je dostupné Mongo.
      assertPricingApproved();

      // Honeypot: skryté pole, které člověk nevyplní. Tváříme se úspěšně a nic nezapisujeme --
      // bot se nedozví, že ho někdo odhalil, a nezkusí to jinak.
      if (String(rawDtoIn?.website ?? "").trim() !== "") {
        return { id: null, state: STATE.REQUESTED, nights: 0, totalPrice: 0 };
      }

      // reCAPTCHA v3 až za honeypotem (odhalený bot nestojí dotaz do Googlu) a před validací
      // (bot se nedozví, která pole má špatně). Token `captchaToken` posílá formulář a verify
      // ho z dtoIn odebere. Bez GOOGLE_RECAPTCHA_SECRET v developmentu projde, v produkci
      // odmítne 503 -- veřejný zápis nesmí potichu běžet nechráněný (caio-server README, Captcha).
      // Action = název use casu; formulář volá `execute("reservation/create")`.
      const dtoIn = await Captcha.verify(rawDtoIn, { action: useCase });

      const { dateFrom, dateTo } = readDateRange(dtoIn);
      validateStay(dateFrom, dateTo);
      const guestCount = readGuestCount(dtoIn);
      const contact = readContact(dtoIn);

      const note = String(dtoIn?.note ?? "").trim();
      if (note.length > config.maxNoteLength) {
        throw invalid(`Poznámka může mít nejvýš ${config.maxNoteLength} znaků.`, { note: true });
      }

      // DNS až po všech kontrolách, které nic nestojí, a před dotazem do Monga.
      await assertEmailReceivesMail(contact.email);

      // Rate limit dotazem nad kolekcí, ne express-rate-limit v paměti: middleware přidaný
      // po App.init se k requestu nedostane, a stav v paměti by navíc nepřežil restart
      // instance na GAE ani se nesdílel mezi instancemi.
      const clientIp = clientIpOf(req);
      if ((await crud.countRecentFromIp(clientIp)) >= config.rateLimit.maxPerIpPerDay) {
        throw new AppError.Failed("Příliš mnoho rezervací z jedné adresy. Zkuste to zítra.", {
          status: 429,
          code: `${CODE}/rateLimitExceeded`,
        });
      }

      // Jazyk hosta z FE (`useLanguage()`). Neznámý nebo chybějící = čeština -- formulář kvůli
      // tomu odmítat nebudeme, jde jen o jazyk e-mailů.
      const lang = config.languages.includes(dtoIn?.lang) ? dtoIn.lang : "cs";

      // E-maily (H1 hostovi, V1 vlastníkovi) posílá crud a zapisuje je do historie. Jejich
      // selhání rezervaci neshodí -- ta je už zapsaná a je to ta cenná část.
      return crud.createFromWeb({ dateFrom, dateTo, guestCount, contact, note: note || null, clientIp, lang });
    },
  },

  // -----------------------------------------------------------------------------------------
  // Admin (v2). Všechno `auth: ["authorities"]`; veřejné use casy výš zůstávají beze změny.
  // -----------------------------------------------------------------------------------------

  "reservation/list": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      // dtoIn z GETu je celý řetězcový (pole přijde jako JSON); prázdná hodnota = bez filtru.
      // Hodnota z query začínající "{" / "[" se parsuje jako JSON -- všechno se proto čte přes
      // výčet nebo regex, ať nejde podstrčit Mongo operátor ({"$ne": …}).
      const v = createValidator(CODE);
      const scope = v.enumeration(dtoIn?.scope, "scope", SCOPE_LIST) ?? "active";
      // Archiv je po letech: bez roku by vracel všechno, co kdy proběhlo.
      const year = v.int(dtoIn?.year, "year", { required: scope === "archive", min: 2000, max: 2100 });
      const stateList = readStateList(v, dtoIn?.stateList);
      const source = dtoIn?.source == null || dtoIn.source === "" ? null : String(dtoIn.source);
      v.check(source == null || /^[a-z0-9_-]{1,50}$/i.test(source), "source");
      const arrivalFrom = optionalDate(v, dtoIn, "arrivalFrom");
      const arrivalTo = optionalDate(v, dtoIn, "arrivalTo");
      // Obrácený rozsah by tiše vrátil prázdný seznam.
      v.check(!arrivalFrom || !arrivalTo || arrivalFrom <= arrivalTo, "arrivalTo");
      v.assert();
      return crud.listForAdmin({ scope, year, stateList, source, arrivalFrom, arrivalTo, pageInfo: readPageInfo(dtoIn) });
    },
  },

  /** Detail včetně historie (`eventList`) -- ve výpisu historie není. */
  "reservation/get": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.getForAdmin(readId(dtoIn, CODE)),
  },

  /**
   * Ruční rezervace i blokace termínu.
   *
   * Vlastní use case, ne větev ve `reservation/create`: veřejná cesta je záměrně hloupá
   * (honeypot, captcha, rate limit, vždy `requested` a `source: web`) a míchat do ní admin
   * větev by znamenalo rozhodovat o autorizaci uvnitř use casu.
   *
   * `asConfirmed` (výchozí true): rovnou potvrzená. false = čeká na zálohu, hostovi jde výzva
   * k platbě. `sendEmail` (výchozí true) jde hostovi jen u rezervace s kontaktem.
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
   * Úprava: pobyt, kontakt, poznámky, cena, záloha a splatnosti. Stav se tady NEMĚNÍ --
   * na to je `reservation/transition`. Hostovi jde e-mail o změně (H9), jen když se změnilo
   * něco, co vidí, a rezervace je přijatá; `sendEmail: false` ho vypne.
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
   * Náhledy e-mailu k formulářům: ruční vytvoření (výzva k záloze / potvrzení) a úprava
   * (změna rezervace). Stejný dtoIn jako `createManual` / `update`, nic se nezapíše ani
   * neodešle. `email: null` = formulář by e-mail neposlal. POST kvůli tvaru dtoIn (vnořené
   * hodnoty), ne kvůli zápisu.
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
   * Náhled e-mailu, který by akce poslala (předmět, text, HTML) -- bez zápisu. Modál změny
   * stavu ho ukazuje, ať vlastník vidí, co hostovi odejde. `email: null` = akce e-mail nemá.
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
   * Změna stavu (docs/proposal-reservation-flow.md § 3). Povolené akce podle stavu vrací
   * `reservation/list` a `get` v `actionList`; nepovolená akce = 409 s aktuálním stavem.
   *
   * `paidDate` u „záloha / doplatek přijat“ (výchozí dnešek), `lang` změní jazyk e-mailů
   * rezervace, `message` se vloží do e-mailu hostovi.
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
