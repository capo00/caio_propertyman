import { useRouter, withLazy } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import UiApp from "caio-ui/src/caio-ui-app";
import Home from "./routes/home.jsx";
import NotFound from "./routes/not-found.jsx";
import nav from "./content/nav.js";

// uu5g05 routeMap: klíč = cesta, hodnota = element / { redirect } / { rewrite }.
//
// Web je JEDNA stránka: `home` skládá všechny sekce pod sebe a menu na ně scrolluje
// (docs/decisions.md). Samostatné routy sekcí zrušené jsou, ale jejich URL zůstávají --
// vyrenderují tutéž home a doscrollují na kotvu sekce. Bez toho by existující odkazy
// (a co má případně naindexovaný Google) spadly na 404.

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

const ROUTE_MAP = {
  "": { redirect: "home" },
  home: <Home />,

  ...Object.fromEntries(nav.map((item) => [item.code, <Home scrollTo={item.anchor} />])),
  // `faq` nemá položku v menu, ale routa pro něj existovala -- ať se taky nezahodí.
  faq: <Home scrollTo="#faq" />,

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
