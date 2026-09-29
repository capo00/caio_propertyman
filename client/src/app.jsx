// `caio-ui/src/caio-ui-app`, ne kořenový barrel `caio-ui`: ten reexportuje i `UiElements`
// (a s ním `Crud` → `uu5tilesg02*`, `uu5codekitg01-forms`) a `UiEcc` → `uu5richtextg01`.
// Balíček nemá `sideEffects: false`, takže je tree shaking z barrelu nevyhodí a veřejný web
// by je stahoval, i když žádnou tabulku nemá (design-v2.md § 4).
import UiApp from "caio-ui/src/caio-ui-app";
import Uu5Elements from "uu5g05-elements";
import { Lsi, useMemo, useRoute } from "uu5g05";
import Config from "./config/config.js";
import { useScrollTopOnRouteChange } from "./tools/scroll.js";
import { usePageTitle } from "./tools/page-title.js";
import Router, { isAdminRoute } from "./router.jsx";
import Footer from "./components/footer.jsx";
import Contact from "./components/contact/contact.jsx";
import nav from "./config/nav.js";
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
 * Položka `config/nav.js` -> položka `ActionGroup`u v liště.
 *
 * `href` rozhoduje o chování a překládá si ho `CaioApp.Top` sám: kotva scrolluje po
 * aktuální stránce, cokoli jiného je routa a naviguje.
 *
 * Žádné `itemList`: menu je jednoúrovňové (viz config/nav.js). Stránky prostorů se
 * dostanou z rozcestníku `ubytovani`, ne z rozbaleného menu.
 *
 * Popisek se nebere z `header.nav.<code>` natvrdo -- položka si nese `label` jako cestu do
 * LSI, takže se název dá vzít ze stejného místa jako na cílové stránce.
 *
 * `currentRoute` (2026-09-28, majitel): klik na položku stránky, na které host už je,
 * musí plynule odscrollovat na začátek, ne se netvářit (`setRoute` na nezměněnou routu
 * neudělá nic). Řeší se přepnutím `href` na kotvu bez cíle -- `withItemBehaviour`
 * v `caio-ui/src/caio-ui-app/top.jsx` pro kotvu bez odpovídajícího `id` v DOM sama spadne
 * na `animateScrollTo(0)`, tedy přesně na plynulý skok na začátek, stejným tempem jako
 * ostatní kotvy v appce.
 */
function toMenuItem(item, currentRoute) {
  const targetRoute = item.route ?? item.anchor;
  return {
    href: item.route && item.route === currentRoute ? "#" : targetRoute,
    children: <Lsi lsi={lsi(...item.label)} />,
    significance: "subdued",
    colorScheme: "building",
  };
}

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
    href: "home",
    tooltip: undefined,
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

// Obsah adminu je aplikační, ne prezentační: odsazení a rozumná maximální šířka od rámu,
// ne od sekcí (ty admin nemá).
const ADMIN_MAIN = { padding: true, maxWidth: 1400 };

// Sekce webu si gutter i vertikální rytmus řeší samy (components/section.jsx),
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
 * KONTAKT je (kompaktní podobou) tady, ne jen v routách: je to poslední sekce KAŽDÉ veřejné
 * stránky, takže kotva `#kontakt` existuje všude, i když na ni od 2026-09-28 už nic v menu
 * neodkazuje (nav.js) -- menu míří rovnou na routu `kontakt`. Admin kontakt nemá vůbec --
 * tam se přepíná celý rám. Na vlastní routě `kontakt` (router.jsx) je ale patička navíc --
 * tu plnou verzi si `Router` vykreslí sám, takže se tu schovává, ať `id="kontakt"` není
 * na stránce dvakrát (docs/decisions.md, § Frontend).
 */
function AppFrame() {
  const [route] = useRoute();
  const currentRoute = route?.uu5Route;
  const isAdmin = isAdminRoute(currentRoute);
  const isContactRoute = currentRoute === "kontakt";
  // Přechod na jinou routu začíná na začátku stránky; fragment a Zpět/Vpřed si řeší
  // uu5g05 sám (viz scroll.js). To pokrývá jen SKUTEČNOU změnu routy -- klik na položku
  // menu mířící na routu, na které host už je, žádnou změnu nevyvolá (`setRoute` na
  // nezměněnou routu je no-op), proto to níž řeší samo menu (viz `toMenuItem`).
  useScrollTopOnRouteChange();
  // Každá routa má vlastní titulek v panelu prohlížeče (viz page-title.js).
  usePageTitle();
  // Volá se vždycky, i na webu -- podmíněné volání hooků React neumí. Od té doby, co
  // identitu řeší `Top` sám přes `displayIdentity`, je to jen složení objektu, takže
  // na veřejné stránce nestojí vůbec nic.
  const adminTop = useAdminTop();

  // Závisí na aktuální routě (viz `toMenuItem`), proto tu, ne v `TOP_BASE`.
  const top = useMemo(
    () => ({
      ...TOP_BASE,
      menu: {
        itemList: [
          ...nav.map((item) => toMenuItem(item, currentRoute)),
          {
            href: currentRoute === "rezervace" ? "#" : "rezervace",
            children: <Lsi lsi={lsi("header", "book")} />,
            significance: "highlighted",
            colorScheme: "building",
            // CTA se nesmí schovat do sbaleného menu ani na mobilu.
            collapsed: "never",
          },
        ],
      },
    }),
    [currentRoute],
  );

  return (
    <UiApp.Spa
      top={isAdmin ? adminTop : top}
      footer={isAdmin ? undefined : <Footer />}
      main={isAdmin ? ADMIN_MAIN : WEB_MAIN}
    >
      <Router />
      {!isAdmin && !isContactRoute && <Contact compact />}
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
