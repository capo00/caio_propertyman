// Stránky webu a jejich adresy v každém jazyce (docs/proposal-seo-lang-urls.md § 6.3).
//
// Jediný zdroj pro router (router.jsx), odkazy (`pagePath` v tools/page-language.js), SEO
// (seo.js, sitemap, hreflang, canonical), `public/spa-routes.json` pro server (404 a 301)
// i mapu cest pro přesměrovací skript v index.html (vite.config.js, `languagePaths`).
// Seznam jazyků tu není: je jen v package.json (`caio.languages`), tady jsou slugy.
//
// Jen data a čisté funkce bez uu5, ať to jde načíst v node (vite.config.js, testy).
//
// Interní identita stránky je `code` (anglicky). Slug je to, co je v adrese: v jazyce
// stránky, bez diakritiky, výchozí jazyk (cs) bez prefixu (`/cenik`), ostatní s ním
// (`/de/preise`). Slugy schválil majitel 2026-10-16. Prostory mají slug u sebe
// (components/accommodation/content.js) a jejich adresa je `<accommodation>/<slug prostoru>`.
//
// Admin tu není: je to vlastní UVE (`src/admin/`) bez jazyka v adrese.
import spaces from "../components/accommodation/content.js";
// The page slugs live in shared/pages.js: the server needs them too (links in emails) and it
// cannot import from client/, which is not uploaded to App Engine.
import { PAGES } from "../../../shared/pages.js";

export { PAGES };

// Staré slugy stejné stránky -> nová (ve všech jazycích). Server na ně odpovídá 301, klient
// je přesměruje sám. `home` je tatáž stránka jako kořen jazyka.
export const LEGACY = { home: "home" };

/** Stránka detailu prostoru: `{ code: "accommodation", space: "<kód prostoru>" }`. */
const SPACE_PAGE = "accommodation";

/** Všechny veřejné stránky: `{ code }` a `{ code: "accommodation", space }` pro každý prostor. */
export function listPages() {
  return [
    ...Object.keys(PAGES).map((code) => ({ code })),
    ...spaces.map((space) => ({ code: SPACE_PAGE, space: space.code })),
  ];
}

/**
 * uu5 routa stránky v jazyce (relativní k app base dokumentu, tedy bez prefixu jazyka):
 * `pageRoute("de", { code: "pricing" })` = "preise", home = "".
 * Neznámá stránka nebo prostor vrátí `null`.
 */
export function pageRoute(language, { code, space } = {}) {
  const slug = PAGES[code]?.[language];
  if (slug == null) return null;
  if (space == null) return slug;
  const spaceSlug = spaces.find((item) => item.code === space)?.slug?.[language];
  return spaceSlug ? `${slug}/${spaceSlug}` : null;
}

/** Opak `pageRoute`: `{ code, space? }` uu5 routy v jazyce, nebo `null`. */
export function parseRoute(language, uu5Route) {
  if (typeof uu5Route !== "string") return null;
  const route = uu5Route.replace(/^\/+|\/+$/g, "");
  for (const page of listPages()) {
    if (pageRoute(language, page) === route) return page;
  }
  return null;
}

/**
 * Adresa stránky bez domény: výchozí jazyk bez prefixu (`/cenik`, home `/`), ostatní
 * s ním (`/de/preise`, home `/de/`). Kořen jazyka má lomítko, stejně jako u caio-serveru.
 */
export function localizedPath(language, page, defaultLanguage) {
  const route = pageRoute(language, page);
  if (route == null) return null;
  if (language === defaultLanguage) return `/${route}`;
  return `/${language}/${route}`;
}

/**
 * Přesměrování uvnitř jazyka: slug téže stránky z jiného jazyka (`/de/cenik` -> `preise`)
 * a staré slugy (`home`). Klíč, který je v tomhle jazyce vlastní stránkou, se nepřesměrovává.
 */
export function redirectsFor(language, languages) {
  const own = new Set(listPages().map((page) => pageRoute(language, page)));
  const result = {};
  for (const page of listPages()) {
    const target = pageRoute(language, page);
    for (const other of languages) {
      const foreign = pageRoute(other, page);
      if (foreign == null || own.has(foreign) || foreign in result) continue;
      result[foreign] = target;
    }
  }
  for (const [legacy] of Object.entries(LEGACY)) {
    if (!own.has(legacy)) result[legacy] = pageRoute(language, { code: "home" });
  }
  return result;
}

/**
 * Mapa cest pro přesměrovací skript v index.html (caio-ui `buildLanguageRedirectScript`):
 * `{ en: { "": "", cenik: "prices", "ubytovani/stodola": "accommodation/barn" }, de: … }`,
 * klíče jsou routy výchozího jazyka.
 */
export function languagePaths(languages) {
  const [defaultLanguage, ...others] = languages;
  return Object.fromEntries(
    others.map((language) => [
      language,
      Object.fromEntries(listPages().map((page) => [pageRoute(defaultLanguage, page), pageRoute(language, page)])),
    ]),
  );
}

/**
 * Adresa téže stránky v jiném jazyce (přepínač jazyka): `pathname` aktuální stránky,
 * `search` se přenáší beze změny. Stránka, kterou tabulka nezná (404), vede na kořen jazyka.
 */
export function translatePath({ pathname, search = "" }, { from, to, languages }) {
  const defaultLanguage = languages[0];
  const prefix = from === defaultLanguage && !pathname.startsWith(`/${from}/`) ? "/" : `/${from}/`;
  const route = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.replace(/^\/+/, "");
  const page = parseRoute(from, route);
  const path = page ? localizedPath(to, page, defaultLanguage) : localizedPath(to, { code: "home" }, defaultLanguage);
  return page ? path + search : path;
}
