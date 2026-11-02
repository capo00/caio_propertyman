// Konfigurace jen pro klienta, vrstva 2 (caio-devkit README, „Konfigurace appky“). Klíče 1. úrovně
// jsou standardní -- devkit je validuje při buildu (neznámý klíč build shodí), caio-ui je bere jako
// výchozí hodnoty svých propsů. Appka ho předává `<UiApp.SpaProvider config={clientConfig}>` v obou
// UVE (app.jsx, admin/app.jsx).
//
// Klíč `app` (hodnoty klienta, které se opakují ve víc souborech) appka nepotřebuje: písma, rozměry
// a barvy mají jedno místo v src/config/theme.js, odkud je berou komponenty. Údaje o roubence, které
// zná i server, jsou v caio.config.js `app` (`UiApp.AppConfig.app`).
export default {
  // uu5 tag appky: prefix jmen komponent a CSS modulu (src/config/config.js).
  tag: "PropertyMan.",

  top: {
    // Výběr z pěti jazyků je v liště webu vždycky, ne ve „třech tečkách“.
    languageSelector: { collapsed: false },
    // Odkaz do administrace na webu pro toho, kdo se v tomhle prohlížeči přihlásil do adminu
    // (značku zapisuje admin/app.jsx). Postavička, ne ozubené kolo: web nemá identitu v liště.
    // `profileList` je zároveň to, kdo do administrace smí -- guard a značka v admin/app.jsx
    // berou stejný seznam, takže se nemůžou rozejít.
    adminLink: { profileList: ["authorities"], icon: "uugds-account" },
  },

  // Správa identit v administraci (menu identity v liště): admin propertymanu nemá vlastní role,
  // vystačí si s `authorities`.
  identity: { roleList: ["authorities"] },

  // Seznamy administrace (rezervace, recenze, kalendáře) po 50 položkách.
  list: { pageSize: 50 },
};
