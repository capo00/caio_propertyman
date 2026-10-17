// Jazyk stránky a adresy v něm (docs/proposal-seo-lang-urls.md § 6).
//
// Jazyky webu jsou jen v package.json (`caio.languages`), do bundlu je dosazuje caio-devkit
// a čte je caio-ui (`LANGUAGE_LIST`). Jazyk stránky určuje adresa, tedy dokument, který
// server poslal (`/` = cs v index.html, `/de/…` = index.de.html) -- ne prohlížeč ani
// uložená volba. Je pevný po celé načtení: přepnutí jazyka je přechod na jinou adresu
// (caio-ui `SpaProvider`, `getLanguageUrl` níž).
//
// Hlubší import `language.js` místo `UiApp.Language`: je bez uu5 a nestahuje celý caio-ui-app.
import { LANGUAGE_LIST, DEFAULT_LANGUAGE, getDocumentLanguage } from "caio-ui/src/caio-ui-app/language.js";
import { pageRoute, parseRoute, translatePath } from "../config/routes.js";

export const LANGUAGES = LANGUAGE_LIST;

/** Jazyk téhle stránky (dokumentu). */
export const PAGE_LANGUAGE = getDocumentLanguage() ?? DEFAULT_LANGUAGE ?? "cs";

/**
 * Úvodní stránka tohohle dokumentu jako absolutní adresa: app base (`/`, `/de/`, `/cs/`).
 * Pro odkazy, které prázdnou routu `""` neunesou (logo v liště bere prázdný `href` jako
 * „bez odkazu“). Leží uvnitř app base, takže z něj zůstává navigace SPA, ne reload.
 */
export const HOME_HREF =
  (typeof document !== "undefined" && document.querySelector("base")?.getAttribute("data-uu-app-base")) || "/";

/**
 * uu5 routa stránky v jazyce stránky -- pro `href` a `setRoute` (relativní, uu5 ji složí
 * s app base dokumentu, takže na /de/… vede na /de/…): `pagePath("pricing")` = "preise".
 */
export function pagePath(code, { space } = {}) {
  return pageRoute(PAGE_LANGUAGE, { code, space });
}

/** `{ code, space? }` uu5 routy aktuální stránky, nebo `null` (404). */
export function currentPage(uu5Route) {
  return parseRoute(PAGE_LANGUAGE, uu5Route);
}

/**
 * Adresa téže stránky v jiném jazyce, pro přepínač jazyka (caio-ui `SpaProvider`
 * `getLanguageUrl`). Volá se v okamžiku přepnutí, takže čte aktuální adresu z `location`.
 */
export function getLanguageUrl(language) {
  return translatePath(
    { pathname: window.location.pathname, search: window.location.search },
    { from: PAGE_LANGUAGE, to: language, languages: LANGUAGES },
  );
}
