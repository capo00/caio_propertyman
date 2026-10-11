import { Dao } from "caio-server";

// Vystavené faktury (docs/proposal-invoice-pdf.md § 2). Jedna položka = jedna faktura se
// snímkem údajů a hotovým PDF (`pdf`, Binary). Faktura se po vystavení nemění, jen se dá
// označit jako stornovaná -- nemaže se, ať číselná řada nemá díry.
class InvoiceDao extends Dao {
  constructor() {
    super("invoice");
  }

  createIndexes() {
    return Promise.all([
      // Číslo je jediné, co brání dvěma fakturám se stejným číslem při souběhu (viz crud.js).
      super.createIndex({ number: 1 }, { unique: true }),
      super.createIndex({ reservationId: 1 }),
    ]);
  }

  /** Nejvyšší použité číslo v roce (i stornované), nebo null. Čísla mají pevnou šířku, řadí se jako text. */
  async findLastNumber(year) {
    const last = await this.findOne({ number: { $regex: `^${year}-` } }, { number: 1 }, { number: -1 });
    return last?.number ?? null;
  }

  /** Faktury rezervace bez PDF, nejnovější nahoře. */
  listByReservation(reservationId) {
    return this.find({ reservationId }, {}, { number: -1 }, { pdf: 0 });
  }

  /** Jen označí jako stornovanou. Vrací false, když faktura neexistuje nebo už stornovaná je. */
  async markCancelled(id, by) {
    const item = await this.get(id);
    if (!item || item.cancelled) return false;
    await this.update({ id, cancelled: true, cancelledAt: new Date().toISOString(), cancelledBy: by });
    return true;
  }
}

export default new InvoiceDao();
