import { UiApp } from "caio-ui";
import Router from "./router.jsx";

// v1 je jednojazyčná (design-v1.md § 1). Všechny texty ale leží v client/src/lsi/ a čtou se
// přes importLsi, a en.json je vedle cs.json už teď vyplněný -- zapnutí druhého jazyka je
// doplnění "en" do seznamu níž, ne refaktor.
//
// SpaProvider skládá AppBackground -> LanguageList -> Language -> Session -> Route.
// Spa přidá ErrorBoundary -> ModalBus -> AlertBus.
const LANGUAGE_LIST = ["cs"];

function App() {
  return (
    <UiApp.SpaProvider languageList={LANGUAGE_LIST}>
      <UiApp.Spa>
        <Router />
      </UiApp.Spa>
    </UiApp.SpaProvider>
  );
}

export default App;
