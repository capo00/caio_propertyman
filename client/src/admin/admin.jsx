import { createVisualComponent } from "uu5g05";
import Config from "../config/config.js";
import Reservations from "./screens/reservations.jsx";
import Reviews from "./screens/reviews.jsx";
import IcalFeeds from "./screens/ical-feeds.jsx";

// Kořen adminu. Tenhle soubor je zároveň hranicí lazy chunku: router ho importuje
// dynamicky (`withLazy`), takže se admin -- a hlavně `uu5tilesg02*` a `uu5codekitg01-forms`,
// na kterých stojí `UiElements.Crud` -- stáhne teprve tomu, kdo na /admin opravdu přijde
// (design-v2.md § 4). Proto se obrazovky importují staticky TADY, a ne v routeru:
// všechny tři patří do jednoho chunku.
const SCREENS = {
  reservations: Reservations,
  reviews: Reviews,
  ical: IcalFeeds,
};

const Admin = createVisualComponent({
  uu5Tag: Config.TAG + "Admin",

  render({ screen }) {
    const Screen = SCREENS[screen] ?? Reservations;
    return <Screen />;
  },
});

export default Admin;
