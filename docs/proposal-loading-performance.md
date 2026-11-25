# Návrh: načítání a výkon webu podle afkbratcice

Stav: **návrh k odsouhlasení** (2026-11-25). Nic z něj není implementované, nic se necommitovalo.
Předloha je práce v `afkbratcice` z 2026-11-23 až 25 (vydáno afkbratcice 0.12.5, caio-ui 0.4.12,
caio-devkit 0.5.3): `afkbratcice/docs/proposal-section-loading.md` a `docs/proposal-mobilni-vykon.md`.

Naměřená data a skripty leží mimo repo ve sdílené složce session
(`…\side-session-notes\local_ffeaff88-25cc-4fd3-a175-b8b4313ff9bf\loading-performance-pm\`, viz [Příloha](#příloha-data-a-skripty)).

---

## 1. Shrnutí

- **Propertyman na tom je výrazně líp, než byl AFK před opravou.** Velkou část toho, co se v AFK dělalo
  teď, udělal už v říjnu (statické routy, líné těžké knihovny, `LazySection` na home, písma v `<head>`,
  WebP fotky s variantami, preload fotky hero, první render až s jazykem). CLS je skoro všude 0.
- **Skáčou jen dvě routy, obě kvůli datovým sekcím se špatnou rezervou:** `/cenik` (kalendář obsazenosti,
  mobil 0,025, desktop v Lighthouse až 0,117) a `/recenze` (spinner 200 px → recenze posune kontakt, 0,026).
  Ve scrollu po home driftuje výška dokumentu o ±420 px (zastaralé `ESTIMATE`, `#recenze` bez odhadu).
- **Lighthouse produkce: desktop 78–91, mobil 42–53** (AFK po opravách 79–93 / 53–56). Mobil brzdí stejné
  věci jako v AFK: inicializace uu5 (`uu_gdsg01-unicorn` ~0,7 s) a první render Reactu (0,6–1,5 s) při CPU 4×.
  LCP na mobilu (6,7–8,1 s simulovaně) je ze 70–90 % *render delay*, ne stahování.
- **Nové nálezy, které AFK neměl:**
  1. **`/galerie`:** fotky se začnou stahovat až v 4,9 s (simulovaný mobil), protože čekají na řetěz
     `gallery-image` chunk → `uu5imagingg01` → `uu5g05-forms` (183 kB). Na home začínají ve 2,1 s.
  2. **Administrace nemá boot screen** (`uves.admin.boot: false`): na pomalé síti 15 s (produkce) až
     33 s (lokálně) prázdná tmavá obrazovka.
  3. **Lišta při prvním snímku bez ikon:** boot screen zmizí s prvním renderem, písmo ikon GDS ještě není
     stažené, hamburger menu doskočí později (totéž opravil AFK v `0ab99ce`).
  4. **Statické soubory na produkci mají `Cache-Control: public, max-age=0`**, i verzované knihovny
     (`/libs/uu5g05/1.54.0…/`), hashované chunky a písma. Opakovaná návštěva každý soubor revaliduje.
     Týká se i AFK, je to `express.static` v caio-serveru.
- **Z AFK převzít:** povýšení caio-ui 0.4.12 a caio-devkit 0.5.3 (preload skriptů nechat vypnutý),
  `UiElements.Deferred`, boot screen až do hotové stránky (web i admin) a zpožděné spinnery.
  **Nepřebírat:** preload skriptů, rezervu výšky obalu routy (A1), statické routy (už jsou),
  fázi 2 se skeletony a `SectionSlot`.
- **Odhad ≈ 4,25–6 d celkem**, z toho ≈ 2,75–3,5 d propertyman, 1–2 d sdílené kroky (boot screen do
  caio-devkit/caio-ui, cache v caio-serveru) a 0,5 d měření. Otevřené otázky Caio rozhodl 2026-11-25 (sekce 9);
  propertyman se vydá jednou verzí na konci.

---

## 2. Jak jsem měřil

Stejná metodika jako v AFK:

- **CLS na routách:** skript přes CDP v Edge headless (`cls.mjs` z AFK, doplněný o CWV okna: mezera ≤ 1 s,
  okno ≤ 5 s, a o úklid prohlížeče po chybě). Profil **slow 4G** (1,6 Mbit/s, 150 ms RTT) + **CPU 4×**,
  vypnutá cache, viewporty **390×844** a **1366×768**. Pět hlavních rout 3 běhy, ostatní 1 běh,
  home navíc se scrollem (`SCROLL=1`, lazy sekce). Absolutní časy jsou nafouknuté throttlingem, použitelné
  je CLS a pořadí událostí.
- **Lighthouse 13.5** v Edge headless: mobil se simulovaným zpomalením (výchozí, home 3 běhy, ostatní 1),
  desktop preset (home 3 běhy), mobil se skutečným zpomalením (`devtools`, 1 běh). Jen výkon a přístupnost.
- **Lokálně:** produkční build HEAD (`69aad2c`, odpovídá 0.3.2 + úpravy ceny rezervace) v kopii repa
  mimo pracovní adresář, server na portu 8095 s lokální databází. Lokální server **neposílá gzip**, takže
  lokální LCP na mobilu (14–19 s) je omezený pásmem; použitelné jsou CLS, TBT a desktop.
- **Produkce:** `https://roubenyraj.cz` 0.3.2, jen načítání stránek zvenku (GET), databáze nedotčená.
- **Omezení:** jedna kopie dat (recenze, obsazenost), jeden profil sítě; Lighthouse ostatních rout 1 běh
  (rozptyl skóre ±5 bodů je u home vidět i mezi třemi běhy).

---

## 3. Výchozí stav

### 3.1 CLS na routách (slow 4G + CPU 4×, první návštěva, CWV okna)

Lokální build i produkce dávají stejná čísla (rozdíl jen v časech), proto jedna tabulka.

| Routa | Mobil 390 | Desktop 1366 | Co se hýbe |
|---|---:|---:|---|
| `/` | 0 | 0 (1× 0,0015 v boot screenu) | nic; scroll: mobil **0,014** (sekce ceníku) |
| `/cenik` | **0,025** | 0,007 | `section#kalendar` o 50 px (rezerva 260 px ≠ kalendář) |
| `/recenze` | **0,026** | 0,010 | `section#kontakt` o 42 px (spinner 200 px → recenze) |
| `/rezervace` | 0,0007 | 0 | prázdný div fallbacku formuláře |
| `/galerie`, `/ubytovani`, `/ubytovani/loznice`, `/okoli`, `/faq`, `/kontakt`, `/de/` | 0 | 0 | — |
| `/admin/` | 0 | 0 | — (ale 15–33 s nic, viz 3.4) |

Lighthouse desktop (viewport 1350×940) na `/cenik` naměřil **0,117 lokálně a 0,036 na produkci**: na vyšším
okně je kalendář celý ve viewportu a jeho dorovnání posune víc obsahu.

**Scroll po home** (lazy sekce, mimo viewport, takže CLS skoro nedělají): výška dokumentu mobil
9243 → 8833 → 9254 → 8994 px, desktop 6182 → 6014 → 6267 px (±4–5 %). Kotvy to řeší `revealAll`,
ale skok z hero na `#rezervace` při scrollu ručně se může o pár set px „posunout pod rukou“.

### 3.2 Lighthouse

| Routa | Produkce mobil | Produkce desktop | Lokál mobil | Lokál desktop |
|---|---|---|---|---|
| `/` (3 běhy) | **50–53**, LCP 6,9–7,0 s, TBT 840–930 ms | **84–91**, LCP 1,5–1,6 s, TBT 120–170 ms | 49–53, TBT 850–1120 | 74–81, TBT 150–250 |
| `/` mobil, skutečné zpomalení | 45, LCP 13,9 s, TBT 5,8 s | | 45, LCP 18,3 s | |
| `/cenik` | 50, LCP 6,7 s, TBT 1210 | 85, CLS 0,036 | 53 | 80, **CLS 0,117** |
| `/rezervace` | **42**, LCP 7,7 s, **TBT 2270** | 78, TBT 260 | 48 | 84 |
| `/galerie` | **46**, **LCP 8,1 s** | 83 | 57 | 77 |
| `/admin/` | 49 | 83 | 33 (FCP 8 s) | 64 |

Přístupnost 96 (na `/rezervace` 85–88, popisky polí a `FormDateRange` z uu5, sepsáno v
[uu5-proposal-a11y.md](./uu5-proposal-a11y.md)), admin 95.

Pro srovnání AFK po opravách (zadání): desktop 79–93, mobil 53–56.

### 3.3 Kam jde čas (produkce, simulovaný mobil)

**Home** (43 požadavků, 1,2 MB):

```
 0,36 s  HTML; souběžně 4 písma (103 kB, preload), uu5loader, fotka hero (preload, 58 kB)
 0,75 s  index.js (po loaderu)
 0,96 s  uu5g05, uu5g05-elements, react, theme-setup chunk
 1,05 s  react-dom (až po shimu)
 1,28 s  uu_appdatatypesg02, uu5stringg01
 1,38 s  uu_gdsg01-unicorn, uu_i18ng01
 2,05 s  druhá vlna uu5g05-elements, fotky „O roubence“, ikony GDS (uu_gds_svgg01)
```

- **LCP = fotka hero** („Roubenka z boku“): stáhne se do 0,75 s, pak **1,45 s render delay** (čeká na JS
  a render). Se skutečným zpomalením CPU je render delay 11 s z 13,9 s.
- **Hlavní vlákno:** `uu_gdsg01-unicorn` 680–790 ms jedním blokem, `react-dom` 590 ms (home) až 1490 ms
  (rezervace). Stejný obraz jako AFK (`proposal-mobilni-vykon.md` M4); propertyman v tom nemá nic vlastního.
- Nevyužitý JS při startu ~290 kB (platformní knihovny, rozdělit nejdou).
- `uu5g05-forms` už na home nejde (v říjnu ho táhl caio-ui, dnes ne). **Jde ale na `/galerie`** přes
  `uu5imagingg01` (viz 3.5).

### 3.4 Start a vzhled během načítání

- **Web:** boot screen z devkitu je uvnitř `#root` a React ho smaže prvním renderem. Protože propertyman
  nemá `AppProvider` ani líné routy, první render je rovnou celá stránka (bez dat sekcí), takže šedé
  mezistavy jako v AFK tu nejsou. Ale **písmo ikon GDS ještě není stažené**: na prvním snímku home chybí
  hamburger menu v liště a doskočí (filmový pás, `film/home-019077.png`).
- **Spinnery:** ceník, recenze, kalendář a fallback formuláře ukazují `Uu5Elements.Pending` hned.
  Na rychlé síti probliknou na desítky ms.
- **Administrace:** `boot: false` v `caio.config.js` (`uves.admin`). Do prvního renderu je stránka prázdná:
  slow 4G produkce FCP **15 s**, lokálně 24–33 s, Lighthouse mobil lokálně FCP 8 s.

### 3.5 Galerie: řetěz před první fotkou

```
 4,07 s  chunk gallery-image (dlaždice je withLazy)
 4,22 s  uu5imagingg01 (23 kB)
 4,42 s  uu5g05-forms (183 kB)  ← závislost uu5imagingg01
 4,92 s  teprve teď první fotky (-800.webp)
```

LCP `/galerie` je první fotka, *resource load delay* 4,4 s. Na mobilu se navíc hned stahuje 12+ dlaždic
po 34–198 kB (`02-ohniste-800.webp` má 198 kB). Totéž platí pro detail prostoru (`/ubytovani/<prostor>`)
a teaser galerie na home (tam jen pod ohybem).

### 3.6 Cache a server (produkce)

- Všechny statické soubory: `Cache-Control: public, max-age=0`, `Last-Modified: 1980-01-01` (App Engine
  nuluje čas souborů), slabé ETag `W/"<velikost>-<čas>"`. Prohlížeč tedy při každé návštěvě revaliduje
  ~40 souborů a revalidace jdou přes uu5loader ve stejných ~6 kolech jako první stažení.
- ETag z velikosti a nulového času znamená, že **nehashovaný soubor se stejnou velikostí po novém vydání
  vrátí 304** a prohlížeč si nechá starý (`index.js`, `admin.js`; `index.js` dostává `?v=`, takže tam to
  nehrozí, u ostatních nehashovaných souborů ano). Spíš teoretické, ale stojí za zmínku u změny cache.
- TTFB HTML 0,35–0,6 s zahřáté; těsně po probuzení instance (uptime 207 s) 1,0–1,4 s. `app.yaml` nemá
  `min_instances`, první návštěvník po nečinnosti čeká na start instance.

---

## 4. Co z AFK převzít

| AFK | Stav v propertymanu | Návrh |
|---|---|---|
| **caio-ui 0.4.12**: `UiElements.Deferred`, `top.logo.label`, `UiElements.SocialLink` | 0.4.11 | **Povýšit.** `Deferred` viz P5; `logo.label` místo `tooltip` jako přístupný název loga (dnes ho dává `title`, funguje, ale `label` je čistší a bez bubliny na mobilu; rozhodnuto, viz rozhodnutí 5); `SocialLink` místo vlastních PNG v kontaktu (`facebook`/`instagram`, 22 kB) |
| **caio-devkit 0.5.3**: `preloadScripts`, výchozí `false` | 0.5.1 (preload ještě neexistoval) | **Povýšit, volbu nezapínat.** Pro propertyman je to beze změny chování |
| `0ab99ce` boot screen drží do hotové stránky (`core/boot-screen.jsx`: přesun `#app-loading` mimo `#root`, `BootReady`, čekání na písma a ikony lišty, `inert`, `scrollbar-gutter: stable`, pojistka 20 s, `onUncaughtError`) | boot screen mizí prvním renderem, admin žádný | **Převzít, web i admin** (P3). Podle poznámky v AFK „až to bude chtít i jiná appka, patří to do caio-devkit a caio-ui“ — propertyman je ta druhá appka; rozhodnuto do sdílených knihoven (rozhodnutí 1) |
| `0ab99ce` zpožděné čekací stavy (`delayed-appear.js`: 400 ms průhledné, 100 ms prolnutí) | spinnery hned | **Převzít** pro `Pending` v ceníku, recenzích, kalendáři a fallbacku formuláře (P3) |
| `ab6c0de` home: hero a statistiky hned, zbytek v `Deferred` | home už odkládá sekce pod ohybem přes `LazySection` (mount 1000 px před viewportem) | Na home malý přínos (zbývá jen „O roubence“). **Použít na `/rezervace`** (P5), kde je TBT 2,3 s |
| `6196f45` malé routy bez lazy | routy jsou statické od začátku | nic |
| `6196f45` A1 obal routy s min. výškou okna | CLS dělají jen dvě datové sekce | **Nepřebírat**, viz kap. 6 |
| `b44a7bf`, `defe396`, `cf8a560` rezervy v kartě mužstva a historii | specifické pro AFK | analogie je P1 (ceník, kalendář, recenze) |
| `af5c272` výsledky z produkce, preload vypnutý | — | stejné měření po vydání (kap. 8) |
| `proposal-mobilni-vykon.md` M2 úvodní data v HTML | propertyman žádné úvodní dotazy nemá | nic |
| M4 profil `uu_gdsg01-unicorn` | stejných ~0,7 s | **nedělat zvlášť**, výsledek AFK (SLS uu5) platí pro obě appky |
| M5 loga týmů + dlouhá cache v bucketu | fotky jsou už WebP s variantami ve `public/` | cache řeší S1 (sdílené) |

---

## 5. Specifické pro propertyman

### P1. Ceník, kalendář a recenze drží přesné místo (CLS `/cenik`, `/recenze`)

- **Kalendář obsazenosti** (`availability-calendar.jsx:70-71`): místo prázdné rezervy 260 px se spinnerem
  vykreslit rovnou `Uu5Elements.Calendar` s prázdnou `dateMap` a čekání ukázat malým `Pending` v legendě.
  Tvar kalendáře je pak od prvního snímku přesný. Bylo to už v AFK návrhu (A6), neimplementováno.
  Vedlejší přínos: na `/cenik` desktop je LCP **legenda kalendáře**, která dnes čeká na `availability/get`
  (render delay 3,4 s); s okamžitým kalendářem se LCP posune na nadpis/karty ceníku.
- **Ceník** (`pricing.jsx:122-126`): při `pending` s daty nechat karty viditelné (`aria-busy`), ne spinner;
  při `pendingNoData` rezerva podle skutečné výšky karet (mřížka `minmax(220px, 280px)`: 1 řada na desktopu,
  2 karty pod sebou na mobilu) místo 200 px.
- **Recenze** (`reviews.jsx:45-47`): rezerva podle počtu zobrazovaných recenzí (teaser 3, routa podle
  stránky) místo 200 px, nebo karty-obrysy stejné výšky (bez skeleton animace, viz AFK specifikace C,
  jen pokud to bude vypadat lépe než prázdné místo).
- **`ESTIMATE` na home** (`routes/home.jsx:43-49`) přeměřit pro xs/s/m/xl a doplnit `#recenze`.
- **Odhad 0,5 d.** Přínos: CLS 0 na všech routách (i Lighthouse desktop `/cenik`), drift home ≤ ±5 %
  zůstane jen z rozdílu šířek.

### P2. Galerie bez čekání na uu5imagingg01 (LCP `/galerie`, detail prostoru)

- Dlaždice vykreslit hned jako obyčejný `<img>` s `srcset` (komponenta `Photo` to umí, `loading="lazy"`
  kromě první řady) a `uu5imagingg01` (+ `uu5g05-forms`) načíst až pro lightbox v `requestIdleCallback`
  po vykreslení stránky; klik/fokus dlaždice před dotažením načtení jen urychlí (rozhodnutí 2).
- `sizes` u dlaždic podle mřížky (`minColumnSize` 240 px), ať mobil s jedním sloupcem bere `-480`/`-800`
  podle šířky a desktop s více sloupci `-480`.
- Hlídá to dál `lazy-libs.test.js` (imaging zůstává jen dynamicky).
- **Odhad 0,5–1 d** (lightbox z `Uu5Imaging.Image` je dnes vázaný na dlaždici; buď otevřít lightbox
  programově po dotažení, nebo vyměnit dlaždici za `Image` po dotažení bez skoku: stejný poměr 4:3).
- **Přínos (`inferred`):** první fotky startují jako na home (~2,1 s místo 4,9 s simulovaně), LCP `/galerie`
  mobil ~8,1 → ~5,5 s. Data se kvůli načtení v idle neušetří (lightbox je pak připravený hned).

### P3. Boot screen až do hotové stránky, zpožděné spinnery (web i admin)

- **Rozhodnuto: do sdílených knihoven** (rozhodnutí 1): `#app-loading` vedle `#root` v caio-devkit,
  `BootReady`/`renderApp` v caio-ui, AFK pak přejde na sdílenou verzi a svou kopii smaže.
- Logika podle `core/boot-screen.jsx` z AFK: boot screen přesunout mimo `#root`, pustit ho po prvním renderu
  routy (`BootReady` v `router.jsx`) a po stažení písma ikon lišty (`uugds` menu, `uugdsstencil-weather`
  přepínač režimu). Písma webu se už přednačítají v `<head>`, takže čekání na ně bude ~0 ms.
- Web propertymanu nemá `AppProvider`, takže z AFK odpadá skrytí `PageLoading` během startu; potřeba je
  jen `ErrorBoundary`/`onUncaughtError` pustit boot screen i při chybě.
- **Administrace:** zapnout boot screen (`uves.admin.boot`, stejná kresba) a držet ho přes `preloadLsi`
  a první render. Prázdná tmavá plocha 8–15 s tím zmizí. Rozhodnuto zapnout (rozhodnutí 4); v
  `decisions.md` přepsat záznam „Admin boot screen nemá … jako dřív“.
- `delayed-appear` (400 ms) pro `Pending` v P1 a `FormFallback`.
- **Odhad 1,25–2 d** (0,75–1 d logika a zapojení v propertymanu + 0,5–1 d přesun do caio-devkit/caio-ui
  a vydání obou knihoven).
- **Přínos:** žádné doskakování ikon lišty a probliknutí spinnerů; admin ukáže boot screen hned
  (FCP ~1 s místo 8–15 s). Na Lighthouse skóre webu minimální (FCP už je boot screen).

### P4. Písma a preloady na pomalé síti (pokus s měřením)

- Propertyman přednačítá všechna 4 písma (103 kB) s vysokou prioritou a fotku hero (58 kB).
  V AFK se preload 8 písem vyřadil, protože by na pomalé síti předběhl skripty. Na produkci propertymanu
  písma končí v 0,53–0,73 s, stejně jako uu5loader (0,73 s): dělí se o pásmo.
- Pokus: preload jen `karla-latin` a `fraunces-600-latin` (latin-ext se stáhne podle `unicode-range`,
  jakmile ho text potřebuje; „ř“, „ě“ jsou ale v hero hned, proto jen měřit, ne slibovat).
- **Odhad 0,25 d** včetně měření. Přínos nejistý (desítky až stovky ms LCP na mobilu); když nepomůže,
  zůstává současný stav.

### P5. `/rezervace`: rozdělit první render

- TBT 2,3 s (produkce mobil), `react-dom` 1,5 s: rezervační sekce vykreslí najednou podmínky, kalendář
  přes 14 měsíců obsazenosti a fallback formuláře. LCP je perex (render delay 3,2 s).
- Nejdřív krátký profil (které komponenty), pak nadpis, perex a podmínky hned a kalendář (a karta
  formuláře) v `UiElements.Deferred` s rezervou výšky (kalendář po P1 má přesný tvar).
- Případně totéž pro `/ubytovani/<prostor>` a `/galerie` (mřížka fotek), podle profilu.
- **Odhad 0,5 d.** Přínos (`inferred` z AFK M3, kde to dalo LCP −0,9 s a TBT −0,8 s při CPU 4×): LCP
  `/rezervace` dřív, TBT nižší; skóre mobilu spíš +3 až +8 než skok.

### S1 (sdílené, mimo propertyman). Cache statických souborů v caio-serveru

- `express.static` v `caio-server-app/services/app.js:84` s `setHeaders`: `/libs/<knihovna>/<verze>/…`,
  `/chunks/*-<hash>.js`, `/assets/**/*-<hash>.*` a `/assets/fonts/*` → `public, max-age=31536000, immutable`;
  HTML, `index.js`, `admin.js`, `manifest.json` dál `no-cache`, ideálně se silným ETag z obsahu.
- Platí pro všechny appky stacku najednou (AFK, caio-apps). Vydání caio-serveru, bump ve třech appkách.
  Rozhodnuto dělat teď jako krok stacku (rozhodnutí 3).
- **Odhad 0,5–1 d** v caio-serveru. **Přínos:** opakovaná návštěva bez ~40 revalidací (na mobilu 6 kol
  po RTT), méně požadavků na instanci App Engine. Na Lighthouse (první návštěva) žádný.

### Zvážit: probouzení instance App Engine

`min_instances: 1` by odstranil čekání prvního návštěvníka po nečinnosti (TTFB 1,0–1,4 s proti 0,35 s),
ale instance by běžela 24 h denně (free kvóta 28 instance-hodin/den, při špičce s druhou instancí se
může vyčerpat). Rozhodnuto nechat uspávání (rozhodnutí 6).

---

## 6. Co z AFK nepřebírat

- **Preload startovních skriptů (caio-devkit `preloadScripts`).** V AFK zhoršil desktop (TBT 110 →
  330–400 ms, výkon 88 → 73–76) a mobilu dal jen ~−0,5 s LCP. Propertyman má stejný uu5loader, takže by
  dopadl stejně. Po povýšení na 0.5.3 zůstane vypnutý.
- **A1, obal routy s min. výškou okna.** V AFK řešil patičku ve viewportu během líných rout a skeletonů.
  Propertyman líné routy nemá a CLS dělají jen dvě sekce, které opraví P1 přesněji. A1 by krátkým
  stránkám (404, krátké FAQ na desktopu) přidal prázdné místo nad kontaktem.
- **Fáze 2 AFK návrhu:** `SectionSlot` v caio-ui a primitiva skeletonu. `LazySection` stačí, CLS je 0.
  Vrátit se k tomu, až bude mít `SectionSlot` druhého konzumenta s potřebou, která tu není.
- **Preload všech písem** AFK vyřadil; tady je naopak už zavedený a pomohl s CLS (říjen). Neměnit bez
  měření (P4).

---

## 7. Pořadí kroků, odhad a přínos

| # | Krok | Kde | Odhad | Očekávaný přínos |
|---|---|---|---:|---|
| 1 | Povýšit caio-ui 0.4.12 a caio-devkit 0.5.3, `logo.label`, `SocialLink` | propertyman | 0,25 d | základ pro P3/P5, −22 kB PNG, beze změny výkonu |
| 2 | **P1** kalendář, ceník, recenze, `ESTIMATE` | propertyman | 0,5 d | CLS 0 na všech routách; LCP `/cenik` desktop bez čekání na data |
| 3 | **P2** galerie bez imaging do prvního kliku | propertyman | 0,5–1 d | LCP `/galerie` mobil ~−2,5 s, −183 kB |
| 4 | **P3** boot screen do hotové stránky + zpožděné spinnery, web i admin | caio-devkit + caio-ui, pak propertyman (a AFK) | 1,25–2 d | bez doskakování ikon a probliknutí; admin bez 8–15 s prázdné obrazovky |
| 5 | **P5** `/rezervace` v `Deferred` (po profilu) | propertyman | 0,5 d | TBT a LCP `/rezervace` dolů, mobil +3–8 bodů (`inferred`) |
| 6 | **P4** pokus s preloadem písem | propertyman | 0,25 d | nejistý, jen s měřením |
| 7 | Měření před/po (stejné skripty, 3 běhy, produkce po vydání) | — | 0,5 d | |
| S1 | Cache statických souborů | caio-server, pak všechny appky | 0,5–1 d | rychlejší opakované návštěvy všech appek |
| | **Celkem** | | **≈ 4,25–6 d** | |

Propertyman se vydá **jednou verzí na konci** (rozhodnutí 7): kroky 1–6 v `development`, měření před/po
na lokálním produkčním buildu, po vydání měření produkce. Sdílené knihovny (caio-ui, caio-devkit,
caio-server) se vydávají průběžně, jak je kroky potřebují. Krok 3 je největší měřitelný zisk Lighthouse.
Realistický cíl po krocích 1–5: **mobil 52–58 na hlavních routách** (dnes 42–53), desktop beze změny
nebo mírně lépe (78–91), **CLS 0 všude**. Výš to bez zásahu do uu5 runtime (M4 v AFK) nepůjde, stejně
jako v AFK.

---

## 8. Ověření

- CLS: `cls.mjs` (CWV okna) na všech routách 390/1366, slow 4G + CPU 4×, 3 běhy hlavních rout; cíl
  0 (medián i maximum), home scroll drift ≤ ±5 %.
- Lighthouse: mobil simulovaný 3× a desktop 3× na `/`, `/cenik`, `/rezervace`, `/galerie`, admin; lokálně
  před vydáním, pak produkce.
- Filmový pás startu (`FILM=`) web i admin: nejvýš boot screen → hotová stránka, lišta s ikonami
  od prvního snímku.
- `npm test` (včetně `lazy-libs.test.js`), ruční průchod: lightbox galerie, kotvy z hero, rezervační flow
  (s ohledem na rozpracovanou práci v `docs/flow-rezervace.md` a `docs/testy-rezervace.md`).

---

## 9. Rozhodnutí (Caio, 2026-11-25)

1. **Boot screen (P3) do sdílených knihoven:** `#app-loading` vedle `#root` v caio-devkit, `BootReady`
   a `renderApp` v caio-ui; AFK přejde na sdílenou verzi. Ne kopie z AFK.
2. **Galerie (P2):** `uu5imagingg01` načíst v idle po vykreslení stránky, ať je lightbox připravený
   hned; klik před dotažením načtení jen urychlí.
3. **S1 cache v caio-serveru:** dělat teď jako krok stacku (vydání caio-serveru, bump v AFK, caio-apps
   a propertymanu).
4. **Admin:** boot screen zapnout, stejná kresba roubenky jako web; záznam v `decisions.md` přepsat.
5. **Logo v liště:** `logo.label` jako v AFK, bez tooltipu.
6. **App Engine:** nechat uspávání, `min_instances` neměnit.
7. **Vydání propertymanu:** všechno najednou jednou verzí na konci; sdílené knihovny průběžně.

---

## 10. Stav implementace (2026-11-25, větev `perf/loading-performance`)

| Krok | Stav | Výsledek (lokální produkční build, slow 4G + CPU 4×) |
|---|---|---|
| 1 Knihovny, `logo.label`, `SocialLink` | hotovo | caio-ui 0.4.12 → 0.4.13, caio-devkit 0.5.3, caio-server 0.8.2 |
| 2 P1 rezervy | hotovo | CLS `/cenik`, `/recenze`, `/`, `/rezervace` 0 (mobil i desktop). `ESTIMATE` přeměřené ve 412/700/1000/1200/1400 px: sedí na pixel, beze změny |
| 3 P2 galerie | hotovo | dlaždice jako `<img>` hned, imaging v idle, klik předem otevře lightbox po načtení (ověřeno). LCP `/galerie` mobil 23,7 → 18–19,5 s, desktop ~25 → 17,8 s, CLS 0. Navíc: obal dlaždice `display: grid` ruší 7,6 px mezeru pod fotkou |
| S1 cache | hotovo, vydáno | caio-server 0.8.2: `libs/<verze>/`, `chunks/*-<hash>.js`, `assets/*-<hash>.*` immutable; ověřeno hlavičkami |
| 4 P3 boot screen + spinnery | hotovo, vydáno | caio-ui 0.4.13 `renderApp`/`BootReady`; admin FCP 32,5 → 0,5 s (boot screen), CLS 0; lišta s ikonami od prvního snímku |
| 5 P5 `/rezervace` `Deferred` | hotovo | kalendář a formulář v `UiElements.Deferred`. A/B Lighthouse mobil (3 běhy, medián, stejný stroj): bez boot screenu 47 / TBT 1,26 s, s boot screenem 46 / 1,42 s, s `Deferred` **50 / 1,0 s**. Home ve všech třech 53–54 (šum) |
| 6 P4 preload písem | nepokračovat | boot screen teď na písma včetně latin-ext čeká; kratší preload by ho jen zdržel |

**Profil `/ubytovani`, detailu prostoru a `/galerie` (2026-11-25, Lighthouse mobil 3×, long tasks):**
první render routy (react-dom) je 330–460 ms, největší blok je inicializace `uu_gdsg01-unicorn`
(690–815 ms po renderu), na detailu a galerii ještě `uu5g05-forms` (~150 ms) z lightboxu načteného
v idle. Rozhodnutí: `BelowFold` (components/below-fold.jsx = `Deferred` s rezervou na výšku okna,
s kotvou v adrese hned) na `/ubytovani` (doplňující informace) a na detailu prostoru (vše od druhé
místnosti dál). Galerie ne: mřížka je hlavní obsah s LCP a render je nejkratší.

| Routa | před (perf / TBT / LCP) | s `BelowFold` |
|---|---|---|
| `/ubytovani` | 53 / 813 ms / 15,2 s | 55 / 776 ms / 15,3 s |
| `/ubytovani/loznice` | 53 / 768 ms / 14,8 s | 53 / 746 ms / 14,1 s |
| `/ubytovani/kuchyne` | 54 / 758 ms / 18,6 s | 54 / 777 ms / 15,6 s |

TBT beze změny (render je malý), LCP detailu dřív; CLS 0 na všech třech, mobil i desktop.

Závěrečný průchod CLS (po všech krocích, 1 běh, 390 a 1366 px): `/`, `/rezervace`, `/cenik`, `/recenze`,
`/galerie`, `/ubytovani/loznice`, `/admin/` všude **0**; FCP 0,46–0,73 s (boot screen).

Další kroky mimo propertyman: afkbratcice přejít na sdílený boot screen z caio-ui 0.4.13 (smazat
`core/boot-screen.jsx`) a povýšit caio-server na 0.8.2; caio-apps povýšit caio-server (dnes ^0.5.0).

Pozor: lokální server posílá soubory nekomprimované, absolutní LCP je proto vyšší než na produkci;
porovnávat jen lokálně před/po.

### Produkce po vydání v0.3.3 (2026-11-25)

Lighthouse 13.5 (simulovaný mobil a desktop), před = měření z 2026-11-25 dopoledne (kap. 3.2), po = 2 běhy.

| Routa | Mobil před | Mobil po | Desktop před | Desktop po |
|---|---|---|---|---|
| `/` | 50–53, LCP 7,0 s, TBT 840–930 | 51–54, LCP 6,3–6,9 s, TBT 700–820 | 84–91 | 85–86 |
| `/cenik` | 50, CLS 0,025, TBT 1210 | **56–57**, CLS 0, TBT 810–830 | 85, CLS 0,036 | **92–94**, CLS 0,002 |
| `/rezervace` | 42, LCP 7,7 s, TBT 2271 | **50–51**, LCP 6,3 s, TBT 1050–1100 | 78 | **84–88** |
| `/galerie` | 46, LCP 8,1 s | 46–49, LCP 6,9–7,1 s | 83 | 80–85 |
| `/ubytovani/kuchyne` | — | 51–53, LCP 6,8–7,4 s | — | 85–91 |
| admin | 49 | 50 | 83 | 84–85 |

CLS skriptem (slow 4G + CPU 4×, CWV okna) na produkci: `/`, `/cenik`, `/recenze` mobil i desktop **0**.
Hlavičky: `libs/<verze>/` `immutable`, HTML `no-cache`, `index.js` a písma `max-age=0` (curl).
Cíl z kap. 7 (mobil 52–58, CLS 0) je splněný na `/`, `/cenik` a téměř na `/rezervace`; galerie a admin
na mobilu zůstávají pod 50 kvůli inicializaci uu5 (`uu_gdsg01-unicorn` ~0,7 s), stejně jako v AFK.

## Příloha: data a skripty

Mimo repo: `…\side-session-notes\local_ffeaff88-25cc-4fd3-a175-b8b4313ff9bf\loading-performance-pm\`

- `cls.mjs` (AFK skript + CWV okna, úklid Edge po chybě), `run.mjs` (routy × viewporty × běhy, souhrn),
  `lh.sh` (Lighthouse z npm cache, Edge headless). V Git Bash spouštět s `MSYS_NO_PATHCONV=1`, jinak
  se cesta `/cenik` přepíše na `C:/Program Files/Git/cenik`.
- `local-*.txt`, `prod-*.txt`, `lh-local.txt`, `lh-prod.txt`: souhrny; `out-*/`: JSON každého běhu CLS
  (posuny se zdrojovými uzly, vodopád, vzorky výšky); `lh/`: vybrané Lighthouse reporty.
- `film/`: snímky startu home, `/cenik` a adminu (lokálně, mobil).
