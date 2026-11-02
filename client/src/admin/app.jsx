import { UiApp } from "caio-ui";
import Uu5Elements from "uu5g05-elements";
import { useRouter } from "uu5g05";
import Reservations from "./screens/reservations.jsx";
import ReservationDetail from "./screens/reservation-detail.jsx";
import Reviews from "./screens/reviews.jsx";
import IcalFeeds from "./screens/ical-feeds.jsx";
import { useAdminTop } from "./top.jsx";
import { APP_SETTINGS } from "./settings.js";
import clientConfig from "../../client.config.js";

// Kořen UVE adminu (admin/index.html, /admin/…). Do 2026-10-16 byl admin lazy routa uvnitř
// webu (design-v2.md § 4); vlastní UVE je od chvíle, kdy caio-devkit umí víc vstupů
// (docs/proposal-seo-lang-urls.md § 6.0). Web tak o adminu neví vůbec -- ani router, ani
// rám stránky, ani jazykové adresy.

// Každá obrazovka jen pro přihlášeného s `authorities`. Nepřihlášenému guard vykreslí
// `UiAuth.Unauthenticated` s tlačítkem na přihlášení. Role jsou v client.config.js
// (`top.adminLink.profileList`): guard, značka pro web a odkaz na webu berou stejný seznam.
const ADMIN_PROFILES = clientConfig.top.adminLink.profileList;
const guard = (Screen) => UiApp.withRoute(Screen, { profileList: ADMIN_PROFILES });
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
  // Nastavení: odchozí pošta, registrace a údaje majitelky (e-mail pro žádosti, příjezd, účet,
  // dodavatel na faktuře) -- obrazovka z caio-ui, guard `authorities` má v sobě, sekci appky
  // jí dává `SpaProvider settings` níž (admin/settings.js).
  ...UiApp.settingsRouteMap({ route: "settings" }),
  "*": { redirect: "reservations" },
};

// Obsah adminu je aplikační, ne prezentační: odsazení a rozumná maximální šířka od rámu.
const ADMIN_MAIN = { padding: true, maxWidth: 1400 };

function AdminFrame() {
  const top = useAdminTop();
  // Značka pro web: v tomhle prohlížeči se někdo přihlásil do adminu (web podle ní ukáže
  // odkaz do adminu, caio-ui `Top` `adminLink`).
  UiApp.useAdminMarkerSync(ADMIN_PROFILES);
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
    // Jazyky i jazyk (volba z webu, jinak výchozí) dodává SpaProvider sám z caio.config.js.
    // `config`: client.config.js (role správy identit, velikost stránky seznamů, odkaz do adminu).
    // `settings`: sekce majitelky na obrazovce Nastavení -- komponenta, takže nemůže být
    // v client.config.js; platí pro routu `settings` i pro Nastavení v menu identity.
    <UiApp.SpaProvider config={clientConfig} settings={{ appSection: APP_SETTINGS }}>
      <AdminFrame />
    </UiApp.SpaProvider>
  );
}

export default AdminApp;
