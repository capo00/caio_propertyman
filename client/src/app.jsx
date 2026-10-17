// `caio-ui/src/caio-ui-app`, ne kořenový barrel `caio-ui`: ten reexportuje i `UiElements`
// (a s ním `Crud` → `uu5tilesg02*`, `uu5codekitg01-forms`) a `UiEcc` → `uu5richtextg01`.
// Balíček nemá `sideEffects: false`, takže je tree shaking z barrelu nevyhodí a veřejný web
// by je stahoval, i když žádnou tabulku nemá (design-v2.md § 4).
import UiApp from "caio-ui/src/caio-ui-app";
import Uu5Elements from "uu5g05-elements";
import { Lsi, useMemo, useRoute } from "uu5g05";
import Config from "./config/config.js";
import { useScrollTopOnRouteChange } from "./tools/scroll.js";
import { usePageMeta } from "./tools/page-meta.js";
import Router from "./router.jsx";
import Footer from "./components/footer.jsx";
import Contact from "./components/contact/contact.jsx";
import { lsi } from "./lsi/import-lsi.js";
import { HOME_HREF, currentPage, getLanguageUrl } from "./tools/page-language.js";
import { useWebMenu } from "./tools/use-web-menu.jsx";

const { theme } = Config;

// Jazyky webu jsou v package.json (`caio.languages`), jazyk stránky určuje adresa
// (tools/page-language.js). Uložení volby, `<html lang>` a přechod na jinou jazykovou
// verzi při přepnutí řeší caio-ui `SpaProvider` (`getLanguageUrl`).
//
// SpaProvider skládá AppBackground -> LanguageList -> Language -> Session -> Route.
// Spa přidá ErrorBoundary -> ModalBus -> AlertBus a -- když dostane `top`/`footer` --
// i rám stránky (UiApp.Page: lišta + main + patička). Proto appka nemá vlastní Page.

// Horní lišta. Staví se konfigurací UiApp.Page/Spa, ne vlastní komponentou -- `Top`
// z caio-ui není exportovaný schválně, aby byla pro lištu v celém stacku jedna cesta.
//
// Lišta je zelená všude, i nad hero. Barva se drží tokenů předlohy přes cssBackground/cssColor,
// protože GDS paleta `building` je bílá a přenastavit se nedá (docs/component-tree.md § B.0).
//
// Bez `menu` -- ten se dopočítává v `AppFrame` (potřebuje aktuální routu, viz `toMenuItem`),
// zbytek je stálý, takže tu může zůstat jako obyčejná konstanta.
const TOP_BASE = {
  logo: {
    imageSrc: Config.asset.logo,
    // Routa, ne kotva `#hero`: hero je jen na home a z ostatních stránek by kotva bez cíle
    // jen odscrollovala nahoru (Top má na chybějící cíl fallback na scroll na začátek).
    // Úvodní stránka jazyka téhle stránky (`/de/`), ne `/` -- to by vedlo na češtinu.
    href: HOME_HREF,
    // Název webu jako tooltip: uu5 `withTooltip` ho dá do `title` odkazu, a to je zároveň
    // přístupný název loga pro čtečky (bez něj byl odkaz beze jména, A8 2026-10-15).
    tooltip: lsi("property", "name"),
  },
  // Lišta je zelená i po dosednutí; stín při dosednutí dodá Top sám.
  // Kdyby se měl vzhled po dosednutí měnit, každý z těchhle propsů bere i funkci:
  //   cssBackground: ({ stuck }) => (stuck ? theme.color.bg : "transparent")
  cssBackground: theme.color.forest,
  cssColor: theme.color.onDark,
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

// Sekce webu si gutter i vertikální rytmus řeší samy (components/section.jsx),
// takže main veřejné části nesmí přidávat žádné odsazení ani šířku.
const WEB_MAIN = { padding: false };

/**
 * Rám stránky. Admin je vlastní UVE (`src/admin/`) s vlastním rámem, tady je jen web.
 *
 * Musí to být komponenta UVNITŘ `SpaProvider`: `useRoute()` čte kontext, který zakládá
 * teprve `RouteProvider` z něj.
 *
 * KONTAKT je (kompaktní podobou) tady, ne jen v routách: je to poslední sekce KAŽDÉ veřejné
 * stránky, takže kotva `#kontakt` existuje všude, i když na ni od 2026-09-28 už nic v menu
 * neodkazuje (nav.js) -- menu míří rovnou na stránku kontaktu. Na ní (router.jsx) je ale patička
 * navíc -- tu plnou verzi si `Router` vykreslí sám, takže se tu schovává, ať `id="kontakt"` není
 * na stránce dvakrát (docs/decisions.md, § Frontend).
 */
function AppFrame() {
  const [route] = useRoute();
  const currentCode = currentPage(route?.uu5Route)?.code;
  const isContactRoute = currentCode === "contact";
  // Přechod na jinou routu začíná na začátku stránky; fragment a Zpět/Vpřed si řeší
  // uu5g05 sám (viz scroll.js). To pokrývá jen SKUTEČNOU změnu routy -- klik na položku
  // menu mířící na routu, na které host už je, žádnou změnu nevyvolá (`setRoute` na
  // nezměněnou routu je no-op), proto to níž řeší samo menu (viz `toMenuItem` v tools/use-web-menu.jsx).
  useScrollTopOnRouteChange();
  // Každá routa má vlastní titulek, popis a canonical (viz page-meta.js, config/seo.js).
  usePageMeta();

  const menu = useWebMenu(currentCode);
  const top = useMemo(() => ({ ...TOP_BASE, menu }), [menu]);

  return (
    // Web, ne aplikace: `loose` je pro veřejné stránky výchozí volba celého stacku, takže
    // provider obaluje VŠECHNO včetně lišty a patičky, ne jednotlivé sekce.
    // Prakticky to zvedá vnitřní mezery uu5 komponent -- `useSpacing()` vrací
    // a2/b16/c24/d32 místo a2/b8/c16/d24, tedy padding `Tile` z 8 na 16 px a výchozí
    // `gap` v `Uu5Elements.Grid` (spacing.c) z 16 na 24 px. Žádné CSS, jen kontext.
    <Uu5Elements.SpacingProvider type="loose">
      <UiApp.Spa top={top} footer={<Footer />} main={WEB_MAIN}>
        <Router />
        {!isContactRoute && <Contact compact />}
      </UiApp.Spa>
    </Uu5Elements.SpacingProvider>
  );
}

function App() {
  return (
    <UiApp.SpaProvider getLanguageUrl={getLanguageUrl}>
      <AppFrame />
    </UiApp.SpaProvider>
  );
}

export default App;
