import { useRouter } from "uu5g05";
import Home from "./routes/home.jsx";
import Accommodation from "./routes/accommodation.jsx";
import SpaceDetail from "./routes/space-detail.jsx";
import Pricing from "./routes/pricing.jsx";
import Gallery from "./routes/gallery.jsx";
import Reservation from "./routes/reservation.jsx";
import Reviews from "./routes/reviews.jsx";
import Surroundings from "./routes/surroundings.jsx";
import Faq from "./routes/faq.jsx";
import Contact from "./routes/contact.jsx";
import NotFound from "./components/not-found.jsx";
import { listPages, pageRoute, redirectsFor } from "./config/routes.js";
import { LANGUAGES, PAGE_LANGUAGE } from "./tools/page-language.js";

// uu5g05 routeMap: klíč = cesta, hodnota = element / { redirect } / { rewrite }.
//
// Web je STROM STRÁNEK (docs/proposal-routes.md), ne jedna stránka: `home` je zkrácená
// výkladní skříň s teasery a každá sekce, která unese detail, má vlastní routu.
// Ruší se tím rozhodnutí "web je JEDNA stránka" z 2026-09-01 (docs/decisions.md).
//
// Klíče routeMapy jsou SLUGY JAZYKA STRÁNKY (config/routes.js, `PAGES`): v index.html
// `cenik`, v index.de.html `preise`. Jazyk je pevný po celé načtení (adresa = dokument,
// tools/page-language.js), takže se mapa sestaví jednou. Slugy ostatních jazyků téže
// stránky jsou přesměrování, ať ručně napsané `/de/cenik` skončí na `/de/preise` (server
// na ně odpovídá 301 stejně, server/spa-routes/). uu5 `{ rewrite }` by tu nepomohl:
// `useRoute()` by dál vracel slug v URL a kód by ho stejně musel překládat.
//
// Kontakt je od 2026-09-28 taky routa (docs/decisions.md, § Frontend) -- plná `<Contact
// compact={false} />` s mapou. Stejná komponenta je ale i patička KAŽDÉ veřejné stránky
// (`compact`, výchozí), takže kotva `#kontakt` dál existuje všude (proposal-routes.md § 3a);
// `AppFrame` (app.jsx) patičku na stránce kontaktu jen schová, ať tam není dvakrát.
//
// Každá routa má tu tenké drátování v `routes/<name>.jsx`, které jen reexportuje skutečnou
// implementaci z `components/` (docs/decisions.md, § Frontend, 2026-09-28).
//
// Admin tu není: je to vlastní UVE (`src/admin/`, /admin/…), web o něm neví
// (docs/proposal-seo-lang-urls.md § 6.0).

// Stránka (kód z config/routes.js) -> co se na ní vykreslí. Detail prostoru dostane kód
// prostoru; routy detailů se GENERUJÍ ze seznamu prostorů (`listPages`) -- `useRouter`
// dynamický segment neumí, klíče routeMapy jsou statické.
const ELEMENT_BY_PAGE = {
  home: () => <Home />,
  accommodation: ({ space }) => (space ? <SpaceDetail code={space} /> : <Accommodation />),
  gallery: () => <Gallery />,
  pricing: () => <Pricing />,
  reservation: () => <Reservation />,
  reviews: () => <Reviews />,
  surroundings: () => <Surroundings grouped />,
  faq: () => <Faq />,
  contact: () => <Contact compact={false} />,
};

function buildRouteMap(language) {
  const pages = Object.fromEntries(
    listPages().map((page) => [pageRoute(language, page), ELEMENT_BY_PAGE[page.code](page)]),
  );
  const redirects = Object.fromEntries(
    Object.entries(redirectsFor(language, LANGUAGES)).map(([from, to]) => [from, { redirect: to }]),
  );
  return { ...redirects, ...pages, "*": <NotFound /> };
}

const ROUTE_MAP = buildRouteMap(PAGE_LANGUAGE);

function Router() {
  return useRouter(ROUTE_MAP);
}

export default Router;
