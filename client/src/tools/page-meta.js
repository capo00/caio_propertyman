import { useLsi, useRoute } from "uu5g05";
import UiApp from "caio-ui/src/caio-ui-app";
import Config from "../config/config.js";
import importLsi from "../lsi/import-lsi.js";
import { OG_LOCALE, getBreadcrumb, getSeoEntry } from "../config/seo.js";
import { localizedPath } from "../config/routes.js";
import { LANGUAGES, PAGE_LANGUAGE, currentPage } from "./page-language.js";

// Page meta data by route: title, description, canonical, `og:*`, `robots`, language versions
// and breadcrumb navigation (`BreadcrumbList`, docs/proposal-seo-json-ld.md). What each route
// gets is defined by `config/seo.js`; writing it into `<head>` is caio-ui's `UiApp.usePageMeta`.
//
// Caution: the tags are written by JS, so only a crawler that runs JS sees them (Google yes,
// Facebook, WhatsApp and Seznam no). Those see only the static tags from index.html -- see
// proposal-seo-meta § 6.

/**
 * `<head>` by the current route: title „Ceník · Roubený ráj" (home just the name), description,
 * canonical and `og:*`. Unknown routes (404) get `noindex`. Admin is a separate UVE with
 * `noindex` from caio-devkit, it does not belong here.
 *
 * Language versions (docs/proposal-seo-lang-urls.md § 6.6): canonical points to the page in its
 * language (`/de/preise`; `/cs/cenik` to `/cenik`, in Czech the canonical address has no prefix),
 * `hreflang` to all languages and `x-default` to the default (`roubenyraj.cz` is in Czech),
 * `og:locale` by the page language.
 *
 * Canonical, `og:url`, `og:image` and the alternates need an absolute address (`APP_URL`);
 * until it is set, caio-ui leaves them out -- better none than a wrong one.
 *
 * `useLsi` must always be called, even when the page has no name or description of its own --
 * React cannot do conditional hook calls. Hence the fallback to the property name.
 */
export function usePageMeta() {
  const [route] = useRoute();
  const uu5Route = route?.uu5Route;
  const page = currentPage(uu5Route);
  const entry = getSeoEntry(page);
  const noindex = typeof uu5Route === "string" && !entry;

  const propertyName = useLsi(importLsi, ["property", "name"]);
  const homeDescription = useLsi(importLsi, ["seo", "home"]);
  const pageName = useLsi(importLsi, entry?.title ?? ["property", "name"]);
  const pageDescription = useLsi(importLsi, entry?.description ?? ["seo", "home"]);
  const notFoundName = useLsi(importLsi, ["notFound", "heading"]);
  // Breadcrumb navigation (`BreadcrumbList`): home › [hub page] › page. The home and page
  // names we already have; the only other one is the hub page for a space detail.
  const crumbs = getBreadcrumb(page);
  const parentCrumb = crumbs?.length === 3 ? crumbs[1] : null;
  const parentName = useLsi(importLsi, parentCrumb?.title ?? ["property", "name"]);

  const path = entry ? localizedPath(PAGE_LANGUAGE, page, LANGUAGES[0]) : null;
  const title = noindex ? notFoundName : entry?.title ? pageName : undefined;
  const appUrl = Config.appUrl;
  const crumbNames = crumbs && [propertyName, ...(parentCrumb ? [parentName] : []), pageName];

  UiApp.usePageMeta(
    propertyName
      ? {
          siteName: propertyName,
          title: title || undefined,
          // The „nenalezeno“ page has no description and does not belong in results (noindex).
          description: entry ? pageDescription : homeDescription,
          noindex,
          path,
          image: "/assets/meta/og-image.jpg",
          locale: OG_LOCALE[PAGE_LANGUAGE] ?? null,
          localeAlternates: LANGUAGES.filter((language) => language !== PAGE_LANGUAGE)
            .map((language) => OG_LOCALE[language])
            .filter(Boolean),
          // Language versions: only for a page that is in the table.
          alternates: path
            ? [
                ...LANGUAGES.map((language) => ({ hreflang: language, path: localizedPath(language, page, LANGUAGES[0]) })),
                { hreflang: "x-default", path: localizedPath(LANGUAGES[0], page, LANGUAGES[0]) },
              ]
            : [],
          // Items have an absolute `item`, so without the site address nothing is inserted.
          jsonLd: {
            "ld-breadcrumb":
              appUrl && crumbs && crumbNames.every(Boolean)
                ? {
                    "@context": "https://schema.org",
                    "@type": "BreadcrumbList",
                    itemListElement: crumbs.map((crumb, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      name: crumbNames[index],
                      item: appUrl + localizedPath(PAGE_LANGUAGE, crumb.page, LANGUAGES[0]),
                    })),
                  }
                : null,
          },
        }
      : {},
  );
}
