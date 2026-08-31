import { useRouter } from "uu5g05";
import Home from "./routes/home.jsx";
import NotFound from "./routes/not-found.jsx";
import SectionPage from "./routes/section-page.jsx";
import About from "./components/sections/about.jsx";
import Gallery from "./components/sections/gallery.jsx";
import Pricing from "./components/sections/pricing.jsx";
import Reservation from "./components/sections/reservation.jsx";
import Reviews from "./components/sections/reviews.jsx";
import Surroundings from "./components/sections/surroundings.jsx";
import Faq from "./components/sections/faq.jsx";
import Contact from "./components/sections/contact.jsx";

// uu5g05 routeMap: klíč = cesta, hodnota = element / { redirect } / { rewrite }.
//
// `home` skládá všechny sekce pod sebe (= předloha 1:1, kotvy #galerie a spol. fungují)
// a každá sekce má navíc vlastní routu se stejnou komponentou (docs/decisions.md).
// Názvy rout drží design-v1.md § 5.
const ROUTE_MAP = {
  "": { redirect: "home" },
  home: <Home />,

  about: <SectionPage><About /></SectionPage>,
  gallery: <SectionPage><Gallery /></SectionPage>,
  pricing: <SectionPage><Pricing /></SectionPage>,
  reservation: <SectionPage><Reservation /></SectionPage>,
  reviews: <SectionPage><Reviews /></SectionPage>,
  surroundings: <SectionPage><Surroundings /></SectionPage>,
  faq: <SectionPage><Faq /></SectionPage>,
  contact: <SectionPage><Contact /></SectionPage>,

  "*": <NotFound />,
};

function Router() {
  return useRouter(ROUTE_MAP);
}

export default Router;
