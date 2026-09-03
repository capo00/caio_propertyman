import { useRouter } from "uu5g05";
import Home from "./routes/home.jsx";
import NotFound from "./routes/not-found.jsx";
import nav from "./content/nav.js";

// uu5g05 routeMap: klíč = cesta, hodnota = element / { redirect } / { rewrite }.
//
// Web je JEDNA stránka: `home` skládá všechny sekce pod sebe a menu na ně scrolluje
// (docs/decisions.md). Samostatné routy sekcí zrušené jsou, ale jejich URL zůstávají --
// vyrenderují tutéž home a doscrollují na kotvu sekce. Bez toho by existující odkazy
// (a co má případně naindexovaný Google) spadly na 404.
const ROUTE_MAP = {
  "": { redirect: "home" },
  home: <Home />,

  ...Object.fromEntries(nav.map((item) => [item.code, <Home scrollTo={item.anchor} />])),
  // `faq` nemá položku v menu, ale routa pro něj existovala -- ať se taky nezahodí.
  faq: <Home scrollTo="#faq" />,

  "*": <NotFound />,
};

function Router() {
  return useRouter(ROUTE_MAP);
}

export default Router;
