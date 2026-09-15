import { randomUUID } from "crypto";
import { Crud, Error as AppError } from "caio-server";
import config from "../config.js";
import dao from "./dao.js";
import { isFree } from "../services/availability.js";
import { assertPricingApproved, calculatePrice } from "../services/price.js";
import { addDays, nightsBetween } from "../services/dates.js";

const CODE = "caio-propertyman/reservation";

/**
 * Tvar, ve kterém rezervace odchází do adminu.
 *
 * `contact` se rozbaluje do plochých polí, protože formulářový modál `UiElements.Crud`
 * pracuje s plochou hodnotou (`initialValue` i diff změn jdou po klíčích první úrovně) --
 * vnořený objekt by se nepředvyplnil a při editaci by se poslal celý znovu. V databázi
 * zůstává `contact` vnořený, převod je jen na hranici API (design-v2.md § 6).
 *
 * `clientIp` se zahazuje: osobní údaj sbíraný výhradně kvůli rate limitu.
 */
function toAdminDto(item) {
  if (!item) return item;
  const { clientIp, contact, ...rest } = item;
  return {
    ...rest,
    contactName: contact?.name ?? null,
    contactEmail: contact?.email ?? null,
    contactPhone: contact?.phone ?? null,
  };
}

/**
 * Záznam z importu se ručně editovat nesmí: příští `calendar/sync` ho podle UID přepíše
 * nebo smaže, takže by změna tiše zmizela. Kdo chce obsazenost z portálu zrušit, zruší
 * ji na portálu (design-v2.md § 6).
 */
function assertEditable(item) {
  if (item.icalFeedCode == null) return;
  throw new AppError.Failed(
    `Záznam pochází z importu (${item.icalFeedCode}) a nejde měnit z aplikace — příští synchronizace by změnu přepsala.`,
    { status: 400, code: `${CODE}/importedRecord` },
  );
}

class ReservationCrud extends Crud {
  constructor() {
    super("reservation", dao);
  }

  /**
   * Rezervace z veřejného webu. Vzniká jako `pending` a potvrzuje ji vlastník mimo aplikaci --
   * iCal se na straně portálů stahuje s prodlevou (desítky minut), takže dvojí rezervaci téhož
   * termínu jde technicky udělat a automatické potvrzení by lhalo (design-v1.md § 6).
   *
   * dtoIn je v tuhle chvíli už zvalidovaný a přetypovaný v api.js.
   */
  async createFromWeb({ dateFrom, dateTo, guestCount, contact, note, clientIp }) {
    // Úplně první krok, ještě před dotazy do DB: bez schváleného ceníku se v produkci
    // rezervace nezakládá. Kdyby to bylo až u výpočtu ceny, odpověď by se lišila podle toho,
    // jestli je zrovna dostupné Mongo.
    assertPricingApproved();

    // Kolizní kontrola proti VŠEM nezrušeným záznamům -- vlastním i importovaným.
    //
    // Zůstává tu race condition: dvě současné žádosti o stejný termín obě projdou. Ve v1 to
    // řeší kombinace `pending` + potvrzení člověkem; korektní řešení (transakce nebo lock na
    // termín) je věc v2 (design-v1.md § 6).
    if (!(await isFree(dateFrom, dateTo))) {
      throw new AppError.Failed("Termín je již obsazený.", {
        status: 409,
        code: `${CODE}/dateOccupied`,
        paramMap: { invalidValueKeyMap: { dateFrom: true, dateTo: true } },
      });
    }

    // Kanál je natvrdo "web" -- tohle je rezervace z našeho webu. Sazby pro "booking"
    // slouží k nastavení cen v extranetu portálu, ne k výpočtu u nás (viz config.js).
    const { nights, totalPrice, pricePerNight } = calculatePrice(dateFrom, dateTo, guestCount, "web");

    const item = await dao.create({
      propertyId: config.propertyId,
      dateFrom,
      dateTo,
      nights,
      guestCount,
      totalPrice,
      pricePerNight,
      channel: "web",
      state: "pending",
      source: "web",
      contact,
      note: note ?? null,
      // UID generujeme předem, ne z Mongo id -- jinak by musel následovat druhý zápis a mezi
      // nimi by v exportním feedu seděl záznam bez UID.
      icalUid: `res-${randomUUID()}@caio-propertyman`,
      // null = vzniklo u nás -> patří do exportu a import na to nesmí sáhnout.
      icalFeedCode: null,
      // Jen pro rate limit (§ rateLimit v config.js). Osobní údaj -- nikdy se nevrací
      // z veřejných endpointů a při úklidu starých rezervací se maže první.
      clientIp: clientIp ?? null,
    });

    return { id: String(item.id), state: item.state, nights, totalPrice };
  }

  // ---------------------------------------------------------------------------------------
  // Admin (v2). Veřejná cesta výš zůstává beze změny -- do ní se nesahá.
  // ---------------------------------------------------------------------------------------

  /**
   * Výpis pro admin tabulku. Vrací `{ itemList, pageInfo }`, což je tvar, který čeká
   * `useDataList` v `UiElements.Crud`.
   *
   * `clientIp` se odsud NIKDY nevrací: je to osobní údaj sbíraný výhradně kvůli rate limitu
   * (design-v2.md § 6). Kontakt hosta naopak ano -- to je smysl celé obrazovky.
   */
  async listForAdmin({ state, source, dateFrom, dateTo, pageInfo } = {}) {
    const filter = {};
    if (state) filter.state = state;
    if (source) filter.source = source;
    // Překryv s oknem, ne "začíná v okně" -- jinak by z výpisu vypadl probíhající pobyt.
    if (dateFrom) filter.dateTo = { $gt: dateFrom };
    if (dateTo) filter.dateFrom = { $lt: dateTo };

    const result = await dao.findPageBy(filter, pageInfo);
    return { ...result, itemList: result.itemList.map(toAdminDto) };
  }

  async getForAdmin(id) {
    return toAdminDto(await this._get(id));
  }

  /**
   * Ruční rezervace nebo blokace termínu (`source: "manual"`).
   *
   * Obojí je tatáž kolekce i tentýž záznam, liší se jen vyplněností: blokace nemá kontakt
   * ani cenu a má `reason`. Samostatné `blockedDate/*` use casy neexistují (design.md § 6).
   * Obojí má `icalFeedCode: null`, takže se exportuje do našeho feedu a portály termín zavřou.
   */
  async createManual({ dateFrom, dateTo, guestCount, contact, reason, note, totalPrice, force }) {
    await this._assertFree(dateFrom, dateTo, { force });

    const nights = nightsBetween(dateFrom, dateTo);
    // Cena se počítá, jen když ji vlastník nezadal a jde o platícího hosta. Bez téhle
    // podmínky by ruční zápis narazil na neschválený ceník i tam, kde je částka známá.
    const price = totalPrice != null ? totalPrice : contact && guestCount ? calculatePrice(dateFrom, dateTo, guestCount, "web").totalPrice : null;

    const item = await dao.create({
      propertyId: config.propertyId,
      dateFrom,
      dateTo,
      nights,
      guestCount: guestCount ?? null,
      totalPrice: price,
      pricePerNight: price != null && nights > 0 ? Math.round(price / nights) : null,
      channel: "manual",
      // Ruční záznam zadává vlastník, takže je potvrzený rovnou -- nemá kdo ho potvrzovat.
      state: "confirmed",
      source: "manual",
      contact: contact ?? null,
      reason: reason ?? null,
      note: note ?? null,
      icalUid: `res-${randomUUID()}@caio-propertyman`,
      icalFeedCode: null,
      clientIp: null,
    });

    return toAdminDto(item);
  }

  /** Editace vlastního záznamu. Importovaný odmítne -- přepsal by ho příští sync. */
  async updateOwn({ id, force, ...changes }) {
    const current = await this._get(id);
    assertEditable(current);

    const dateFrom = changes.dateFrom ?? current.dateFrom;
    const dateTo = changes.dateTo ?? current.dateTo;
    if (changes.dateFrom || changes.dateTo) {
      await this._assertFree(dateFrom, dateTo, { force, exceptId: id });
      changes.nights = nightsBetween(dateFrom, dateTo);
    }

    return toAdminDto(await this.update({ id, ...changes }));
  }

  async deleteOwn(id) {
    assertEditable(await this._get(id));
    await this.delete(id);
    return {};
  }

  /**
   * Potvrzení / storno. Vrací i původní stav, aby volající poznal, jestli se něco změnilo
   * a má tedy smysl posílat hostovi e-mail.
   */
  async setState(id, state) {
    const current = await this._get(id);
    assertEditable(current);
    if (current.state === state) return { item: toAdminDto(current), changed: false };

    const item = await this.update({ id, state });
    return { item: toAdminDto(item), changed: true };
  }

  /** Kolizní kontrola, kterou smí vlastník vědomě přebít (`force`). */
  async _assertFree(dateFrom, dateTo, { force, exceptId } = {}) {
    if (force) return;
    const colliding = (await dao.findOverlapping(dateFrom, dateTo)).filter((item) => item.id !== exceptId);
    if (colliding.length === 0) return;

    throw new AppError.Failed("Termín se kryje s jiným záznamem.", {
      status: 409,
      code: `${CODE}/dateOccupied`,
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
          dateFrom,
          dateTo,
          nights: Math.max(0, (new Date(dateTo) - new Date(dateFrom)) / 86400000),
          guestCount: null,
          totalPrice: null,
          state: "confirmed",
          source: icalFeedCode,
          contact: null,
          note: null,
          icalUid: uid,
          icalFeedCode,
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

export default new ReservationCrud();
