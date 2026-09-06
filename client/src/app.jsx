import { UiApp } from "caio-ui";
import Uu5Elements from "uu5g05-elements";
import { Lsi } from "uu5g05";
import Config from "./config/config.js";
import Router from "./router.jsx";
import Footer from "./components/layout/footer.jsx";
import nav from "./content/nav.js";
import { lsi } from "./lsi/import-lsi.js";

const { theme } = Config;

// v1 je jednojazyčná (design-v1.md § 1). Všechny texty ale leží v client/src/lsi/ a čtou se
// přes importLsi, a en.json je vedle cs.json už teď vyplněný -- zapnutí druhého jazyka je
// doplnění "en" do seznamu níž, ne refaktor.
//
// SpaProvider skládá AppBackground -> LanguageList -> Language -> Session -> Route.
// Spa přidá ErrorBoundary -> ModalBus -> AlertBus a -- když dostane `top`/`footer` --
// i rám stránky (UiApp.Page: lišta + main + patička). Proto appka nemá vlastní Page.
const LANGUAGE_LIST = ["cs"];

// Horní lišta. Staví se konfigurací UiApp.Page/Spa, ne vlastní komponentou -- `Top`
// z caio-ui není exportovaný schválně, aby byla pro lištu v celém stacku jedna cesta.
//
// Lišta je zelená všude, i nad hero. Barva se drží tokenů předlohy přes cssBackground/cssColor,
// protože GDS paleta `building` je bílá a přenastavit se nedá (docs/component-tree.md § B.0).
const TOP = {
  logo: {
    uri: Config.asset.logo,
    href: "#hero",
    tooltip: undefined,
  },
  // Lišta je zelená i po dosednutí; stín při dosednutí dodá Top sám.
  // Kdyby se měl vzhled po dosednutí měnit, každý z těchhle propsů bere i funkci:
  //   cssBackground: ({ stuck }) => (stuck ? theme.color.bg : "transparent")
  cssBackground: theme.color.forest,
  cssColor: theme.color.onDark,
  menu: {
    itemList: [
      ...nav.map((item) => ({
        href: item.anchor,
        children: <Lsi lsi={lsi("header", "nav", item.code)} />,
        significance: "subdued",
        colorScheme: "building",
      })),
      {
        href: "#rezervace",
        children: <Lsi lsi={lsi("header", "book")} />,
        significance: "highlighted",
        colorScheme: "building",
        // CTA se nesmí schovat do sbaleného menu ani na mobilu.
        collapsed: "never",
      },
    ],
  },
  // Dvouřádkový název vedle loga. `children` Topu je jeho volný obsah.
  //
  // Skládá se z VLASTNÍCH elementů, ne z `Uu5Elements.Header`. Header nemá token pro font
  // (viz Heading.jsx) -- title i subtitle si renderuje jako `Uu5Elements.Text` s explicitní
  // font-family (Karla), takže zdědění nestačí a jediná cesta k němu vedla přes selektor
  // `[data-name="Uu5Elements.Text"]`.
  //
  // Ten ale **v produkčním buildu neexistuje**: `data-name` je vývojová pomůcka, kterou uu5
  // v produkci nevypisuje. Název tak byl v dev Fraunces a v ostrém provozu Karla -- rozdíl,
  // který v devu není jak uvidět (nalezeno 7. 9. 2026 v afkbratcice, stejná příčina).
  children: (
    <div className={Config.Css.css({ display: "grid", alignContent: "center" })}>
      <span className={Config.Css.css({ ...theme.text.h3, fontSize: 18, lineHeight: "22px" })}>
        <Lsi lsi={lsi("property", "name")} />
      </span>
      <span className={Config.Css.css({ ...theme.text.small, opacity: 0.8 })}>
        <Lsi lsi={lsi("property", "region")} />
      </span>
    </div>
  ),
};

function App() {
  return (
    // Web, ne aplikace: `loose` je pro veřejné stránky výchozí volba celého stacku, takže
    // provider obaluje VŠECHNO včetně lišty a patičky, ne jednotlivé sekce.
    // Prakticky to zvedá vnitřní mezery uu5 komponent -- `useSpacing()` vrací
    // a2/b16/c24/d32 místo a2/b8/c16/d24, tedy padding `Tile` z 8 na 16 px a výchozí
    // `gap` v `Uu5Elements.Grid` (spacing.c) z 16 na 24 px. Žádné CSS, jen kontext.
    <Uu5Elements.SpacingProvider type="loose">
      <UiApp.SpaProvider languageList={LANGUAGE_LIST}>
        <UiApp.Spa
          top={TOP}
          footer={<Footer />}
          // Sekce si gutter i vertikální rytmus řeší samy (components/layout/section.jsx),
          // takže main nesmí přidávat žádné odsazení ani šířku.
          main={{ padding: false }}
        >
          <Router />
        </UiApp.Spa>
      </UiApp.SpaProvider>
    </Uu5Elements.SpacingProvider>
  );
}

export default App;
