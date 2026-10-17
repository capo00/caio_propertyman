import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import { preloadLsi } from "./lsi/import-lsi.js";
import { PAGE_LANGUAGE } from "./tools/page-language.js";
import { setupTheme } from "./tools/theme-setup.js";
// fonts.css se tu neimportuje: `@font-face` vkládá build rovnou do <head> index.html
// (config/font-head.js), aby se písma stahovala hned s HTML, ne až po startu bundlu.

setupTheme();

// První render až s LSI jazyka stránky (lsi/import-lsi.js, `preloadLsi`), ať se text
// po dotažení jazyka nepřeskládá. Jazyk určuje adresa (tools/page-language.js). Pro češtinu
// se nečeká. Když stažení selže, vykreslí se i tak -- uu5 si jazyk zkusí dotáhnout sám.
preloadLsi(PAGE_LANGUAGE)
  .catch(() => {})
  .then(() => createRoot(document.getElementById("root")).render(<App />));
