import { useRouter, withLazy } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import UiApp from "caio-ui/src/caio-ui-app";
import Home from "./routes/home.jsx";
import Ubytovani from "./routes/ubytovani.jsx";
import Space from "./routes/space.jsx";
import Cenik from "./routes/cenik.jsx";
import NotFound from "./routes/not-found.jsx";
import Gallery from "./components/sections/gallery.jsx";
import Reservation from "./components/sections/reservation.jsx";
import Reviews from "./components/sections/reviews.jsx";
import Surroundings from "./components/sections/surroundings.jsx";
import Faq from "./components/sections/faq.jsx";
import spaces from "./content/spaces.js";

// uu5g05 routeMap: klíč = cesta, hodnota = element / { redirect } / { rewrite }.
//
// Web je STROM STRÁNEK (docs/proposal-routes.md), ne jedna stránka: `home` je zkrácená
// výkladní skříň s teasery a každá sekce, která unese detail, má vlastní routu.
// Ruší se tím rozhodnutí "web je JEDNA stránka" z 2026-09-01 (docs/decisions.md).
//
// Kontakt tady schválně NENÍ. Je to poslední sekce každé veřejné routy a vykresluje ji rám
// v app.jsx, takže kotva `#kontakt` existuje všude (proposal-routes.md § 3a).
//
// Stránky, které jsou přesně jednou sekcí (galerie, rezervace, recenze, dotazy), se sem
// dávají rovnou -- vlastní soubor v routes/ by byl jen reexport.

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
// jeden záznam v content/spaces.js, ne zásah sem.
const SPACE_ROUTES = Object.fromEntries(
  spaces.map((space) => [`ubytovani/${space.code}`, <Space code={space.code} />]),
);

// Staré routy sekcí (anglické kódy z původního content/nav.js). Zůstávají funkční jako
// přesměrování, ať nespadnou existující odkazy a to, co má naindexovaný Google.
// `contact` míří na home -- vlastní stránku kontakt nemá, na home je jako poslední sekce.
const LEGACY_ROUTES = {
  about: { redirect: "ubytovani" },
  gallery: { redirect: "galerie" },
  pricing: { redirect: "cenik" },
  reservation: { redirect: "rezervace" },
  reviews: { redirect: "recenze" },
  surroundings: { redirect: "okoli" },
  contact: { redirect: "home" },
};

const ROUTE_MAP = {
  "": { redirect: "home" },
  home: <Home />,

  ubytovani: <Ubytovani />,
  ...SPACE_ROUTES,

  galerie: <Gallery />,
  cenik: <Cenik />,
  rezervace: <Reservation />,
  recenze: <Reviews />,
  okoli: <Surroundings grouped />,
  faq: <Faq />,

  ...LEGACY_ROUTES,

  admin: { redirect: "admin/reservations" },
  "admin/reservations": <Admin screen="reservations" />,
  "admin/reviews": <Admin screen="reviews" />,
  "admin/ical": <Admin screen="ical" />,

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
