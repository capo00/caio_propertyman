// Konfigurace appky, vrstva 2 (caio-devkit README, „Konfigurace appky“): co je stejné pro server
// i klienta nebo co potřebuje build. Klíče 1. úrovně jsou standardní -- devkit i caio-server je
// znají a validují, neznámý klíč shodí build i start. Vlastní hodnoty appky jsou jen pod `app`
// (server `AppConfig.app` z caio-serveru, klient `UiApp.AppConfig.app`, build -- JSON-LD
// v client/src/config/seo-files.js -- tenhle soubor rovnou).
//
// Co je jen pro server (ceník, pravidla rezervace, storno), je v server/server.config.js, co jen pro
// klienta, v client/client.config.js. Co mění majitelka za běhu (e-mail pro žádosti, příjezd,
// platby, dodavatel na faktuře), není konfigurace, ale Nastavení v administraci (`sys_settings`,
// docs/decisions.md § Konfigurace). Klíče a tajemství jsou v env souborech (.env.example).
export default {
  // Titulek kořenového dokumentu, jméno a popis v manifestu, jméno na boot screenu, og:site_name,
  // podpis e-mailů a hlavička faktury.
  name: "Roubený ráj",
  description: "Roubenka v Českém ráji",

  // Jazyky webu, první je výchozí: jazykové verze /en/…, přepínač v liště, e-maily hostům
  // (docs/proposal-seo-lang-urls.md). Pořadí je pořadí v přepínači (majitel 2026-10-22).
  languages: ["cs", "en", "sk", "pl", "de"],

  // Dvě palety se stejnými rolemi -- jediné místo, kde smí být hex barvy palety (oklch originály
  // a role v docs/ux-design-system.md § 1). Světlá je předloha webu, tmavá varianta A „Teplá noc“
  // (majitel 2026-10-30, docs/decisions.md). Komponenty je berou z client/src/config/theme.js.
  theme: {
    prefix: "rr",
    palette: {
      light: {
        bg: "#FBF9F0",
        cream: "#F9F5E8",
        card: "#FFFDF9",
        muted: "#F0EDE0",
        border: "#DFDBCB",
        fg: "#1E2715",
        mutedFg: "#646553",
        accent: "#955F35",
        accentFg: "#FEFCF4",
        sand: "#EDE8D6",
        sandFg: "#3E2815",
        forest: "#1E3E23",
        onDark: "#FBF9F0",
        primary: "#315833",
        forestOverlay: "#1E3E23B8",
        cardShadow: "#1E27151F",
      },
      dark: {
        bg: "#16150F",
        cream: "#1D1C15",
        card: "#211F18",
        muted: "#27261D",
        border: "#36342A",
        fg: "#EFEBDC",
        mutedFg: "#ADA891",
        accent: "#D49A69",
        accentFg: "#1C130A",
        sand: "#2E2A1E",
        sandFg: "#E6D7BC",
        forest: "#1E3E23",
        onDark: "#FBF9F0",
        primary: "#56995A",
        forestOverlay: "#0F1E12CC",
        cardShadow: "#00000000",
      },
    },
    background: "bg",
    foreground: "fg",
    meaning: { primary: "primary", secondary: "accent" },
  },

  // Boot screen: kresba roubenky uvnitř otáčivého prstence a jméno z `name` pod ní. Prstenec je
  // ve světlém režimu lesní zelený jako lišta, barvy jinak z palety (docs/decisions.md 2026-10-30).
  boot: {
    logo: "/src/assets/roubenka.svg",
    nameUppercase: false,
    logoSize: "70%",
    light: { accent: "#1E3E23" },
  },

  // Barva lišty nainstalované appky (theme_color manifestu): lesní zelená jako lišta webu. Pozadí
  // manifestu je role `background` tématu.
  pwa: { themeColor: "forest" },

  // Administrace je vlastní UVE (client/src/admin/), titulek „Správa · Roubený ráj“, bez boot
  // screenu; neveřejná je sama od sebe (noindex, robots.txt).
  uves: { admin: { title: "Správa", boot: false } },

  // Klíč pro Google Maps (mapa v kontaktu) smí do bundlu: je to Maps Embed klíč omezený na domény
  // webu, ne tajemství (docs/release.md § 1.5). Klient ho čte z `UiApp.PublicEnv`.
  env: { client: ["GOOGLE_MAPS_API_KEY"] },

  deploy: { project: "caio-propertyman", keepVersions: 3 },

  // Údaje o roubence, které čte server (e-maily, pravidla rezervace), web (stránky, mapa, formulář)
  // i build (JSON-LD v client/src/config/seo-files.js). Do 2026-11 opsané v server/config.js,
  // client/src/config/property.js a client/src/components/contact/content.js. Texty (název,
  // popisy, podmínky) jsou v LSI klienta, tady jen to, co se nepřekládá.
  app: {
    property: {
      // Jen poštovní adresa, bez regionu: ten by se musel překládat a do adresy nepatří.
      // `gps` je bod u domu: 2026-10-14 ověřený proti poloze od majitele (asi 5 m od sebe),
      // jediný zdroj souřadnic pro mapu (contact/map.jsx) a strukturovaná data.
      address: {
        street: "Libošovice 6",
        zip: "507 44",
        city: "Libošovice",
        gps: { lat: 50.49033097159986, lng: 15.163830025845405 },
      },
      // Podle inzerátu na e-chalupy.cz: 9 pevných lůžek a 1 přistýlka ve 3 podkrovních ložnicích.
      // Přistýlka se počítá zvlášť (host ji dostane na vyžádání); nejvyšší počet hostů rezervace
      // je `beds + extraBeds` -- hlídá ho server i formulář.
      capacity: { beds: 9, extraBeds: 1, bedrooms: 3 },
      // Nejkratší pobyt přes web (server ho vynucuje, formulář na něj upozorní dřív). Ruční zápis
      // v administraci ho obchází, kromě rezervace v zastoupení hosta (ta má pravidla webu).
      minNights: 2,
      checkIn: "15:00",
      checkOut: "10:00",
    },

    contact: {
      // Telefon čitelně s mezerami; podobu pro `tel:` a WhatsApp si web i e-maily odvodí
      // (shared/contact.js) -- dřív to byly dvě hodnoty a rozešly se.
      phone: "+420 723 872 512",
      email: "capkova.leni@gmail.com",
      // Odkaz „otevřít v Google Maps“ pod mapou; výřez mapy se skládá ze souřadnic výš.
      mapUrl: "https://maps.app.goo.gl/7GW3ApWY7uX8MdFw8",
      // `facebook` je stránka „Roubený ráj“ (uživatelské jméno `roubenyraj` od 2026-10-12),
      // `instagram` potvrdil vlastník jako finální 2026-10-14. WhatsApp je číslo z `phone`.
      social: {
        facebook: "https://www.facebook.com/roubenyraj",
        instagram: "https://www.instagram.com/roubenyraj/",
      },
    },
  },
};
