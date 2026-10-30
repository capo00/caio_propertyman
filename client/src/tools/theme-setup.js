import Config from "../config/config.js";

const { theme } = Config;

/**
 * Globální styly, které musí platit dřív, než se cokoli vykreslí. Volá ho entry KAŽDÉ UVE
 * (main.jsx pro web, admin/index.jsx pro admin), ať admin vypadá jako tentýž dům.
 *
 * Barvy tu nejsou: CSS proměnné obou režimů a barvy `body` vkládá do dokumentu caio-devkit
 * a uu5 barvy (`primary` zelená, `secondary` terakota, v každém režimu jiný odstín) nastavuje
 * caio-ui `SpaProvider` -- obojí z package.json `caio.theme`.
 */
export function setupTheme() {
  // uu5g05 injektuje globální pravidlo `html { font-family: Roboto, ClearSans, sans-serif;
  // line-height: 1.2 }` a pro UI font NEEXISTUJE žádný token, kterým by se to dalo přebít.
  // Jediná cesta je vlastní global -- náš `owner` je pozdější, takže vyhrává.
  Config.Css.injectGlobal({
    html: {
      fontFamily: theme.font.body,
      lineHeight: theme.text.body.lineHeight,
      // Fraunces a Karla jsou variabilní fonty; bez tohohle je Chrome renderuje o něco tvrději.
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    body: {
      fontSize: theme.text.body.fontSize,
    },
    "*, *::before, *::after": { boxSizing: "border-box" },
    // Kotvy (#galerie, #cenik...) nesmí skončit pod sticky hlavičkou.
    ":target": { scrollMarginBlockStart: 96 },
    // Odznak reCAPTCHA v rohu stránky (majitel 2026-10-09). Google ho dovoluje skrýt, když je
    // u formuláře vidět text „chrání reCAPTCHA, platí zásady a podmínky Google“ s odkazy --
    // ten je pod rezervačním formulářem (reservation-form.jsx, `captchaNotice`).
    // `visibility`, ne `display: none`: s display none reCAPTCHA v3 přestane fungovat.
    ".grecaptcha-badge": { visibility: "hidden" },
  });
}

export default setupTheme;
