# Rozhodnutí a vyřešené problémy (log)

Věci, které se rozhodly jednou a pak už se o nich nediskutuje. Detaily k jednotlivým
oblastem jsou v [impl-plan-v1.md](./impl-plan-v1.md) a [ux-design-system.md](./ux-design-system.md);
rozdělané věci v [wip.md](./wip.md).

Formát je stejný jako `caio-devkit/docs/decisions.md`.

---

## Struktura appky

- **`caio-create-app` se pouští přímo v rootu existujícího repa** (2026-08-29).
  Scaffold nemá argument pro cílovou složku — běží v `process.cwd()`. V nepráz­dné složce
  jen vypíše varování, **nic neblokuje a neptá se**, a `git init` nevolá, takže existující
  `.git` přežije. Repo `caio_propertyman` má dnes jen `design.md`, `design-v1.md`, `docs/`
  a `ux/` — žádný `package.json`, `README.md`, `.gitignore` ani `.npmrc`, takže **není co
  přepsat**. Alternativa „scaffoldovat do temp a přenést ručně“ je proto zbytečná práce.

- **Nezmenšené originály ikon jsou v `client/assets-src/meta/`** (2026-08-31). Sada
  z realfavicongeneratoru měla 1,6 MB (`og-image.png` sama 850 kB) a všechno v
  `client/public/assets/` se 1:1 kopíruje do build outputu, takže by se to celé nasazovalo
  a stahovalo. Do `assets/meta/` jde zmenšená varianta (ikony PNG-256, OG jako JPEG q85),
  originály zůstávají v `client/assets-src/`, odkud je **nic nekopíruje ani nedeployuje** —
  `client/` je v `.gcloudignore` a mimo `client/public/` po něm Vite nesahá. Kdyby se sada
  předělávala, vychází se odtamtud, ne ze zmenšených souborů.

- **Rozvržení serveru: `server/&lt;entita&gt;/{dao,crud,api}.js`** (2026-08-29), tedy podle
  [design-v1.md § 3](../design-v1.md#3-struktura-v1), **ne** podle scaffoldu.
  `caio-create-app` zakládá prázdné `server/api/`, `server/abl/`, `server/dao/` (dělení
  podle vrstvy) a stejnou konvenci má i `caio-server` uvnitř sebe. Obojí funguje —
  framework strukturu nevynucuje, `App.init({ api })` bere jen složenou mapu.
  Volím dělení **podle entity**, protože: design už ho popisuje, u ~10 entit ve v2/v3
  se ve `server/dao/` s deseti soubory hůř orientuje, a změna jedné entity je pak změna
  v jedné složce. Prázdné scaffoldované složky se po scaffoldu smažou.

- **Business logika je v `crud.js` jako `extends Crud`** (2026-08-29). `caio-server`
  exportuje třídu `Crud` (`list/get/create/update/delete` nad dao instancí, chybové kódy
  `caio-server/&lt;name&gt;/&lt;op&gt;`). Soubor se jmenuje `crud.js` (design-v1) i když v `caio-serveru`
  se stejné vrstvě říká `abl` — jméno souboru je kosmetika, důležité je, že vrstva existuje.

## Frontend

- **Web je JEDNA stránka, routy sekcí jen přesměrují na kotvu** (2026-09-01).
  Ruší předchozí rozhodnutí „každá sekce má navíc vlastní routu" (viz níž).
  `home` skládá všechny sekce pod sebe a menu i tlačítka míří na kotvy (`#galerie`, `#cenik`, …).
  Původní routy (`/gallery`, `/pricing`, …) **zůstávají funkční**: vyrenderují tutéž `home`
  a doscrollují na svou sekci (`<Home scrollTo="#galerie" />`), takže existující odkazy
  nespadnou na 404. Seznam sekcí a jejich kotev je v `client/src/content/nav.js`
  (jen struktura, popisky v LSI pod `header.nav.<code>`).
  Odsazení pod sticky lištu **není potřeba a nikde se nenastavuje** (ověřeno 2026-09-04):
  `scrollMarginBlockStart` na `Section` je v kódu zakomentovaný a `scroll.js` ho jen
  respektuje, kdyby ho někdy dostal. Lišta je `sticky`, takže zůstává v toku, a při scrollu
  dolů odjede (`visibility: "onScrollUp"`) — cíl kotvy nezakrývá.
  Tím padl `routes/section-page.jsx` a dvojí cíl (`anchor` + `route`) u `Button`u.

  <details><summary>Původní rozhodnutí z 2026-08-29 (už neplatí)</summary>

  Předloha je one-page, appka bude mít routy. `home` je celá one-page předloha a každá sekce
  má navíc vlastní routu, která renderuje tutéž komponentu sekce samostatně. Menu může
  odkazovat na kotvy i na routy podle toho, co se ukáže jako lepší.
  </details>

- **Hlavička a patička se nastavují přes `UiApp.Spa`, appka nemá vlastní `Page`** (2026-09-01).
  `caio-ui` dostal zrevidované `Spa`/`Page`/`Top`: `Spa` bere `top`, `footer` a `main`
  a složí celý rám stránky. Tím zmizely `components/layout/header.jsx`
  a `components/layout/page.jsx` — lišta je dnes konfigurace v `app.jsx`.
  `Top` z caio-ui **není exportovaný schválně**, aby na lištu byla jedna cesta.
  Detaily API jsou v `caio-ui/README.md`; co je specifické pro tenhle web:
  - Lišta je **zelená všude** (`cssBackground: theme.color.forest`). GDS paleta `building`
    je bílá a přenastavit ji nejde (viz [component-tree.md § B.0](./component-tree.md)),
    proto se barvy předávají jako CSS, ne přes `colorScheme`.
  - Menu staví na `Uu5Elements.ActionGroup`, který si sbalení do hamburgeru na mobilu
    a tabletu řeší sám podle šířky kontejneru. CTA „Rezervovat" má `collapsed: "never"`,
    takže zůstává vidět.
  - Dvouřádkový název vedle loga je `Uu5Elements.Header` (`title` + `subtitle`), tedy
    **uu5 stupně** — 16/700 a 12 místo Fraunces 17. **Font je ale Fraunces** (opraveno
    2026-09-04): `Header` sází `title`/`subtitle` jako `Uu5Elements.Text` s vlastní
    explicitní `font-family`, takže dědění z `Header`u nestačilo a `app.jsx` cílí
    `className`em na `[data-name="Uu5Elements.Text"]` uvnitř. Je to totéž jedno rozhodnutí
    o fontu jako v `Heading`u, jen druhé místo — soupis v
    [component-tree.md § B.0](./component-tree.md#b0-co-z-uu5-jde-a-co-ne-měřeno-ne-odhadem).
  - `theme.zIndex.header` zmizel: `withStickyTop` používá `Config.STICKY_TOP_MAX_ZINDEX`,
    což je shodou okolností tatáž 900, kterou jsme drželi ručně.
  - **Lišta se při scrollu dolů schovává** (2026-09-03, majitel): `withStickyTop` má
    v `Top` `visibility: "onScrollUp"` a je to **default celého `caio-ui`**, ne nastavení
    tohohle webu — appka to může přepnout propem `sticky` na `Page`/`Spa` (`"always"`,
    `false`). Čtení tak má celou výšku okna a navigace je zpátky jedním gestem nahoru.
    Mechanika (HOC nemění `display`, jen odečítá výšku od `top`) a dva důsledky, které
    z propu samy nevypadnou — spojování `transition` a návrat fokusu do odjeté lišty —
    jsou popsané v `caio-ui/README.md` a v [wip.md](./wip.md).

- **Web stojí na `uu5g05-elements` a komponenty se nastavují PROPSY** (2026-09-03, majitel).
  Ruší rozhodnutí ze 2026-08-29 níž. Pravidlo pro celou `caio-architecture`:
  najdi prop (`significance`, `colorScheme`, `size`, `borderRadius`, `header`,
  `BackgroundProvider`, `SpacingProvider`, …) a **přijmi, jak komponenta vypadá**.
  Přestylování — `className` nebo `Config.Css.css()` nad uu5 komponentou — se nedělá z vlastní
  iniciativy: nejdřív se navrhne a **musí ho schválit majitel**. Vzhled ustupuje jednomu design
  systému, i když se tím posune proti grafické předloze.
  Konkrétně to na tomhle webu znamená:
  - `layout/button.jsx`, `layout/card.jsx` a `layout/heading.jsx` **nezmizely** — jsou to
    tenké obaly nad `Uu5Elements.Button` / `Tile` / `Text`. Propsy pro celý web tak drží
    jedno místo a sekce se při změně nesahají.
  - **Jediné schválené přebití je `fontFamily: Fraunces`.** Font v GDS typografii není žádný
    token — uu5 ho dědí z globálního `html { font-family }`, které `main.jsx` nastavuje na
    Karlu — takže bez té deklarace by display font ze webu zmizel. Je na **dvou** místech:
    v `Heading`u (na našem `<hN>` uvnitř `children` jako funkce) a v `app.jsx` na
    `Uu5Elements.Header` v liště. Kompletní soupis toho, co je v kódu přebité — včetně
    jednoho zbytku, který schválený není (`Icon` v potvrzení formuláře) — je
    v [component-tree.md § B.0](./component-tree.md#b0-co-z-uu5-jde-a-co-ne-měřeno-ne-odhadem).
  - Cena, kterou to má: CTA 48 px místo 54 a sazba 16/500 místo 16/600, h1 44 px místo 60,
    h2 30 místo 36, karty čistě bílé s linkou `#E0E0E0` místo `#FFFDF9` s `#DFDBCB`,
    accordion jako čtyři panely se 4px mezerou místo jednoho bloku s vlasovými linkami.
  - `SpacingProvider type="loose"` obaluje **celou appku** — pro weby je to výchozí volba,
    prakticky dává `Tile`u padding 16 px místo 8 a `Grid`u výchozí gap 24 místo 16.
  - Podklad se hlásí kontextem, ne propem u každé komponenty: `Section variant="forest"`
    zapíná `BackgroundProvider background="dark"` a bílé karty v rezervaci ho vrací na
    `light`. Tím zmizely varianty `onDark`/`outlineOnDark` u tlačítka.
  - **Naše zůstávají** `Section`, `Eyebrow` a `Photo`: vertikální rytmus a gutter GDS nemá
    a prostrkání eyebrow (0,28 em) proti `interface/highlight` (0,5 px) je šestinásobek.
  - Naměřené limity a pasti (mapování `significance` v `Panel`u, `Link type` versus
    `withRouteLink`, `Grid` bez `ContentSizeProvider`u) jsou v
    [component-tree.md](./component-tree.md) a [wip.md](./wip.md).

  <details><summary>Původní rozhodnutí z 2026-08-29 (už neplatí)</summary>

  **Veřejný web se sází sémantickým HTML + `Config.Css.css()`, ne `Uu5Elements.Text`.**
  `uu5g05-elements` je business design systém: `Uu5Elements.Text category="story"
  segment="heading"` vyrenderuje uu5 typografii, ne Fraunces, a `colorScheme` míchá barvy
  z GDS palety. Typografii ani spacing nejde přebít žádným API — jediné, co se přebít dá,
  je osm barevných „meanings" přes `UuGds.setMeaningColor`. Kdybychom vzhled předlohy cpali
  do `Uu5Elements`, bojujeme s knihovnou v každé komponentě. `Uu5Elements` se proto používá
  tam, kde dodává **chování**, ne vzhled: `Modal`, `AlertBus`, `Calendar`, `Pending`,
  a `uu5g05-forms` na rezervační formulář.

  Co z toho zůstalo v platnosti: `setMeaningColor("primary", "#315833")` a
  `setMeaningColor("secondary", accent)` v `main.jsx` (jinak by uu5 komponenty byly modré),
  globální přepis `html { font-family }` na Karlu, a fakt, že paleta `building` je čistě
  bílá a **nepřenastavitelná**. Co padlo: že se kvůli tomu web nesmí stavět z `Uu5Elements`.
  </details>

- **Mapa je dvoufázová a klíč se zapéká do buildu** (2026-09-03). `components/map.jsx`:
  první fáze je **statický obrázek z Maps Static API ve výchozím vzhledu Googlu**
  s `loading="lazy"`, takže request odejde teprve když se sekce Kontakt dostane do viewportu.
  Kliknutím **kamkoli do mapy** (`Box onClick` + `elementAttrs` s `role="button"`,
  `tabIndex` a Enter/Space kvůli klávesnici) se obrázek nahradí iframem **Maps Embed API**;
  samostatné tlačítko tam není, jen tichý popisek pod mapou, že kliknutí načte Google.
  Výchozí vzhled je záměr (majitel, 2026-09-03): Static API `style=` umí, ale Embed API ne,
  takže stylovaná statická mapa by se po kliknutí viditelně přebarvila.
  Proč obojí: Embed API je zdarma a bez limitů, ale zakládá cookies; Static API **cookies
  nenastaví** (odejde jen IP a referer) a má 10 000 volání měsíčně zdarma, pak $7/1000 —
  strop, na který tenhle web nedosáhne. Obrázek se **nesmí** ukládat a servírovat z našeho
  serveru (podmínky Googlu), takže se generuje z URL při každém zobrazení.
  Stylovaná interaktivní mapa by znamenala Maps JavaScript API, které se platí per map load.
  Bez klíče (nebo když se obrázek nenačte) zůstává `Uu5Elements.PlaceholderBox code="location"`
  s odkazem do Google Maps.
  Klíč se zadává jako `GOOGLE_MAPS_API_KEY` do `client/.env.development` (v `.gitignore`)
  a do prostředí, kde běží build; do bundlu ho dostane `define` v `client/vite.config.js`.
  **`import.meta.env.VITE_*` v tomhle buildu nefunguje** — výstup je SystemJS a hodnota se
  do bundlu vůbec nedostane (ověřeno). Bez klíče komponenta ukáže placeholder a jen odkaz
  do Google Maps, takže se do produkce nemůže dostat poloviční mapa.
  Klíč je v URL iframu veřejný — musí mít v Google Cloud omezení na HTTP referrer.

- **Layout si appka staví sama** (2026-08-29) — ne rozhodnutí, spíš daná věc:
  `caio-ui-app/exports.js` reexportuje jen `spa-provider`, `spa` a `with-route`.
  `UiApp.Top`/`UiApp.Page` v balíčku existují a README je popisuje, ale z barrelu nejsou
  dostupné a `package.json` nemá `exports` mapu. Nám to vyhovuje — předloha má vlastní
  hlavičku webu, ne aplikační top bar.

- **Všechny texty jdou přes `importLsi`, včetně obsahu** (2026-08-31). Dřív byly texty
  rozeseté ve dvou tvarech: obsahové jako LSI objekty `{ cs: "…" }` v `content/*.js`
  a popisky rozhraní natvrdo v komponentách. Teď je **všechno** v `client/src/lsi/cs.json`
  a `en.json` a čte se přes `client/src/lsi/import-lsi.js` — stejný mechanismus, jaký používá
  uu5g05 a `caio-ui` (viz `caio-devkit` README, 5.6).
  V `content/*.js` zůstala **jen struktura**: `code`, `order`, čísla, souřadnice, `src` fotek,
  sazby ceníku. Položka se do LSI adresuje svým kódem, takže `content/amenities.js` je dnes
  seznam kódů a texty k nim jsou pod `amenities.<code>`.
  Adresa, telefon a e-mail v `content/contact.js` zůstaly také — nejsou to překlady, ale údaje.
  Komponenty, které berou `lsi` prop (`Heading`, `Eyebrow`, `Button`, `Photo`), se měnit
  nemusely: helper `lsi("a", "b")` vrací `{ import, path }`, což uu5g05 bere všude, kde bere
  LSI objekt.
  **Appka je pořád jednojazyčná** (`languageList = ["cs"]` v `app.jsx`), ale `en.json` je
  vyplněný, takže zapnutí angličtiny je doplnění `"en"` do toho seznamu.

- **Barvy a typografie se přebírají z předlohy měřením, ne odhadem** (2026-08-29).
  Tokeny jsou odečtené z běžící stránky a zapsané v
  [ux-design-system.md](./ux-design-system.md). Hex je zdroj pravdy pro implementaci,
  `oklch` je poznamenané pro případ, že by se šlo do širšího gamutu.

## Ceník

- **Sazba závisí na třech osách** (2026-08-30): kanál → počet osob (do 5 / od 6) → délka
  pobytu (víc nocí = levněji). Tabulka je `rates[kanál][skupinaOsob][odKolikaNocí]` a hledá
  se **nejvyšší práh ≤ počtu nocí**. Sazba je jednotná pro celý pobyt, odvozená od jeho
  celkové délky — počítat ji po jednotlivých nocích by u množstevní slevy nedávalo smysl.

- **`booking` sazby jsou pouze referenční** (2026-08-30). Slouží jen jako podklad, který
  vlastník ručně opisuje do Booking extranetu. Server s nimi **nikde nepočítá ani je
  nezobrazuje**. Důvod: rezervace z Bookingu chodí přes iCal, ten cenu ani počet osob nenese,
  takže by jakýkoli dopočet byl odhad vydávaný za skutečnost. Importované rezervace proto
  zůstávají s `totalPrice: null`.

- **Neschválený ceník nesmí opustit vývoj** (2026-08-30). `pricing.approved: false` znamená,
  že v produkci vrátí `price/calculate` i `reservation/create` rovnou 503
  `caio-propertyman/price/notApproved`. Ve vývoji se počítá dál (jinak by nešlo stavět
  frontend) a odpověď nese `provisional: true`.
  Pojistka **musí být první řádek use casu**, ne až u výpočtu ceny — `reservation/create`
  se ptá do Monga dřív (rate limit), takže hlouběji schovaná pojistka vracela 500
  z nedostupné DB místo čistého 503.

## Prostředí

- **Node 24.19.0 LTS, ne nejnovější 26** (2026-08-30). `app.yaml` má `runtime: nodejs24`
  a GAE runtime pro Node 26 neexistuje — nejnovější Node by rozdíl mezi vývojem a produkcí
  jen otočil, ne odstranil. Node 24 je zároveň nejnovější LTS. Tím padly i všechny
  `EBADENGINE` v `npm install`: `mongodb`/`bson`/`mongodb-connection-string-url` chtějí
  `>=20.19.0` a `uu_appdatatypesg02` dokonce `>=22.18.0`.

## Cross-repo poznámky (co je v `caio-architecture` jinak, než říká design)

- **`design.md § 2` a `§ 8` mluví o Google Drive pro `BinaryStore`, realita je GCS**
  (`GCS_BUCKET_NAME`, `caio-devkit/docs/how-to-set-gcs.md`, commity z 26. 8.).
  v1 `BinaryStore` nepoužívá, takže to nic neblokuje — přepsat před v2.

- **Kořenový `caio-architecture/README.md` má v „Known issues“ čtyři body, z nichž tři
  jsou už opravené** (`publicPath` default, pád na prázdném `GOOGLE_CLIENT_ID`,
  `MongoClient` při importu). Platí jen to, že use casy jsou mountované na rootu
  bez `/api` prefixu. Při čtení dokumentace stacku dávat přednost
  `caio-devkit/docs/decisions.md` před kořenovým README.
