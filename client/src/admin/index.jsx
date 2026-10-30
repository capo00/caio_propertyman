import { createRoot } from "react-dom/client";
import AdminApp from "./app.jsx";
import { preloadLsi } from "../lsi/import-lsi.js";
import { UiApp } from "caio-ui";
import { setupTheme } from "../tools/theme-setup.js";

// Entry UVE adminu (admin/index.html). Stejný start jako web (main.jsx): globální styly
// a barvy, pak první render až s LSI jazyka, ať se texty nepřeskládají. Admin jazyk v adrese
// nemá: je to volba z přepínače na webu, jinak výchozí jazyk (caio-ui `SpaProvider`).
setupTheme();

preloadLsi(UiApp.Language.getSavedLanguage() ?? UiApp.Language.DEFAULT_LANGUAGE)
  .catch(() => {})
  .then(() => createRoot(document.getElementById("root")).render(<AdminApp />));
