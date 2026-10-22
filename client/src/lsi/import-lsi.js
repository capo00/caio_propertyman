// All texts of the website -- UI labels and content alike -- live in <lang>.json and are read
// through this function. It is the same lazy LSI shape uu5g05 and caio-ui use, so it is done
// one way across the stack.
//
//   import importLsi, { lsi } from "../../lsi/import-lsi.js";
//   <Lsi import={importLsi} path={["sections", "about", "heading"]} />
//   <Heading lsi={lsi("sections", "about", "heading")} />   // components with an `lsi` prop
//   const label = useLsi(importLsi, ["form", "submit"]);    // when a string is needed
//
// `path` is the key path into the JSON. The structure mirrors the website: content at the top
// (property, amenities, faq, ...), UI labels under "sections" and so on. Only the language
// currently needed is downloaded; adding a language means adding <lang>.json next to this file
// and one line to IMPORT_BY_LANGUAGE below.
//
// The source is cs.json, the other languages (en, de, pl, sk; 2026-10-14) are its translation
// with the same keys -- lsi.test.js guards that. Website languages are in package.json (`caio.languages`).
import { Utils } from "uu5g05";
import cs from "./cs.json";

// caio-devkit defines process.env.NAME from package.json, so it follows the app name by itself.
// It only has to be unique among the libraries loaded at runtime.
const libraryCode = process.env.NAME + "@" + process.env.VERSION;

// Languages are listed, not globbed: uu5g05 writes `import(`./${lang}.json`)` because it is
// built by webpack, but Vite rejects that with "variable imports cannot import their own
// directory". This is the price for <lang>.json living next to this file --
// adding a language then also means one line here, not just a new JSON.
const IMPORT_BY_LANGUAGE = {
  cs: () => import("./cs.json"),
  en: () => import("./en.json"),
  de: () => import("./de.json"),
  pl: () => import("./pl.json"),
  sk: () => import("./sk.json"),
};

const importLsi = (lang) =>
  IMPORT_BY_LANGUAGE[lang]?.() ?? Promise.reject(new Error(`No LSI for language "${lang}", setup it in /lsi/import-lsi.js!`));
importLsi.libraryCode = libraryCode;

// Fills the store synchronously so the first render already has text. cs, because v1 is Czech
// (design-v1.md § 1) -- filling it with English would flash English for a moment.
Utils.Lsi.setDefaultLsi(libraryCode, { cs });

/**
 * Downloads the LSI of the language the website first renders in and adds it to the default
 * store next to cs. Without it the first render is done in Czech and the language is loaded
 * only afterwards -- the text reflows and PageSpeed (browser in English) counts it as a layout
 * shift (CLS ~0.1 from the hero lead). Called by main.jsx before `createRoot`; does nothing for cs.
 */
export async function preloadLsi(language) {
  if (language === "cs" || !IMPORT_BY_LANGUAGE[language]) return;
  const { default: data } = await IMPORT_BY_LANGUAGE[language]();
  Utils.Lsi.setDefaultLsi(libraryCode, { cs, [language]: data });
}

/**
 * Shorthand for components that take an `lsi` prop (Heading, Eyebrow, Button, Photo) and for
 * `<Lsi lsi={...}>`. uu5g05 knows this `{ import, path }` shape everywhere it accepts an LSI
 * object, so thanks to it the signature of none of those components has to change.
 */
export function lsi(...path) {
  return { import: importLsi, path };
}

/**
 * Texts of server errors by their code (`errors` in <lang>.json), in the shape uu5g05-forms
 * reads for `lsiError`. One stable object, so it can go straight into props and hooks.
 */
export const ERROR_LSI = lsi("errors");

export default importLsi;
