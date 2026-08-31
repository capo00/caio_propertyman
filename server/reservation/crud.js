import { randomUUID } from "crypto";
import { Crud, Error as AppError } from "caio-server";
import config from "../config.js";
import dao from "./dao.js";
import { isFree } from "../services/availability.js";
import { assertPricingApproved, calculatePrice } from "../services/price.js";
import { addDays } from "../services/dates.js";

const CODE = "caio-propertyman/reservation";

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
