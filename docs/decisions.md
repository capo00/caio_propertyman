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

- **Obrázky appky bez originálů v repu: `client/src/assets/` (popř. `client/src/<subapp>/assets/`), žádné `assets-src/`** (2026-09-26, majitel).
  `client/assets-src/` (nezmenšené originály ikon i vektorová kresba roubenky, dohromady
  přes 2 MB) se maže celá — originály se v repu neuchovávají, drží se jen finální,
  už zmenšený soubor. Konkrétně:
  - Kresba roubenky pro boot indikátor je `client/src/assets/roubenka.svg` (116 kB,
    gzip ~30 kB) — trace s jedinou cestou, zaokrouhlené souřadnice, relativní příkazy
    s `h`/`v`, vyhozené podcesty s bboxem pod 8 jednotek (tracovací šum, při 200 px
    pod půl pixelu), barva natvrdo `#1E3E23` (v `<img>` se `currentColor` nemá od
    čeho odvodit). Referencuje se z `index.html` jako `/src/assets/roubenka.svg` —
    stejná cesta jako `<script src="/src/main.jsx">`, takže ji Vite zpracuje jako
    modul a v buildu zahešuje do `dist/assets/` (ověřeno buildem: vyjde
    `assets/roubenka-<hash>.svg`). Kresba NENÍ logo v liště (`Config.asset.logo`);
    to zůstává čtvercová ikona pro 40px v `public/assets/meta/`. Indikátor má od
    2026-10-15 (majitel) rozložení uu5 loadingu jako plus4u.net/jokes: kresba uvnitř
    kruhu 252 px (na mobilu `70vw`) s otáčivým prstencem kolem, název pod tím. Kresba
    5:4 zabírá 70 % průměru, aby se rohy vešly do kruhu. Do 2026-10-15 byl indikátor
    kresba → název → malý prstenec, protože do prstenu kolem 64px loga se rytina nevejde.
  - PNG ikony pro PWA manifest a favicon (`client/public/assets/meta/`) zůstávají,
    kde byly — potřebují stabilní cestu i mimo build (manifest.json je odkazuje
    natvrdo), takže patří do `public/`, ne do `src/assets/`. Mění se jen to, že
    nezmenšené originály (byly z realfavicongeneratoru, 1,6 MB) se dál neschovávají
    pro případnou budoucí předělávku — kdyby se sada dělala znovu, jde se od
    zdrojového návrhu, ne od těchto PNG.

  <details><summary>Rozhodnutí z 2026-08-31 a 2026-09-26 (už neplatí)</summary>

  **Nezmenšené originály ikon jsou v `client/assets-src/meta/`** (2026-08-31). Sada
  z realfavicongeneratoru měla 1,6 MB (`og-image.png` sama 850 kB) a všechno v
  `client/public/assets/` se 1:1 kopíruje do build outputu, takže by se to celé nasazovalo
  a stahovalo. Do `assets/meta/` jde zmenšená varianta (ikony PNG-256, OG jako JPEG q85),
  originály zůstávají v `client/assets-src/`, odkud je **nic nekopíruje ani nedeployuje** —
  `client/` je v `.gcloudignore` a mimo `client/public/` po něm Vite nesahá. Kdyby se sada
  předělávala, vychází se odtamtud, ne ze zmenšených souborů.

  **Kresba roubenky v boot indikátoru je vlastní soubor, ne logo z `meta/`** (2026-09-26).
  `client/assets-src/roubenka_vector.svg` je trace s jedinou cestou a 855 kB, což do
  `public/` jít nemůže. Do `client/public/assets/roubenka.svg` jde odvozená varianta
  (116 kB, gzip ~30 kB): zaokrouhlené souřadnice, relativní příkazy s `h`/`v`, vyhozené
  podcesty s bboxem pod 8 jednotek (tracovací šum, při 200 px pod půl pixelu) a barva
  natvrdo `#1E3E23` — v `<img>` se `currentColor` nemá od čeho odvodit. Stejný vztah
  jako u ikon výš: originál v `assets-src/`, odvozenina v `public/assets/`, převod ruční.
  Indikátor je kvůli tomu přeskládaný na kresba → název → malý prstenec; do prstenu kolem
  64px loga se kresba (poměr 5:4, rytina) nevejde.
  </details>

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

- **`client/src` přeskládaný na `assets/`, `admin/`, `config/`, `lsi/`, `routes/`, `tools/`,
  `components/`** (2026-09-28, majitel). Tři pravidla, teď zapsaná i jako obecná konvence
  pro appky na stacku caio-architecture (`caio/knowledge-base/preferences/fe-slozkova-struktura.md`,
  platí pro všechny appky, ne jen tuhle):
  1. **Kód anglicky** -- identifikátory, soubory, složky. Komentáře zůstávají česky (ta jsou
     dokumentace, ne kód). Výjimka: vlastní jména míst se nepřekládají ani jako hodnota kódu
     (`"kost"`, `"plakanek"` u hradu Kost a údolí Plakánek zůstávají).
  2. **Routy v URL česky bez diakritiky** -- to appka splňovala už předtím
     (`cenik`, `ubytovani`, `okoli`, …), beze změny.
  3. **`content/` zaniká.** Data, která patří jedné komponentě, jsou teď `content.js` (nebo
     `amenities.js` apod.) přímo v její složce (`components/faq/content.js`,
     `components/accommodation/{content.js,amenities.js}`, …). Data bez jednoho věcného
     vlastníka (`property.js` -- čtou ho Stats, Reservation i Contact/Map; `nav.js` -- jen
     `app.jsx`) šla do `config/`. `routes/<name>.jsx` je od teď TENKÉ drátování -- vybere
     komponentu z `components/`, případně přidá stránkové slepení, které nikde jinde nežije
     (`home.jsx` skládá 9 sekcí, `pricing.jsx` lepí `Pricing` + kalendář). `components/layout/`
     a `components/sections/` zanikly -- jednosouborová komponenta je `components/<name>.jsx`
     (`Button`, `Card`, `Hero`, `Stats`, …), komponenta s víc částmi má vlastní složku
     (`components/accommodation/`, `components/contact/`, `components/gallery/`, …).
     Sdílené kusy (`gallery-grid.jsx`, `availability-calendar.jsx`, `photo.jsx`) zůstávají
     ploché v `components/`, protože je používá víc než jedna funkční oblast.

  Přejmenované komponenty (čistě anglicky, routa v `router.jsx` beze změny): `Cenik` →
  `PricingPage` (`routes/pricing.jsx`), `Ubytovani` → `Accommodation`
  (`components/accommodation/accommodation.jsx`), `Space` → `SpaceDetail`
  (`components/accommodation/space-detail.jsx`). `config/nav.js` dostal oddělené `code`
  (anglicky, interní) a `route` (česky bez diakritiky, do URL) -- dřív `code` jen kopíroval
  `route`, což byl jediný český interní identifikátor v kódu appky.

  **Neřešeno schválně:** LSI klíče v `lsi/cs.json` (`pages.cenik.*`, `pages.ubytovani.*`, …)
  zůstávají beze změny -- jsou to datové cesty do JSONu, ne identifikátory v kódu, a přejmenovat
  je by znamenalo zásah do `cs.json` bez funkčního přínosu. `component-tree.md` cesty souborů
  po týhle změně **neodpovídají** -- není přepsaný, je to jen rozbor, ne živá dokumentace.
  `admin/` zůstal beze změny -- **mimo rozsah tohohle průchodu**, čeká na další.

## Admin (v2)

- **Admin je vlastní UVE** (2026-10-16, majitel; ruší bod níž). `client/src/admin/index.html`
  a `index.jsx` → `public/admin.html` + `admin.js`, server ho obsluhuje na `/admin/` a všem pod
  tím (holé `/admin` → 302 `/admin/`, `caio-server`). Důvod z 2026-09-14 padl: dnešní
  `caio-devkit` staví jeden vstup na UVE. Spouštěč byly jazykové adresy
  ([proposal-seo-lang-urls.md § 6.0](./proposal-seo-lang-urls.md)): web pak o adminu neví vůbec.
  - Routy jsou relativní k `/admin/` (`reservations`, `reservation?id=`, `reviews`, `ical`),
    `""` i neznámá adresa přesměrují na `reservations`. Odkaz v e-mailu vlastníkovi
    (`/admin/reservation?id=`) se nemění.
  - Rám (`admin/app.jsx`): vlastní `SpaProvider` + `Spa` s lištou adminu, `SpacingProvider
    normal`, každá obrazovka za `UiApp.withRoute(…, { profileList: ["authorities"] })`.
    Globální styly a barvy uu5 sdílí s webem přes `tools/theme-setup.js`.
  - `admin/index.html` má statický `noindex`; písma do něj vkládá build stejně jako do webu
    (`vite.config.js`), fotku hero ani JSON-LD ne. Z webu zmizelo `isAdminRoute`,
    `ADMIN_SCREENS`, `REDIRECTS.admin` i přepínání rámu v `app.jsx`; `lazy-libs.test.js`
    hlídá, že web nic z `admin/` neimportuje.
  - Admin nemá vlastní `assets/meta/` a bere manifest webu, takže devkit při buildu hlásí
    `start_url`/`scope` "/" místo "/admin/" a instalace adminu jako PWA by otevřela web.
    **Rozhodnuto 2026-10-16 (majitel): admin se zatím zvlášť instalovat nemusí**, varování je
    známé a nechává se. Kdyby se to změnilo: `client/src/admin/assets/meta/` s vlastním
    `manifest.json` (`start_url`/`scope` "/admin/") a kopií ikon.
  - Ověřeno 2026-10-16 v prohlížeči nad buildem: `/admin` → `/admin/reservations`, guard bez
    přihlášení, seznam, detail (`/admin/reservation?id=`), deep link `/admin/reviews` po
    reloadu, web nestahuje `admin.js` ani `uu5tilesg02`.

- ~~**Admin je lazy routa v jedné SPA, ne druhý bundle** (2026-09-14).~~ Neplatí od 2026-10-16, viz bod výš. `design.md § 4` popisuje
  dvě SPA (`admin.html` + vlastní entry), ale `caio-devkit` to dnes nepostaví: `entryFileNames`
  je natvrdo `"index.js"` a plugin `uu5-loader` vkládá `Uu5Loader.import("/index.js")` do
  každého HTML. Admin tedy žije pod `/admin` jako `withLazy(() => import("./admin/admin.jsx"))`
  a server se nemění vůbec — catch-all `/*splat` deep link obslouží sám. Podrobně
  v [design-v2.md § 4](../design-v2.md#4-kde-admin-fyzicky-žije).

- **`caio-ui` se importuje po submodulech, ne přes kořenový barrel** (2026-09-14). Tohle je
  ta část, bez které by lazy chunk nebyl k ničemu. `caio-ui/src/index.js` reexportuje
  `UiElements` (→ `Crud` → `uu5tilesg02*` + `uu5codekitg01-forms`/Monaco) a `UiEcc`
  (→ `uu5richtextg01*`); balíček nemá `sideEffects: false`, takže je tree shaking nevyhodí.
  Jediné `import { UiApp } from "caio-ui"` tak stáhlo celý admin stack na veřejnou stránku.
  Nově: `caio-ui/src/caio-ui-app`, `.../caio-ui-auth`, `.../caio-ui-elements/call`,
  a plný `.../caio-ui-elements` jen v obrazovkách adminu (ty jsou v lazy chunku).
  **Součástí je i změna v `caio-ui`**: `caio-ui-auth/identity-item.jsx`
  a `form-identity-select.jsx` si kvůli jedinému `Call.cmdGet` tahaly celý barrel elements,
  takže tabulky a Monaco tekly do každé appky na `Spa`. Teď importují `../caio-ui-elements/call`.
  Naměřeno: `index.js` 163,7 → 121,9 kB a veřejná stránka nenačte z `libs/` ani jednu
  z těch knihoven.

- **Profil správce je `authorities`, ne vlastní `owner`** (2026-09-14, majitel).
  `Authentication.createApi()` v `caio-serveru` má `authorities` natvrdo jako jediný profil,
  který smí na identity (`identity/adminList`, `identity/update`, `member/*`) — s vlastním
  jménem role by správce appky potřeboval role dvě. Role se čtou **z databáze**, ne z tokenu,
  takže odebrání platí okamžitě.

  **Upřesněno pro `caio-server` 0.2.1:** role neleží na identitě, ale v kolekci `sys_member`
  pod kódem identity (knihovna, `docs/auth.md`, kapitola 10). Prvního správce proto zakládá
  `npm run grant-role -- <e-mail> authorities`, ne ruční zápis do `sys_identity`. Pro kód
  appky se nemění nic: `identity.profileList` má v use casech stejný tvar jako dřív.

- **Cron a admin mají na synchronizaci každý svůj use case** (2026-09-14, majitel).
  `calendar/sync` (sdílený secret / `X-Appengine-Cron`) volá Cloud Scheduler, `icalFeed/sync`
  (`auth: ["authorities"]`, volitelný `code`) je tlačítko v adminu. `caio-server` umí `auth`
  jako funkci, takže by to šlo i jedním use casem — jedna podmínka by ale míchala secret pro
  stroj s rolí pro člověka a každá změna v jedné z nich by se musela promýšlet i za tu druhou.

- **Kontakt jde do adminu plochý, v databázi zůstává vnořený** (2026-09-14).
  `reservation/list` vrací `contactName`/`contactEmail`/`contactPhone`, `createManual`
  a `update` je berou stejně a server z nich skládá `contact: { name, email, phone }`.
  Důvod je formulářový modál `UiElements.Crud`: pracuje s klíči první úrovně (`initialValue`
  i diff změn), takže vnořený objekt by se nepředvyplnil a při editaci by se posílal celý.
  Tamtéž se ze záznamu zahazuje `clientIp` — osobní údaj sbíraný jen kvůli rate limitu.

- **Stav rezervace se needituje ve formuláři, jen přes `reservation/setState`** (2026-09-14).
  Use case podle změny pošle hostovi e-mail (potvrzení / storno); kdyby šel stav přepsat
  v modálu, host by se o změně nedozvěděl a `pending` z v1 by bylo prázdné gesto.

- **Smazání iCal feedu maže i obsazenost, kterou naimportoval** (2026-09-14). Jinak by
  v `reservation` zůstaly záznamy s jeho `icalFeedCode`, které už nikdo neaktualizuje ani
  nesmaže — trvale obsazené termíny bez zdroje. Měkká varianta je `state: "inactive"`.

- **Recenze mají jeden `review/list` pro web i admin** (2026-09-14).
  `Authentication.resolveIdentity` běží před každým use casem včetně veřejných, takže `fn`
  vidí, kdo se ptá: bez role vrací jen `approved` (filtr je konstanta v `crud.js`, ne parametr
  z dtoIn), správci vrací vše a bere filtr na `state`. Druhý use case by znamenal dvě místa,
  kde se rozhoduje, co je veřejné.

- **Prázdná sekce recenzí nechává na stránce aspoň kotvu** (2026-09-14, upřesněno 2026-09-15).
  Když `review/list` nic nevrátí, nevykreslí se blok, ale `<section id="recenze">` zůstane.
  Platí to ale jen pro **teaser na home** (`<Reviews limit={3} />`): na vlastní routě
  `/recenze` by z prázdné kotvy byla prázdná stránka, takže se tam místo toho vykreslí
  `PlaceholderBox code="message"`. Původní důvod (položka *Recenze* v liště mířila na
  `#recenze` a bez cíle by byl odkaz mrtvý) mezitím odpadl — položka dnes míří na routu.

## Frontend

- **Web je STROM STRÁNEK; kontakt je sekce rámu na všech routách** (2026-09-15, majitel).
  Ruší rozhodnutí „web je JEDNA stránka" z 2026-09-01 (níž). Důvod je obsah: u každého
  prostoru přibyly vlastní odstavce a fotky, detail nešel poslat odkazem a jeden `<title>`
  na celý web neměl kam nechat přistát „ceník" ani „ubytování". Rozbor a srovnání
  s předlohou (pohadkovaroubenka.cz) je v [proposal-routes.md](./proposal-routes.md).
  - `home` je zkrácená výkladní skříň: každá sekce, která unese detail, je na ní jen teaser
    s odkazem dovnitř (`About`, `Gallery limit`, `Pricing teaser`, `Reviews limit`,
    `Surroundings limit`). Celé zůstávají `Reservation` a `Faq`.
  - Routy: `ubytovani` (rozcestník), `ubytovani/<code>` (detail prostoru, **generuje se**
    z `content/spaces.js` — `useRouter` dynamický segment neumí, klíče routeMapy jsou
    statické), `galerie`, `cenik`, `rezervace`, `okoli`, `recenze`, `faq`.
  - ~~**Kontakt vlastní routu nemá.**~~ **Zrušeno 2026-09-28 (majitel).** Kontakt je jedna
    komponenta (`components/sections/contact.jsx`) ve dvou podobách přes prop `compact`:
    - `compact` (výchozí) zůstává poslední sekcí KAŽDÉ veřejné stránky, vykresluje ji
      `AppFrame` v `app.jsx` — kotva `#kontakt` tak dál existuje všude, i když na ni od
      téhož dne už nic v menu neodkazuje (viz položka *Kontakt* níž). Mapa v ní ustoupila
      černé kresbě roubenky (stejný soubor jako boot indikátor, `assets/roubenka.svg`,
      přebarvený filtrem `brightness(0)`, protože fill je v souboru natvrdo a `img`
      currentColor nebere) — na patičce KAŽDÉ stránky by mapa znamenala volání Google Maps,
      o které nikdo nežádal.
    - `compact={false}` je nová routa `kontakt` (`router.jsx`) — plná mapa
      (`components/contact/map.jsx`) a stejná kresba pod ní. `AppFrame` na téhle routě
      kompaktní patičku schovává, ať `id="kontakt"` není na stránce dvakrát.
    Admin kontakt nemá vůbec — tam se přepíná celý rám.
  - **Položka *Kontakt* v menu míří na routu** (2026-09-28, majitel) — `{ route: "kontakt" }`
    v `nav.js` místo dosavadního `{ anchor: "#kontakt" }`. Kontakt tím přestává být jediná
    výjimka z pravidla „menu = routy, ne kotvy" (viz „Menu je jednoúrovňové" níž).
  - ~~Staré anglické routy sekcí (`/gallery`, `/pricing`, …) jsou dnes **přesměrování** na
    české cesty.~~ **Smazané 2026-10-13** (majitel): web ještě nikdy nebyl veřejně, takže
    staré adresy nikdo nemá v odkazech a Google je nezná. Teď končí na 404
    ([proposal-seo-404.md](./proposal-seo-404.md)). `Home` ztratil prop `scrollTo` už dřív.
  - Menu je **jednoúrovňové** (2026-09-19, majitel; ruší dvouúrovňové menu z 2026-09-15).
    *Ubytování* je obyčejný odkaz na rozcestník a rozbalovací seznam prostorů nemá — na
    prostor se chodí až z té stránky, která je vypisuje jako karty ze stejných dat
    (`components/accommodation/content.js`). Cesta k prostoru je tím jedna, ne dvě.
    `CaioApp.Top` zanořené `itemList` umí dál (`withItemBehaviour` sestupuje rekurzivně),
    jen ho nepoužíváme. Položka menu **neumí routu a kotvu zároveň** (`setRoute` by vzal
    „cenik#kalendar" jako celou routu), takže kotvy uvnitř stránky řeší až obsah té stránky.
  - **Klik na položku menu stránky, na které host už je, plynule odscrolluje na začátek**
    (2026-09-28, majitel). `setRoute` na nezměněnou routu je no-op — nic by se nestalo.
    `toMenuItem` (`app.jsx`) proto pro aktuální routu přepne `href` na `"#"`; `CaioApp.Top`
    (`withItemBehaviour`) kotvu bez odpovídajícího `id` v DOM sám vyhodnotí jako "cíl
    neexistuje" a spadne na `animateScrollTo(0)` — stejné tempo jako u každé jiné kotvy
    v appce, žádný nový kód pro animaci. Platí i pro CTA „Rezervovat" v liště. Menu proto
    musí být teď **routou-závislé** (`useMemo` v `AppFrame` podle `route.uu5Route`), ne
    statická konstanta jako dřív (`TOP_BASE` zůstala statická, jen `menu` je dopočítané).
  - **Patička je konec kontaktní sekce, ne samostatný pruh** (2026-09-19, majitel). Byl to
    tmavě zelený pruh pod krémovým kontaktem; dnes je krémová jako ta sekce, takže hranice
    mezi nimi není vidět a název s copyrightem od kontaktu odděluje jen vlas linky uvnitř
    kontejneru obsahu. `Footer` proto **nemá horní padding** — odstup nad linkou dodává
    spodní padding kontaktní sekce (`Section`, `theme.sectionPad`). Komponenta zůstává
    v `footer` slotu rámu (`UiApp.Spa`), takže `<footer>` je pořád vlastní landmark
    a admin ho dál nemá.
  - `scroll.js` dostal `useScrollTopOnRouteChange()`: `RouteProvider` z uu5g05 řeší jen skok
    na fragment a návrat na zapamatovanou pozici při Zpět/Vpřed, obyčejný přechod na jinou
    routu scroll nechává být — galerie se pak otevřela uprostřed (naměřeno v prohlížeči).
    Hook oba případy uu5g05 obchází (fragment přeskočí, `popstate` si poznamená příznakem).

  <details><summary>Rozhodnutí z 2026-09-01 (už neplatí)</summary>

  **Web je JEDNA stránka, routy sekcí jen přesměrují na kotvu.**
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
    a tabletu řeší sám podle šířky kontejneru. CTA „Rezervovat" má `primary: true`, takže
    se do hamburgeru sbalí až poslední, po všech položkách navigace. Do 2026-10-14 mělo
    `collapsed: "never"`; s přepínačem jazyka se ale na telefonu nevešlo (viz bod o jazycích).
  - Dvouřádkový název vedle loga **už není `Uu5Elements.Header`**, ale dva vlastní elementy
    se stupni z `theme.text` (opraveno 2026-09-07). `Header` sází `title`/`subtitle` jako
    `Uu5Elements.Text` s vlastní explicitní `font-family`, takže dědění nestačilo a jediná
    cesta k Fraunces vedla přes `className` cílící na `[data-name="Uu5Elements.Text"]`
    uvnitř — a **ten selektor v produkčním buildu nic nechytí**: `data-name` je vývojová
    pomůcka, kterou uu5 v produkci nevypisuje. Název tak byl v devu Fraunces a na ostrém
    webu Karla; v devu to nejde uvidět. (Táž chyba byla i v afkbratcice a našla se tam.)
    **Pravidlo z toho: `data-name` nepatří do selektoru.** Když komponentu nejde nastavit
    propsy, skládá se vlastní obal — ne styl do jejího vnitřku.
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
  Klíč se zadává jako `GOOGLE_MAPS_API_KEY` do `client/.env.development` (v `.gitignore`);
  do bundlu ho dostane `define` v `client/vite.config.js`. **`import.meta.env.VITE_*`
  v tomhle buildu nefunguje** — výstup je SystemJS a hodnota se do bundlu vůbec nedostane
  (ověřeno). Bez klíče komponenta ukáže placeholder a jen odkaz do Google Maps, takže se
  do produkce nemůže dostat poloviční mapa.
  Klíč je v URL iframu veřejný — musí mít v Google Cloud omezení na HTTP referrer.
  **Produkční build klíč od 2026-09-28 bere automaticky ze stejného `.env.development`**
  (`vite.config.js` ho čte navíc explicitně vedle proměnné v prostředí, kterou Vite jinak
  načte jen pro aktuální mód) — deploy se proto nemusí pouštět s `GOOGLE_MAPS_API_KEY=…`
  před příkazem, viz [release.md § 1.5](./release.md#15-google_maps_api_key-a-google_recaptcha_api_key-při-buildu).
  Proměnná v prostředí funguje dál a má přednost, kdyby produkce měla mít jiný klíč.

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
  Od 2026-10-14 je web pětijazyčný (cs, en, de, pl, sk), viz bod o přepínači jazyků níž.

- **Pět jazyků a přepínač v liště** (2026-10-14, Caio). K rozhodnutí majitele z 2026-10-08
  (cs, en, de, sk; [impl-plan-reservation-flow.md § Jazyky](./impl-plan-reservation-flow.md))
  přibyla **polština**. `cs.json` je zdroj, `en/de/pl/sk.json` jeho překlad se stejnými klíči
  (hlídá `client/src/lsi/lsi.test.js`, i soulad se seznamem jazyků serveru).
  - **Přepínač** je `Uu5Elements.LanguageSelector` jako poslední položka menu (`component`
    v položce `ActionGroup`u, `app.jsx`, `LANGUAGE_ITEM`). Ukazuje **kód** (`CS`, bez šipky -- `iconOpen`/`iconClosed={null}`, Caio), v rozbalení
    nativní název + kód. Vlajky ne: angličtina žádnou jednu vlajku nemá a jazyk není stát.
    `collapsed: "never"` s výchozím `order` → na mobilu je **vlevo od hamburgeru**, nikdy v něm.
    Logo + název (~155 px), CTA, přepínač a hamburger se do telefonu nevešly (lišta přetékala
    o 25 px na 360 px), proto se na telefonu do hamburgeru sbalí **CTA „Rezervovat“**, ne
    přepínač (Caio). Na 320–390 px je lišta `[logo název] [CS] [☰]`.
  - ~~**Jazyk není v URL.**~~ Od 2026-10-16 je, viz bod *Jazyk v adrese* níž.
  - **Admin** přepínač nemá, jde za tím, co je zvolené na webu (uložená volba, jinak čeština;
    proto jsou přeložené i texty `admin.*`).
  - Tvar slova „noc“ (`tools/nights.js`) bere kategorii z `Intl.PluralRules` jazyka, ne pevné
    hranice -- polština má „noce“ i pro 22–24.
  - **E-maily hostovi** jsou od 2026-10-14 taky ve všech pěti jazycích (Caio), vlastníkovi
    dál jen česky. Jazyky leží vedle sebe v každé šabloně (`server/email/templates/*.js`),
    popisky obálky a platby v `layout.js` a `render.js`, věta o storno podmínkách
    v `reservation/cancellation.js` (`cancellationPolicyText(policy, lang)`). Test
    (`email.test.js`) vyrenderuje každý vzorek ve všech jazycích a hlídá stejný počet odstavců,
    řádků a QR jako česká verze a že v cizím jazyce nezůstalo „ř/ě/ů“ ani „Kč“.
    - Mimo češtinu má blok platby navíc **IBAN** (ze zahraničí se na `6338724003/0800` platit nedá).
    - **QR** zůstává SPAYD („QR Platba“), což je český standard -- slovenské banky čtou PAY by
      square. Popisek pod QR proto mimo češtinu říká, že funguje v českých bankovních aplikacích.
      Zpráva v QR je ve všech jazycích stejná a česká (čte ji vlastník ve výpisu).
    - **Zprávu hostovi** z modálu změny stavu vkládá e-mail tak, jak ji vlastník napíše -- musí
      ji psát v jazyce hosta.
    - Náhled: `npm run email:preview` (všechny jazyky) nebo `npm run email:preview -- de pl`.
  - Co zbývá (kontrola překladů, platby ze zahraničí): [wip.md § Jazyky](./wip.md).
- **Jazyk v adrese** (2026-10-16, majitel; [proposal-seo-lang-urls.md](./proposal-seo-lang-urls.md)).
  - **Adresy:** čeština bez prefixu (`/cenik`), ostatní jazyky s ním a se slugy v jazyce
    stránky (`/de/preise`, `/en/accommodation/barn`); `/cs/…` je česky bez přesměrování,
    kořen jazyka má lomítko (`/en/`). Jazyk určuje jen adresa, ne prohlížeč -- `roubenyraj.cz`
    je vždycky česky.
  - **Kde se co nastavuje:** jazyky jen v `package.json` (`caio.languages`, první je výchozí),
    slugy jen v `client/src/config/routes.js` (`PAGES`) a u prostorů (`slug` v
    `components/accommodation/content.js`). Odtud je čte caio-server (`/en/…` →
    `index.en.html`), caio-devkit (generuje `index.<lang>.html`), caio-ui (`SpaProvider`),
    server appky (`config.languages` přes caio-server `readLanguageList`), router, sitemap,
    `spa-routes.json` i přesměrovací skript. `tools/language.js` a `route` v `nav.js` zmizely.
  - **Uložená volba:** přepínač ji uloží (`<NAME>.language`, klíč beze změny) a přejde na
    tutéž stránku v jiném jazyce (reload, `getLanguageUrl`). Skript první v `<head>`
    `index.html` pak z adresy bez jazyka přesměruje na uloženou verzi (`location.replace`,
    Zpět ji přeskočí); adresa s jazykem volbu ignoruje. Googlebot nic uloženého nemá.
  - **SEO:** canonical na stránku v jejím jazyce (`/cs/…` na adresu bez prefixu), `hreflang`
    na všech pět jazyků + `x-default` na češtinu, `og:locale`, drobečky v jazyce, sitemap
    75 adres s alternativami, `index.<lang>.html` má statický popis, `og:locale` a JSON-LD
    v jazyce (pro crawlery bez JS). `priceRange` je jazykově neutrální (`3700+ CZK`).
    `robots.txt` zakazuje `/index.` (dokumenty napřímo).
  - **Server:** `spa-routes.json` má routy a přesměrování po jazycích; `/de/cenik` → 301
    `/de/preise`, 404 dostane dokument jazyka adresy.
  - **Stack** jede zatím z lokálních tarballů (`npm run sync`): vyžaduje nevydané změny
    caio-serveru, caio-ui a caio-devkitu. Po vydání stacku zvednout piny v `package.json`.
  - **Ověřeno 2026-10-16** nad buildem (`npm start`): curl na 27 adres z tabulky návrhu,
    v prohlížeči přepínač cs → de → pl → cs (adresa, texty, meta, uložená volba), SPA navigace
    uvnitř `/de/` (menu, karta prostoru, logo), přesměrování `/cenik` a `/ubytovani/stodola`
    při uložené `de`, `/cs/cenik` a `/en/prices` bez přesměrování, admin v uložené polštině.

- **Barvy a typografie se přebírají z předlohy měřením, ne odhadem** (2026-08-29).
  Tokeny jsou odečtené z běžící stránky a zapsané v
  [ux-design-system.md](./ux-design-system.md). Hex je zdroj pravdy pro implementaci,
  `oklch` je poznamenané pro případ, že by se šlo do širšího gamutu.

- **Karty prostorů i míst v okolí proklikávají celou plochou, žádný odkaz uvnitř**
  (2026-09-29, majitel). Zrušilo se tím dřívější schválné rozhodnutí kartu neklikat celou
  (`space-card.jsx` mívalo komentář „Tile by musel dostat role/tabIndex a odkaz uvnitř by se
  s ním pral o fokus“) — bez odkazu uvnitř ten důvod odpadá.
  - `components/card.jsx` dostal volitelný prop `href` (+ `target`): když je zadaný, obalí
    celý `Tile` do `Uu5Elements.Link` s `display: block` a hoverem (zvednutí 2 px + jemný
    stín — jediné místo v appce, kde se na kartě objevuje stín, schválně jen při najetí).
    `withRouteLink`, kterým je `Link` obalený, sám pozná interní routu od absolutní URL,
    takže stejný kód funguje pro klientskou navigaci (`SpaceCard` → `ubytovani/<code>`)
    i pro odkaz ven (`AttractionCard` → oficiální web místa, `target="_blank"`; `rel="noopener"`
    doplní `Link` sám). `className` na `Uu5Elements.Link` je layout/interakce téhle karty,
    ne přebití vzhledu `Tile` — barvy, rámeček i rádius pořád dává GDS beze změny.
  - **Oprava tentýž den:** `<a>` se v mřížce natáhne na výšku celého řádku (grid item je
    defaultně `stretch`), ale `Tile` uvnitř měl jen svou přirozenou výšku — u nižší
    dlaždice ve stejném řádku jako vyšší tak pod kartou zůstal neviditelný kus `<a>`,
    který pořád spouštěl hover (nahlášeno majitelem: "hoveruje se celý height řádku").
    `blockSize: "100%"` na `<a>` i na jeho jediném potomkovi (`"& > *"`) srovná výšku
    Tilu s `<a>`, takže hover zóna == viditelná karta; řádky karet zůstávají stejně
    vysoké (grid stretch), jen se do nich teď natáhne i obsah.
  - `content/attractions.js` (dnes `components/surroundings/content.js`) dostal `url` u
    každého místa kromě `kingdomCome` (tip, ne místo na mapě — zůstává bez prokliku).
    Odkazy dodal majitel: Kost, Plakánek, Vesec, Trosky, Hrubá Skála, Prachovské skály,
    Humprecht — každé na svůj oficiální web.
  - `SpaceCard` i `AttractionCard` ztratily svůj vnitřní `Uu5Elements.Link`
    („Prohlédnout“ / bez textu) — LSI klíč `common.spaceDetail` smazaný jako nepoužitý.

- **Meta údaje stránek podle routy** (2026-10-13, [proposal-seo-meta.md](./proposal-seo-meta.md)).
  - **Co:** `tools/page-meta.js` (`usePageMeta`, nahradil `page-title.js`) nastavuje v `<head>` titulek, `description`, canonical, `og:*` a `robots`. Co která routa dostane, říká tabulka `config/seo.js`; popisy jsou v LSI pod `seo.<routa>`, u prostorů se použije jejich `perex`.
  - **`noindex`** dostane admin a každá neznámá routa (404 vrací server dál 200, viz proposal § 6).
  - **Canonical, `og:url` a `og:image`** potřebují `APP_URL` ze serverového `.env` v kořeni repa (jedna proměnná pro server i klienta; `client/vite.config.js` ji čte při buildu a dává do bundlu přes `define`). Bez ní se nenastavují. `window.location.origin` se schválně nepoužívá: appspot.com a vlastní doména by měly každá jiný canonical.
  - **Omezení:** tagy píše JS. Google je přečte, Facebook, WhatsApp a Seznam ne -- ty vidí jen statické tagy z `index.html` (home). Plné řešení je injektáž do `index.html` nebo prerender; jde to middlewarem v `server/` této appky (`middlewareList`), zásah do `caio-server` netřeba (opraveno 2026-10-13, [proposal-seo-robots-sitemap.md § 3](./proposal-seo-robots-sitemap.md)).
  - **Test:** `config/seo.test.js` hlídá, že každá routa z menu a každý prostor má popis 40–155 znaků a že statický popis v `index.html` odpovídá `seo.home`. Popisy prostorů `deti` (45) a `stodola` (41) jsou kvůli krátkému `perexu` těsně nad hranicí.
- **`robots.txt` a `sitemap.xml` vznikají při buildu** (2026-10-13, [proposal-seo-robots-sitemap.md](./proposal-seo-robots-sitemap.md)).
  - **Co:** plugin `seoFiles` v `client/vite.config.js` je po buildu zapíše do kořene `public/`, server je vrací jako statické soubory. Obsah skládá `client/src/config/seo-files.js` ze seznamu rout v `seo.js` (stejného jako pro canonical) a `APP_URL`.
  - **Proč build, ne server:** obsah se mění jen s novou verzí webu a seznam rout je jen v klientovi (`client/` se na App Engine nenahrává). Devkitový `publicDir` kopíruje jen pod `/assets/`, proto vlastní plugin.
  - **`robots.txt` je stejný pro hlavní doménu i `*.appspot.com`.** Duplicitu řeší canonical, ne zákaz: zakázanou stránku Google nenačte, a tak neuvidí ani canonical. Zakázaný je admin, přihlášení a prefixy use casů; že žádný nechybí, hlídá `seo-files.test.js` proti `server/*/api.js`.
  - **`CANONICAL_HOST=roubenyraj.cz`** v `.env`: `www.roubenyraj.cz` přesměruje `caio-server` na hlavní host (301).
- **Skutečná 404 a home na `/`** (2026-10-13, [proposal-seo-404.md](./proposal-seo-404.md)).
  - **Co:** `server/spa-routes/` (přes `App.init({ middlewareList })`) vrací neznámé adrese 404 s tělem `index.html` (host vidí „nenalezeno“ s menu) a přesměrováním z `config/routes.js` 301 (`/home` → `/`, `/admin` → `/admin/reservations`), query string zůstává. Seznam rout zapisuje build do `public/spa-routes.json`, ze stejných dat sestavuje routeMap `router.jsx`.
  - **Use casy pouští dál** (klíče z `api`, `/sys/`, `/auth/`): registrují se až za `middlewareList` a iCal feed pro portály posílá `Accept: */*`, takže by jinak dostal 404.
  - **Home je routa `""`**, ne `home`. Dřív `""` přesměrovávalo na `home` a z `/` se v adresním řádku stalo `/home`; s 301 z `/home` na `/` by se adresa při každém obnovení přehazovala. Logo míří na `/`, tlačítko na stránce „nenalezeno“ na `""`.
  - **Lomítko na konci** (`/cenik/`) server bere jako známou routu (200). Klient ji ale dnes vykreslí jako „nenalezeno“: uu5g05 `RouteProvider` (přes `caio-ui` `SpaProvider`) z ní udělá routu `cenik/`. Podle majitele je to vlastnost `caio-architecture`, v appce se neobchází. Řeší to `caio-server` 0.4.1 (301 na adresu bez lomítka, `caio-server/docs/proposal-trailing-slash.md`), zatím nevydaný.
  - **Use case s lomítkem** (`/calendar/ical/`) pouští `spa-routes` dál stejně jako bez lomítka: express routuje volně, takže by ho jinak vrátil jako 404 místo kalendáře (chyceno při ověřování 2026-10-14).
- **Strukturovaná data (JSON-LD)** (2026-10-14, [proposal-seo-json-ld.md](./proposal-seo-json-ld.md)).
  - **Web a roubenka** (`WebSite` + `LodgingBusiness`) se při buildu vkládají do `<head>` index.html (`transformIndexHtml` v pluginu `seoFiles`), takže je vidí i crawler bez JS. Skládá je `config/seo-files.js` (`buildStructuredData`) z `property.js`, `contact/content.js`, galerie a `cs.json`; cenu („od 3 700 Kč za noc“) bere `vite.config.js` ze `server/config.js`. Bez `APP_URL` se nevkládají.
  - **Drobečková navigace** (`BreadcrumbList`) je pro každou stránku jiná, takže ji píše `usePageMeta` za běhu do `#ld-breadcrumb` (`seo.js` `getBreadcrumb`). Home, admin a 404 ji nemají.
  - **Vědomě vynechané:** `aggregateRating` (Google hodnocení sbírané na vlastním webu u firem nezobrazuje), `FAQPage` (FAQ rich results jsou od 2023 jen pro úřady a zdravotnictví), `VacationRental` (jen pro partnery Google Vacation Rentals).
  - **Data od majitele 2026-10-14:** Instagram je finální (smazané TODO v `contact/content.js`). GPS v `property.js` zůstává, jak je: je od bodu majitele asi 5 m, takže nepravdivé TODO „střed obce“ je pryč.
- **Fotky jako WebP s menšími variantami, fotka hero přednačtená na home** (2026-10-15, majitel; podnět PageSpeed mobil: výkon 68, LCP 7,8 s).
  - **Varianty:** ke každé fotce v `client/src/assets/gallery/` jsou `-480.webp` a `-800.webp` z `tools/gallery-variants.js` (sharp, mimo závislosti projektu, návod v hlavičce skriptu). `gallery/content.js` dává každé položce `src` (plná), `thumbnailSrc` (-800) a `srcSet`; `gallery/content.test.js` hlídá, že soubory existují.
  - **`srcset` + `sizes`, ne „malá a pak výměna za velkou“:** prohlížeč si sám vybere velikost podle šířky a hustoty displeje, nic se nestahuje dvakrát. Výměnu dělá jen galerie a umí ji `Uu5Imaging.Image` sám: dlaždice kreslí `thumbnailSrc`, plnou fotku stáhne až otevřený lightbox. Rozmazaný minináhled na hero by nepomohl: Chrome nepočítá málo detailní obrázky (pod 0,05 bitu na pixel) jako LCP, takže LCP by byla až velká fotka po výměně.
  - **Preload fotky hero:** inline skript v `<head>` index.html (`config/hero-preload.js`, vkládá ho plugin `seoFiles`) na `/` přidá `<link rel="preload">`. Do 480 px se stejným `imagesrcset`/`imagesizes` jako `<img>` v `hero.jsx`, od 481 px plnou fotku pro pozadí sekce (hranice = uu5 `xs`). Fotka se tak začne stahovat s HTML místo po startu appky.
  - **Jen home, indikátor beze změny** (majitel): ostatní routy (`/cenik`, admin, 404) dostávají stejný index.html, ale fotku stahovat nemají. Proto skript, ne `<link>` ani `<img style="opacity: 0">` přímo v HTML: ten by preload scanner stáhl na každé routě a neviditelný prvek se jako LCP nepočítá. Statickou kopii hero v index.html (LCP ~2 s) majitel nechce.
  - **Ověřeno lokálně (Lighthouse mobil, localhost bez gzipu):** fotka hero startuje ~25 ms po HTML (dřív až po vykreslení appky), stahuje se jednou jako `-800` (66 kB místo 217 kB). Obrázky na home na mobilu ~320 kB místo ~1 MB. Na `/cenik` se fotka nestahuje. LCP teď čeká hlavně na vykreslení appky (uu5 knihovny).
- **První render až s jazykem návštěvníka** (2026-10-15; od 2026-10-16 je to jazyk adresy, `PAGE_LANGUAGE` v `tools/page-language.js`; PageSpeed s anglickým prohlížečem měřil CLS 0,112, z toho 0,102 perex v hero).
  - **Příčina:** store LSI měl při startu jen `cs` (`setDefaultLsi`), takže se web vykreslil česky a jazyk prohlížeče se dotáhl až po prvním renderu -- text se přeskládal.
  - **Co:** `main.jsx` před `createRoot` počká na `preloadLsi(getInitialLanguage())`. `getInitialLanguage` (`tools/language.js`) počítá jazyk stejně jako uu5 `LanguageProvider` přes veřejné `Utils.Language.getItem` (zapamatovaná volba, pak `navigator.languages`, jinak en); `preloadLsi` (`lsi/import-lsi.js`) jazyk stáhne a přidá do store vedle cs. Pro češtinu se nečeká. Selhání stažení render nezastaví, uu5 si jazyk dotáhne jako dřív.
  - **Cena:** návštěvník s jiným jazykem než cs vidí appku o jeden malý request (chunk jazyka, ~9 kB gzip) později, zato bez přeskočení.
  - **Ověřeno lokálně** (Lighthouse mobil, `--lang=en-US`, 3 běhy): CLS 0,097–0,103 → 0–0,001. V prohlížeči: uložená `de` se vykreslí rovnou německy, přepínač dál líně dotáhne další jazyk (pl).
- **Písma webu jsou v `<head>` index.html s preloadem, ne v bundlu** (2026-10-15; zbytek CLS 0,013 z výměny písma v hero a liště).
  - **Příčina:** `fonts.css` se importoval z `main.jsx` a SystemJS build vkládá jeho `<style>` až při `execute` index.js, tedy po stažení všech uu5 knihoven. Písma se stahovala až po prvním renderu (~835 ms), text se vykreslil záložním písmem a po jejich dorazu se přeskládal.
  - **Co:** `fonts.css` zůstává jediný zdroj, ale z JS se neimportuje. Plugin `seoFiles` ho při buildu vloží do `<head>` index.html jako `<style>` (bez komentářů) a ke každému souboru přidá `<link rel="preload" as="font" crossorigin>` (`config/font-head.js`, test `font-head.test.js`). Jen do index.html, ne do login.html.
  - **Přednačítají se všechna 4 písma** (Karla a Fraunces, latin + latin-ext, ~103 kB) a na všech routách: čeština potřebuje latin-ext a Karla je globální písmo celého webu. Admin tak stáhne i Fraunces, který nepoužije (~67 kB, jen pro majitele).
  - **Vědomě se nedělá:** metriky záložního písma (`size-adjust`, `ascent-override`) -- po přednačtení k výměně v praxi nedojde a záložní písmo se liší podle zařízení; `font-display: optional` -- na pomalém prvním návštěvu by web zůstal v systémovém písmu. Ikonová písma uu5 (`uu_gds_svgg01`, audit „font-display“ v PageSpeed) mají `@font-face` v CSS knihovny, v appce se neobchází.
  - **Ověřeno lokálně** (Lighthouse mobil, 3 běhy cs + 1 en): písma startují ~18 ms po HTML a každé se stáhne jednou; CLS cs 0,013 → 0,001 (zbytek není z písem), en 0,001. Fotka hero startuje ~36 ms místo ~26 ms (dělí se o pásmo s písmy). V prohlížeči bez varování o preloadu, hero i lišta v Karle a Fraunces.
- **Těžké knihovny líně, sekce home pod ohybem až u viewportu** (2026-10-15; LCP čekal na vykreslení hero, ne na fotku).
  - **Příčina:** SystemJS spustí `index.js` až po stažení všech jeho statických závislostí (dřív i `uu5g05-forms`, `uu5imagingg01`, `uu5extrasg01`, ~220 kB gzip) a home se vykreslila celá najednou (~1,6 s CPU Reactu v emulovaném mobilu), včetně fetchů cen, obsazenosti a recenzí.
  - **Knihovny (`withLazy`):** rezervační formulář (`reservation.jsx` → `reservation-form.jsx`, fallback s výškou formuláře) a dlaždice galerie (`gallery-grid.jsx` → `gallery-image.jsx`, fallback plocha 4:3). Platí i na routách `/rezervace`, `/galerie` a v detailu prostoru. `lazy-libs.test.js` hlídá, že na tyhle moduly nevede statický import. Dlaždice mají `width="100%"`, ať drží poměr i před načtením fotky.
  - **Sekce (`LazySection`, `useViewportVisibility(1000)`):** na home se hned vykreslí hero, statistiky a „O roubence“; galerie, ceník, rezervace, recenze, okolí a FAQ až 1 000 px před viewportem (okraj platí nahoru i dolů, při scrollu dolů rozhoduje spodní). Placeholder drží `id` sekce (kotvy) a změřenou výšku (`estimate` v `home.jsx`).
  - **Kotvy:** tlačítko s `#…` nejdřív zavolá `revealAll()` (`tools/lazy-reveal.js`) a `smoothScrollTo` přepočítává cíl v každém kroku, takže skok dojede na skutečný začátek sekce. Adresa s fragmentem (`/#rezervace`) vykreslí všechno hned a skok odbaví RouteProvider.
  - **Nedořešené -- `uu5g05-forms` je v `index.js` dál:** tahá ho `caio-ui` 0.4.3. `caio-ui-app` (`identity-route.jsx` → `OcAuth.IdentityList`) a `caio-ui-auth/index.js` (`import * as Exports; export default Exports`) drží celý jmenný prostor, takže v bundlu zůstane i `FormIdentitySelect` a `IdentityList` s formuláři, i když je web nepoužívá. V appce se to obejít nedá (i přímé importy `spa-provider`/`with-route` jdou přes týž jmenný prostor), řešení patří do stacku.
  - **Ověřeno lokálně** (Lighthouse mobil cs, 3 běhy, proti A6): LCP 16,8–17,2 → 15,4–15,8 s, TBT 780–990 → 530–890 ms, CLS dál ~0,001; na startu se nestahuje imaging, extras ani `price/list`, `availability/get`, `review/list`. V prohlížeči: scroll vykreslí sekce dopředu, kotva z hero dojede přesně na `#rezervace`, `/rezervace`, `/galerie`, `/ubytovani/loznice` a admin fungují, konzole bez chyb.
- **Přístupnost: kontrast a název loga** (2026-10-15, majitel podle screenshotů před/po; Lighthouse 83 → 86).
  - **`accent` #AE794C → #955F35 v celém webu** (`theme.js`): jako 11px text (vzdálenosti, počty lůžek) měl kontrast 3,72:1, teď 5,21:1. Mění i hvězdičky a linku u recenzí a GDS `secondary`. `ux-design-system.md` to uvádí.
  - **Ceník:** popisek „2 noci…“ `Uu5Elements.Text colorScheme="building"` místo `"dim"` (#808080, 3,94:1). `building` + `subdued` (#7a7a7a) by neprošlo.
  - **Kalendář obsazenosti:** obsazené a rezervované dny `significance: "common"` místo `"highlighted"` (bílé číslo na plné červené 3,68:1, na oranžové 2,7:1). Varianta `distinct` (jen obrys) neprošla a vypadala slabě.
  - **Logo v liště:** `tooltip` s názvem webu; uu5 `withTooltip` ho dá do `title` odkazu, a to je jeho přístupný název (`link-name`).
  - **Vědomě ponecháno:** odkazy v textu o reCAPTCHA bez podtržení (majitel; `link-in-text-block` zůstává), popisky Adresa/Telefon/E-mail ve výchozí šedi `InfoGroup` (majitel).
  - **Zbytek je v uu5** a appka ho neobchází: popisky polí formuláře, hlavička a víkendy v `Calendar`, ARIA atributy v `Accordion` a `FormDateRange`, role loga v `TouchButton` -- sepsáno pro uu5 tým v [uu5-proposal-a11y.md](./uu5-proposal-a11y.md).
  - **Měří se na `/#faq`:** od líných sekcí (A7) PageSpeed na home audituje jen horní část stránky a ukáže víc, než odpovídá celé home.

## Ceník

- **Ceník podle nocí, svátků a sezóny** (majitel, 2026-10-12; nahrazuje model „kanál →
  počet osob → délka“ z 2026-08-30). Čísla a vzorec jsou v `server/config.js → pricing`,
  výpočet v `server/services/price.js`, zadání majitele jako testy v `price.test.js`.
  - Noc patří dni, **na který** připadá (ráno se odjíždí). Noc na sobotu, neděli nebo svátek
    je za 120 % — jen ta noc, ne celý pobyt. **Pobyt delší než 5 nocí má víkend za běžnou
    cenu, svátek ale dál s přirážkou** (majitel, 2026-10-12) — díky tomu jsou ceny 6 a 7 nocí
    v kartě Běžný termín skutečně dosažitelné.
  - **Vánoce** = pobyt obsahuje noci na 24. i 25. 12. (příjezd ≤ 23. 12., odjezd ≥ 25. 12.):
    celý pobyt za 180 %, nejméně 3 noci (kratší veřejná rezervace neprojde,
    `caio-propertyman/stay/christmasMinNights`). **Silvestr** = noc na 1. 1.: celý pobyt
    za 200 %. Obojí v jednom pobytu → celé za vánoční násobitel (jedni hosté, žádný meziúklid).
  - Úklid se přičte a **celek** se zaokrouhlí nahoru na 500 Kč. Násobitele jsou v procentech
    a počítá se v celých číslech — v plovoucí čárce by zaokrouhlení nahoru mohlo přidat 500 Kč.
  - **Host vidí jen jednu výslednou cenu za pobyt.** Žádný rozpad na noci ani zmínka
    o úklidu (ani ve formuláři, ani v ceníku). Počet osob cenu neovlivňuje.
  - **Stránka Ceník ukazuje jen víkend (2 noci) a týden (7 nocí)**, nic víc (majitel,
    2026-10-12). Čísla nemá v klientovi — bere je z `price/list`, který je počítá stejnou
    funkcí jako rezervaci, takže se web a potvrzení nemůžou rozejít. Cenu jiného termínu
    ukáže formulář po výběru dnů.
  - **Červenec a srpen jen na týden** (majitel, 2026-10-12): pobyt s aspoň jednou nocí na
    den 1. 7.–31. 8. musí mít přesně 7 nocí (`config.summerWeekOnly`), jinak
    `caio-propertyman/stay/summerWeekOnly`.
  - **V letní sezóně se za svátky nepřiráží** (majitel, 2026-10-12): všechny letní týdny
    stojí stejně (28 000 Kč), i ty s nocemi na 5. a 6. 7. Platí pro každý pobyt s nocí
    v sezóně, tedy i pro týden přes hranici sezóny a pro kratší pobyt zapsaný ručně
    v adminu. Víkendová přirážka u krátkého pobytu zůstává. Sezónu určuje
    `server/services/season.js` pro cenu i pro pravidlo týdne.
  - Omezení termínů (Vánoce, léto) hlídá `server/services/stay-rules.js` jen u **veřejné**
    rezervace (`price/calculate`, `reservation/create`). Výpočet ceny sám nic neodmítá —
    vlastník v adminu může zapsat i termín, který web neprodává.
  - Referenční sazby pro Booking.com (placeholder na starém modelu) jsou ze `config.js`
    pryč; ceny na Bookingu se tady neřeší.

- **Neschválený ceník nesmí opustit vývoj** (2026-08-30). `pricing.approved: false` znamená,
  že v produkci vrátí `price/calculate` i `reservation/create` rovnou 503
  `caio-propertyman/price/notApproved`. Ve vývoji se počítá dál (jinak by nešlo stavět
  frontend) a odpověď nese `provisional: true`.
  Pojistka **musí být první řádek use casu**, ne až u výpočtu ceny — `reservation/create`
  se ptá do Monga dřív (rate limit), takže hlouběji schovaná pojistka vracela 500
  z nedostupné DB místo čistého 503.

## Ochrana formuláře

- **Rezervační formulář chrání reCAPTCHA v3, vedle honeypotu a rate limitu** (2026-10-06, majitel).
  - **Server:** `reservation/create` volá `Captcha.verify` z `caio-server`. Pořadí je ceník → honeypot → captcha → validace → rate limit:
    - odhalený bot nestojí dotaz do Googlu;
    - bot se nedozví, která pole má špatně.
  - **Action:** název use casu (`reservation/create`), formulář ji volá stejně.
  - **Klient:** `useReCaptcha` z `uu5extrasg01`. Site key dostane **až po první interakci s formulářem**. Formulář je na úvodní stránce a hook by jinak tahal Google skript a jeho cookies při každé návštěvě.
  - **Zapnutí:** řídí ho klíče. Server bere `GOOGLE_RECAPTCHA_SECRET` z `.env`, klient `GOOGLE_RECAPTCHA_API_KEY` z `client/.env.development` přes `define` jako Maps.
  - **Bez secretu:** v developmentu formulář projde, v produkci `caio-server` každé odeslání odmítne 503 `caio-server/captcha/unavailable` (požadavek majitele). Klíče proto musí být oba, nebo žádný.
  - **Odznak Googlu** vpravo dole zůstává. Schovat ho jde jen s textovým odkazem na zásady Googlu u formuláře; dnes tam je jen věta „Formulář chrání Google reCAPTCHA.“
  - **Ještě nevydaný `caio-server`:** `Captcha` přijde ve verzi 0.4.0, která obsahuje i breaking změnu CORS. Do vydání se testuje přes `npm run sync -- --server`. Pak je potřeba zvednout pin na `^0.4.0`.

- **Doména e-mailu se ověřuje v DNS** (2026-10-07, majitel).
  - **Kde:** `reservation/create` volá `Mailer.checkEmail` z `caio-server` po všech levných kontrolách a před rate limitem. Doména, která neexistuje (`gmail.coom`) nebo poštu nepřijímá (null MX), vrací 400 u pole e-mailu.
  - **Výpadek DNS adresu propustí.**
  - **Co to nepozná:** neexistující schránku ani překlep, který padne na zaregistrovanou doménu. Ten pořád zachytí vlastník, který se hostovi do 24 hodin ozývá, a povinný telefon.
  - **Ruční záznam z adminu** kontroluje jen formát, stejným regexem (`Mailer.validateEmail`).

## Admin rezervací

- **Aktivní a Archiv** (2026-10-09, majitel). Archiv = všechno ukončené: rezervace hosta ve stavu
  `completed`, `rejected`, `cancelled`, `expired`, plus blokace a importy, jejichž termín skončil
  (`dateTo <= dnes`; akce stavu nemají a zůstávají `confirmed`). Potvrzená rezervace hosta po pobytu
  zůstává v Aktivních, dokud ji vlastník neukončí. Archiv je po letech příjezdu, rok je povinný
  (`reservation/list` `scope: "archive"` bez `year` = 400). Pravidlo je na jednom místě:
  `server/reservation/scope.js`.
- **Filtry ve FilterBaru, filtruje server** (2026-10-09, majitel): stav, zdroj, příjezd od–do
  (Aktivní), rok (Archiv). Klientský filtr uu5tiles by viděl jen načtenou stránku.
- **Klik na řádek otevře detail** (2026-10-09, majitel); `onItemClick` v `caio-ui` Crud.
- **„Platba přijata“ místo „Záloha přijata“ u platby celé částky** (2026-10-09, majitel). Jen popisek v adminu (`actionLabelCode` ve `fields.jsx`); akce na serveru je dál `markDepositPaid`.
- **„Čeká na platbu“ u platby celé částky** (2026-10-09, majitel). Stav je dál jeden (`awaitingDeposit`), jen popisek se mění podle plánu; filtr ukazuje „Čeká na zálohu / platbu“. Historie bere plán z doby události (`fullPayment` v události přechodu).
- **Kalendář na webu rozlišuje předběžnou obsazenost** (2026-10-09, majitel): žádost a rezervace čekající na platbu (nic nezaplaceno) světlejší barvou, potvrzená (aspoň částečně zaplacená), blokace a import plnou. Veřejné `availability/get` vrací jen `tentative`, nic osobního.
- **Kalendář na webu je zároveň výběr termínu** (2026-10-10, majitel): klik na příjezd a odjezd vyplní pole „Termín pobytu“ ve formuláři a naopak (stav drží `reservation.jsx`). Obsazené dny mají v `dateMap` `disabled` -- uu5g05 1.52.1 ho ještě nečte, začne platit s vydáním, které ho podporuje.
- **Storno podmínky** (2026-10-10, majitel): poplatek z ceny pobytu podle dní do příjezdu: 0–14 dní 100 %, 15–30 dní 50 %, 31–60 dní 25 %, 61+ dní zdarma. Pravidlo jen v `server/config.js` (`cancellationPolicy`) a `server/reservation/cancellation.js`; e-maily z něj skládají text podmínek, storno zapíše do rezervace `cancellation` (den, dny do příjezdu, %, poplatek, zaplaceno, vratka) a e-mail o stornu uvede vratku. Vratka = zaplaceno − poplatek, nikdy záporně: nedoplatek do poplatku se po hostovi automaticky nevymáhá. Text na webu (podmínky, FAQ) je v `cs.json` ručně -- při změně pravidla upravit i ten.
- **V adminu data přes `Uu5Elements.DateTime`, čísla přes `Uu5Elements.Number`** (2026-10-09, majitel).
- **E-mailové adresy a telefony v HTML e-mailu jsou odkazy** (2026-10-09, majitel): `mailto:`, `tel:` jen u čísla s předvolbou (jinak by se odkazoval variabilní symbol nebo účet).
- **Admin i web jsou primárně na telefonu** (2026-10-09, majitel): každá obrazovka se ověřuje na
  šířce telefonu.
- **Faktury: majitel má IČO, není plátce DPH, faktura jen ad hoc** (2026-10-10, majitel). Vystavuje ji vlastník v detailu rezervace, když o ni zákazník požádá: předvyplněný dodavatel, doplní odběratele, vygeneruje a stáhne PDF a pošle ho sám. Appka faktury neposílá, zálohová faktura se nedělá. Hotové PDF se ukládá do databáze (kolekce `invoice`) a opakované stažení vrací to samé PDF. Návrh v [proposal-invoice-pdf.md](./proposal-invoice-pdf.md); poznámka o § 9 ZDP v `design.md` tím neplatí.
- **Chyby vstupu se ukazují u polí formuláře** (2026-10-11): server posílá `paramMap` ve tvaru uu5g05-forms (`{ invalidValueKeyMap: { "$.<input>": { invalid: zpráva } } }`) přes `formParamMap` v `server/services/dto.js`; `crud.js` ho převádí ve `failed()`. Klíč musí být jméno inputu, který formulář má (jinak forms formulář zamkne): `readId` paramMap neposílá, veřejný formulář si `dateFrom`/`dateTo` přejmenovává na `stay` (`renameFormFields`). Na klientu to potřebuje caio-ui 0.4.3+, kde `Call` dává `code` a `paramMap` přímo na chybu.

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
