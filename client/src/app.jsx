// `caio-ui/src/caio-ui-app`, ne kořenový barrel `caio-ui`: ten reexportuje i `UiElements`
// (a s ním `Crud` → `uu5tilesg02*`, `uu5codekitg01-forms`) a `UiEcc` → `uu5richtextg01`.
// Balíček nemá `sideEffects: false`, takže je tree shaking z barrelu nevyhodí a veřejný web
// by je stahoval, i když žádnou tabulku nemá (design-v2.md § 4).
import UiApp from "caio-ui/src/caio-ui-app";
import Uu5Elements from "uu5g05-elements";
import { Lsi, useRoute } from "uu5g05";
import Config from "./config/config.js";
import { useScrollTopOnRouteChange } from "./scroll.js";
import { usePageTitle } from "./page-title.js";
import Router, { isAdminRoute } from "./router.jsx";
import Footer from "./components/layout/footer.jsx";
import Contact from "./components/sections/contact.jsx";
import nav from "./content/nav.js";
import { lsi } from "./lsi/import-lsi.js";
import { useAdminTop } from "./admin/top.jsx";

const { theme } = Config;

// v1 je jednojazyčná (design-v1.md § 1). Všechny texty ale leží v client/src/lsi/ a čtou se
// přes importLsi, a en.json je vedle cs.json už teď vyplněný -- zapnutí druhého jazyka je
// doplnění "en" do seznamu níž, ne refaktor.
//
// SpaProvider skládá AppBackground -> LanguageList -> Language -> Session -> Route.
// Spa přidá ErrorBoundary -> ModalBus -> AlertBus a -- když dostane `top`/`footer` --
// i rám stránky (UiApp.Page: lišta + main + patička). Proto appka nemá vlastní Page.
const LANGUAGE_LIST = ["cs"];

/**
 * Položka `content/nav.js` -> položka `ActionGroup`u v liště.
 *
 * `href` rozhoduje o chování a překládá si ho `CaioApp.Top` sám: kotva (`#kontakt`)
 * scrolluje po aktuální stránce, cokoli jiného je routa a naviguje. Zanoření je rekurzivní,
 * protože `Top` do `itemList` položky sestupuje taky (dropdown pak reaguje na `onLabelClick`).
 *
 * Popisek se nebere z `header.nav.<code>` natvrdo -- položka si nese `label` jako cestu do
 * LSI, takže názvy prostorů v submenu jsou tytéž jako na jejich stránkách.
 */
function toMenuItem(item) {
  const menuItem = {
    href: item.route ?? item.anchor,
    children: <Lsi lsi={lsi(...item.label)} />,
    significance: "subdued",
    colorScheme: "building",
  };

  if (item.children?.length) menuItem.itemList = item.children.map(toMenuItem);

  return menuItem;
}

// Horní lišta. Staví se konfigurací UiApp.Page/Spa, ne vlastní komponentou -- `Top`
// z caio-ui není exportovaný schválně, aby byla pro lištu v celém stacku jedna cesta.
//
// Lišta je zelená všude, i nad hero. Barva se drží tokenů předlohy přes cssBackground/cssColor,
// protože GDS paleta `building` je bílá a přenastavit se nedá (docs/component-tree.md § B.0).
const TOP = {
  logo: {
    uri: Config.asset.logo,
    // Routa, ne kotva `#hero`: hero je jen na home a z ostatních stránek by kotva bez cíle
    // jen odscrollovala nahoru (Top má na chybějící cíl fallback na scroll na začátek).
    href: "home",
    tooltip: undefined,
  },
  // Lišta je zelená i po dosednutí; stín při dosednutí dodá Top sám.
  // Kdyby se měl vzhled po dosednutí měnit, každý z těchhle propsů bere i funkci:
  //   cssBackground: ({ stuck }) => (stuck ? theme.color.bg : "transparent")
  cssBackground: theme.color.forest,
  cssColor: theme.color.onDark,
  menu: {
    itemList: [
      ...nav.map(toMenuItem),
      {
        href: "rezervace",
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

// Obsah adminu je aplikační, ne prezentační: odsazení a rozumná maximální šířka od rámu,
// ne od sekcí (ty admin nemá).
const ADMIN_MAIN = { padding: true, maxWidth: 1400 };

// Sekce webu si gutter i vertikální rytmus řeší samy (components/layout/section.jsx),
// takže main veřejné části nesmí přidávat žádné odsazení ani šířku.
const WEB_MAIN = { padding: false };

/**
 * Rám stránky. Admin má vlastní lištu a je bez patičky, takže se `top`/`footer`/`main`
 * vybírají podle aktuální routy.
 *
 * Musí to být komponenta UVNITŘ `SpaProvider`: `useRoute()` čte kontext, který zakládá
 * teprve `RouteProvider` z něj. Vnořovat kvůli tomu druhou `Page` do `Spa` by znamenalo
 * dvě lišty nad sebou (design-v2.md § 4).
 *
 * KONTAKT je tady, ne v routách: je to poslední sekce KAŽDÉ veřejné stránky, takže kotva
 * `#kontakt` existuje všude a položka v menu může zůstat plynulým scrollem po aktuální
 * stránce (docs/proposal-routes.md § 3a). Admin ji nemá -- tam se přepíná celý rám.
 */
function AppFrame() {
  const [route] = useRoute();
  const isAdmin = isAdminRoute(route?.uu5Route);
  // Přechod na jinou routu začíná na začátku stránky; fragment a Zpět/Vpřed si řeší
  // uu5g05 sám (viz scroll.js).
  useScrollTopOnRouteChange();
  // Každá routa má vlastní titulek v panelu prohlížeče (viz page-title.js).
  usePageTitle();
  // Hook se volá vždycky, i na webu -- podmíněné volání hooků React neumí. Je to jen
  // složení objektu nad `useSession()`, takže na veřejné stránce nic nestojí.
  const adminTop = useAdminTop();

  return (
    <UiApp.Spa
      top={isAdmin ? adminTop : TOP}
      footer={isAdmin ? undefined : <Footer />}
      main={isAdmin ? ADMIN_MAIN : WEB_MAIN}
    >
      <Router />
      {!isAdmin && <Contact />}
    </UiApp.Spa>
  );
}

function App() {
  return (
    // Web, ne aplikace: `loose` je pro veřejné stránky výchozí volba celého stacku, takže
    // provider obaluje VŠECHNO včetně lišty a patičky, ne jednotlivé sekce.
    // Prakticky to zvedá vnitřní mezery uu5 komponent -- `useSpacing()` vrací
    // a2/b16/c24/d32 místo a2/b8/c16/d24, tedy padding `Tile` z 8 na 16 px a výchozí
    // `gap` v `Uu5Elements.Grid` (spacing.c) z 16 na 24 px. Žádné CSS, jen kontext.
    <Uu5Elements.SpacingProvider type="loose">
      <UiApp.SpaProvider languageList={LANGUAGE_LIST}>
        <AppFrame />
      </UiApp.SpaProvider>
    </Uu5Elements.SpacingProvider>
  );
}

export default App;
