import { useRouter, withLazy } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import UiApp from "caio-ui/src/caio-ui-app";
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
import spaces from "./components/accommodation/content.js";
import { ADMIN_SCREENS, REDIRECTS } from "./config/routes.js";

// uu5g05 routeMap: klíč = cesta, hodnota = element / { redirect } / { rewrite }.
//
// Web je STROM STRÁNEK (docs/proposal-routes.md), ne jedna stránka: `home` je zkrácená
// výkladní skříň s teasery a každá sekce, která unese detail, má vlastní routu.
// Ruší se tím rozhodnutí "web je JEDNA stránka" z 2026-09-01 (docs/decisions.md).
//
// `kontakt` je od 2026-09-28 taky routa (docs/decisions.md, § Frontend) -- plná `<Contact
// compact={false} />` s mapou. Stejná komponenta je ale i patička KAŽDÉ veřejné stránky
// (`compact`, výchozí), takže kotva `#kontakt` dál existuje všude (proposal-routes.md § 3a);
// `AppFrame` (app.jsx) patičku na routě `kontakt` jen schová, ať tam není dvakrát.
//
// Každá routa má tu tenké drátování v `routes/<name>.jsx`, které jen reexportuje skutečnou
// implementaci z `components/` (docs/decisions.md, § Frontend, 2026-09-28) -- soubory v
// `routes/` tak zůstávají anglicky, i když klíč routy (`route` v config/nav.js) je česky
// bez diakritiky.

/**
 * Admin (v2) je LAZY: `withLazy` z něj udělá vlastní chunk, takže návštěvník webu nestahuje
 * ani admin kód, ani `uu5tilesg02*` a `uu5codekitg01-forms`, na kterých stojí `UiElements.Crud`.
 * Jedna SPA a jeden `index.html` -- dva bundly `caio-devkit` dnes nepostaví (design-v2.md § 4).
 *
 * `withRoute` je NAD lazy komponentou schválně: nepřihlášenému se chunk vůbec nezačne stahovat,
 * protože guard místo něj vyrenderuje `UiAuth.Unauthenticated`.
 */
const AdminLazy = withLazy(() => import("./admin/admin.jsx"), <Uu5Elements.Pending size="xl" />);
const Admin = UiApp.withRoute(AdminLazy, { profileList: ["authorities"] });

// Routy detailů prostorů se GENERUJÍ ze seznamu -- `useRouter` dynamický segment
// (`ubytovani/:code`) neumí, klíče routeMapy jsou statické. Přidání prostoru je proto
// jeden záznam v components/accommodation/content.js, ne zásah sem.
const SPACE_ROUTES = Object.fromEntries(
  spaces.map((space) => [`ubytovani/${space.code}`, <SpaceDetail code={space.code} />]),
);

// Přesměrování a obrazovky adminu jsou v config/routes.js -- podle stejných dat build zapíše
// public/spa-routes.json pro server (404 a 301, docs/proposal-seo-404.md).
const REDIRECT_ROUTES = Object.fromEntries(
  Object.entries(REDIRECTS).map(([from, to]) => [from, { redirect: to }]),
);
const ADMIN_ROUTES = Object.fromEntries(
  ADMIN_SCREENS.map((screen) => [`admin/${screen}`, <Admin screen={screen} />]),
);

// Home je routa "" (adresa `/`), ne `home`: dřív `""` přesměrovávalo na `home`, takže
// z `/` se v adresním řádku stalo `/home` -- druhá adresa téže stránky. Kanonická je `/`,
// `home` zůstává jen jako přesměrování (REDIRECTS).
const ROUTE_MAP = {
  "": <Home />,

  ubytovani: <Accommodation />,
  ...SPACE_ROUTES,

  galerie: <Gallery />,
  cenik: <Pricing />,
  rezervace: <Reservation />,
  recenze: <Reviews />,
  okoli: <Surroundings grouped />,
  faq: <Faq />,
  kontakt: <Contact compact={false} />,

  ...REDIRECT_ROUTES,
  ...ADMIN_ROUTES,

  "*": <NotFound />,
};

/** Je aktuální routa admin? Podle toho se přepíná rám stránky (app.jsx). */
export function isAdminRoute(uu5Route) {
  return typeof uu5Route === "string" && (uu5Route === "admin" || uu5Route.startsWith("admin/"));
}

function Router() {
  return useRouter(ROUTE_MAP);
}

export default Router;
