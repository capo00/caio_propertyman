// Pages of the web and their slug in every language. Shared by the client (router, links, SEO:
// client/src/config/routes.js builds the full routes on top of it) and the server (links in
// emails, server/email/send.js).
//
// It lives outside client/ on purpose: client/ is not uploaded to App Engine (.gcloudignore),
// only the built public/ is, so the server must never import from client/ -- it starts on the
// developer's machine and crashes in production (v0.2.7). server/no-client-imports.test.js
// keeps it that way.
//
// Only data and pure functions, no uu5, no imports.

export const PAGES = {
  home: { cs: "", en: "", de: "", pl: "", sk: "" },
  accommodation: { cs: "ubytovani", en: "accommodation", de: "unterkunft", pl: "zakwaterowanie", sk: "ubytovanie" },
  gallery: { cs: "galerie", en: "gallery", de: "galerie", pl: "galeria", sk: "galeria" },
  pricing: { cs: "cenik", en: "prices", de: "preise", pl: "cennik", sk: "cennik" },
  reservation: { cs: "rezervace", en: "booking", de: "buchung", pl: "rezerwacja", sk: "rezervacia" },
  reviews: { cs: "recenze", en: "reviews", de: "bewertungen", pl: "opinie", sk: "recenzie" },
  surroundings: { cs: "okoli", en: "surroundings", de: "umgebung", pl: "okolica", sk: "okolie" },
  faq: { cs: "faq", en: "faq", de: "faq", pl: "faq", sk: "faq" },
  contact: { cs: "kontakt", en: "contact", de: "kontakt", pl: "kontakt", sk: "kontakt" },
};

/**
 * Path of a page without the domain: the default language without a prefix (`/cenik`, home `/`),
 * the others with it (`/de/preise`, home `/de/`). Unknown page or language gives `null`.
 */
export function pagePath(language, code, defaultLanguage) {
  const slug = PAGES[code]?.[language];
  if (slug == null) return null;
  return language === defaultLanguage ? `/${slug}` : `/${language}/${slug}`;
}
