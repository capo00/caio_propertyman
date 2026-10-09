import { Dao } from "caio-server";
import { ObjectId } from "mongodb";
import { RELEASED_STATE_LIST } from "./states.js";

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
      // VS je klíč, podle kterého vlastník páruje platby z výpisu -- dva stejné by znamenaly
      // platbu, kterou nejde přiřadit. Jen tam, kde je vyplněný (žádost ho ještě nemá).
      super.createIndex(
        { "payment.variableSymbol": 1 },
        { unique: true, partialFilterExpression: { "payment.variableSymbol": { $type: "string" } } },
      ),
    ]);
  }

  /**
   * Záznamy, které kolidují se zadaným intervalem.
   * Překryv = existující.dateFrom < nový.dateTo && existující.dateTo > nový.dateFrom
   * (ostré nerovnosti, protože dateTo je exkluzivní -- navazující pobyty nekolidují).
   *
   * Blokuje všechno kromě stavů, které termín uvolňují ($nin, ne $in na blokující): neznámý
   * stav radši zablokuje, než aby pustil dvojí rezervaci.
   */
  findOverlapping(dateFrom, dateTo) {
    return this.find({
      state: { $nin: RELEASED_STATE_LIST },
      dateFrom: { $lt: dateTo },
      dateTo: { $gt: dateFrom },
    });
  }

  /** Co se exportuje do našeho iCal feedu -- jen to, co vzniklo u nás a blokuje termín. */
  findForExport() {
    return this.find({ icalFeedCode: null, state: { $nin: RELEASED_STATE_LIST } });
  }

  /** Už použité VS s daným prefixem (YYMMDD příjezdu) -- pro výběr dalšího pořadí. */
  async findVariableSymbolsWithPrefix(prefix) {
    const list = await this.find({ "payment.variableSymbol": { $regex: `^${prefix}` } }, {}, {}, { "payment.variableSymbol": 1 });
    return list.map((item) => item.payment?.variableSymbol).filter(Boolean);
  }

  /**
   * Optimistický zámek: zapíše, jen když se záznam od přečtení (`current`) nezměnil -- stejný
   * stav i stejné `sys.mts`. Dvojklik, dva správci naráz nebo úprava souběžně s přechodem tak
   * nepřepíšou jeden druhého (dvakrát e-mail, dvakrát VS, ztracená cena) -- druhý dostane false.
   *
   * `Dao.update` podmínku nezná (přepisuje podle id), proto tahle metoda jde na kolekci napřímo.
   * Zápis události do historie (`pushEvent`) `sys.mts` nemění, takže zámek neruší.
   */
  async updateIfCurrent(id, current, set) {
    const result = await this.coll.updateOne(
      { _id: new ObjectId(id), state: current.state, "sys.mts": current.sys?.mts },
      { $set: { ...set, "sys.mts": new Date().toISOString() } },
    );
    return result.matchedCount === 1;
  }

  /**
   * Přidá událost do historie atomicky ($push), bez čtení a přepisu celého pole -- souběžná
   * úprava jiného pole ji tak nepřepíše.
   */
  async pushEvent(id, event) {
    await this.coll.updateOne({ _id: new ObjectId(id) }, { $push: { eventList: event } });
  }

  /** Doplní e-maily k už zapsané události (podle jejího času `at`). */
  async setEventEmails(id, at, emailList) {
    await this.coll.updateOne({ _id: new ObjectId(id), "eventList.at": at }, { $set: { "eventList.$.emailList": emailList } });
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

  /**
   * Stránkovaný a filtrovaný výpis pro admin tabulku (v2).
   *
   * `findPage` (ne `find`) proto, že vrací i `pageInfo.total` -- bez něj `useDataList`
   * v `UiElements.Crud` neví, že existuje další stránka. Řadí se od nejbližšího termínu
   * dozadu, protože co vlastníka zajímá, je vždycky nahoře.
   */
  findPageBy(filter, pageInfo, sort = { dateFrom: -1 }) {
    // Historie a e-maily jsou jen v detailu -- ve výpisu by s každým řádkem jely desítky kB.
    return this.findPage(filter, pageInfo, { ...sort, _id: 1 }, { eventList: 0, clientIp: 0 });
  }
}

export default new ReservationDao();
