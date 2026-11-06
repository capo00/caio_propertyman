// Designové tokeny odečtené z předlohy (ux/) -- viz docs/ux-design-system.md, kde je
// u každé hodnoty i její oklch originál a čím se v předloze projevuje.
//
// Tohle (spolu s paletou v caio.config.js `theme`) je JEDINÉ místo, kde smí být barvy
// a velikosti písma. Komponenty berou vždycky odsud; když se v JSX objeví "#..." nebo
// "fontSize: 36", je to chyba.

// Barvy: dvě palety se stejnými rolemi jsou v caio.config.js `theme` -- jediné místo, kde
// smí být hex barvy palety (oklch originály a role v docs/ux-design-system.md § 1). Světlá je
// předloha webu, tmavá je varianta A „Teplá noc“ (majitel 2026-10-30, docs/decisions.md).
//
// Komponenty berou barvy jako CSS proměnné (`color.<role>` = `var(--rr-<role>)`): režim se
// přepne jedním atributem na <html> bez překreslení Reactu. Proměnné obou režimů vkládá do
// hlavičky caio-devkit, uu5 barvy (`primary` = role primary, `secondary` = terakota accent)
// nastaví caio-ui `SpaProvider` -- obojí z caio.config.js `theme`.
//
// `forest` a `onDark` jsou v obou paletách stejné: lišta, hero a rezervace vypadají v obou
// režimech stejně. Hex z palety (`palette.light.forest`) je potřeba jen tam, kde CSS proměnná
// nestačí -- lišta (`Top` z hexu pozná, že stojí na tmavém).
//
// Přes kořenový barrel `caio-ui`, ne `caio-ui/src/...` (hlídá lazy-libs.test.js).
import { UiApp } from "caio-ui";

const { palette, color, paletteVars, lightScope, darkScope } = UiApp.Theme;

// Co není role palety, protože to na režimu nezávisí nebo to není barva:
const surface = {
  // Jemné diagonální proužky zástupné plochy fotky (photo.jsx) -- bílá 5 % sedí na všech tónech.
  placeholderStripe: "rgba(255, 255, 255, 0.05)",
  // Fotky v tmavém režimu ztlumené na 88 % jasu (majitel 2026-10-30). Jen na našich <img>,
  // ne na uu5 komponentách (docs/decisions.md).
  photoDarkFilter: "brightness(0.88)",
  // Kresba roubenky v kontaktu (contact.jsx) je <img>, takže `currentColor` nebere a barví se
  // filtrem: černá v obou režimech, v tmavém na papíru (role palety `paper`, majitel 2026-11-05).
  drawingFilter: "brightness(0)",
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
  palette,
  color,
  paletteVars,
  lightScope,
  darkScope,
  surface,
  font,
  text,
  textMobile,

  radius: 8,
  maxWidth: 1140,
  gutter: { xs: 20, m: 24 },

  // Vertikální padding sekce; v předloze 72 px, na širokém desktopu víc.
  sectionPad: { xs: 48, m: 72, l: 96 },
};
