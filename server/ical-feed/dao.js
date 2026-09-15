import { Dao } from "caio-server";

// Konfigurace externích kalendářů. Ve v1 byly feedy v `.env` (ICAL_FEED_BOOKING / _ECHALUPY),
// od v2 jsou tady a spravují se v adminu (design-v2.md § 8).
//
// `code` je spojovací klíč na `reservation.icalFeedCode` a je NEMĚNNÝ: kdyby se změnil,
// osiřely by všechny dosud naimportované záznamy toho feedu -- import by je už nenašel,
// takže by je neaktualizoval ani nesmazal, a v kalendáři by zůstaly navěky obsazené termíny.
class IcalFeedDao extends Dao {
  constructor() {
    super("ical_feed");
  }

  createIndexes() {
    return Promise.all([
      // Unikátní bez podmínky: každý feed má právě jeden kód a na něm stojí celý import.
      super.createIndex({ code: 1 }, { unique: true }),
      super.createIndex({ state: 1 }),
    ]);
  }

  findByCode(code) {
    return this.findOne({ code });
  }

  /** Feedy, které se mají synchronizovat. Neaktivní se přeskočí, ale záznamy jim zůstanou. */
  findActive() {
    return this.find({ state: "active" });
  }

  findPageAll(pageInfo) {
    return this.findPage({}, pageInfo, { name: 1 });
  }
}

export default new IcalFeedDao();
