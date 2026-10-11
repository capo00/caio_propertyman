import { randomUUID } from "crypto";
import { Crud, Error as AppError } from "caio-server";
import config from "../config.js";
import dao from "./dao.js";
import { isFree } from "../services/availability.js";
import { assertPricingApproved, calculatePrice } from "../services/price.js";
import { addDays, nightsBetween, todayIn } from "../services/dates.js";
import { scopeQuery, scopeOf } from "./scope.js";
import { computeCancellation } from "./cancellation.js";
import { STATE, TRANSITIONS, RELEASED_STATE_LIST, transitionProblem, allowedActions, nextAction, isGuestReservation } from "./states.js";
import { createPaymentPlan, balanceAmount, nextVariableSymbol, variableSymbolPrefix, planProblems } from "./payment.js";
import { actorOf, createEvent, diff } from "./history.js";
import { sendEmail, renderEmail, emailLanguages, htmlForBrowser } from "../email/send.js";
import { formParamMap } from "../services/dto.js";

const CODE = "caio-propertyman/reservation";

/** Dnešek v časové zóně provozu -- základ všech splatností. */
function today() {
  return todayIn(config.reservation.timeZone);
}

/**
 * `extra.paramMap` se tady píše jednoduše (`{ invalidValueKeyMap: { dateTo: true } }`) a převádí
 * se na tvar, který uu5g05-forms přiřadí k polím (`formParamMap` v server/services/dto.js).
 */
function failed(code, message, status, extra) {
  const paramMap = extra?.paramMap && Object.assign({}, ...Object.entries(extra.paramMap).map(([kind, keyMap]) => formParamMap(keyMap, message, kind)));
  return new AppError.Failed(message, { status, code: `${CODE}/${code}`, ...extra, paramMap: paramMap || undefined });
}

/** Proč akce nejde → chyba pro API. Kódy odpovídají `transitionProblem` ve states.js. */
const TRANSITION_PROBLEM = {
  unknownAction: [400, "Neznámá akce."],
  notGuestReservation: [400, "Import ani blokace termínu nemají stav, který by šel posunout."],
  invalidTransition: [409, "Tahle akce v aktuálním stavu rezervace nejde."],
  noBalanceDue: [409, "Rezervace nemá nezaplacený doplatek."],
  stayNotFinished: [409, "Pobyt ještě neskončil."],
  notOverdue: [409, "Záloha ještě není po splatnosti — rezervaci jde zrušit stornem."],
};

/** Pole, jejichž změnu host vidí -- jen tehdy má smysl e-mail „změna rezervace“ (H9). */
const GUEST_VISIBLE_FIELDS = [
  "dateFrom", "dateTo", "guestCount",
  "payment.totalPrice", "payment.deposit.amount", "payment.deposit.dueDate", "payment.balance.dueDate",
];

/** Všechna pole, která se při úpravě zapisují do historie jako `changes`. */
const TRACKED_FIELDS = [
  ...GUEST_VISIBLE_FIELDS,
  "contact.name", "contact.email", "contact.phone", "note", "desc", "reason", "lang",
  "payment.deposit.paidDate", "payment.balance.paidDate",
];

/**
 * Tvar, ve kterém rezervace odchází do adminu.
 *
 * Plochý (`contactName`, `depositDueDate`, …), i když v databázi je `contact` a `payment`
 * vnořené: formulářový modál `UiElements.Crud` pracuje s klíči první úrovně (`initialValue`
 * i diff změn). Odvozené hodnoty (`nights`, `balanceAmount`) se dopočítávají tady, v DB nejsou.
 *
 * `actionList` a `nextAction` říkají, co admin smí nabídnout -- tabulku přechodů má jen server.
 * `clientIp` se nevrací nikdy, `eventList` jen v detailu.
 */
function toAdminDto(item, { withEvents = false, today: day = today() } = {}) {
  if (!item) return item;
  const { clientIp, contact, payment, eventList, ...rest } = item;
  const ctx = { today: day };
  return {
    ...rest,
    nights: nightsBetween(item.dateFrom, item.dateTo),
    contactName: contact?.name ?? null,
    contactEmail: contact?.email ?? null,
    contactPhone: contact?.phone ?? null,
    totalPrice: payment?.totalPrice ?? null,
    variableSymbol: payment?.variableSymbol ?? null,
    depositAmount: payment?.deposit?.amount ?? null,
    depositDueDate: payment?.deposit?.dueDate ?? null,
    depositPaidDate: payment?.deposit?.paidDate ?? null,
    balanceAmount: balanceAmount(payment),
    balanceDueDate: payment?.balance?.dueDate ?? null,
    balancePaidDate: payment?.balance?.paidDate ?? null,
    actionList: allowedActions(item, ctx),
    nextAction: nextAction(item, ctx),
    scope: scopeOf(item, ctx.today),
    // Storno: zapsané při stornu, u rezervace, kterou jde stornovat, náhled ke dnešku (modál).
    cancellation: item.cancellation ?? (allowedActions(item, ctx).includes("cancel") ? computeCancellation(item, ctx.today) : null),
    ...(withEvents ? { eventList: eventList ?? [] } : null),
  };
}

/**
 * Záznam z importu se ručně editovat nesmí: příští `calendar/sync` ho podle UID přepíše
 * nebo smaže, takže by změna tiše zmizela. Kdo chce obsazenost z portálu zrušit, zruší
 * ji na portálu (design-v2.md § 6).
 */
function assertEditable(item) {
  if (item.icalFeedCode == null) return;
  throw failed(
    "importedRecord",
    `Záznam pochází z importu (${item.icalFeedCode}) a nejde měnit z aplikace — příští synchronizace by změnu přepsala.`,
    400,
  );
}

/**
 * E-maily k události; null (host bez e-mailu) se vynechá. Nikdy nehází: zápis, ke kterému
 * e-mail patří, už proběhl a je to ta cenná část. Výjimka z odeslání se zapíše jako `failed`.
 */
/** Náhled e-mailu pro admin: HTML s QR jako data URI (admin ho ukáže v iframe tak, jak ho uvidí host). */
function emailPreviewDto(mail) {
  return { template: mail.template, lang: mail.lang, to: mail.to, subject: mail.subject, text: mail.text, html: htmlForBrowser(mail) };
}

async function sendAll(codeList, reservation, options) {
  // Souběžně: u žádosti z webu se na e-maily čeká v requestu formuláře, dva za sebou by čekání
  // zdvojnásobily. Pořadí v historii zůstává podle `codeList`.
  const result = await Promise.all(codeList.map(async (code) => {
    try {
      return await sendEmail(code, reservation, options);
    } catch (e) {
      console.error(`[reservation] e-mail ${code} selhal:`, e?.message ?? e);
      return { template: code, lang: null, to: null, subject: null, text: null, status: "failed", reason: null, error: String(e?.message ?? e), sentAt: null };
    }
  }));
  return result.filter(Boolean);
}

/**
 * Krok po úspěšném zápisu (historie, e-maily). Jeho selhání se zaloguje, ale nevrací chybu:
 * stav už je změněný, a 500 by správce (nebo hosta) poslalo akci opakovat do už hotového stavu.
 */
async function afterWrite(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.error(`[reservation] ${label} se nepodařilo dopsat:`, e?.message ?? e);
  }
}

/** Optimistický zámek selhal -- někdo záznam mezitím změnil. */
function concurrentChange() {
  return failed("concurrentChange", "Rezervaci mezitím změnil někdo jiný. Načtěte ji znovu.", 409);
}

function assertPlan(doc) {
  const bad = planProblems(doc);
  if (!Object.keys(bad).length) return;
  throw failed(
    "invalidPaymentPlan",
    "Zkontrolujte platby: záloha musí být kladná a menší než cena (při platbě celé částky rovna ceně), splatná nejpozději se doplatkem a doplatek před příjezdem.",
    400,
    { paramMap: { invalidValueKeyMap: bad } },
  );
}

/** Připomínky, které je po změně splatnosti nebo příjezdu potřeba poslat znovu (až bude cron). */
function reminderResets(changeList) {
  const fields = new Set(changeList.map(({ field }) => field));
  const set = {};
  if (fields.has("payment.deposit.dueDate")) {
    set["reminder.depositSentAt"] = null;
    set["reminder.depositOverdueSentAt"] = null;
  }
  if (fields.has("payment.balance.dueDate")) set["reminder.balanceSentAt"] = null;
  if (fields.has("dateFrom")) set["reminder.arrivalInfoSentAt"] = null;
  return set;
}

function isUniqueViolation(e) {
  return e?.code === 11000;
}

function emptyReminder() {
  return { depositSentAt: null, balanceSentAt: null, arrivalInfoSentAt: null, depositOverdueSentAt: null };
}

class ReservationCrud extends Crud {
  constructor() {
    super("reservation", dao);
  }

  /**
   * Žádost z veřejného webu. Vzniká jako `requested` a termín předběžně blokuje; přijímá ji
   * vlastník v adminu (docs/proposal-reservation-flow.md). Hostovi jde H1, vlastníkovi V1.
   *
   * dtoIn je v tuhle chvíli už zvalidovaný a přetypovaný v api.js.
   */
  async createFromWeb({ dateFrom, dateTo, guestCount, contact, note, clientIp, lang }) {
    // Úplně první krok, ještě před dotazy do DB: bez schváleného ceníku se v produkci
    // rezervace nezakládá. Kdyby to bylo až u výpočtu ceny, odpověď by se lišila podle toho,
    // jestli je zrovna dostupné Mongo.
    assertPricingApproved();

    // Kolizní kontrola proti VŠEM blokujícím záznamům -- vlastním i importovaným.
    //
    // Zůstává tu race condition: dvě současné žádosti o stejný termín obě projdou. Řeší ji
    // to, že žádost přijímá člověk a druhou zamítne (design-v1.md § 6).
    if (!(await isFree(dateFrom, dateTo))) {
      throw failed("dateOccupied", "Termín je již obsazený.", 409, {
        paramMap: { invalidValueKeyMap: { dateFrom: true, dateTo: true } },
      });
    }

    // Kanál "web" -- sazby pro "booking" slouží k nastavení cen v extranetu portálu, ne
    // k výpočtu u nás (viz config.js). Uloží se jen výsledná cena.
    const { nights, totalPrice } = calculatePrice(dateFrom, dateTo, guestCount, "web");
    const created = createEvent("created", { by: null });

    const item = await dao.create({
      propertyId: config.propertyId,
      source: "web",
      // UID generujeme předem, ne z Mongo id -- jinak by musel následovat druhý zápis a mezi
      // nimi by v exportním feedu seděl záznam bez UID.
      icalUid: `res-${randomUUID()}@caio-propertyman`,
      // null = vzniklo u nás -> patří do exportu a import na to nesmí sáhnout.
      icalFeedCode: null,
      state: STATE.REQUESTED,
      lang,
      dateFrom,
      dateTo,
      guestCount,
      reason: null,
      contact,
      note: note ?? null,
      desc: null,
      payment: { totalPrice, variableSymbol: null, deposit: null, balance: null },
      reminder: emptyReminder(),
      eventList: [created],
      // Jen pro rate limit (§ rateLimit v config.js). Osobní údaj -- nikdy se nevrací
      // z API a při úklidu starých rezervací se maže první.
      clientIp: clientIp ?? null,
    });

    // Vlastníkovi první: je důležitější, aby se žádost neztratila, než aby host dostal potvrzení.
    await afterWrite("e-maily k žádosti", async () => {
      const emailList = await sendAll(["ownerNewRequest", "requestReceived"], item, { lang });
      await dao.setEventEmails(item.id, created.at, emailList);
    });

    return { id: String(item.id), state: item.state, nights, totalPrice };
  }

  // ---------------------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------------------

  /**
   * Výpis pro admin tabulku. Vrací `{ itemList, pageInfo }`, což je tvar, který čeká
   * `useDataList` v `UiElements.Crud`.
   *
   * - `scope`: `active` (čeká na krok nebo na pobyt) / `archive` (ukončené), viz scope.js.
   * - `year`: rok příjezdu, u archivu povinný (validuje API).
   * - `stateList`, `source`, `arrivalFrom` / `arrivalTo` (den příjezdu včetně): filtry z FilterBaru.
   *
   * Aktivní od nejbližšího příjezdu, archiv od posledního.
   */
  async listForAdmin({ scope = "active", year, stateList, source, arrivalFrom, arrivalTo, pageInfo } = {}) {
    // Jedno „dnes“ pro dotaz i pro `scope` v DTO -- request přes půlnoc by je jinak rozešel.
    const day = today();
    const and = [scopeQuery(scope, day)];
    if (year) and.push({ dateFrom: { $gte: `${year}-01-01`, $lt: `${year + 1}-01-01` } });
    if (stateList?.length) and.push({ state: { $in: stateList } });
    if (source) and.push({ source });
    if (arrivalFrom || arrivalTo) {
      and.push({ dateFrom: { ...(arrivalFrom ? { $gte: arrivalFrom } : null), ...(arrivalTo ? { $lte: arrivalTo } : null) } });
    }

    const result = await dao.findPageBy({ $and: and }, pageInfo, { dateFrom: scope === "archive" ? -1 : 1 });
    return { ...result, itemList: result.itemList.map((item) => toAdminDto(item, { today: day })) };
  }

  /** Detail včetně historie a jazyků, ve kterých jde hostovi poslat e-mail (výběr v modálu). */
  async getForAdmin(id) {
    return { ...toAdminDto(await this._get(id), { withEvents: true }), emailLanguageList: emailLanguages() };
  }

  /**
   * Ruční rezervace nebo blokace termínu (`source: "manual"`).
   *
   * - Blokace (bez kontaktu, s `reason`) je vždy `confirmed`, bez ceny a bez e-mailu.
   * - Rezervace s hostem je ve výchozím stavu `confirmed` (`asConfirmed`); nezaškrtnutá vznikne
   *   jako `awaitingDeposit` s platebním plánem a hostovi jde výzva k platbě (H2).
   *
   * Obojí má `icalFeedCode: null`, takže se exportuje do našeho feedu a portály termín zavřou.
   */
  /**
   * @param preview  true = nic nezapsat ani neposlat, jen vrátit e-mail, který by odešel
   *                 (`{ email }`, `email: null` = bez e-mailu). Stejný výpočet i validace jako zápis.
   */
  async createManual({ data, asConfirmed = true, sendEmail: shouldSend = true, message, force, identity, preview = false }) {
    const { dateFrom, dateTo, guestCount, contact, reason, note, desc, lang, totalPrice, plan: planOverride } = data;
    await this._assertFree(dateFrom, dateTo, { force });

    // Cena se počítá, jen když ji vlastník nezadal a jde o platícího hosta. Bez téhle
    // podmínky by ruční zápis narazil na neschválený ceník i tam, kde je částka známá.
    const price = totalPrice != null ? totalPrice : contact && guestCount ? calculatePrice(dateFrom, dateTo, guestCount, "web").totalPrice : null;
    const awaiting = Boolean(contact) && !asConfirmed;
    if (awaiting && price == null) {
      throw failed("priceMissing", "Bez ceny nejde chtít zálohu.", 400, { paramMap: { missingKeyMap: { totalPrice: true } } });
    }

    const state = awaiting ? STATE.AWAITING_DEPOSIT : STATE.CONFIRMED;
    const created = createEvent("created", { by: actorOf(identity), to: state, message: message || undefined, sendEmail: contact ? shouldSend : undefined });
    const base = {
      propertyId: config.propertyId,
      source: "manual",
      icalFeedCode: null,
      state,
      lang: lang ?? "cs",
      dateFrom,
      dateTo,
      guestCount: guestCount ?? null,
      reason: reason ?? null,
      contact: contact ?? null,
      note: note ?? null,
      desc: desc ?? null,
      payment: contact ? { totalPrice: price, variableSymbol: null, deposit: null, balance: null } : null,
      reminder: emptyReminder(),
      eventList: [created],
      clientIp: null,
    };
    if (awaiting) {
      base.payment = { ...base.payment, ...applyPlanOverride(createPaymentPlan({ totalPrice: price, dateFrom, today: today() }), planOverride, price) };
      assertPlan(base);
    }

    if (preview) {
      if (!contact) return { email: null };
      if (awaiting) base.payment.variableSymbol = await this._nextVariableSymbol(dateFrom);
      const mail = await renderEmail(awaiting ? "depositRequested" : "reservationConfirmed", base, { lang: base.lang, message });
      return { email: emailPreviewDto(mail) };
    }

    // VS se vybírá před zápisem; souběžné vytvoření se stejným dnem příjezdu narazí na unikátní
    // index a zkusí další číslo (nejvýš třikrát), stejně jako přijetí.
    let item;
    for (let attempt = 0; !item; attempt++) {
      if (awaiting) base.payment.variableSymbol = await this._nextVariableSymbol(dateFrom);
      try {
        item = await dao.create({ ...base, icalUid: `res-${randomUUID()}@caio-propertyman` });
      } catch (e) {
        if (!awaiting || !isUniqueViolation(e) || attempt >= 2) throw isUniqueViolation(e) ? failed("variableSymbolConflict", "Nepodařilo se přidělit variabilní symbol, zkuste to znovu.", 409) : e;
      }
    }

    if (contact && shouldSend) {
      await afterWrite("e-mail k ruční rezervaci", async () => {
        const template = awaiting ? "depositRequested" : "reservationConfirmed";
        const emailList = await sendAll([template], item, { lang: item.lang, message });
        await dao.setEventEmails(item.id, created.at, emailList);
      });
    }

    return toAdminDto(await this._get(item.id));
  }

  /**
   * Úprava vlastního záznamu: pobyt, kontakt, poznámky, cena, záloha a splatnosti.
   * Importovaný odmítne (přepsal by ho příští sync). Do historie jde událost `update`
   * se seznamem změn; hostovi H9, jen když se změnilo něco, co vidí, a rezervace už je přijatá.
   *
   * `changes` je v tvaru dokumentu (vnořený `contact`, `payment.*` jako tečkové cesty).
   * Zápis je podmíněný (optimistický zámek), takže souběžný přechod nebo úprava nic nepřepíše.
   */
  /** @param preview  jako u `createManual`: jen e-mail o změně (H9), který by úprava poslala. */
  async updateOwn({ id, changes, sendEmail: shouldSend = true, message, force, identity, preview = false }) {
    const current = await this._get(id);
    assertEditable(current);

    const set = {};
    for (const [key, value] of Object.entries(changes)) {
      if (key.startsWith("payment.") || key === "contact") continue;
      set[key] = value;
    }

    // Kontakt se skládá zpátky do vnořeného tvaru. Rezervace s hostem a blokace se úpravou
    // nepřevádějí jedna na druhou: z vyprázdněné žádosti by byla blokace bez akcí (nešla by
    // ani zamítnout) a blokace s doplněným kontaktem by neměla platby.
    if (changes.contact !== undefined) {
      const merged = { ...(current.contact ?? {}), ...changes.contact };
      const hasContact = Boolean(merged.name || merged.email || merged.phone);
      if (hasContact !== (current.contact != null)) {
        throw failed("contactChangeNotAllowed", current.contact ? "Rezervace s hostem musí mít kontakt. Blokaci termínu založte zvlášť." : "Blokaci nejde převést na rezervaci — založte novou.", 400, {
          paramMap: { invalidValueKeyMap: { contactName: true, contactEmail: true, contactPhone: true } },
        });
      }
      if (hasContact) set.contact = { name: merged.name ?? null, email: merged.email ?? null, phone: merged.phone ?? null };
    }

    const paymentChanges = Object.entries(changes).filter(([key]) => key.startsWith("payment."));
    if (paymentChanges.length) set.payment = applyPaymentChanges(current, paymentChanges);

    const next = { ...current, ...set };
    if (set.dateFrom || set.dateTo) {
      if (next.dateFrom >= next.dateTo) {
        throw failed("invalidDtoIn", "Odjezd musí být po příjezdu.", 400, { paramMap: { invalidValueKeyMap: { dateTo: true } } });
      }
      // Uvolněný záznam (zamítnutý, zrušený, propadlý) termín neblokuje, takže ani nekoliduje.
      if (!RELEASED_STATE_LIST.includes(next.state)) {
        await this._assertFree(next.dateFrom, next.dateTo, { force, exceptId: id });
      }
    }
    assertPlan(next);

    const changeList = diff(current, next, TRACKED_FIELDS);
    if (preview) {
      const visible = changeList.some(({ field }) => GUEST_VISIBLE_FIELDS.includes(field));
      const emailable = isGuestReservation(next) && [STATE.AWAITING_DEPOSIT, STATE.CONFIRMED].includes(next.state) && visible;
      if (!emailable) return { email: null };
      const mail = await renderEmail("reservationChanged", next, { lang: next.lang, message, changes: changeList });
      return { email: emailPreviewDto(mail) };
    }
    if (!changeList.length) return toAdminDto(current);

    if (!(await dao.updateIfCurrent(id, current, { ...set, ...reminderResets(changeList) }))) throw concurrentChange();
    const updated = await this._get(id);

    const guestVisible = changeList.some(({ field }) => GUEST_VISIBLE_FIELDS.includes(field));
    const emailable = isGuestReservation(updated) && [STATE.AWAITING_DEPOSIT, STATE.CONFIRMED].includes(updated.state) && guestVisible;

    await afterWrite("historie úpravy", async () => {
      const emailList = emailable && shouldSend ? await sendAll(["reservationChanged"], updated, { lang: updated.lang, message, changes: changeList }) : [];
      await dao.pushEvent(id, createEvent("update", {
        by: actorOf(identity),
        changes: changeList,
        message: message || undefined,
        sendEmail: emailable ? shouldSend : undefined,
        emailList,
      }));
    });

    return toAdminDto(await this._get(id));
  }

  async deleteOwn(id) {
    assertEditable(await this._get(id));
    await this.delete(id);
    return {};
  }

  /**
   * Změna stavu akcí z adminu (docs/proposal-reservation-flow.md § 3). Ověří přechod, provede
   * ho podmíněně (optimistický zámek: stav i `sys.mts` se od přečtení nezměnily), pošle e-mail
   * a zapíše událost.
   */
  async transition({ id, action, sendEmail: shouldSend = true, message, paidDate, lang, identity }) {
    const current = await this._get(id);
    const ctx = { today: today() };
    const problem = transitionProblem(current, action, ctx);
    if (problem) {
      const [status, text] = TRANSITION_PROBLEM[problem];
      throw failed(problem, text, status, { dtoOut: { state: current.state, actionList: allowedActions(current, ctx) } });
    }
    const def = TRANSITIONS[action];
    const set = await this._transitionSet(current, action, ctx, { paidDate, lang });

    const applied = action === "approve"
      ? await this._approveWithVariableSymbol(id, current, set)
      : await dao.updateIfCurrent(id, current, set);
    if (!applied) throw concurrentChange();

    const updated = await this._get(id);
    await afterWrite("historie přechodu", async () => {
      const emailList = def.template && shouldSend ? await sendAll([def.template], updated, { lang: updated.lang, message }) : [];
      await dao.pushEvent(id, createEvent("transition", {
        by: actorOf(identity),
        action,
        // Plán platby celé částky v okamžiku přechodu: admin podle toho v historii pojmenuje akci
        // („Platba přijata“) i stav („Čeká na platbu“) tak, jak se jmenovaly tehdy -- plán se může
        // později změnit.
        fullPayment: updated.payment?.deposit != null && updated.payment?.balance == null ? true : undefined,
        from: current.state,
        to: def.to,
        message: message || undefined,
        sendEmail: def.template ? shouldSend : undefined,
        emailList,
      }));
    });

    return toAdminDto(await this._get(id), { withEvents: true });
  }

  /**
   * Co přechod do záznamu zapíše (`$set`, včetně tečkových cest). Sdílí ho přechod i náhled
   * e-mailu, aby náhled ukázal přesně to, co po přechodu odejde.
   */
  async _transitionSet(current, action, ctx, { paidDate, lang } = {}) {
    if (paidDate && paidDate > ctx.today) {
      throw failed("invalidDtoIn", "Datum zaplacení nemůže být v budoucnu.", 400, { paramMap: { invalidValueKeyMap: { paidDate: true } } });
    }
    const def = TRANSITIONS[action];
    const set = { state: def.to };
    if (lang) set.lang = lang;

    switch (action) {
      case "approve":
      case "reopen": {
        // Nulová cena by dala zálohu 0 Kč -- stejné jako chybějící cena.
        if (!(current.payment?.totalPrice > 0)) throw failed("priceMissing", "Bez ceny nejde žádost přijmout — doplňte ji úpravou.", 400);
        // Dvě žádosti na stejný termín jdou vytvořit souběžně (známý race u webu) -- přijmout
        // ale jde jen jednu: jiná NEPŘIJATÁ žádost přijetí nebrání (vlastník si vybere, kterou
        // přijme, a druhou zamítne), přijatá nebo potvrzená ano. Totéž platí pro obnovení propadlé.
        await this._assertFree(current.dateFrom, current.dateTo, { exceptId: current.id, ignoreStates: [STATE.REQUESTED] });
        // Plán se počítá od dneška: při obnovení může být do příjezdu už ≤ 14 dní (celá částka)
        // a původní splatnosti můžou být v minulosti. VS zůstává (reopen) -- host ho už má.
        const plan = createPaymentPlan({ totalPrice: current.payment.totalPrice, dateFrom: current.dateFrom, today: ctx.today });
        set.payment = { ...current.payment, ...plan };
        Object.assign(set, { "reminder.depositSentAt": null, "reminder.depositOverdueSentAt": null, "reminder.balanceSentAt": null });
        break;
      }
      case "markDepositPaid":
        set["payment.deposit.paidDate"] = paidDate ?? ctx.today;
        break;
      case "markBalancePaid":
        set["payment.balance.paidDate"] = paidDate ?? ctx.today;
        break;
      case "cancel":
        // Storno poplatek a vratka ke dni storna -- zůstanou v rezervaci, ať je vlastník vidí
        // i později (podmínky v configu se můžou změnit).
        set.cancellation = computeCancellation(current, ctx.today);
        break;
      default:
        break;
    }
    return set;
  }

  /**
   * Náhled e-mailu, který přechod pošle -- bez zápisu. Pro modál změny stavu v adminu.
   * Vrací null, když akce e-mail nemá nebo host nemá e-mail. U přijetí se ukáže VS, který by
   * rezervace dostala, kdyby se přijala teď (skutečný se přidělí až při přijetí).
   */
  async previewTransitionEmail({ id, action, lang, message, paidDate }) {
    const current = await this._get(id);
    const ctx = { today: today() };
    const problem = transitionProblem(current, action, ctx);
    if (problem) {
      const [status, text] = TRANSITION_PROBLEM[problem];
      throw failed(problem, text, status);
    }
    const def = TRANSITIONS[action];
    if (!def.template || !current.contact?.email) return { email: null };

    const set = await this._transitionSet(current, action, ctx, { paidDate, lang });
    if (action === "approve") set.payment.variableSymbol = await this._nextVariableSymbol(current.dateFrom);
    const next = applySet(current, set);
    const mail = await renderEmail(def.template, next, { lang: next.lang, message });
    return { email: emailPreviewDto(mail) };
  }

  /**
   * Přijetí s přidělením VS. Kandidáta vybírá `nextVariableSymbol`, unikátnost hlídá index:
   * když dva přijmou naráz rezervace se stejným dnem příjezdu, druhý narazí na E11000
   * a zkusí další číslo (nejvýš třikrát).
   */
  async _approveWithVariableSymbol(id, current, set) {
    for (let attempt = 0; attempt < 3; attempt++) {
      set.payment.variableSymbol = await this._nextVariableSymbol(current.dateFrom);
      try {
        return await dao.updateIfCurrent(id, current, set);
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
    throw failed("variableSymbolConflict", "Nepodařilo se přidělit variabilní symbol, zkuste to znovu.", 409);
  }

  async _nextVariableSymbol(dateFrom) {
    const existing = await dao.findVariableSymbolsWithPrefix(variableSymbolPrefix(dateFrom));
    const vs = nextVariableSymbol(dateFrom, existing);
    if (!vs) throw failed("variableSymbolExhausted", "Pro tento den příjezdu došly variabilní symboly.", 409);
    return vs;
  }

  /** Kolizní kontrola, kterou smí vlastník vědomě přebít (`force`). */
  async _assertFree(dateFrom, dateTo, { force, exceptId, ignoreStates = [] } = {}) {
    if (force) return;
    const colliding = (await dao.findOverlapping(dateFrom, dateTo)).filter((item) => item.id !== exceptId && !ignoreStates.includes(item.state));
    if (colliding.length === 0) return;

    throw failed("dateOccupied", "Termín se kryje s jiným záznamem.", 409, {
      paramMap: { invalidValueKeyMap: { dateFrom: true, dateTo: true } },
      // Vlastník na rozdíl od hosta smí kolizi přebít, tak ať ví s čím.
      dtoOut: { collidingList: colliding.map(({ id, dateFrom, dateTo, source, state }) => ({ id, dateFrom, dateTo, source, state })) },
    });
  }

  /** Kolik rezervací už z téhle IP dnes přišlo -- strop je v config.rateLimit. */
  async countRecentFromIp(clientIp) {
    if (!clientIp) return 0;
    const since = `${addDays(new Date().toISOString().slice(0, 10), -1)}T00:00:00.000Z`;
    return (await dao.countByIpSince(clientIp, since)).length;
  }

  /**
   * Promítnutí jednoho iCal feedu do kolekce (etapa 6).
   *
   * KAŽDÝ dotaz je filtrovaný na `icalFeedCode` toho jednoho feedu. Bez toho by mazací krok
   * sáhl na vlastní rezervace (icalFeedCode: null) nebo na záznamy druhého portálu -- je to
   * nejdůležitější věc, kterou v importu nezkazit (design-v1.md § 7).
   *
   * Je to idempotentní: opakované spuštění nad stejným feedem nic nezmění.
   */
  async syncFeed(icalFeedCode, events) {
    const existing = await dao.findByFeed(icalFeedCode);
    const byUid = new Map(existing.map((r) => [r.icalUid, r]));
    const seen = new Set();

    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const { uid, dateFrom, dateTo } of events) {
      seen.add(uid);
      const current = byUid.get(uid);

      if (!current) {
        // Z VEVENTu se bere jen UID a termín. SUMMARY/DESCRIPTION s osobními údaji hosta
        // (e-chalupy je v exportu "s detaily" posílají) se zahazuje a neukládá.
        await dao.create({
          propertyId: config.propertyId,
          source: icalFeedCode,
          icalUid: uid,
          icalFeedCode,
          state: STATE.CONFIRMED,
          lang: null,
          dateFrom,
          dateTo,
          guestCount: null,
          reason: null,
          contact: null,
          note: null,
          desc: null,
          payment: null,
          reminder: emptyReminder(),
          eventList: [createEvent("created", { by: null })],
          clientIp: null,
        });
        created++;
      } else if (current.dateFrom !== dateFrom || current.dateTo !== dateTo) {
        await dao.update({ id: current.id, dateFrom, dateTo });
        updated++;
      }
    }

    // Co zmizelo z feedu, zmizí i u nás -- ale jen v rámci tohohle feedu.
    for (const record of existing) {
      if (!seen.has(record.icalUid)) {
        await dao.delete(record.id);
        deleted++;
      }
    }

    return { created, updated, deleted, total: events.length };
  }
}

/** `$set` (i s tečkovými cestami) aplikovaný na kopii dokumentu -- pro náhled bez zápisu. */
function applySet(doc, set) {
  const next = structuredClone(doc);
  for (const [path, value] of Object.entries(set)) {
    const keys = path.split(".");
    let target = next;
    for (const key of keys.slice(0, -1)) {
      if (target[key] == null || typeof target[key] !== "object") target[key] = {};
      target = target[key];
    }
    target[keys.at(-1)] = value;
  }
  return next;
}

/**
 * Ruční přepis výchozího plánu (částka zálohy, splatnosti) při vytvoření.
 * Splatnost doplatku: datum = plán se zálohou a doplatkem, výslovné null = celá částka najednou
 * (záloha = cena, pokud ji vlastník nezadal jinak).
 */
function applyPlanOverride(plan, override = {}, totalPrice) {
  const result = { deposit: { ...plan.deposit }, balance: plan.balance ? { ...plan.balance } : null };
  if (override.balanceDueDate === null) {
    result.balance = null;
    result.deposit.amount = totalPrice;
  } else if (override.balanceDueDate) {
    result.balance = { dueDate: override.balanceDueDate, paidDate: null };
  }
  if (override.depositAmount != null) result.deposit.amount = override.depositAmount;
  if (override.depositDueDate) result.deposit.dueDate = override.depositDueDate;
  return result;
}

/**
 * Úprava peněz. Cena jde měnit vždy, když je rezervace s hostem; záloha a doplatek jen tehdy,
 * když plán existuje (po přijetí) -- jinak není co upravovat a request je chyba.
 *
 * - Splatnost doplatku: datum u plánu bez doplatku doplatek **přidá**, null ho **zruší**
 *   (= celá částka najednou). Zaplacený doplatek zrušit nejde.
 * - U platby celé částky jde nezaplacená záloha s cenou (zvýšení ceny = vyšší platba), pokud
 *   vlastník částku zálohy nezadal výslovně. Zaplacená záloha s cenou nejde -- rozdíl pak musí
 *   vlastník vybrat jako doplatek (`planProblems` ho k tomu donutí).
 * - Data zaplacení jde úpravou jen **opravit** (jiné datum u už zaplacené platby). Označit jako
 *   zaplacené nebo zaplacení zrušit jde jen akcí -- jinak by stav (`awaitingDeposit`) a platba
 *   (zaplacená záloha) mluvily každý jinak.
 */
function applyPaymentChanges(current, paymentChanges) {
  if (!current.payment) {
    throw failed("noPayment", "Blokace ani import nemají platby.", 400);
  }
  const payment = {
    ...current.payment,
    deposit: current.payment.deposit ? { ...current.payment.deposit } : null,
    balance: current.payment.balance ? { ...current.payment.balance } : null,
  };
  const noPlan = {};
  const badPaid = {};
  let depositAmountGiven = false;
  for (const [path, value] of paymentChanges) {
    const [, part, field] = path.split(".");
    if (part === "totalPrice") {
      payment.totalPrice = value;
      continue;
    }
    const formKey = `${part}${field[0].toUpperCase()}${field.slice(1)}`;
    if (!payment.deposit) {
      noPlan[formKey] = true;
      continue;
    }
    if (part === "balance" && field === "dueDate") {
      if (value === null) {
        if (payment.balance?.paidDate) badPaid.balanceDueDate = true;
        else payment.balance = null;
      } else if (!payment.balance) {
        payment.balance = { dueDate: value, paidDate: null };
      } else {
        payment.balance.dueDate = value;
      }
      continue;
    }
    if (!payment[part]) {
      noPlan[formKey] = true;
      continue;
    }
    if (field === "paidDate" && (payment[part].paidDate == null || value == null)) {
      if (payment[part].paidDate !== value) badPaid[formKey] = true;
      continue;
    }
    if (part === "deposit" && field === "amount") depositAmountGiven = true;
    payment[part][field] = value;
  }
  if (Object.keys(noPlan).length) {
    throw failed("noPaymentPlan", "Záloha a doplatek jdou upravit až po přijetí žádosti.", 400, { paramMap: { invalidValueKeyMap: noPlan } });
  }
  if (Object.keys(badPaid).length) {
    throw failed("paidDateNotEditable", "Zaplacení se označuje akcí „Záloha přijata“ / „Doplatek přijat“; úpravou jde jen opravit datum. Zaplacený doplatek nejde zrušit.", 400, {
      paramMap: { invalidValueKeyMap: badPaid },
    });
  }
  // Celá částka najednou: nezaplacená záloha jde s cenou.
  if (payment.deposit && !payment.balance && !payment.deposit.paidDate && !depositAmountGiven) {
    payment.deposit.amount = payment.totalPrice;
  }
  return payment;
}

export default new ReservationCrud();
