import UiApp from "caio-ui/src/caio-ui-app";
import Uu5Elements from "uu5g05-elements";
import { useRouter } from "uu5g05";
import Reservations from "./screens/reservations.jsx";
import ReservationDetail from "./screens/reservation-detail.jsx";
import Reviews from "./screens/reviews.jsx";
import IcalFeeds from "./screens/ical-feeds.jsx";
import { useAdminTop } from "./top.jsx";

// Kořen UVE adminu (admin/index.html, /admin/…). Do 2026-10-16 byl admin lazy routa uvnitř
// webu (design-v2.md § 4); vlastní UVE je od chvíle, kdy caio-devkit umí víc vstupů
// (docs/proposal-seo-lang-urls.md § 6.0). Web tak o adminu neví vůbec -- ani router, ani
// rám stránky, ani jazykové adresy.

// Každá obrazovka jen pro přihlášeného s `authorities`. Nepřihlášenému guard vykreslí
// `UiAuth.Unauthenticated` s tlačítkem na přihlášení.
const guard = (Screen) => UiApp.withRoute(Screen, { profileList: ["authorities"] });
const ReservationsRoute = guard(Reservations);
const ReservationDetailRoute = guard(ReservationDetail);
const ReviewsRoute = guard(Reviews);
const IcalFeedsRoute = guard(IcalFeeds);

// Routy jsou relativní k /admin/ (`data-uu-app-base` v admin/index.html). Detail rezervace
// je routa s query parametrem (`reservation?id=`) -- dynamický segment router neumí.
// Neznámá adresa skončí na seznamu rezervací: admin nemá co ukazovat jako „nenalezeno“
// a do vyhledávání nepatří.
const ROUTE_MAP = {
  "": { redirect: "reservations" },
  reservations: <ReservationsRoute />,
  reservation: <ReservationDetailRoute />,
  reviews: <ReviewsRoute />,
  ical: <IcalFeedsRoute />,
  "*": { redirect: "reservations" },
};

// Obsah adminu je aplikační, ne prezentační: odsazení a rozumná maximální šířka od rámu.
const ADMIN_MAIN = { padding: true, maxWidth: 1400 };

function AdminFrame() {
  const top = useAdminTop();
  const element = useRouter(ROUTE_MAP);

  return (
    // Admin je aplikace, ne web: výchozí `normal` spacing (majitel 2026-10-10).
    <Uu5Elements.SpacingProvider type="normal">
      <UiApp.Spa top={top} main={ADMIN_MAIN}>
        {element}
      </UiApp.Spa>
    </Uu5Elements.SpacingProvider>
  );
}

function AdminApp() {
  return (
    // Jazyky i jazyk (volba z webu, jinak výchozí) dodává SpaProvider sám z `caio.languages`.
    <UiApp.SpaProvider>
      <AdminFrame />
    </UiApp.SpaProvider>
  );
}

export default AdminApp;
