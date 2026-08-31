// Designové tokeny odečtené z předlohy (ux/) -- viz docs/ux-design-system.md, kde je
// u každé hodnoty i její oklch originál a čím se v předloze projevuje.
//
// Tohle je JEDINÉ místo, kde smí být hexy a velikosti písma. Komponenty berou vždycky odsud;
// když se v JSX objeví "#..." nebo "fontSize: 36", je to chyba.

const color = {
  // Nikde není čistá bílá ani černá -- všechno je posunuté do teplé (hue ~95) nebo do zelené.
  bg: "#FBF9F0", // základní podklad stránky
  cream: "#F9F5E8", // alternující sekce, o odstín tmavší
  forest: "#1E3E23", // tmavé bloky: rezervace, footer, logo dlaždice
  primary: "#315833", // primární tlačítka, aktivní stavy
  fg: "#1E2715", // základní text (tmavá zelenošedá)
  sand: "#EDE8D6",
  sandFg: "#3E2815",
  muted: "#F0EDE0",
  mutedFg: "#646553", // sekundární text, popisky, vzdálenosti
  accent: "#AE794C", // terakota -- hvězdičky u recenzí, akcenty
  accentFg: "#FEFCF4",
  border: "#DFDBCB",
  card: "#FFFDF9",
  onDark: "#FBF9F0", // text na forest podkladu
};

const font = {
  display: '"Fraunces", Georgia, serif',
  body: '"Karla", system-ui, sans-serif',
};

// Nadpisy mají ZÁPORNÉ prostrkání (-1.5 %). Bez něj Fraunces ve velkých stupních vypadá
// rozsypaně. Velikosti jsou desktopové; menší varianty řeší komponenty přes useScreenSize().
const text = {
  h1: { fontFamily: font.display, fontSize: 60, lineHeight: "63px", fontWeight: 600, letterSpacing: "-0.015em" },
  h2: { fontFamily: font.display, fontSize: 36, lineHeight: "40px", fontWeight: 600, letterSpacing: "-0.015em" },
  h3: { fontFamily: font.display, fontSize: 20, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.012em" },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 1.6, fontWeight: 400 },
  small: { fontFamily: font.body, fontSize: 14, lineHeight: 1.5, fontWeight: 400 },
  // Prostrkaný uppercase štítek nad nadpisem sekce (GALERIE, CENÍK, KONTAKT...).
  // Nejlevnější a nejvýraznější prvek rytmu celé stránky -- nevynechávat.
  eyebrow: {
    fontFamily: font.body,
    fontSize: 11,
    lineHeight: "16.5px",
    fontWeight: 700,
    letterSpacing: "0.28em",
    textTransform: "uppercase",
  },
};

// Mobilní zmenšení nadpisů. h1 v 60 px se na telefon nevejde.
const textMobile = {
  h1: { fontSize: 36, lineHeight: "40px" },
  h2: { fontSize: 28, lineHeight: "32px" },
};

export default {
  color,
  font,
  text,
  textMobile,

  radius: 8,
  maxWidth: 1140,
  gutter: { xs: 20, m: 24 },

  // Vertikální padding sekce; v předloze 72 px, na širokém desktopu víc.
  sectionPad: { xs: 48, m: 72, l: 96 },

  // uu5 má modal 1000, alert 2000, popover 990. Sticky hlavička musí zůstat POD popoverem,
  // jinak by překryla otevřené menu uu5 komponent.
  zIndex: { header: 900 },
};
