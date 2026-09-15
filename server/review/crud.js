import { Crud } from "caio-server";
import config from "../config.js";
import dao from "./dao.js";

// Jediné místo, kde se rozhoduje, co je veřejné: `approved`. Kdyby se filtr skládal až
// v api.js z dtoIn, stačilo by poslat `state=pending` a neschválená recenze by byla venku.
const PUBLIC_FILTER = { state: "approved" };

class ReviewCrud extends Crud {
  constructor() {
    super("review", dao);
  }

  /** Co vidí veřejný web. Filtr je konstanta, ne parametr -- viz komentář výš. */
  listPublic(pageInfo) {
    return dao.findPageBy(PUBLIC_FILTER, pageInfo);
  }

  /** Co vidí správce: všechno, volitelně zúžené na jeden stav. */
  listForAdmin({ state, pageInfo } = {}) {
    return dao.findPageBy(state ? { state } : {}, pageInfo);
  }

  /** `propertyId` drží server, ne formulář -- appka je zatím jednonemovitostní. */
  create(data) {
    return super.create({ propertyId: config.propertyId, ...data });
  }
}

export default new ReviewCrud();
