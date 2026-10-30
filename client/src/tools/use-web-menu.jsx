import { Lsi, useMemo } from "uu5g05";
import nav from "../config/nav.js";
import { lsi } from "../lsi/import-lsi.js";
import { pagePath } from "./page-language.js";

// Items of the site's top bar (taken out of app.jsx 2026-10-18). The bar itself (logo,
// colours, name) stays in app.jsx; the admin link, the language and the light/dark switch and
// a click on the page the guest is already on (smooth scroll to the top) are caio-ui `Top`'s.

/**
 * An item of `config/nav.js` -> an item of the bar's `ActionGroup`. `href` decides the
 * behaviour, `Top` translates it itself: an anchor scrolls, anything else is a route.
 *
 * No `itemList`: the menu is one level (see config/nav.js). The pages of the spaces are
 * reached from the `ubytovani` hub, not from an expanded menu. The label is a path into LSI,
 * so the name can come from the same place as on the target page.
 */
function toMenuItem(item) {
  return {
    href: pagePath(item.code),
    children: <Lsi lsi={lsi(...item.label)} />,
    significance: "subdued",
    colorScheme: "building",
  };
}

/** The menu of the top bar: navigation and the "Book" CTA. */
export function useWebMenu() {
  return useMemo(
    () => ({
      itemList: [
        ...nav.map(toMenuItem),
        {
          href: pagePath("reservation"),
          children: <Lsi lsi={lsi("header", "book")} />,
          significance: "highlighted",
          colorScheme: "building",
          // The CTA collapses into the hamburger LAST, after all navigation items:
          // ActionGroup collapses from the right and `primary` items at the very end.
          primary: true,
        },
      ],
    }),
    [],
  );
}
