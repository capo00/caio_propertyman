import { Dao } from "caio-server";

// Jedna kolekce pro VŠECHNU obsazenost -- rezervace z webu i obsazenost naimportovanou
// z portálů. Liší se hodnotami polí, ne kolekcí (design-v1.md § 4). Díky tomu je kalendář
// obsazenosti i kolizní kontrola jeden dotaz nad jednou kolekcí, takže obsazenost z Bookingu
// blokuje web a naopak.
//
// Rozhodující pole je `icalFeedCode`:
//   null            -> vzniklo u nás; patří do exportovaného feedu, import na to nesmí sáhnout
//   "booking" | ...  -> vlastní import; do exportu to nesmí (jinak by si portály rezervace
//                       navzájem množily)
//
// Datumy jsou ISO řetězce ("2026-09-04"), ne Date. Lexikografické porovnání ISO dat je
// totožné s chronologickým, takže $lt/$gt nad stringy funguje správně a odpadá časová zóna.
// `dateTo` je EXKLUZIVNÍ (den odjezdu) -- den odjezdu jedné rezervace je zároveň možný den
// příjezdu následující.
class ReservationDao extends Dao {
  constructor() {
    super("reservation");
  }

  // Vrací se (ne awaituje), aby případné odmítnutí chytil safety net v konstruktoru Dao.
  // Pozor: createIndexes() se volá fire-and-forget, takže se NIKDY nesmí spoléhat na to,
  // že index existuje, když přijde první request -- kolizní kontrola je proto i v kódu.
  createIndexes() {
    return Promise.all([
      super.createIndex({ dateFrom: 1, dateTo: 1 }),
      super.createIndex({ state: 1 }),
      // Unikátní jen tam, kde icalFeedCode NENÍ null. Bez partialFilterExpression by
      // unikátnost sahala i na vlastní rezervace, které mají icalFeedCode: null všechny,
      // a druhá rezervace z webu by neprošla.
      super.createIndex(
        { icalFeedCode: 1, icalUid: 1 },
        { unique: true, partialFilterExpression: { icalFeedCode: { $type: "string" } } },
      ),
    ]);
  }

  /**
   * Záznamy, které kolidují se zadaným intervalem.
   * Překryv = existující.dateFrom < nový.dateTo && existující.dateTo > nový.dateFrom
   * (ostré nerovnosti, protože dateTo je exkluzivní -- navazující pobyty nekolidují).
   */
  findOverlapping(dateFrom, dateTo) {
    return this.find({
      state: { $ne: "cancelled" },
      dateFrom: { $lt: dateTo },
      dateTo: { $gt: dateFrom },
    });
  }

  /** Co se exportuje do našeho iCal feedu -- jen to, co vzniklo u nás. */
  findForExport() {
    return this.find({ icalFeedCode: null, state: { $ne: "cancelled" } });
  }

  /**
   * Všechny záznamy jednoho importního feedu. Import MUSÍ filtrovat na icalFeedCode,
   * jinak by mazací krok sáhl na vlastní rezervace nebo na záznamy druhého portálu.
   */
  findByFeed(icalFeedCode) {
    return this.find({ icalFeedCode });
  }

  /** Kolik rezervací z webu přišlo z jedné IP od zadaného času -- rate limit (§ 4.4). */
  countByIpSince(ip, sinceIso) {
    return this.find({ source: "web", clientIp: ip, "sys.cts": { $gte: sinceIso } });
  }
}

export default new ReservationDao();
