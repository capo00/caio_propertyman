# Rozdělané věci / backlog

Živý seznam — položky mažu, jak se vyřeší (výsledek jde do [decisions.md](./decisions.md)
nebo do příslušného dokumentu), přidávám nové, jak vzniknou.
Formát je schválně stejný jako `caio-devkit/docs/wip.md`.

---

## Kde jsme skončili (2026-09-02)

**Hotovo: etapy 0–8 a 10.** Zbývá **9** (galerie — čeká na fotky) a **11** (deploy).
Podrobnosti u každé etapy v [impl-plan-v1.md](./impl-plan-v1.md), tabulka nahoře má stav.

Appka běží: `npm run dev` → **http://localhost:8080** (serverový port, ne 3000; není HMR).
Produkční build (`npm run build`) prochází.

**Co existuje:**

- **Server** (~900 řádků, 13 souborů): `reservation` dao/crud/api, `availability/get`,
  `price/calculate`, `reservation/create` s honeypotem a rate limitem, e-mailové notifikace,
  iCal export i import. Ověřeno proti Mongu a curlem. **Beze změny od 2026-08-30.**
- **Frontend**: designový systém z předlohy (Fraunces + Karla lokálně), 10 sekcí,
  galerie s lightboxem nad `Uu5Imaging.Image`, rezervační formulář + kalendář obsazenosti
  nad `Uu5Elements.Calendar`. Ověřeno proklikáním v prohlížeči — formulář opravdu založí
  rezervaci a kalendář ji obratem obarví jako obsazenou.

### Co se udělalo 2026-09-02

1. **Fraunces v liště.** `Uu5Elements.Header` v `top.children` (`app.jsx`) dostal `className`
   cílící na `[data-name="Uu5Elements.Text"]` uvnitř — vyšší specificita přebije uu5 třídu
   s Karlou bez ohledu na pořadí vložení stylesheetů. Nahrazovat `Header` naším `Heading`
   (dřívější plán, viz [Otevřené](#otevřené)) tak nakonec nebylo potřeba.
2. **Galerie → `Uu5Imaging.Image` + `lightbox`** ([component-tree.md § B.13](./component-tree.md),
   bod 1). Zmizel `<button>` obal, `openIndex` state i `Modal`; `GalleryItem` rozhoduje mezi
   naší `Photo` (dokud `src: null`) a `Image` (`lightbox="roubenka"`, `lightboxTrigger="image"`).
   Ověřeno naostro: dočasně nastaven `src` na existující asset, lightbox se otevřel na celou
   obrazovku s průchodem/zoomem/downloadem, pak vráceno zpět na `null`.
3. **Kalendář obsazenosti → `Uu5Elements.Calendar`** (component-tree bod 2), `uu5calendarg01`
   pryč z `client/package.json` i node_modules. Zmizela ruční hlavička měsíce (`shift()`,
   `monthLabel`, tlačítka), `dateMap` (klíč je `UuDate.toIsoString()`) obarví obsazené dny
   `colorScheme="secondary"` a `displayNavigation` dá přepínání měsíců zadarmo. Ověřeno
   založením zkušební rezervace 15.–17. 9. 2026 — dny 15 a 16 se obarvily, 17 (den odjezdu)
   ne — a smazáním z Mongo po ověření.
4. **`design.md` opraven na GCS** — Google Drive/`gFileId`/`googleDiskAuthPath` nahrazeno
   GCS bucketem/`objectName`/`GCS_BUCKET_NAME` v § 1, 2, 6, 8, 10, 12 (podrobnosti níž
   u [Neblokující, ale ověřit](#neblokující-ale-ověřit)).
5. **Mobilní layout ověřen** — viz [Neblokující, ale ověřit](#neblokující-ale-ověřit):
   hamburger v liště se rozbaluje správně, kotva z menu skáče, `theme.textMobile` zmenšuje
   nadpisy, patička je pod sebou. Cestou se našla a opravila past s `npm install` mažící
   `caio-ui` z cache (viz tamtéž) — appka mezitím krátce běžela bez lišty a patičky.
6. **Logo v liště → `Uu5Elements.TouchButton`** (`caio-ui/src/caio-ui-app/top.jsx`, funkce
   `renderLogo`). Dřív ruční `<img>` v `Uu5Elements.Link`, teď `TouchButton` (`RichIcon` pod
   kapotou) s `imageSrc` — pořádný touch target s hover/focus/pressed stavy z GDS zadarmo,
   `height={TOP_HEIGHT - 16}` drží stejnou velikost jako dřív. Anchor-scroll override
   (`e.preventDefault()` + `scrollToAnchor`) i `tooltip` prop fungují dál stejně. Změna je
   v `caio-ui`, ne v appce — vyžádala si `npm pack` + reinstall + restart dev serveru (viz
   past výš). Ověřeno: `<a role="button" data-name="Uu5Elements.TouchButton">`, klik na logo
   z prokliknuté stránky (Kontakt) skočil zpět na `#hero`, žádné chyby v konzoli.
7. **Všechny odkazy na kotvu teď skáčou plynule za přesně 1 s**, ne okamžitě (natvrdo, ne
   nastavením prohlížeče) — `scrollIntoView({ behavior: "smooth" })` dobu neumí zadat.
   Vlastní `requestAnimationFrame` smyčka s `easeInOutQuad`, v obou repozitářích zvlášť
   (nesdílený kód mezi `caio-ui` a appkou):
   - **`client/src/scroll.js`** (nový soubor) — `smoothScrollTo(el)` a `scrollToAnchor(href)`.
     Používá `Button` (`layout/button.jsx`, anchor `href` dostal `onClick` override —
     dřív jel čistě nativně) a `routes/home.jsx` (starý skok `scrollTo` ze zrušených rout
     sekcí, dřív `scrollIntoView` bez animace).
   - **`caio-ui/src/caio-ui-app/top.jsx`** — stejná logika přímo ve `scrollToAnchor` (menu
     položky i logo v Topu ji už používaly, jen bez animace).
   Obojí respektuje `scroll-margin-block-start` cíle, pokud ho má nastavený, i
   `prefers-reduced-motion` (skočí rovnou). Ověřeno: klik na `Button` i položku menu přistane
   přesně na hranici sekce pod lištou, stará routa `/gallery` doscrolluje plynule na galerii.
   **Mimo dosah zůstává** jen skutečně nativní skok kotvy (ruční `#hash` v URL, reload
   s hashem) — to není odkaz, který appka renderuje, takže se ho JS override netýká.
   **Upraveno 2026-09-02 (majitel):** `Section` už `scrollMarginBlockStart: 80` nenastavuje
   (`layout/section.jsx` zjednodušený zpět na `getAttrs`) — kotva teď přistává přesně na horní
   hraně sekce, ne 80 px pod ní. Jediný zbylý `scroll-margin-block-start` v repu je `:target`
   v `main.jsx` (96, pro čistě nativní skok kotvy popsaný výš).

### Co se udělalo 2026-09-01

1. **Logo v liště** — zelená dlaždice s „R“ nahrazená obrázkem z `assets/meta/icon-192.png`.
   Cesta je v `Config.asset.logo` (`client/src/config/config.js`).
2. **[docs/component-tree.md](./component-tree.md)** — nový dokument: 29 mermaid diagramů
   (z čeho je každá sekce složená) + návrh, co z toho má být z uu5, včetně změřených limitů
   (paleta `building` je bílá a nepřenastavitelná, prostrkání v GDS typografii je 0,5 px,
   rádius `moderate` = 8 px sedí na náš, `square-meter` neexistuje jako jednotka pro `Number`).
3. **Routy → jedna stránka s kotvami.** Zrušené `routes/section-page.jsx`, staré URL sekcí
   doscrollují na kotvu. Kotvy jsou v `client/src/content/nav.js`.
4. **Rám stránky se přesunul do `caio-ui`.** `Spa` umí `top`/`footer`/`main`, `Page` se
   exportuje, `Top` je nový (logo, children, menu, sticky, transparent, cssBackground,
   cssColor, colorScheme, maxWidth) a nastavuje se jen přes prop `top`. V appce zmizely
   `layout/header.jsx` a `layout/page.jsx`.
5. **Opraveny React warningy** — komponenty vzhledu už nerozbalují `{...restProps}` na DOM
   prvek, ale skládají atributy přes `Utils.VisualComponent.getAttrs`.
6. **Designové dokumenty srovnané se skutečností** — `design.md § 9`, `design-v1.md § 3/5`,
   `docs/ux-design-system.md § 4`, `docs/impl-plan-v1.md` (F1, 8.2, tabulka etap).

### První věc zítra

**Fraunces v liště i galerie/kalendář na uu5 jsou hotové** (viz výš). Zbývá z dřívějška:

- **Etapa 11 (deploy)** — jde udělat i s placeholdery; server v produkci cenu stejně odmítne
  spočítat, dokud není `pricing.approved: true`, takže by to bylo nasazení „výkladní skříně“
  bez funkčních rezervací.
- **Doladit lištu (zbytek)** — lišta je pořád zelená i po odscrollování, ne průhledná nad
  hero (viz [Otevřené](#otevřené)). Nastavení (`transparent`, funkční tvar propsů), ne kód.
- ~~**Další doporučení z component-tree § B.13**~~ **Hotovo 2026-09-03** — `Grid`, `Number`,
  `Tile`, `Accordion`, `Tag`, `HighlightedBox`, `InfoItem`, `Text` na nadpisy i mapa,
  viz [Revize webu na uu5 komponenty](#revize-webu-na-uu5-komponenty-2026-09-03) níž.
  Z tabulky zbývá jen `PlaceholderBox code=success` místo ručního `Confirmation`
  ve formuláři, `Line` v patičce a rozhodnutí o `Eyebrow`.

**Past, na kterou jsem narazil při vývoji:** testovací servery spuštěné na pozadí
přežívají ukončení nadřazeného příkazu a drží port 8080, takže další `npm run dev`
spadne na `EADDRINUSE`. Když se to stane: `netstat -ano | findstr :8080` a zabít ten PID.

**Past při ověřování v prohlížeči:** panel řízený automatizací je `document.visibilityState
= "hidden"`, takže se v něm **nedoručují scroll eventy, `requestAnimationFrame`,
`IntersectionObserver` ani `ResizeObserver`**. Cokoli závislého na scrollu (sticky stavy,
smooth scroll, sbalování `ActionGroup`) proto vypadá jako rozbité. Screenshot vynutí
vykreslovací krok a eventy se doručí — nebo jde stav nasimulovat
`window.dispatchEvent(new Event("scroll"))`.

---

## Revize webu na uu5 komponenty (2026-09-03)

Majitel zadal revizi: tlačítka, dlaždice („O roubence“, ceník), dotazy, layout a mapa mají
stát na `uu5g05-elements`. Naměřené limity komponent jsou v
[component-tree.md § B.0](./component-tree.md) (a dvě opravy proti němu níž).

**Pravidlo, které z toho platí dál:** v `caio-architecture` se komponenty uu5 nastavují
**propsy**. Přestylování (`className`, `Config.Css.css` nad uu5 komponentou) se nedělá samo
od sebe — nejdřív se navrhne a **musí ho schválit majitel**.

**Rozhodnuto:**

- **`Uu5Elements.Button` se bere tak, jak je.** Nepřebíjí se výška, rádius, padding, tučnost
  ani zalamování textu. Varianta `outline` = `significance="distinct"`, `solid` =
  `significance="highlighted"`. Vzhled se tím proti předloze posune (48 px místo 54,
  16/500 místo 16/600, rádius 7,2 px místo 8, popisek se nezalomí) — bere se to jako cena
  za jeden design systém.
- **Podklad tlačítek řeší `BackgroundProvider`**, ne varianty `onDark`/`outlineOnDark`.
  Forest sekce (hero, rezervace) se obalí `background="dark"` a GDS si světlé stavy zvolí sám.
- **`Tile` se taky nepřebíjí** — jen propsy (`significance`, `borderRadius`, `header`,
  `headerSeparator`). Výjimka, kterou majitel povolil dopředu, je **padding**.
- **`Heading` má nahradit `Uu5Elements.Text` a jeho propsy** (`category`/`segment`/`type`);
  `Eyebrow`, `Section` a `Photo` zůstávají prozatím naše, ale i tam platí „maximum uu5,
  minimum přestylování“.
- **Mapa: dvoufázově.** Placeholder ve vzhledu předlohy, iframe Maps Embed API se načte až
  po kliknutí → nula requestů na Google do té doby, tedy žádná cookie lišta. Embed API je
  **bez poplatku a bez limitů**, potřebuje jen API klíč; Static a JavaScript API se platí
  per map load, takže placeholder **nesmí** být obrázek ze Static API.

**Poznámky k pozdější úpravě (majitel s tím není spokojený, neruší to dnešní stav):**

- **Selektor `'& [data-name="Uu5Elements.Text"]'`** (`client/src/app.jsx`, Fraunces v liště)
  se majiteli nelíbí — hledat cestu přes propsy nebo podporu v `caio-ui`, ne přes cílení na
  vnitřek cizí komponenty.
- **`client/src/config/uu5-override.js`** (zamýšlené jedno místo pro přebití ploch) je
  odsouhlasený jen prozatím a s výhradou, že v něm nakonec skoro nic nebude. Když by měl
  růst, je to signál, že se něco dělá špatně.

**Opravy proti [component-tree.md](./component-tree.md):**

- **§ B.6 bod 2 neplatí:** `Tile significance="highlighted"` **není** náhrada za `borderWidth: 2`
  — `Shape.ground.highlighted` je plná tmavá plocha `#212121` se světlým textem. Nejblíž naší
  kartě je `significance="subdued"` (bílá + 1px `#E0E0E0`, **bez stínu**); `common` má stín
  `elevationGround`, který předloha nikde nemá.
- **§ B.4 ikony:** `uugds-conifer`/`-leaf`/`-fire` neexistují. Základní sada `uugds-*` je
  UI ikonografie (193 kusů, z vybavení použitelné nic). Použitelné jsou **stencily**:
  `uugdsstencil-it-wifi`, `uugdsstencil-weather-fire`, `uugdsstencil-home-coffee`,
  `uugdsstencil-home-flower`, `uugdsstencil-home-home`; pro `pets` v celé lokální sadě
  žádná ikona není. `mdi-*` by šlo z CDN — nepoužívat, celý stack je self-hosted.
- **Naměřeno k tomu navíc:** `Tile` má padding `useSpacing().b` = 8 px (desktop) / 4 px
  (mobil); `Uu5Elements.SpacingProvider type="loose"` ho zvedne na 16 px **bez CSS**.
  `Uu5Elements.Text` s `type="h1".."h5"` renderuje **skutečný `<hN>`** s `margin: 0`, takže
  osnova dokumentu se náhradou `Heading`u neztratí; `category="expose"` (hero 44/52) naopak
  renderuje `<span>`. `Uu5Elements.Header level={N}` je totéž jako `Text story/heading/hN`.
  `Uu5Elements.Grid` nepotřebuje přebít nic: gapy berou px a `sizePolicy="content"` měří
  **kontejner**, ne viewport (na rozdíl od našeho `useScreenSize()`).

**Hotovo 2026-09-03 — krok 1 (tlačítka) a příprava mapy:**

- **`SpacingProvider type="loose"` obaluje celou appku** (`client/src/app.jsx`) — pro weby je
  `loose` výchozí volba. `useSpacing()` tím vrací a2/b16/c24/d32 místo a2/b8/c16/d24, takže
  padding `Tile` bude 16 px (ne 8) a výchozí `gap` v `Grid` 24 px (ne 16), bez jediného CSS.
- **`layout/button.jsx` je jen obal nad `Uu5Elements.Button`** — nulové přebíjení. `solid` =
  `significance="highlighted"`, `outline` = `distinct`, `size="xl"` (48 px, nejvyšší stupeň
  GDS). Varianty `onDark`/`outlineOnDark` **zmizely**: `colorScheme` se volí podle podkladu
  z kontextu (`useBackground()` → `building` na tmavé, `primary` na světlé), což na forest
  sekci dává bílou výplň s tmavým textem a světlý rámeček — přesně předlohu.
- **`Section` hlásí podklad do kontextu** (`BackgroundProvider background="dark"` pro
  `variant="forest"`), takže veškeré uu5 uvnitř tmavé sekce volí správnou variantu samo.
  **Bílé karty v rezervaci to musí vrátit na `light`** (`sections/reservation.jsx`) — jinak by
  formulář i kalendář kreslily světlé barvy na bílou. Ověřeno v prohlížeči, konzole čistá.
- **Kam patří klíč pro Google Maps: `client/.env.development` → `GOOGLE_MAPS_API_KEY=`**
  (soubor je v .gitignore; pro produkci stejná proměnná v prostředí buildu). Do bundlu ho
  dostane `define` v novém `client/vite.config.js`, čte se jako `Config.googleMapsApiKey`.
  **`import.meta.env.VITE_*` v tomhle buildu nefunguje** (SystemJS výstup) — hodnota se do
  bundlu vůbec nedostane, ověřeno. Proto bez prefixu `VITE_` a přes `define`, tedy stejnou
  cestou, jakou devkit dosazuje NAME/VERSION.
  Vedlejší nález: **Rollup zahazuje nepoužité property `Config`u** — dokud klíč nikdo nečte,
  není v bundlu vůbec (ověřeno probem, po přečtení se objeví). Při hledání „proč tam ta
  hodnota není" na to nesednout.

**Hotovo 2026-09-03 — krok 8 (dokumentace):**

- **[decisions.md](./decisions.md)** — rozhodnutí ze 2026-08-29 („web se sází sémantickým
  HTML, `Uu5Elements` jen kde dodává chování") je **zrušené** a nahrazené pravidlem
  „uu5 se nastavuje propsy, přestylování jen se schválením majitele", včetně seznamu
  ústupků proti předloze a toho, co ze starého rozhodnutí zůstalo platit
  (`setMeaningColor`, globální font, nepřenastavitelná paleta `building`). Přidané
  rozhodnutí o dvoufázové mapě a o tom, kudy jde klíč do buildu.
- **[component-tree.md](./component-tree.md)** — část A přepsaná podle skutečnosti:
  aktualizované diagramy A.0 (sdílené primitivy), A.2–A.12 včetně A.7/A.7a/A.7b, nový
  souhrn A.13 a hlavička dokumentu. V části B je revidovaný závěr § B.0 (dělící linie
  „layout z uu5, povrch náš" **neplatí**), přeškrtnuté „co nedělat" a tabulka § B.13
  se stavem u každého bodu. Dvě chybná tvrzení části B jsou opravená na místě
  (`Tile significance="highlighted"`, kontejnerové breakpointy `Gridu`).

**Hotovo 2026-09-03 — krok 7 (mapa, dvoufázově):** nová `components/map.jsx`, v kontaktu
místo placeholderové `Photo`.

- **První fáze** je **statický obrázek z Maps Static API ve výchozím vzhledu Googlu**
  (2026-09-03; mezitím byl chvíli nastylovaný do palety webu přes `style=`, majitel to
  vrátil na výchozí — stylovaná statická mapa se po kliknutí viditelně přebarvila, protože
  Embed API stylování neumí). `loading="lazy"` odloží request až k viewportu, `scale=2` dodá
  retina rozlišení v rámci jednoho volání. **Tlačítko tam není** — klikací je celá plocha
  (`Box onClick`), klávesnici řeší `elementAttrs` (`role="button"`, `tabIndex`, Enter/Space),
  a pod mapou je tichý popisek, že kliknutí načte mapu z Googlu. Bez klíče zůstává
  `PlaceholderBox code="location"`.
  Ověřeno: obrázek 1280×960 se načte, poměr stran boxu 1.33, `cursor: pointer`,
  klik kamkoli do mapy přepne na iframe.
  **Past:** `Box` bere `aspectRatio` jako **token** (`"4x3"`), ne jako CSS `"4 / 3"` —
  s CSS zápisem se to sice vykreslí, ale konzole hlásí `Invalid prop`.
  **Past při ověřování:** `loading="lazy"` se ve skrytém panelu prohlížeče **vůbec nespustí**
  (žádný IntersectionObserver), takže obrázek zůstane nenačtený — pro kontrolu se musí
  přepnout `img.loading = "eager"` a znovu nastavit `src`.
- **Druhá fáze** je iframe Maps Embed API (`/maps/embed/v1/place?key=…&q=lat,lng&zoom=14
  &language=<jazyk appky>`) v `Uu5Elements.Box aspectRatio="4 / 3" borderRadius="moderate"`.
  Titulek iframu jde z LSI přes `useLsi` (čtečka jinak čte bezejmenný rám).
- **Ověřeno v prohlížeči:** klíč z `client/.env.development` je v bundlu (maskovaný grep),
  takže `define` cesta z kroku 1 funguje naostro; statická mapa se vykreslí v paletě webu
  s bodem na souřadnicích z `content/property.js` a po kliknutí se přepne na interaktivní
  iframe s českými popisky. Cookies z google.com přijdou teprve s tím iframem.
- **Bez klíče** komponenta ukáže placeholder a jen odkaz ven — do produkce se tak nemůže
  dostat poloviční mapa. `content/contact.js` → `mapUrl` teď míří na Google Maps
  (dřív OpenStreetMap).
- Nové LSI klíče: `sections.contact.mapButton`, `.mapConsent`, `.mapTitle`, `.mapLink`
  (cs i en).
- **Placeholder schválně není obrázek mapy ze Static API** — ten se platí per map load,
  zatímco Embed API je zdarma a bez limitů.

**Hotovo 2026-09-03 — krok 5 (drobnosti na propsech):**

- **`Uu5Elements.Number` místo `formatPrice()`** — funkce byla duplikovaná v `pricing.jsx`
  i `reservation-form.jsx` (tam je z ní lokální `Price`), s natvrdo psaným `"cs-CZ"` a `"Kč"`.
  Teď `currency="CZK" currencyFormat="symbol" maxDecimalDigits={0}` (bez toho posledního
  přidá Intl haléře). Vzdálenosti v okolí jdou stejnou cestou: `unit="kilometer"
  unitFormat="short"`, takže `" km"` z JSX zmizelo a v datech zůstává holé číslo.
- **`Uu5Elements.Tag`** (`colorScheme="primary" significance="highlighted" borderRadius="full"`)
  místo ručně stylovaného pillu s odznakem, **`Uu5Elements.HighlightedBox`**
  (`colorScheme="warning" icon="uugds-alert"`) místo dashed `<p>` u neschváleného ceníku.
  Práh nocí i odznak jsou teď v slotu `header` karty.
- **Ceny a čísla statistik jsou `expose`** (`broad` 28/32 u ceny, `lead` 34/40 u statistik) —
  expresivní údaje, ne nadpisy sekcí. Popisky u nich jsou `interface/content/small`
  s `colorScheme="dim"` místo `theme.color.mutedFg`.
- **Kontakt na `InfoGroup`/`InfoItem`** (`itemDirection="vertical-reverse"` = malý popisek nad
  hodnotou) s ikonami `uugds-mapmarker`/`-phone`/`-email`. Lokální komponenta `Row` zmizela.
- **Ikony vybavení ze stencilů** — `content/amenities.js` má nový sloupec `icon`
  (`uugdsstencil-home-home`, `-weather-fire`, `-home-coffee`, `-home-flower`, `-it-wifi`);
  u `pets` je `null`, protože v celé lokální sadě není žádné zvíře, a dlaždice se vykreslí
  bez ikony. Ověřeno, že se stencily v devu opravdu načtou (viz oprava devkitu výš).

**Past: `Uu5Elements.Link` s `type="email"`/`"phone"` nefunguje, dokud je v appce router.**
Prefix `mailto:`/`tel:` sice `LinkView` doplní sám, ale `withRouteLink`, kterým je `Link`
obalený, si holou hodnotu **nejdřív přeloží proti `Environment.appBaseUri`**
(`new URL("info@…", base)`), takže výsledný odkaz je `mailto:http://localhost:8080/info@…`
— naměřeno v DOM. Schéma proto musí být rovnou v `href` (`href={`mailto:${…}`}`) a `type`
se nepoužívá. Ostatní propsy `Link`u (`colorScheme="primary"`, `underline="onHover"`) fungují
normálně — bez `colorScheme` spadne odkaz na modrou/fialovou barvu prohlížeče.

**Hotovo 2026-09-03 — krok 4 (dotazy na `Uu5Elements.Accordion`):** `sections/faq.jsx` je
dnes `itemList` — ruční accordion i `useState(openCode)` zmizely. `allowMultiple={false}`
drží „jedna otevřená", `initialOpen` na první položce „první rozbalená". Otázka jde dovnitř
jako `Heading level={3}`, takže zůstává `<h3>` v osnově (uvnitř elementu s `role="button"` —
kompromis podle § B.10). Ověřeno v prohlížeči: 5 panelů, 5× `<h3>`, 5× `role="region"`,
klik na druhou otázku otevřel ji a zavřel první, konzole čistá.
**Past v `Panel`u:** `itemSignificance` se na obal **překládá** mapou `{distinct: "subdued"}`,
takže `subdued` skončí jako průhledný panel **bez** linky a rámeček (0,8px `rgba(33,33,33,.16)`,
radius 8) dá právě **`distinct`**. Nastaveno tedy `itemSignificance="distinct"`.
Vzhled proti předloze: pět samostatných panelů se 4px mezerou a chevronem místo jednoho
bloku s vlasovými linkami a `+`/`−`; podklad panelu je průhledný (prosvítá krém sekce).

**Hotovo 2026-09-03 — krok 3 (layout na `Uu5Elements.Grid`):** převedeno 9 míst — `about`,
`gallery`, `pricing` (karty, ceny i poznámky), `reviews`, `surroundings`, `contact`,
`reservation`, `stats`, `footer`. Zmizelo 14 ručních `display: grid`/`flex` a **`useScreenSize()`
v pěti sekcích** (zůstává v `Section` na vertikální rytmus, v `hero` na výšku bloku a ve
`footer` na gutter). Zápis `{ xs: "1fr", m: "1fr 1fr" }` je „od téhle šířky výš", protože
`getSizeValue` padá na nejbližší menší definovanou hodnotu. Gapy se předávají v px, aby
rytmus zůstal jako v předloze — `Grid` bez `rowGap`/`columnGap` bere `spacing.c`, což je
v `loose` režimu 24 px.
**Sémantiku drží `children` jako funkce:** `<dl>` ve statistikách, `<ul>` u poznámek ceníku
a podmínek rezervace zůstaly, jen si na sebe nasadily spočítaný `style` z `Gridu`.
Ověřeno v prohlížeči: `display: grid` a gapy sedí na všech devíti místech, tagy `DL`/`UL`
zůstaly, vodorovné přetečení nulové, konzole čistá; při simulovaných 390 px se dvousloupcové
sekce i patička složí na jeden sloupec.
⚠️ **Oprava mého dřívějšího tvrzení:** `Grid` **nedává kontejnerové breakpointy** — jen
uvnitř `ContentSizeProvider`u, který zakládá pouze tělo `Modal`u/`Dialog`u.
`useContentSize("content")` jinak padá na `useScreenSize()`, takže se rozhoduje podle
viewportu úplně stejně jako dosavadní kód (změřeno; opraveno i v
[component-tree.md § B.4](./component-tree.md)). Přínos kroku je tedy méně kódu a deklarativní
zápis, ne jiné breakpointy.

**Hotovo 2026-09-03 — krok 2 (karty):** `layout/card.jsx` je `Uu5Elements.Tile` nastavený
propsy, **bez jediného přebití** (i ten povolený padding je zbytečný — `SpacingProvider
type="loose"` dává 16 px). `significance="subdued"` je z GDS jediná varianta s **plochou,
linkou a bez stínu** (`common` přidává `elevationGround`); měřeno v prohlížeči: bílý podklad,
0,8px linka `#E0E0E0`, radius 8, `box-shadow: none`, padding hlavičky i obsahu 16 px.
Zvýrazněná karta ceníku je `colorScheme="primary" significance="distinct"`, tedy **odlišení
barvou plochy** (světle zelená) místo dřívějšího 2px rámečku — `significance="highlighted"`
by byla plná tmavá plocha, viz oprava § B.6 výš. Titulky jdou do slotu `header` (dlaždice
vybavení, karty okolí), takže zmizely ruční paddingy 16/18 px; hlavička karet okolí
(titulek + vzdálenost na jednom řádku) stojí na `Uu5Elements.Grid templateColumns="1fr auto"`
místo vlastního flexu. Ceník a recenze mají obsah beze změny — přestavba ceníku (`header`,
`Tag`, `Number`) přijde v kroku 5.
Rozdíl proti předloze: podklad karty je čistě bílá místo `#FFFDF9` a linka studená `#E0E0E0`
místo teplé `#DFDBCB`.

**Hotovo 2026-09-03 — krok 6 (nadpisy):** `layout/heading.jsx` stojí na `Uu5Elements.Text`
přes **`children` jako funkci** (Text spočítá typografii a předá ji jako `style`, značku
renderujeme my) — proto je hero headline **skutečné `<h1>`**, i když má sazbu
`expose/default/hero`, kterou by `Text` sám vykreslil jako `<span>`. Mapování: level 1 =
`expose/default/hero` 44/52 w700 (expresivní text, má upoutat), level 2 = `story/heading/h2`
30/36 (nadpisy klasických sekcí), level 3 = `story/heading/h5` 18/22 w700 (titulky dlaždic).
**Schválené přetížení: `fontFamily` na Fraunces** — font v GDS typografii není žádný token,
uu5 ho dědí z globálního `html { font-family }` (Karla), takže bez té jedné deklarace by
display font ze webu zmizel. Druhá deklarace je `textWrap: balance` na našem `<hN>`.
Zmizelo: prop `onDark` (barvu dědí ze sekce), ruční `fontSize` u titulků dlaždic
(`about.jsx` 16 px, `surroundings.jsx` 18 px) a mobilní zmenšení nadpisů — GDS má vlastní
`smallScreen` sadu a `Typography.getValue()` mezi nimi vybírá sama podle `getScreen()`.
Tím **`theme.textMobile` nikdo nepoužívá** a `theme.text.h1` taky ne; zbytek (`h2`/`h3`)
drží ještě statistiky, ceník, dotazy, patička a formulář — smazat, až se dostanou na `Text`.
Ověřeno v prohlížeči: `<h1>` je na stránce jeden, tagy `h1`/`h2`/`h3` sedí, konzole bez
jediného warningu.

**Hotovo 2026-09-03:** stencilové ikony v devu (viz `caio-devkit/docs/decisions.md`) —
`uu5-loader` mazal v nemin režimu `uu_gds_svgg01-<stencil>.min.css`, ale `Icon` si o `.min.css`
říká v obou režimech, takže stencily byly v devu 404 a v produkci fungovaly. Teď se drží obě
varianty všech ikonových stylů (+136 kB v dev buildu), ilustrace se kopírovaly správně už dřív.
Do appky se to dostalo přepsáním souboru v `node_modules` (obojí kopie), **ne** `npm install`em
— kvůli pasti s cache popsané u [Neblokující, ale ověřit](#neblokující-ale-ověřit). Po příštím
čistém `npm install` je to bez ztráty, tarball v `caio-devkit/dist/` je aktuální.

**Hotovo 2026-09-03 — lišta se schovává při scrollu dolů.** `caio-ui/src/caio-ui-app/top.jsx`:
`withStickyTop(TopView, { visibility: "onScrollUp", render: false })` (bylo `"always"`).
Do appky se to dostalo zase přepsáním souboru v `client/node_modules/caio-ui`, tarball
v `caio-architecture/caio-ui/dist/` je přebalený.

Co se u toho muselo dořešit — dvě věci, které z propu samy nevypadnou:

- **Přechody vzhledu se do inline stylu musí PŘIPOJIT, ne psát do třídy.** HOC posílá
  `style={{ top, position, zIndex, transition: "top 400ms" }}` a inline `transition`
  přebije tu ze třídy — naše `background/color/box-shadow` přechody se tím dřív vůbec
  neuplatňovaly (tichá chyba, s `visibility: "always"` nebylo co poznat). Teď se obě
  hodnoty spojují v `usedProps`; ověřeno: `transition-property` je
  `top, background, color, box-shadow`.
- **Odjetá lišta zůstává v DOM a dá se do ní vrátit tabulátorem.** `Top` proto při fokusu
  nad horní hranou sroluje o pixel nahoru — HOC z toho udělá směr „up" a lištu vysune.
  (Chrome si focus scrolluje i sám, ale na to se nedá spolehnout u prvku, který je
  schovaný jen záporným `top`.)

Naměřeno v prohlížeči: scroll dolů → `top: -56px`, `rectTop: -56` (lišta pryč, ale pořád
`stuck`, takže si drží zelenou i stín); scroll nahoru → `top: 0` s viditelným přechodem;
na vrcholu stránky v toku a bez stínu; fokus do skryté lišty ji vysune; konzole čistá.
**Past při ověřování:** neaktivní panel prohlížeče **nedoručuje scroll eventy vůbec**
(naměřeno `scrollEvents: 0` po `window.scrollTo`) — `withStickyTop` i naše detekce
dosednutí na nich stojí, takže stav zamrzne. Screenshot vynutí frame a eventy se doručí;
měřit se proto musí až po něm.

Zbývá k tomu jedna kosmetika: skoky na kotvu mají `scrollMarginTop: 0` (`:target` pravidlo
v `main.jsx` se neuplatní, protože `scrollToAnchor` dělá `preventDefault` a hash se nemění).
Při skoku **dolů** to teď vychází líp než dřív (lišta odjede, sekce sedí u hrany), při skoku
**nahoru** lišta zůstane vidět a překryje prvních 56 px sekce.

---

## Otevřené

- **Rám stránky se přesunul do `caio-ui` (2026-09-01).** Hlavička i patička se nastavují
  přes `UiApp.Spa` prop `top`/`footer`, vlastní `Header` a `Page` v appce zmizely, samostatné
  routy sekcí se změnily na skok na kotvu. Viz [decisions.md](./decisions.md) a
  [component-tree.md § A.0/A.1](./component-tree.md). **Otevřené k tomu:**
  - Lišta je dnes zelená i po odscrollování, ne průhledná nad hero jako v předloze. `Top`
    má `transparent` i funkční tvar propsů (`cssBackground: ({ stuck }) => …`), takže
    vrátit průhlednou lištu nad hero je nastavení. ~~Název je v Karle, ne ve Fraunces~~
    **vyřešeno 2026-09-02** — `className` na `Uu5Elements.Header` cílící na
    `[data-name="Uu5Elements.Text"]` (viz výš).
  - `Top` v caio-ui **nemá login/identity tlačítko** — vyhozené záměrně, vrátí se
    s propem `displayIdentity` (dřív se přidávalo vždy, když `Top` dostal `menuList`).
  - `collapsible` (schování celé lišty přes chevron) a `scroll` props se do `Top` taky
    ještě nevrátily.
  - **Změna v caio-ui se do appky nedostane samotným `npm install`** — verze v `package.json`
    se nemění, takže npm vezme tarball z cache. Postup je v `caio-ui/README.md`
    („Vývoj: jak se změna dostane do appky“) — **i tenhle `npm install` bez souvislosti
    s caio-ui to umí rozbít**, viz past u [Neblokující, ale ověřit](#neblokující-ale-ověřit).
- ~~**Konzole hlásí React warningy z našich komponent**~~ **Opraveno 2026-09-01.**
  `Eyebrow`, `Heading`, `Card`, `Button`, `Section`, `Photo` (a `Page` v caio-ui) rozbalovaly
  `{...restProps}` na DOM prvek, takže tam tekly uu5 props (`nestingLevel`, `testId`,
  `fullTextSearchPriority`, `noPrint`, `elementRef`, `elementAttrs`) a React na každém hlásil
  „React does not recognize the … prop on a DOM element". Teď se atributy skládají přes
  **`Utils.VisualComponent.getAttrs(props, className)`**, což je whitelist (`id`, `className`,
  `style`, `ref` z `elementRef`, rozbalené `elementAttrs`, `data-testid`) — uu5 props do něj
  nepropadnou vůbec a className volajícího se zaplete za náš.
  Vedlejší efekt: kdo potřebuje předat vlastní DOM atribut, předá `elementAttrs={{…}}` —
  což je stejná konvence, jakou má celý uu5. Ověřeno: v celém dokumentu nemá **ani jeden**
  prvek uu5 prop jako atribut a konzole je na dev buildu bez warningů.
- **Globální `~/.npmrc` má mrtvý token.** Míří na
  `repo.plus4u.net/repository/plus4unet-sbx-npm` s `_authToken`, který vrací
  **401 `Unable to authenticate, need: BASIC realm="Sonatype Nexus Repository Manager"`**.
  Uvnitř repozitářů to nevadí (každý má vlastní `.npmrc` na veřejný `public-javascript`
  mirror), ale **cokoli spuštěného mimo ně selže** — třeba `npx`, `npm view`, nebo
  `npm install` v čerstvé složce. Buď token obnovit, nebo globální `.npmrc` přesměrovat
  na `public-javascript`.
- **`MONGODB_URI` pro produkci** — Atlas cluster + connection string. Lokální dev jede na
  `mongodb://127.0.0.1:27017/caio_propertyman` (`mongod 4.2.3` je nainstalovaný).
  Bez něj v1 nedává smysl
  ([design-v1.md § 2](../design-v1.md#2-prerekvizity), řádek 5).
  **Past:** `caio-server` si k URI sám lepí `"?" + "retryWrites=true&w=majority"`
  (`src/caio-server-dao/config/config.js`), takže **URI nesmí mít vlastní query string**.
  Atlas ho v „Connect“ dialogu dává defaultně
  (`mongodb+srv://…/?retryWrites=true&w=majority&appName=…`) — všechno od `?` dál umazat,
  jinak vznikne `…?…?…` a připojení spadne. Do `.env` tedy jen
  `mongodb+srv://user:heslo@cluster.mongodb.net/caio-propertyman`.

## Server je hotový, ale dvě věci nejsou ověřené naostro

- **E-mail (etapa 5) nikdy neodešel.** `services/email.js` je napsaný, ale bez SMTP účtu
  se jen zaloguje `SMTP není nastavené` a pokračuje. Až budou `SMTP_HOST/USER/PASS`
  a `OWNER_EMAIL`, je potřeba poslat jednu zkušební rezervaci a zkontrolovat **oba** maily
  (vlastníkovi i hostovi) — hlavně že v tom hostovi je jasně napsané, že termín **ještě není
  potvrzený**.
- **iCal import běžel jen proti umělému feedu.** Parser jsem ověřil na ručně složeném
  feedu „s detaily“ včetně zalomených řádků a osobních údajů, a na vlastním exportu.
  Proti skutečnému Bookingu a e-chalupám neběžel nikdy. Až budou URL:
  spustit `calendar/sync` **dvakrát** a ověřit, že podruhé nevznikly duplikáty, a že
  vlastní rezervace z webu zůstaly nedotčené.

## Ceník čeká na schválení

Model je hotový a funguje, **čísla nejsou schválená**. `server/config.js` má
`pricing.approved: false`; dokud se nepřepne na `true`, server v **produkci** odmítne
spočítat cenu (503 `caio-propertyman/price/notApproved`) a rezervaci nezaloží. Ve vývoji
počítá dál, aby šlo stavět frontend, a v odpovědi vrací `provisional: true`.

**Co je potřeba doplnit** — tabulka Kč za noc, pro každý kanál zvlášť:

| | 1–5 osob | 6+ osob |
|---|---|---|
| od 1 noci | ? | ? |
| od 3 nocí | ? | ? |
| od 5 nocí | ? | ? |
| od 7 nocí | ? | ? |

Dvakrát: jednou pro `web`, jednou pro `booking`.

**Kromě čísel čekají na potvrzení i tyhle placeholdery**, které jsem převzal z předlohy
nebo si je vymyslel:

| Co | Teď | Kde |
|---|---|---|
| prahy délky pobytu | 1 / 3 / 5 / 7 nocí | `pricing.rates.*` — klíče jsou libovolné |
| hranice počtu osob | do 5 / od 6 | `pricing.guestTiers` |
| kapacita | max 8 osob | `capacity.max` |
| minimální pobyt | 2 noci | `minNights` |
| maximální pobyt | 60 nocí | `maxNights` — přidal jsem sám jako pojistku |

Až budou čísla: přepsat `rates` v `server/config.js`, přepnout `approved: true`
a stejná čísla promítnout do `client/src/content/pricing.js` (etapa 8).

## Obsah je placeholder

Texty, adresa, telefon, e-mail, recenze a fotky z předlohy jsou vymyšlené prototypem
(rozhodnuto 2026-08-30). Struktura sekcí na to je připravená.

**Kde se to mění** (od 2026-08-31, kdy texty přešly na `importLsi`):

- **texty** — `client/src/lsi/cs.json` (a `en.json`, kdyby se zapínala angličtina)
- **údaje a struktura** — `client/src/content/*.js`: adresa, GPS, telefon, e-mail, kódy
  položek, pořadí, sazby ceníku. Každý soubor tam má nahoře `TODO OBSAH`.

**Nejcitlivější položky** (tyhle nesmí jít na produkci tak, jak jsou):

- `content/contact.js` — telefon `+420 777 123 456` a e-mail jsou vymyšlené; mohly by patřit
  někomu jinému
- `lsi/cs.json` → `reviews` — čtyři „recenze“ od neexistujících hostů
- `content/property.js` — adresa Libošovice 74 a GPS souřadnice
- `lsi/cs.json` → `faq` — odpovědi o storno podmínkách a záloze jsou závazné údaje, musí je
  potvrdit vlastník

~~**Fotky:** `content/gallery.js` má u všech položek `src: null`~~ **Doplněno 2026-09-02.**
8 skutečných fotek (majitel nahrál do `public/assets/`, přesunuto do `public/assets/gallery/`
podle plánu) — už jen `.jpeg`, ne `.webp` (nebyl po ruce konvertor a soubory jsou beztak
malé, 100–220 kB, max 1280 px), jinak beze změny postupu.

Skutečné fotky ale neodpovídaly vymyšleným popiskům z prototypu (žádná terasa s ohništěm,
okno s muškáty, skalní město, sauna ani podzimní zahrada na fotkách nebyly) — `content/gallery.js`
i `lsi/cs.json`/`en.json` → `gallery` proto mají nové kódy podle toho, co fotky doopravdy
ukazují: `exterior` a `livingRoom`/`atticBedroom` zůstaly (fotka jen dosazená na správné místo —
`livingRoom` teď ukazuje na `05-jidelna.jpeg`, protože tam je vidět kamna, ne na `04-*`),
přibyly `annex` (vejměnek), `facade` (bok roubenky), `kitchen` + `diningArea` (dva úhly téže
společenské místnosti) a `secondBedroom`. `About`'s koláž (`about.jsx`, `CollagePhoto`) bere
první tři podle `order` beze změny kódu — teď to jsou tři exteriérové fotky.

## Neblokující, ale ověřit

- **`NODE_ENV=production` nejde otestovat proti lokálnímu Mongu.** `caio-server` si
  v produkci k URI přilepí `ssl=true` (`src/caio-server-dao/config/config.js`), takže
  lokální `mongod` bez TLS spadne na `ECONNRESET` (ověřeno 2026-08-30). Produkční build
  jde lokálně proklepat jen s Atlasem, nebo dočasně přes `NODE_ENV=development`.

- ~~**`design.md` říká Google Drive pro `BinaryStore`, `caio-server` mezitím přešel na GCS**~~
  **Opraveno 2026-09-02.** `design.md` teď mluví o GCS všude (§ 1, § 2, § 6, § 8, § 10, § 12) —
  `sys_binary` má `objectName` místo `gFileId`, upload jde přes `BinaryStore.isConfigured()`/
  `createApi()` (žádné `BinaryStore.init`), env proměnná je `GCS_BUCKET_NAME`.
- ~~**Mobilní layout není vizuálně ověřený.**~~ **Ověřeno 2026-09-02** (obchůzka za
  `resize_window`, který stále nejde spolehnout — hlásí úspěch, ale reálná šířka okna zůstává
  zaseklá na nějaké hodnotě dané prostředím, tentokrát 982 px místo dřívějších 1536):
  `Object.defineProperty(window, "innerWidth"/"innerHeight", { value: ... })` +
  `window.dispatchEvent(new Event("resize"))` (oklame `useScreenSize()`) společně s injektovaným
  `<style>` `html, body { max-width: 390px; margin: 0 auto; overflow-x: hidden }` (donutí
  kontejnery, které měří svou reálnou šířku přes `ResizeObserver` — např. `ActionGroup` — aby se
  fakt zmenšily). Prošlo: hamburger v liště se objeví a rozbalí (`O roubence` … `Kontakt`,
  `Rezervovat` zůstává vždy vidět přes `collapsed: "never"`), kotva z rozbaleného menu skočí
  správně, `theme.textMobile` zmenší nadpisy, patička je pod sebou. Skript i nález jsou jen
  v historii konverzace, nikde v repu — při příští appce/komponentě to zopakovat ručně.
- **Past, na kterou jsem narazil při tomhle ověřování:** `npm install` v `client/` (i bez
  změny verze v `package.json`) dokázal **tiše vrátit `caio-ui` na starou verzi z npm cache**
  navzdory tomu, že `caio-ui/dist/caio-ui-0.1.0.tgz` na disku byl aktuální — `Top`/`Page`
  z 2026-09-01 zmizely beze stopy (žádná chyba v konzoli, appka vypadala funkční, jen bez
  lišty a patičky). Řešení bylo přesně to, co už říká `caio-ui/README.md`:
  `rm -rf node_modules/caio-ui && npm install --force <cesta k .tgz>`, a pak ještě
  **restartovat běžící `npm run dev`** — samotný reinstall nestačil, dokud si běžící
  `caio-devkit`/vite proces nepřečetl znovu `node_modules`. Ponaučení: po jakémkoli
  `npm install` v `client/`, i "neškodném" (mazání balíčku), zkontrolovat, že lišta a patička
  pořád existují v DOM (`document.querySelector('[data-name="CaioApp.Top"]')`), než se hledá
  bug jinde.
- **Přístupy k portálům** — Booking.com extranet a `klient.e-chalupy.cz`. Potřeba až
  u kroku iCal, ale je to věc, která se shání dlouho, takže začít brzo.
- **SMTP účet pro notifikace** (`SMTP_*`, `OWNER_EMAIL`).

## K ověření až u kódu (nesázet na to dopředu)

- **Umí `Uu5Elements.Calendar` označit nedostupné dny?** Kalendář obsazenosti (etapa 10.1)
  na tom stojí. Když ne, je to vlastní komponenta.
- **Má `uu5g05-elements` použitelný accordion pro FAQ?** Když ne, je to ~20 řádků se `useState`.
- **Sémantika `step` u `FormDateRange`.** Validuje `daysDiff % step === 0`, takže na
  „aspoň 2 noci" to nestačí a je potřeba vlastní `onValidate`. Ověřit, ať se `minNights`
  nevaliduje jen na serveru.
- **Jak moc půjde dostylovat `uu5g05-forms` inputy** do vzhledu předlohy (karta na `forest`
  podkladu). Tohle je nejpravděpodobnější místo, kde se uu5 design systém pobije s předlohou —
  když to bude bolet víc, než pomáhat, formulář se napíše ručně (validace je stejně na serveru).
- ~~**`caio-ui` je z velké části česky natvrdo**~~ **Vyřešeno 2026-08-31** — texty `caio-ui`
  jsou v `src/lsi/cs.json` + `en.json` a čtou se přes `importLsi`. Totéž prošel i tenhle repozitář
  (viz [decisions.md](./decisions.md), *Frontend*).
- **GCP projekt s povoleným App Engine** — `gcloud` CLI je nainstalované (582.0.0),
  projekt zatím neověřen.
