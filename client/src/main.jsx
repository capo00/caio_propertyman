import { UiApp } from "caio-ui";
import App from "./app.jsx";
import { preloadLsi } from "./lsi/import-lsi.js";
import { PAGE_LANGUAGE } from "./tools/page-language.js";
import { setupTheme } from "./tools/theme-setup.js";
import { BOOT_OPTIONS } from "./tools/boot-options.js";
// fonts.css se tu neimportuje: `@font-face` vkládá build rovnou do <head> index.html
// (config/font-head.js), aby se písma stahovala hned s HTML, ne až po startu bundlu.

setupTheme();

// Boot screen drží až do hotové stránky (caio-ui `renderApp`/`BootReady`, BootReady je v app.jsx):
// podrží se hned, ať se písma a ikony lišty stahují souběžně s LSI. Na písma první obrazovky
// (Fraunces nadpisy, Karla text) se před puštěním čeká; stahují se už z <head>, takže ~0 ms.
UiApp.keepBootScreen(BOOT_OPTIONS);

// První render až s LSI jazyka stránky (lsi/import-lsi.js, `preloadLsi`), ať se text
// po dotažení jazyka nepřeskládá. Jazyk určuje adresa (tools/page-language.js). Pro češtinu
// se nečeká. Když stažení selže, vykreslí se i tak -- uu5 si jazyk zkusí dotáhnout sám.
preloadLsi(PAGE_LANGUAGE)
  .catch(() => {})
  .then(() => UiApp.renderApp(<App />, BOOT_OPTIONS));
