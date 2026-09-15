import { Crud, Error as AppError } from "caio-server";
import config from "../config.js";
import dao from "./dao.js";
import reservationDao from "../reservation/dao.js";

const CODE = "caio-propertyman/icalFeed";

class IcalFeedCrud extends Crud {
  constructor() {
    super("icalFeed", dao);
  }

  listAll(pageInfo) {
    return dao.findPageAll(pageInfo);
  }

  /** Feedy pro import. Vrací i neaktivní? Ne -- sync se jich nesmí dotknout. */
  listActive() {
    return dao.findActive();
  }

  getByCode(code) {
    return dao.findByCode(code);
  }

  async create(data) {
    const existing = await dao.findByCode(data.code);
    if (existing) {
      // Unikátní index by to chytil taky, ale jako E11000 z Monga zabalené do CreateFailed --
      // tedy 500 a hláška, ze které uživatel nic nepozná.
      throw new AppError.Failed(`Feed s kódem „${data.code}“ už existuje.`, {
        status: 400,
        code: `${CODE}/codeAlreadyExists`,
        paramMap: { invalidValueKeyMap: { code: true } },
      });
    }
    return super.create({ propertyId: config.propertyId, lastSync: null, ...data });
  }

  /**
   * Smazání feedu smaže i obsazenost, kterou naimportoval.
   *
   * Bez toho by v `reservation` zůstaly záznamy s jeho `icalFeedCode`, které už nikdo nikdy
   * neaktualizuje ani nesmaže -- trvale obsazené termíny, ke kterým neexistuje zdroj.
   * Měkká varianta je `state: "inactive"`: sync feed přeskočí, záznamy zůstanou.
   */
  async deleteWithReservations(id) {
    const feed = await this.get(id);
    const reservationList = await reservationDao.findByFeed(feed.code);

    await reservationDao.deleteByFilter({ icalFeedCode: feed.code });
    await super.delete(id);

    return { deletedReservationCount: reservationList.length };
  }

  /** Kolik záznamů by mazání feedu vzalo s sebou -- pro potvrzovací dialog v adminu. */
  async countReservations(code) {
    return (await reservationDao.findByFeed(code)).length;
  }

  /** Výsledek posledního běhu importu. Zapisuje ho ical-import po každém feedu. */
  async setLastSync(code, lastSync) {
    const feed = await dao.findByCode(code);
    if (!feed) return null;
    return super.update({ id: feed.id, lastSync });
  }
}

export default new IcalFeedCrud();
