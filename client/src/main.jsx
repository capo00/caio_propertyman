import { createRoot } from "react-dom/client";
import Uu5Elements from "uu5g05-elements";
import Config from "./config/config.js";
import App from "./app.jsx";
import "./fonts.css";

const { theme } = Config;

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
    margin: 0,
    backgroundColor: theme.color.bg,
    color: theme.color.fg,
    fontSize: theme.text.body.fontSize,
  },
  "*, *::before, *::after": { boxSizing: "border-box" },
  // Kotvy (#galerie, #cenik...) nesmí skončit pod sticky hlavičkou.
  ":target": { scrollMarginBlockStart: 96 },
});

// Přebarvení uu5 komponent na paletu předlohy. Z hexu si GDS odvodí všech 17 odstínů
// včetně hover stavů.
//
// MUSÍ být před prvním renderem -- setMeaningColor mutuje modulový stav a NENÍ reaktivní,
// takže už vyrenderované komponenty by barvu nepřepočítaly.
//
// Pozor, tohle obarví jen uu5 komponenty (Modal, formuláře, Alert). Vzhled samotného webu
// stojí na sémantickém HTML + Config.Css -- typografii ani spacing uu5 přebít nejde,
// viz docs/decisions.md.
Uu5Elements.UuGds.setMeaningColor("primary", theme.color.primary);
Uu5Elements.UuGds.setMeaningColor("secondary", theme.color.accent);

createRoot(document.getElementById("root")).render(<App />);
