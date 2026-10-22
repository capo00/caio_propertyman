import { useEffect, useLsi, useRoute } from "uu5g05";
import Config from "../config/config.js";
import importLsi from "../lsi/import-lsi.js";
import { OG_LOCALE, getBreadcrumb, getSeoEntry } from "../config/seo.js";
import { localizedPath } from "../config/routes.js";
import { LANGUAGES, PAGE_LANGUAGE, currentPage } from "./page-language.js";

// Page meta data by route: title, description, canonical, `og:*`, `robots` and breadcrumb
// navigation (`BreadcrumbList`, docs/proposal-seo-json-ld.md). While the
// site was a single page, one `<title>` in index.html was enough; with a route tree it is the only thing
// that tells „Ceník" from „Ubytování" in the browser tab, in history, in search results and in the share
// preview (docs/proposal-seo-meta.md).
//
// What each route gets is defined by `config/seo.js`. This is only the write into `<head>`.
//
// Caution: the tags are written by JS, so only a crawler that runs JS sees them (Google yes, Facebook,
// WhatsApp and Seznam no). Those see only the static tags from index.html -- see proposal-seo-meta § 6.

/** Sets (or, when `content == null`, removes) a `<meta>` by its `name`/`property` attribute. */
function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * `<link rel="alternate" hreflang>` of the page's language versions (`list` = `[{ hreflang, href }]`,
 * empty = none). The old ones are deleted entirely so they don't linger after navigating to a page without versions (404).
 */
function setAlternates(list) {
  for (const el of document.head.querySelectorAll('link[rel="alternate"][hreflang]')) el.remove();
  for (const { hreflang, href } of list) {
    const el = document.createElement("link");
    el.setAttribute("rel", "alternate");
    el.setAttribute("hreflang", hreflang);
    el.setAttribute("href", href);
    document.head.appendChild(el);
  }
}

/** `og:locale:alternate` -- several tags with the same `property`, hence separate from `setMeta`. */
function setLocaleAlternates(locales) {
  for (const el of document.head.querySelectorAll('meta[property="og:locale:alternate"]')) el.remove();
  for (const locale of locales) {
    const el = document.createElement("meta");
    el.setAttribute("property", "og:locale:alternate");
    el.setAttribute("content", locale);
    document.head.appendChild(el);
  }
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (href == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Sets (or, when `data == null`, removes) `<script type="application/ld+json" id=…>`.
 * The text goes through `textContent`, not the HTML parser, so `</script>` in the data terminates nothing
 * and needs no escaping (unlike the JSON-LD that the build inserts directly into index.html).
 */
function setJsonLd(id, data) {
  let el = document.getElementById(id);
  if (data == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Sets `<head>` by the current route: title „Ceník · Roubený ráj" (home just the name),
 * description, canonical and `og:*`. Unknown routes (404) get `noindex`. Admin is a separate UVE
 * with a static `noindex` (admin/index.html), it does not belong here.
 *
 * Language versions (docs/proposal-seo-lang-urls.md § 6.6): canonical points to the page in its
 * language (`/de/preise`; `/cs/cenik` to `/cenik`, in Czech the canonical address has no prefix),
 * `hreflang` to all languages and `x-default` to the default (`roubenyraj.cz` is in Czech),
 * `og:locale` by the page language.
 *
 * Canonical, `og:url` and `og:image` need an absolute address (`Config.appUrl`); until
 * it is set, they are not set -- better none than a wrong one.
 *
 * `useLsi` must always be called, even when the page has no name or description of its own --
 * React cannot do conditional hook calls. Hence the fallback to the property name and the decision
 * only in the effect. In the dep list the paths are joined into a string: the array is created anew
 * on every render and as a dependency it would keep re-running the effect over and over.
 */
export function usePageMeta() {
  const [route] = useRoute();
  const uu5Route = route?.uu5Route;
  const page = currentPage(uu5Route);
  const entry = getSeoEntry(page);
  const isString = typeof uu5Route === "string";
  const noindex = isString && !entry;

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

  const titleKey = entry?.title?.join(".");
  const path = entry ? localizedPath(PAGE_LANGUAGE, page, LANGUAGES[0]) : null;
  // Page key for the effect dependencies (the `page` object is new on every render).
  const pageKey = page ? `${page.code}/${page.space ?? ""}` : "";
  const description = entry ? pageDescription : homeDescription;
  const title =
    noindex && notFoundName
      ? `${notFoundName} · ${propertyName}`
      : titleKey && pageName
        ? `${pageName} · ${propertyName}`
        : propertyName;

  useEffect(() => {
    if (!propertyName) return;
    const appUrl = Config.appUrl;
    const url = appUrl && path ? appUrl + path : null;

    document.title = title;
    // The „nenalezeno“ page has no description and does not belong in results.
    const pageDescriptionOrNull = noindex ? null : description;
    setMeta("name", "description", pageDescriptionOrNull);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : null);
    setCanonical(url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", pageDescriptionOrNull);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", appUrl ? `${appUrl}/assets/meta/og-image.jpg` : null);
    setMeta("property", "og:locale", OG_LOCALE[PAGE_LANGUAGE] ?? null);
    setLocaleAlternates(LANGUAGES.filter((language) => language !== PAGE_LANGUAGE).map((language) => OG_LOCALE[language]).filter(Boolean));

    // Language versions: only for a page that is in the table, and with an absolute address.
    setAlternates(
      appUrl && path
        ? [
            ...LANGUAGES.map((language) => ({ hreflang: language, href: appUrl + localizedPath(language, page, LANGUAGES[0]) })),
            { hreflang: "x-default", href: appUrl + localizedPath(LANGUAGES[0], page, LANGUAGES[0]) },
          ]
        : [],
    );

    // Items have an absolute `item`, so without the site address nothing is inserted.
    const crumbNames = crumbs && [propertyName, ...(parentCrumb ? [parentName] : []), pageName];
    setJsonLd(
      "ld-breadcrumb",
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
    );
    // `page` and `crumbs` are derived from `pageKey`, which is in the dependencies.
    // eslint-disable-next-line uu5/hooks-exhaustive-deps
  }, [propertyName, title, description, path, noindex, isString, pageKey, pageName, parentName]);
}
