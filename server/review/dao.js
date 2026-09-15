import { Dao } from "caio-server";

// Recenze hostů. Ve v2 je zakládá VÝHRADNĚ správce (opisem z portálu nebo z mailu), protože
// přihlašování hostů přijde až ve v3 -- proto tu na rozdíl od design.md § 6 zatím není
// `guestId` ani `reservationId`. Nemá je co plnit (design-v2.md § 7).
class ReviewDao extends Dao {
  constructor() {
    super("review");
  }

  // Vrací se (ne awaituje) -- safety net v konstruktoru Dao z toho chytí případné odmítnutí.
  createIndexes() {
    return Promise.all([
      // Veřejný výpis se ptá přesně takhle: schválené, seřazené podle pořadí.
      super.createIndex({ state: 1, order: 1 }),
    ]);
  }

  /**
   * Stránkovaný výpis s filtrem.
   *
   * `findPage` (ne `find`) proto, že vrací i `pageInfo.total` -- bez něj `useDataList`
   * v `UiElements.Crud` neví, jestli má načíst další stránku, a tabulka skončí u první.
   */
  findPageBy(filter, pageInfo) {
    return this.findPage(filter, pageInfo, { order: 1, "sys.cts": -1 });
  }
}

export default new ReviewDao();
