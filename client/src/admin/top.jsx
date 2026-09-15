import { Lsi } from "uu5g05";
import UiAuth from "caio-ui/src/caio-ui-auth";
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
 * Je to hook, ne konstanta, protože odhlášení potřebuje `useSession()`. Lišta si ho musí
 * dodat sama: `Top` z `caio-ui` identity tlačítko nemá (README ho avizuje jako budoucí prop
 * `displayIdentity`), takže je z appky jako položka menu -- design-v2.md § 4.
 */
export function useAdminTop() {
  const { identity, state, logout, login } = UiAuth.useSession();
  const isSignedIn = state === "authenticated";

  // Nepřihlášenému se nenabízí odhlášení, ale přihlášení -- guard pod lištou mu sice ukáže
  // `UiAuth.Unauthenticated` s tlačítkem, ale lišta by tvrdila opak.
  const sessionItem = isSignedIn
    ? {
        icon: "uugds-sign-out",
        children: identity?.name ? (
          <Lsi lsi={lsi("admin", "nav", "logoutNamed")} params={{ name: identity.name }} />
        ) : (
          <Lsi lsi={lsi("admin", "nav", "logout")} />
        ),
        onClick: () => logout(),
      }
    : {
        icon: "uugds-login",
        children: <Lsi lsi={lsi("admin", "nav", "login")} />,
        onClick: () => login(),
      };

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
        { ...sessionItem, significance: "subdued", colorScheme: "building" },
      ],
    },
  };
}

export default useAdminTop;
