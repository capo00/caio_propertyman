import { Lsi } from "uu5g05";
import Config from "../config/config.js";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Položky menu adminu. `href` bez `#` je routa, kterou `Top` prožene `setRoute` -- žádný
// reload stránky (caio-ui/src/caio-ui-app/top.jsx, withItemBehaviour).
const NAV = [
  { code: "reservations", href: "admin/reservations" },
  { code: "reviews", href: "admin/reviews" },
  { code: "ical", href: "admin/ical" },
];

/**
 * Konfigurace horní lišty adminu.
 *
 * Přihlášeného uživatele, odhlášení i správu identit dodává `Top` sám přes
 * `displayIdentity` (caio-ui README, *Identita v liště*). Dřív si to lišta skládala z
 * `useSession()` jako další položku menu -- design-v2.md § 4 to popisuje jako dočasné
 * řešení do doby, než ten prop vznikne.
 *
 * `roleList: []` schválně: admin propertymanu nemá vlastní role, vystačí si s `authorities`,
 * kterou caio-ui do nabídky přidává sama.
 */
export function useAdminTop() {
  return {
    logo: { uri: Config.asset.logo, href: "admin/reservations", tooltip: undefined },
    // Tmavá lišta jako na webu, ať je vidět, že je to tentýž dům; zbytek adminu je
    // ale čisté GDS bez display fontu (design-v2.md § 4).
    cssBackground: theme.color.forest,
    cssColor: theme.color.onDark,
    children: <Lsi lsi={lsi("admin", "nav", "title")} />,
    menu: {
      itemList: [
        ...NAV.map((item) => ({
          href: item.href,
          children: <Lsi lsi={lsi("admin", "nav", item.code)} />,
          significance: "subdued",
          colorScheme: "building",
        })),
      ],
    },
    displayIdentity: { roleList: [] },
  };
}

export default useAdminTop;
