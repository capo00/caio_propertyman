import crud from "./crud.js";
import { createValidator, readId, readPageInfo } from "../services/dto.js";
import { syncAll, syncOne } from "../services/ical-import.js";

const CODE = "caio-propertyman/icalFeed";
const ADMIN = ["authorities"];
const STATE_LIST = ["active", "inactive"];

// Kód jde do dokumentů rezervací (`icalFeedCode`), do logů i do URL parametru syncu,
// takže žádné mezery ani diakritika.
const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,19}$/;

function readFeed(dtoIn, { partial = false } = {}) {
  const v = createValidator(CODE);
  const data = {};
  const has = (key) => Object.hasOwn(dtoIn ?? {}, key);
  const required = (key) => !partial || has(key);

  if (required("name")) data.name = v.string(dtoIn?.name, "name", { required: true, maxLength: 100 });
  if (required("url")) {
    data.url = v.string(dtoIn?.url, "url", { required: true, maxLength: 2000 });
    if (data.url) v.check(/^https?:\/\//i.test(data.url), "url");
  }
  if (required("state")) data.state = v.enumeration(dtoIn?.state, "state", STATE_LIST, { required: true });

  // `code` se zadává JEN při zakládání. Změnou by osiřely všechny dosud naimportované
  // záznamy toho feedu (dao.js) -- proto se v update prostě ignoruje.
  if (!partial) {
    data.code = v.string(dtoIn?.code, "code", { required: true, maxLength: 20 });
    if (data.code) v.check(CODE_PATTERN.test(data.code), "code");
  }

  v.assert();
  return data;
}

export default {
  "icalFeed/list": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.listAll(readPageInfo(dtoIn)),
  },

  "icalFeed/create": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.create(readFeed(dtoIn)),
  },

  "icalFeed/update": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      const id = readId(dtoIn, CODE);
      return crud.update({ id, ...readFeed(dtoIn, { partial: true }) });
    },
  },

  // Maže i obsazenost, kterou feed naimportoval -- jinak by zůstaly trvale obsazené termíny
  // bez zdroje (crud.js).
  "icalFeed/delete": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.deleteWithReservations(readId(dtoIn, CODE)),
  },

  /**
   * Ruční spuštění synchronizace z adminu.
   *
   * Cron má na totéž vlastní use case `calendar/sync` chráněný sdíleným secretem
   * (design-v2.md § 8) -- dvě různé bezpečnostní úvahy nepatří do jedné `auth` funkce.
   * Volitelný `code` pustí jen jeden feed; to volá tlačítko u konkrétního řádku.
   */
  "icalFeed/sync": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn }) => {
      const code = dtoIn?.code ? String(dtoIn.code) : null;
      return code ? syncOne(code) : syncAll();
    },
  },
};
