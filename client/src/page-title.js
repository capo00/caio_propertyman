import { useEffect, useLsi, useRoute } from "uu5g05";
import importLsi from "./lsi/import-lsi.js";

// Titulek stránky podle routy. Dokud byl web jednostránkový, stačil jeden `<title>`
// v index.html; se stromem rout je to jediné, co v panelu prohlížeče, v historii a ve
// výsledcích vyhledávání rozliší „Ceník" od „Ubytování".
//
// Cesty do LSI, ne vlastní texty: název stránky je tentýž řetězec, jaký nese položka menu
// (nebo název prostoru), takže se nemůžou rozejít.
//
// Detail prostoru (`ubytovani/<code>`) se do tabulky nevypisuje -- kód se z routy odvodí,
// ať přidání prostoru není zásah i sem.
const TITLE_PATH_BY_ROUTE = {
  ubytovani: ["header", "nav", "ubytovani"],
  galerie: ["header", "nav", "galerie"],
  cenik: ["header", "nav", "cenik"],
  rezervace: ["header", "nav", "rezervace"],
  recenze: ["header", "nav", "recenze"],
  okoli: ["header", "nav", "okoli"],
  faq: ["sections", "faq", "eyebrow"],
};

const SPACE_ROUTE_PREFIX = "ubytovani/";

/** Cesta do LSI na název stránky, nebo `null` pro home (a cokoli bez vlastního názvu). */
function getTitlePath(uu5Route) {
  if (typeof uu5Route !== "string") return null;
  if (uu5Route.startsWith(SPACE_ROUTE_PREFIX)) {
    return ["spaces", uu5Route.slice(SPACE_ROUTE_PREFIX.length), "title"];
  }
  return TITLE_PATH_BY_ROUTE[uu5Route] ?? null;
}

/**
 * Nastaví `document.title` podle aktuální routy: „Ceník · Roubený ráj", na home jen název.
 *
 * `useLsi` se musí volat vždycky, i když stránka vlastní název nemá -- podmíněné volání
 * hooků React neumí. Proto fallback na název nemovitosti a rozhodnutí až v efektu.
 * V dep listu je cesta spojená do stringu: pole se při každém renderu vyrábí znovu
 * a jako závislost by efekt spouštělo pořád dokola.
 */
export function usePageTitle() {
  const [route] = useRoute();
  const path = getTitlePath(route?.uu5Route);

  const propertyName = useLsi(importLsi, ["property", "name"]);
  const pageName = useLsi(importLsi, path ?? ["property", "name"]);

  const pathKey = path?.join(".");

  useEffect(() => {
    if (!propertyName) return;
    document.title = pathKey && pageName ? `${pageName} · ${propertyName}` : propertyName;
  }, [pathKey, pageName, propertyName]);
}
