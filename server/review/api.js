import crud from "./crud.js";
import { createValidator, readId, readPageInfo } from "../services/dto.js";

const CODE = "caio-propertyman/review";
const ADMIN = ["authorities"];
const STATE_LIST = ["pending", "approved", "rejected"];

/** Je ten, kdo se ptá, správce? `resolveIdentity` běží před KAŽDÝM use casem, i veřejným. */
function isAdmin(identity) {
  return !!identity?.profileList?.includes(ADMIN[0]);
}

/**
 * Zvaliduje a poskládá recenzi z dtoIn.
 *
 * `partial` je pro update: modál `UiElements.Crud` posílá jen změněná pole, takže povinnost
 * se u něj kontrolovat nesmí -- jinak by šlo změnit hodnocení jen s vyplněným textem.
 */
function readReview(dtoIn, { partial = false } = {}) {
  const v = createValidator(CODE);
  const data = {};
  const has = (key) => Object.hasOwn(dtoIn ?? {}, key);
  const required = (key) => !partial || has(key);

  if (required("author")) data.author = v.string(dtoIn?.author, "author", { required: true, maxLength: 200 });
  if (required("text")) data.text = v.string(dtoIn?.text, "text", { required: true, maxLength: 4000 });
  if (required("rating")) data.rating = v.int(dtoIn?.rating, "rating", { required: true, min: 1, max: 5 });
  if (required("state")) data.state = v.enumeration(dtoIn?.state, "state", STATE_LIST, { required: true });

  if (has("place")) data.place = v.string(dtoIn?.place, "place", { maxLength: 200 });
  if (has("response")) data.response = v.string(dtoIn?.response, "response", { maxLength: 4000 });
  if (has("date")) data.date = v.string(dtoIn?.date, "date", { maxLength: 10 });
  if (has("order")) data.order = v.int(dtoIn?.order, "order", { min: 0, max: 100000 });

  v.assert();

  // Pořadí se nezadává ručně u každé recenze -- když chybí, jde nová na konec.
  if (!partial && data.order == null) data.order = 1000;
  return data;
}

export default {
  /**
   * Veřejný i administrační výpis v JEDNOM use casu.
   *
   * Jde to proto, že `Authentication.resolveIdentity` běží před každým use casem včetně
   * veřejných, takže `fn` vidí, kdo se ptá. Druhý use case (`review/listAll`) by znamenal
   * dvě místa, kde se rozhoduje, co je veřejné -- a jedno z nich by se jednou zapomnělo.
   */
  "review/list": {
    method: "get",
    fn: async ({ dtoIn, identity }) => {
      const pageInfo = readPageInfo(dtoIn);
      // `state` z dtoIn se čte, AŽ když je jisté, že volá správce. Jinak by si kdokoli
      // vyžádal `state=pending` a dostal neschválené texty.
      if (!isAdmin(identity)) return crud.listPublic(pageInfo);
      return crud.listForAdmin({ state: dtoIn?.state, pageInfo });
    },
  },

  "review/create": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.create(readReview(dtoIn)),
  },

  "review/update": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      const id = readId(dtoIn, CODE);
      return crud.update({ id, ...readReview(dtoIn, { partial: true }) });
    },
  },

  "review/delete": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      await crud.delete(readId(dtoIn, CODE));
      return {};
    },
  },
};
