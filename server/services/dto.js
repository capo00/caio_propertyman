import { Error as AppError } from "caio-server";

// Čtení a validace dtoIn. Sdílené mezi use casy, které přibyly s adminem (v2).
//
// PROČ TO NENÍ V POLI `validator`: `validator` v caio-serveru má rozbitou chybovou cestu --
// když hodí výjimku, `getDtoIn` pošle 400, ale NEZASTAVÍ se a `fn` se stejně zavolá
// s nevalidním dtoIn. U zapisujícího use casu to znamená zápis do DB a pak pád na
// ERR_HTTP_HEADERS_SENT. Validace proto patří do `fn` (stejně jako v v1, viz reservation/api.js).
//
// DRUHÁ VĚC: dtoIn z GETu přijde celý jako řetězce. Query parametry se nepřetypovávají,
// jen hodnoty začínající `{` nebo `[` projdou JSON.parse (caio-server-app/services/command.js) --
// takže `pageInfo` dorazí jako objekt, ale čísla a data jako stringy.

/**
 * `paramMap`, který uu5g05-forms přiřadí k polím formuláře:
 * `{ <kind>: { "$.<jméno inputu>": { <kód>: <zpráva> } } }`. `keyMap` je `{ <jméno inputu>: true }`.
 *
 * POZOR: klíče musí být jména inputů ve formuláři, který use case volá. Pole, které formulář
 * nemá, si uu5g05-forms založí jako neviditelnou položku s chybou a formulář pak už validací
 * neprojde, dokud se nezavře. Proto třeba `readId` paramMap nemá a veřejný formulář si
 * `dateFrom`/`dateTo` přejmenovává na `stay` (`renameFormFields`).
 */
export function formParamMap(keyMap, message, kind = "invalidValueKeyMap") {
  const code = kind === "missingKeyMap" ? "missing" : "invalid";
  const keyList = Object.keys(keyMap ?? {}).filter((key) => keyMap[key]);
  if (!keyList.length) return undefined;
  return { [kind]: Object.fromEntries(keyList.map((key) => [`$.${key}`, { [code]: message }])) };
}

/**
 * Přejmenuje pole v paramMap chyby (`{ dateFrom: "stay" }`) a chybu hodí dál. Pro formulář,
 * který jedno pole serveru skládá z jiného inputu.
 */
export function renameFormFields(error, renameMap) {
  const paramMap = error?.paramMap;
  if (!paramMap) return error;
  for (const kind of Object.keys(paramMap)) {
    const renamed = {};
    for (const [key, errors] of Object.entries(paramMap[kind] ?? {})) {
      const name = key.startsWith("$.") ? key.slice(2) : key;
      const target = `$.${renameMap[name] ?? name}`;
      renamed[target] = { ...renamed[target], ...errors };
    }
    paramMap[kind] = renamed;
  }
  return error;
}

/** Chyba, které rozumí uu5g05-forms: klíče v paramMap se namapují na konkrétní inputy. */
export function invalidDtoIn(codePrefix, message, keyMap, kind = "invalidValueKeyMap") {
  return new AppError.Failed(message, {
    status: 400,
    code: `${codePrefix}/invalidDtoIn`,
    paramMap: formParamMap(keyMap, message, kind),
  });
}

/** Sběrač chyb: posbírá všechny vadné položky najednou, ať formulář nečervená po jedné. */
export function createValidator(codePrefix) {
  const badMap = {};
  const missingMap = {};

  return {
    /** Povinný neprázdný řetězec. */
    string(value, key, { required = false, maxLength = 1000 } = {}) {
      const text = value == null ? "" : String(value).trim();
      if (!text) {
        if (required) missingMap[key] = true;
        return null;
      }
      if (text.length > maxLength) badMap[key] = true;
      return text;
    },

    /** Celé číslo v rozsahu. `undefined` projde, když není `required`. */
    int(value, key, { required = false, min = -Infinity, max = Infinity } = {}) {
      if (value == null || value === "") {
        if (required) missingMap[key] = true;
        return null;
      }
      const number = Number(value);
      if (!Number.isInteger(number) || number < min || number > max) {
        badMap[key] = true;
        return null;
      }
      return number;
    },

    /** Hodnota z výčtu. */
    enumeration(value, key, allowed, { required = false } = {}) {
      if (value == null || value === "") {
        if (required) missingMap[key] = true;
        return null;
      }
      const text = String(value);
      if (!allowed.includes(text)) {
        badMap[key] = true;
        return null;
      }
      return text;
    },

    /** Vlastní podmínka, když na ni není typový čtenář. */
    check(condition, key) {
      if (!condition) badMap[key] = true;
    },

    /** Hodí posbírané chyby, nebo neudělá nic. Volá se před prvním zápisem do DB. */
    assert(message = "Zkontrolujte prosím vyplněné údaje.") {
      if (Object.keys(missingMap).length) {
        throw invalidDtoIn(codePrefix, "Vyplňte prosím povinné údaje.", missingMap, "missingKeyMap");
      }
      if (Object.keys(badMap).length) throw invalidDtoIn(codePrefix, message, badMap);
    },
  };
}

const MAX_PAGE_SIZE = 1000;

/** `pageInfo` pro stránkované výpisy. Přes query dorazí jako objekt (JSON.parse výš). */
export function readPageInfo(dtoIn) {
  const { pageIndex, pageSize } = dtoIn?.pageInfo ?? {};
  return {
    // Záporný index by Mongo odmítlo (skip < 0) a vrátilo by to 500.
    pageIndex: Number.isInteger(Number(pageIndex)) && Number(pageIndex) >= 0 ? Number(pageIndex) : 0,
    // Celé číslo 1–1000: 0 < pageSize < 1 by Mongo vzalo jako limit(0) = bez limitu.
    pageSize: Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize)))) : 100,
  };
}

/** Povinné id záznamu. */
export function readId(dtoIn, codePrefix) {
  const id = String(dtoIn?.id ?? "").trim();
  // Bez paramMap: `id` není pole žádného formuláře (viz formParamMap).
  if (!id) throw invalidDtoIn(codePrefix, "Chybí id záznamu.");
  return id;
}
