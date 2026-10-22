import { Crud, Error as AppError } from "caio-server";
import config from "../config.js";
import dao from "./dao.js";
import reservationDao from "../reservation/dao.js";
import { formParamMap } from "../services/dto.js";

const CODE = "caio-propertyman/icalFeed";

class IcalFeedCrud extends Crud {
  constructor() {
    super("icalFeed", dao);
  }

  listAll(pageInfo) {
    return dao.findPageAll(pageInfo);
  }

  /** Feeds for the import. Does it return inactive ones too? No -- the sync must not touch them. */
  listActive() {
    return dao.findActive();
  }

  getByCode(code) {
    return dao.findByCode(code);
  }

  async create(data) {
    const existing = await dao.findByCode(data.code);
    if (existing) {
      // The unique index would catch it too, but as an E11000 from Mongo wrapped in CreateFailed --
      // i.e. a 500 and a message the user learns nothing from.
      const message = `A feed with the code "${data.code}" already exists.`;
      throw new AppError.Failed(message, {
        status: 400,
        code: `${CODE}/codeAlreadyExists`,
        paramMap: formParamMap({ code: true }, message, "invalidValueKeyMap", `${CODE}/codeAlreadyExists`),
      });
    }
    return super.create({ propertyId: config.propertyId, lastSync: null, ...data });
  }

  /**
   * Deleting a feed also deletes the occupancy it imported.
   *
   * Without it, `reservation` would keep records with its `icalFeedCode` that nobody would ever
   * update or delete again -- permanently occupied dates with no source.
   * The soft variant is `state: "inactive"`: the sync skips the feed, the records stay.
   */
  async deleteWithReservations(id) {
    const feed = await this.get(id);
    const reservationList = await reservationDao.findByFeed(feed.code);

    await reservationDao.deleteByFilter({ icalFeedCode: feed.code });
    await super.delete(id);

    return { deletedReservationCount: reservationList.length };
  }

  /** How many records deleting the feed would take with it -- for the confirmation dialog in the admin. */
  async countReservations(code) {
    return (await reservationDao.findByFeed(code)).length;
  }

  /** Result of the last import run. Written by ical-import after each feed. */
  async setLastSync(code, lastSync) {
    const feed = await dao.findByCode(code);
    if (!feed) return null;
    return super.update({ id: feed.id, lastSync });
  }
}

export default new IcalFeedCrud();
