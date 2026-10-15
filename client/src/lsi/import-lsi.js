// Všechny texty webu -- popisky rozhraní i obsah -- leží v <lang>.json a čtou se přes
// tuhle funkci. Je to stejný tvar lazy LSI, jaký používá uu5g05 a caio-ui, takže se to napříč
// stackem dělá jedním způsobem.
//
//   import importLsi, { lsi } from "../../lsi/import-lsi.js";
//   <Lsi import={importLsi} path={["sections", "about", "heading"]} />
//   <Heading lsi={lsi("sections", "about", "heading")} />   // komponenty s `lsi` propem
//   const label = useLsi(importLsi, ["form", "submit"]);    // když je potřeba string
//
// `path` je cesta klíčů do JSONu. Struktura kopíruje web: obsah nahoře (property, amenities,
// faq, ...), popisky rozhraní pod "sections" a dál. Stáhne se jen jazyk, který je zrovna
// potřeba; přidání jazyka je přidání <lang>.json vedle tohohle souboru a jednoho řádku
// do IMPORT_BY_LANGUAGE níž.
//
// Zdrojem je cs.json, ostatní jazyky (en, de, pl, sk; 2026-10-14) jsou jeho překlad se
// stejnými klíči -- hlídá to lsi.test.js. Seznam jazyků webu je v tools/language.js.
import { Utils } from "uu5g05";
import cs from "./cs.json";

// caio-devkit definuje process.env.NAME z package.json, takže se to drží názvu aplikace samo.
// Musí to být jen unikátní mezi knihovnami načtenými za běhu.
const libraryCode = process.env.NAME + "@" + process.env.VERSION;

// Jazyky jsou vyjmenované, ne globované: uu5g05 si píše `import(`./${lang}.json`)`, protože
// ho staví webpack, ale Vite to odmítne s "variable imports cannot import their own
// directory". Tohle je cena za to, že <lang>.json leží vedle tohohle souboru --
// přidání jazyka je pak i jeden řádek sem, ne jen nový JSON.
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

// Naplní store synchronně, aby první vykreslení už mělo text. cs, protože v1 je česká
// (design-v1.md § 1) -- naplnit to angličtinou by na okamžik probliklo anglicky.
Utils.Lsi.setDefaultLsi(libraryCode, { cs });

/**
 * Stáhne LSI jazyka, ve kterém se web poprvé vykreslí, a přidá ho do výchozího store vedle cs.
 * Bez toho se první render udělá česky a jazyk se dotáhne až potom -- text se přeskládá
 * a PageSpeed (prohlížeč v angličtině) to počítá jako posun layoutu (CLS ~0,1 z perexu
 * v hero). Volá main.jsx před `createRoot`; pro cs nedělá nic.
 */
export async function preloadLsi(language) {
  if (language === "cs" || !IMPORT_BY_LANGUAGE[language]) return;
  const { default: data } = await IMPORT_BY_LANGUAGE[language]();
  Utils.Lsi.setDefaultLsi(libraryCode, { cs, [language]: data });
}

/**
 * Zkratka pro komponenty, které berou `lsi` prop (Heading, Eyebrow, Button, Photo) a pro
 * `<Lsi lsi={...}>`. uu5g05 tenhle tvar `{ import, path }` zná všude, kde umí LSI objekt,
 * takže se díky němu nemusí měnit signatura žádné z těch komponent.
 */
export function lsi(...path) {
  return { import: importLsi, path };
}

export default importLsi;
