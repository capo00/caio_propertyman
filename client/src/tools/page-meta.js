import { useEffect, useLsi, useRoute } from "uu5g05";
import Config from "../config/config.js";
import importLsi from "../lsi/import-lsi.js";
import { getBreadcrumb, getSeoEntry } from "../config/seo.js";

// Meta údaje stránky podle routy: titulek, popis, canonical, `og:*`, `robots` a drobečková
// navigace (`BreadcrumbList`, docs/proposal-seo-json-ld.md). Dokud byl
// web jednostránkový, stačil jeden `<title>` v index.html; se stromem rout je to jediné,
// co v panelu prohlížeče, v historii, ve výsledcích vyhledávání a v náhledu sdílení rozliší
// „Ceník" od „Ubytování" (docs/proposal-seo-meta.md).
//
// Co která routa dostane, říká `config/seo.js`. Tady je jen zápis do `<head>`.
//
// Pozor: tagy píše JS, takže je uvidí jen crawler, který JS spouští (Google ano, Facebook,
// WhatsApp a Seznam ne). Ty vidí jen statické tagy z index.html -- viz proposal-seo-meta § 6.

/** Nastaví (nebo při `content == null` odstraní) `<meta>` podle atributu `name`/`property`. */
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
 * Nastaví (nebo při `data == null` odstraní) `<script type="application/ld+json" id=…>`.
 * Text jde přes `textContent`, ne přes HTML parser, takže `</script>` v datech nic neukončí
 * a escapovat se nemusí (na rozdíl od JSON-LD, který build vkládá přímo do index.html).
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

function isAdminRoute(uu5Route) {
  return uu5Route === "admin" || uu5Route.startsWith("admin/");
}

/**
 * Nastaví `<head>` podle aktuální routy: titulek „Ceník · Roubený ráj" (home jen název),
 * popis, canonical a `og:*`. Admin a neznámé routy (404) dostanou `noindex`.
 *
 * Canonical, `og:url` a `og:image` potřebují absolutní adresu (`Config.appUrl`); dokud
 * není nastavená, nenastavují se -- lepší žádný než špatný.
 *
 * `useLsi` se musí volat vždycky, i když stránka vlastní název nebo popis nemá --
 * podmíněné volání hooků React neumí. Proto fallback na název nemovitosti a rozhodnutí
 * až v efektu. V dep listu jsou cesty spojené do stringu: pole se při každém renderu
 * vyrábí znovu a jako závislost by efekt spouštělo pořád dokola.
 */
export function usePageMeta() {
  const [route] = useRoute();
  const uu5Route = route?.uu5Route;
  const entry = getSeoEntry(uu5Route);
  const isString = typeof uu5Route === "string";
  const noindex = isString && !entry;

  const propertyName = useLsi(importLsi, ["property", "name"]);
  const homeDescription = useLsi(importLsi, ["seo", "home"]);
  const pageName = useLsi(importLsi, entry?.title ?? ["property", "name"]);
  const pageDescription = useLsi(importLsi, entry?.description ?? ["seo", "home"]);
  // Drobečková navigace (`BreadcrumbList`): home › [rozcestník] › stránka. Název home
  // a stránky už máme; jediný další je rozcestník u detailu prostoru.
  const crumbs = getBreadcrumb(uu5Route);
  const parentCrumb = crumbs?.length === 3 ? crumbs[1] : null;
  const parentName = useLsi(importLsi, parentCrumb?.title ?? ["property", "name"]);

  const titleKey = entry?.title?.join(".");
  const path = entry?.path;
  const description = entry ? pageDescription : homeDescription;
  const title = titleKey && pageName ? `${pageName} · ${propertyName}` : propertyName;

  useEffect(() => {
    if (!propertyName) return;
    const admin = isString && isAdminRoute(uu5Route);
    const appUrl = Config.appUrl;
    const url = appUrl && path ? appUrl + (path === "/" ? "/" : path) : null;

    document.title = title;
    // Admin popis nemá a do výsledků nepatří.
    const pageDescriptionOrNull = admin || noindex ? null : description;
    setMeta("name", "description", pageDescriptionOrNull);
    setMeta("name", "robots", admin || noindex ? "noindex, nofollow" : null);
    setCanonical(url);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", pageDescriptionOrNull);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", appUrl ? `${appUrl}/assets/meta/og-image.jpg` : null);

    // Položky mají absolutní `item`, takže bez adresy webu se nevkládá nic.
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
              item: appUrl + crumb.path,
            })),
          }
        : null,
    );
  }, [propertyName, title, description, path, noindex, isString, uu5Route, pageName, parentName]);
}
