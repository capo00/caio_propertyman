// Všechny texty webu -- popisky rozhraní i obsah -- leží v cs.json / en.json a čtou se přes
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
// potřeba; přidání jazyka je přidání <lang>.json vedle těchhle dvou a jednoho řádku
// do IMPORT_BY_LANGUAGE níž.
import { Utils } from "uu5g05";
import cs from "./cs.json";

// caio-devkit definuje process.env.NAME z package.json, takže se to drží názvu aplikace samo.
// Musí to být jen unikátní mezi knihovnami načtenými za běhu.
const libraryCode = process.env.NAME;

// Jazyky jsou vyjmenované, ne globované: uu5g05 si píše `import(`./${lang}.json`)`, protože
// ho staví webpack, ale Vite to odmítne s "variable imports cannot import their own
// directory". Tohle je cena za to, že cs.json a en.json leží vedle tohohle souboru --
// přidání jazyka je pak i jeden řádek sem, ne jen nový JSON.
const IMPORT_BY_LANGUAGE = {
  cs: () => import("./cs.json"),
  en: () => import("./en.json"),
};

const importLsi = (lang) =>
  IMPORT_BY_LANGUAGE[lang]?.() ?? Promise.reject(new Error(`No LSI for language "${lang}".`));
importLsi.libraryCode = libraryCode;

// Naplní store synchronně, aby první vykreslení už mělo text. cs, protože v1 je česká
// (design-v1.md § 1) -- naplnit to angličtinou by na okamžik probliklo anglicky.
Utils.Lsi.setDefaultLsi(libraryCode, { cs });

/**
 * Zkratka pro komponenty, které berou `lsi` prop (Heading, Eyebrow, Button, Photo) a pro
 * `<Lsi lsi={...}>`. uu5g05 tenhle tvar `{ import, path }` zná všude, kde umí LSI objekt,
 * takže se díky němu nemusí měnit signatura žádné z těch komponent.
 */
export function lsi(...path) {
  return { import: importLsi, path };
}

export default importLsi;
