import { UiApp } from "caio-ui";
import Router from "./router.jsx";

// v1 je jednojazyčná (design-v1.md § 1). Texty se ale píšou jako LSI objekty ({ cs: "..." }),
// takže přidání jazyka je doplnění klíče, ne refaktor.
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
