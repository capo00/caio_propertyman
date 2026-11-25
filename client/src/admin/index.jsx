import AdminApp from "./app.jsx";
import { preloadLsi } from "../lsi/import-lsi.js";
import { UiApp } from "caio-ui";
import { setupTheme } from "../tools/theme-setup.js";
import { BOOT_OPTIONS } from "../tools/boot-options.js";

// Entry UVE adminu (admin/index.html). Stejný start jako web (main.jsx): globální styly
// a barvy, pak první render až s LSI jazyka, ať se texty nepřeskládají. Admin jazyk v adrese
// nemá: je to volba z přepínače na webu, jinak výchozí jazyk (caio-ui `SpaProvider`).
setupTheme();

// Boot screen jako na webu (caio.config.js `uves.admin`), drží se do přihlášení a první obrazovky
// (`BootReady` v admin/app.jsx). Dřív admin boot screen neměl a na pomalé síti byla 15–33 s
// prázdná obrazovka (docs/proposal-loading-performance.md P3, Caio 2026-11-25).
UiApp.keepBootScreen(BOOT_OPTIONS);

preloadLsi(UiApp.Language.getSavedLanguage() ?? UiApp.Language.DEFAULT_LANGUAGE)
  .catch(() => {})
  .then(() => UiApp.renderApp(<AdminApp />, BOOT_OPTIONS));
