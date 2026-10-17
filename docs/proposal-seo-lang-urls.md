# Návrh: jazyk v adrese (`/en/…`, `/de/…`), `hreflang` a sitemap s alternativami

- **Podklad:** [wip.md § Jazyky](./wip.md) („SEO jazykových verzí“), [decisions.md § Frontend](./decisions.md#frontend) (pět jazyků a přepínač, první render s jazykem návštěvníka), [design-v2.md § 4](../design-v2.md) (proč je admin dnes uvnitř kořenové SPA).
- **Stav (2026-10-16):** implementováno (návrh v2 s připomínkami majitele, § 10), vydáno ve v0.2.5 a nasazeno 2026-10-17. Ověření v [decisions.md § Frontend](./decisions.md#frontend), *Jazyk v adrese*.
- **Odchylky implementace od textu níž:**
  - caio-server vystavuje seznam jako export `Language` (`{ list, defaultLanguage }`) a funkci `readLanguageList(dir)` (`caio-server-app/services/language.js`), ne `Config.languages`. Server appky ji volá s kořenem appky, protože `server/config.js` načítá i build klienta, který běží v `client/`.
  - Přesměrovací skript není statický soubor, ale funkce `buildLanguageRedirectScript` v `caio-ui/src/caio-ui-app/language.js` (tam je i klíč úložiště); devkit ji volá při buildu. caio-ui má kvůli tomu `"type": "module"`.
  - Háček `languagePaths` dostává `{ languages, defaultLanguage }` -- appka seznam jazyků nezná dopředu, bere ho z devkitu (i plugin ve `vite.config.js` čte `define` `process.env.CAIO_LANGUAGES`).
  - `res.locals.caioDocument` nedostává navigace subappky (`/admin/…`) a `/` (odpoví na něj už static).
  - `priceRange` je `3700+ CZK` ve všech jazycích, i v češtině.

## 0. Kde se co nastavuje

Appka nastavuje **dvě věci**. Všechno ostatní se z nich odvodí, nic se neopisuje.

| Údaj | Jediné místo | Kdo ho čte |
| --- | --- | --- |
| **Jazyky webu**, první je výchozí | `package.json` appky: `"caio": { "languages": ["cs", "en", "de", "pl", "sk"] }` (vedle `caio.deploy.project`) | **caio-devkit** při buildu: vygeneruje `index.<lang>.html` (§ 5), do `index.html` zapíše `<html lang>` výchozího jazyka a klientovi dosadí `process.env.CAIO_LANGUAGES` (stejně jako dnes `NAME`, `VERSION`). **caio-server** při startu: `Config.languages`, podle nich pozná prefix (§ 4). **caio-ui** `SpaProvider`: seznam pro `LanguageProvider` a přepínač (§ 6.1). **Server appky**: validace `lang` rezervace a jazyky e-mailů berou `Config.languages` z caio-serveru |
| **Slugy stránek** v každém jazyce | `client/src/config/routes.js` (`PAGES`, § 6.3). Slug prostoru je u prostoru v `components/accommodation/content.js`, takže přidání prostoru zůstane jeden záznam | **router** za běhu (§ 6.4). **Build** z nich zapíše `public/spa-routes.json` pro server appky (§ 6.7) a mapu cest pro přesměrovací skript (§ 3). Dál je čte **sitemap**, `hreflang` a canonical (§ 6.6) |

Duplicity, které tím zmizí:

- `LANGUAGE_LIST` v `client/src/tools/language.js`,
- `languages` v `server/config.js`, místo něj `Config.languages` z caio-serveru,
- `lang="cs"` napsané natvrdo v `client/index.html`, zapisuje ho devkit,
- `route` v `config/nav.js`, slug je v `PAGES`.

Co je **konvence stacku**, ne nastavení appky:

- Klíč v `localStorage` (`<NAME>.language`, tentýž jako dnes) a přesměrovací skript žijí v **caio-ui** (`static/language-redirect.js`). Devkit skript jen vloží do `index.html`, stejně jako dnes kopíruje `caio-ui/static/login/`. Klíč je tak v jednom repozitáři a appka ho nezná.
- Jména souborů `index.<lang>.html` a prefix `/<lang>/`.

Shodu hlídají testy a build:

- `lsi.test.js`: LSI soubory jsou přesně `caio.languages` (dnes porovnává se `server/config.js`).
- `routes.test.js`: každá stránka má slug v každém jazyce.
- Devkit build spadne, když se UVE jmenuje jako jazyk nebo když jazyk z `caio.languages` nemá LSI soubor.

## 1. Dnešní stav

- **Jazyk není v URL.** Jazyk vybírá klient: zapamatovaná volba z přepínače (`localStorage`), pak `navigator.languages`, jinak angličtina (`tools/language.js`). Stejná adresa tak vrací pět různých obsahů.
- **Vyhledávač zná z každé stránky jen jednu verzi, a to špatnou.** Googlebot renderuje s `en-US`, takže na `/cenik` vidí **angličtinu**, zatímco statický `index.html` hlásí `lang="cs"`, `og:locale cs_CZ` a český popis. Česká verze v indexu chybí a ostatní tam nejsou vůbec.
- **Sitemap** má 15 adres bez jazyka. JSON-LD má natvrdo `inLanguage: "cs"` a `priceRange` v „Kč“. Canonical míří na adresu bez jazyka.
- **Admin** je lazy routa uvnitř kořenové SPA. Rozhodnuto 2026-09-14 ([design-v2.md § 4](../design-v2.md)), protože tehdejší `caio-devkit` neuměl dva vstupy. To už neplatí: devkit staví jeden vstup na UVE (`base-config.js`: `input` pro každou UVE, `entryFileNames` podle UVE; `uu5-loader.js`: každé HTML startuje svůj vstup) a příkladem je `caio-exampleapp/client/src/portal/`.
- **Stack** (ověřeno v kódu, `development`):
  - `App.init` bere jen `api`, `publicPath`, `authList`, `middlewareList`.
  - `express.static` odpoví na `/` souborem `index.html` dřív, než se dostane k fallbacku.
  - UVE je soubor `<první segment>.html` (`uve.js`), takže `index.en.html` se za UVE nikdy nepovažuje.
  - `SpaProvider` (`caio-ui`) zakládá `LanguageProvider` bez propsů, jazyk tedy určuje uu5 podle prohlížeče.
  - V serveru, devkitu ani caio-ui zatím nic o jazycích webu není.

## 2. Cíl

| Adresa | Dokument | Poznámka |
| --- | --- | --- |
| `/`, `/cenik`, `/ubytovani/stodola` | `index.html` (cs) | inline skript může přesměrovat podle uložené volby (§ 3) |
| `/cs/`, `/cs/cenik` | `index.cs.html` | česky, uložená volba se nebere v potaz, canonical na `/cenik` |
| `/en/`, `/en/prices`, `/de/unterkunft/scheune` | `index.en.html`, `index.de.html`, … | uložená volba se nebere v potaz |
| `/en` | | **301** na `/en/`. Kořen jazyka má lomítko, stejně jako kořen UVE, a uu5 (`routeToUrl("")`) ho taky tak vyrábí |
| `/en/cenik` (slug jiného jazyka) | | **301** na `/en/prices` (appka) |
| `/en/home` | | **301** na `/en/` (appka) |
| `/en/nesmysl` | `index.en.html` se **404** | „nenalezeno“ v jazyce adresy (appka) |
| `/xx/cenik` (jazyk, který web nemá) | `index.html` se **404** | jako dnes |
| `/admin/*` | `admin.html`, vlastní UVE (§ 6.0) | bez prefixu, bez přesměrovacího skriptu, jazyk podle uložené volby, jinak výchozí |
| use casy (`/reservation/create`, …) | | beze změny, `Call` skládá adresu z `location.origin`, ne z `appBaseUri` |

Každá jazyková verze stránky má vlastní canonical (výjimka `/cs/…`, viz tabulka), `hreflang` na všech pět verzí a `x-default`, a je v sitemapě s alternativami.

**Kdy se použije „výchozí jazyk pro ostatní“ (`x-default`):** nikdy na serveru ani ve skriptu. `x-default` je jen nápověda pro Google, kterou verzi ukázat hledajícímu, jehož jazyk mezi `hreflang` není (třeba Nizozemci). `roubenyraj.cz` je česky, takže **`x-default` je česká adresa bez prefixu**. Výchozí jazyk webu je ten první v `caio.languages`, a tedy i jazyk `index.html`.

## 3. Přesměrování podle uložené volby

Inline skript v `index.html`. Vkládá ho devkit, zdroj je `caio-ui/static/language-redirect.js`.

- Je **první** skript v `<head>`, ještě před písmy, preloadem hero a zavaděčem, ať se při přesměrování nic nestahuje zbytečně. Je **jen** v `index.html`, v žádném `index.<lang>.html` ani v `admin.html`.
- Logika:
  1. Přečte `localStorage["<NAME>.language"]`. Klíč je stejný jako dnes, takže dřívější volby hostů platí dál.
  2. Když je to jazyk webu a ne výchozí, najde aktuální cestu v **mapě cest** (česká cesta → cesta v jazyce). Mapu při buildu vyrobí appka z `PAGES` (§ 5, háček `languagePaths`).
  3. Pak `location.replace("/<lang>/" + cesta + search + hash)`, takže v historii nezůstane česká adresa.
- Adresa, která v mapě není (neznámá, 404), se nepřesměruje.
- Čtení `localStorage` je v `try/catch` (soukromé okno, zablokovaná data). Při chybě se nepřesměruje.
- Googlebot žádnou uloženou volbu nemá, takže na adresách bez prefixu vidí vždycky češtinu.
- Kdo se přepne zpátky na češtinu, uloží si `cs`, takže se dál nepřesměrovává. Kdo chce češtinu jednorázově, má `/cs/…`.

## 4. caio-server

**V `App.init` se nic nového nenastavuje.** Jazyky server čte sám z `package.json` (§ 0) a jazykové dokumenty jsou soubory z buildu, stejně jako UVE.

- **`Config.languages`**: `caio.languages` z `package.json` v `process.cwd()` (na App Engine se nahrává). Bez klíče je to `[]` a server se chová jako dnes. Je to i veřejné API pro appku, takže `server/config.js` seznam neopakuje.
- **`resolveLanguageDocument(publicPath, reqPath)`** (nové `services/language.js`). Když je první segment v `Config.languages` a existuje `public/index.<segment>.html`, vrátí `{ language, prefix: "/en", path: zbytek, file }`, jinak `null`. Chybějící soubor (vývoj před prvním buildem) znamená `null` a jedno varování do konzole, stejně jako u `spa-routes.json` v appce.
- **Middleware před `middlewareList`**, za stejných podmínek jako SPA fallback: jen navigace (GET/HEAD bez přípony), která chce HTML. Dělá dvě věci:
  - Holé `/en` přesměruje 301 na `/en/`.
  - Nastaví `res.locals.caioDocument = { language, prefix, path, file }`. Pro adresu bez prefixu to je `{ language: <výchozí>, prefix: "", path, file: index.html }`, takže appka vždycky ví, v jakém jazyce navigace je a jaký soubor je její tělo.
- **Trailing slash:** kořen jazyka (`/en/`) je výjimka, stejně jako kořen UVE. Pod ním platí pravidlo dál (`/en/prices/` → 301 `/en/prices`).
- **SPA fallback:** navigace jazykového dokumentu dostane `file` místo `index.html`. Kontrola jazyka běží **před** `resolveUve`. UVE se jménem jazyka nedovolí už build (§ 5) a server dá přednost jazyku.
- **Hranice:** prefix platí jen pro kořenovou UVE. Admin a jiné UVE jsou bez prefixu.
- **404 a 301 podle slugů** řeší dál appka svým middlewarem (§ 6.7). Server zná jen jazyky, ne stránky.
- `docs/release-candidate.md` § Přidáno. README dostane odstavec o `caio.languages`, signatura `App.init` se nemění.

## 5. caio-devkit

- **Jazyky** čte z `package.json` `caio.languages` (§ 0). Bez klíče nic negeneruje a appka funguje jako dnes.
  - `define` dosadí `process.env.CAIO_LANGUAGES`.
  - `transformIndexHtml` zapíše do `index.html` `<html lang>` výchozího jazyka.
- **Nový plugin `plugins/language-pages.js`**, `writeBundle` s `order: "post"`, po pluginech appky:
  1. Z hotového `index.html` vyrobí pro **každý** jazyk, včetně výchozího (`index.cs.html` kvůli `/cs`), kopii s `<html lang="<lang>">` a `data-uu-app-base="/<lang>/"`, bez přesměrovacího skriptu.
  2. Zavolá háček appky `languageHtml(html, { language, defaultLanguage, languages })`, který doplní obsah v daném jazyce: popis, `og:*`, `og:locale` a JSON-LD. Devkit neví, kde v LSI appky co je.
  3. Do `index.html` vloží přesměrovací skript z § 3. Dosadí do něj jazyky, `NAME` a mapu cest z háčku appky `languagePaths()`.
  - Každá náhrada musí trefit právě jednou, jinak build spadne. Kdyby se změnil tvar `<html>` nebo `<base>`, nesmí vzniknout dokument, který routuje špatně.
- **Háček appky** jde přes Vite inter-plugin API: plugin appky má `api: { caio: { languageHtml, languagePaths } }` a devkit ho najde v `configResolved` přes `config.plugins`. `createViteConfig` tak nedostane nové volby, které dnes nemá.
- **Kolem:**
  - `warnAboutForeignUves` zná nové soubory, jinak by se při každém rebuildu vypisovalo varování.
  - Kontrola UVE odmítne jméno shodné s jazykem.
  - `buildStart` výstup vyprázdní, ale soubory vznikají znovu ve `writeBundle`.
  - `caio-devkit start` to dělá taky, protože je to watch build se stejným `writeBundle`.
- `docs/release-candidate.md` § Přidáno. Po vydání ověřit piny v šablonách `caio-create-app` (`docs/deploy.md`).

## 6. caio-ui a appka

### 6.0 Krok 0: admin jako vlastní UVE

- `client/src/admin/` dostane vlastní `index.html` a vstup (vzor `caio-exampleapp/client/src/portal/`). Devkit z něj udělá `admin.html` a caio-server ho obslouží na `/admin/`. Holé `/admin` přesměruje 302 na `/admin/`, to už umí.
- Routy adminu jsou relativní k `/admin/`: `reservations`, `reservation?id=`, `reviews`, `ical`. `""` přesměruje na `reservations` a nahradí `REDIRECTS.admin`.
- Z kořenové SPA zmizí lazy admin (`withLazy`), `ADMIN_SCREENS`, `isAdminRoute` a přepínání rámu v `app.jsx`. Ze `spa-routes.json` zmizí routy adminu. `DISALLOWED_PATHS` v `robots.txt` si `/admin` nechá.
- `lazy-libs.test.js` hlídá, že `index.js` admin kód neobsahuje.
- Nezávisí na jazycích ani na stacku, jde udělat hned. Zápis do `decisions.md` ruší rozhodnutí z 2026-09-14.

Jazykových adres se tím admin vůbec netýká: nemá prefix, není v mapách rout, přesměrovací skript v něm není a `spa-routes` ho nezná.

### 6.1 caio-ui

- **`SpaProvider`:**
  - `languageList` bere z `process.env.CAIO_LANGUAGES`, prop zůstává jako přebití.
  - Když jsou jazyky nastavené, `language` je `document.documentElement.lang`. Je to řízený `LanguageProvider`, takže jazyk prohlížeče už nerozhoduje.
- **Přepínač:** nový prop `getLanguageUrl(language)`. Volba z přepínače se uloží přes `UiApp.saveLanguage(language)` (klíč zná jen caio-ui) a pak se zavolá `location.assign(getLanguageUrl(language))`. Přepnutí je reload, protože `appBaseUri` je v uu5 konstanta modulu. JS a písma se vezmou z cache.
- **UVE bez prefixu** (admin): `language` je uložená volba, jinak výchozí.
- **`static/language-redirect.js`** (§ 3).
- Bez `caio.languages` se nic nemění. `docs/release-candidate.md` § Přidáno.

### 6.2 Jazyk dokumentu (appka)

Z `tools/language.js` zbude `PAGE_LANGUAGE = document.documentElement.lang` (pevný po celé načtení) a `getLanguageUrl` pro aktuální stránku (§ 6.5). Ukládání volby, `LANGUAGE_LIST` i výpočet jazyka z prohlížeče zmizí. Ukládání převezme caio-ui a přednačtení LSI v `main.jsx` stáhne rovnou `PAGE_LANGUAGE`.

### 6.3 Tabulka stránek: `client/src/config/routes.js`

Je to jediný zdroj pro router, odkazy, SEO, sitemap, `spa-routes.json` i mapu cest přesměrovacího skriptu:

```js
export const PAGES = {
  home:          { cs: "",          en: "",              de: "",            pl: "",               sk: "" },
  accommodation: { cs: "ubytovani", en: "accommodation", de: "unterkunft",  pl: "zakwaterowanie", sk: "ubytovanie" },
  gallery:       { cs: "galerie",   en: "gallery",       de: "galerie",     pl: "galeria",        sk: "galeria" },
  pricing:       { cs: "cenik",     en: "prices",        de: "preise",      pl: "cennik",         sk: "cennik" },
  reservation:   { cs: "rezervace", en: "booking",       de: "buchung",     pl: "rezerwacja",     sk: "rezervacia" },
  reviews:       { cs: "recenze",   en: "reviews",       de: "bewertungen", pl: "opinie",         sk: "recenzie" },
  surroundings:  { cs: "okoli",     en: "surroundings",  de: "umgebung",    pl: "okolica",        sk: "okolie" },
  faq:           { cs: "faq",       en: "faq",           de: "faq",         pl: "faq",            sk: "faq" },
  contact:       { cs: "kontakt",   en: "contact",       de: "kontakt",     pl: "kontakt",        sk: "kontakt" },
};
```

Slugy prostorů jsou u prostoru v `components/accommodation/content.js` (`slug: { cs, en, de, pl, sk }`). Adresa detailu je slug `accommodation` + `/` + slug prostoru (`/de/unterkunft/scheune`).

| Kód prostoru | cs | en | de | pl | sk |
| --- | --- | --- | --- | --- | --- |
| `loznice` | loznice | bedrooms | schlafzimmer | sypialnie | spalne |
| `kuchyne` | kuchyne | kitchen | kueche | kuchnia | kuchyna |
| `koupelny` | koupelny | bathrooms | baeder | lazienki | kupelne |
| `deti` | deti | kids | kinder | dzieci | deti |
| `stodola` | stodola | barn | scheune | stodola | stodola |
| `dvorek` | dvorek | yard | hof | podworko | dvor |

Slugy jsou odvozené z popisků menu a titulků prostorů v LSI, bez diakritiky. Interní identita stránky je `code` (anglicky, dnes v `nav.js`), ne český slug. Kódy prostorů zůstávají, jsou na nich klíče LSI.

### 6.4 Router (`router.jsx`)

- `buildRouteMap(PAGE_LANGUAGE)`: klíče jsou slugy jazyka dokumentu, hodnoty tytéž komponenty jako dnes.
- Slugy ostatních jazyků jsou `{ redirect }` na slug tohoto jazyka, takže ručně napsané `/en/cenik` skončí na `prices`. `home` je `{ redirect: "" }` v každém jazyce. `"*"` je `<NotFound />`.
- Jazyk je pevný po celé načtení, takže se mapa sestaví jednou, na úrovni modulu jako dnes.
- uu5 `{ rewrite }` cestu nezkrátí: přesměruje sice na komponentu, ale `useRoute()` dál vrací slug v URL (`getRouteSettingsAfterRedirectsAndRewrites` v `uu5g05.js`). Kód by tak stejně musel slug překládat, proto tabulka.

### 6.5 Odkazy a čtení routy

- `pagePath(code, { space })` vrací uu5 routu v jazyce dokumentu (relativní, uu5 ji složí s `appBaseUri`).
- `parsePage(uu5Route)` vrací `{ code, space }`, nebo `null`.
- `getLanguageUrl(language)` vrací tutéž stránku v jiném jazyce i s parametry: pro výchozí jazyk bez prefixu, jinak `/<lang>/…`.
- Přepíše se asi 15 míst s routou napsanou natvrdo:
  - `href="cenik"` → `href={pagePath("pricing")}`,
  - `setRoute("galerie", …)`,
  - porovnání `currentRoute === "rezervace"` a `=== "kontakt"` v `app.jsx`,
  - `toMenuItem` (`nav.js` přijde o `route`),
  - `space-card.jsx`, `space-detail.jsx`,
  - logo `href: "/"` → `pagePath("home")`. Z `/de/…` by jinak vedlo na českou home a `CaioApp.Top` by ho bral jako externí odkaz.
- Query parametr `?prostor=` a hodnota `vse` zůstávají, jsou mimo canonical a neindexují se.

### 6.6 SEO v appce

- `seo.js` je klíčovaný `code`. Adresy skládá `localizedUrl(language, code, space)`.
- `page-meta.js`:
  - canonical na sebe (u `/cs/…` na adresu bez prefixu),
  - `<link rel="alternate" hreflang>` ×5 a `x-default` na českou adresu bez prefixu,
  - `og:locale` a `og:locale:alternate`,
  - drobečky s adresami v jazyce stránky.
- Sitemap: 15 stránek × 5 jazyků = 75 `<url>`, každá se všemi alternativami a `x-default`.
- Háček `languageHtml` (§ 5) doplní do `index.<lang>.html` popis z `<lang>.json` `seo.home`, `og:*` a JSON-LD s `inLanguage` daného jazyka. `priceRange` bude jazykově neutrální (`CZK`).
- `hero-preload.js` porovnává `location.pathname` s `data-uu-app-base`, ne s `/`.
- `robots.txt` dostane `Disallow: /index.`, protože static vrací `/index.en.html` i napřímo.

### 6.7 Server appky (`server/spa-routes/`)

`spa-routes.json` je výstup buildu z `PAGES`, ne nastavení:

```json
{
  "routes": { "cs": ["", "ubytovani", "ubytovani/stodola", "…"], "en": ["", "accommodation", "accommodation/barn", "…"] },
  "redirects": { "cs": { "home": "", "prices": "cenik", "…": "…" }, "en": { "home": "", "cenik": "prices", "…": "…" } }
}
```

`resolveNavigation` vezme jazyk, prefix, cestu bez prefixu a soubor z `res.locals.caioDocument` (§ 4):

- přesměrování → 301 na `prefix + "/" + cíl`, query string zůstává,
- známá routa → pustit dál,
- jinak 404 s tělem `caioDocument.file`.

`/cs/…` i adresa bez prefixu se vyhodnotí proti `cs`. Admin je UVE, middleware si ho nevšímá.

## 7. Co se vědomě nedělá

- **Přesměrování podle jazyka prohlížeče** ani podle `Accept-Language`: `roubenyraj.cz` je vždycky česky (majitel).
- **Nabídkový pruh** „stránka je i v angličtině“ z v1 se ruší.
- **Jazyk v adrese pro jiné UVE** než kořenovou.
- **Meta podle routy pro crawlery bez JS** (titulek a popis `/de/preise` pro Facebook): jazykové dokumenty řeší jazyk a popis home. Zbytek je samostatná položka ve `wip.md`.
- **Přeložené názvy query parametrů** (`?prostor=`).

## 8. Pořadí a vydání

0. **Appka: admin jako UVE** (§ 6.0). Nezávisí na stacku, jde udělat hned a samostatně vydat.
1. **caio-server** (§ 4).
2. **caio-ui** (§ 6.1).
3. **caio-devkit** (§ 5).

Každé repo stacku má zápis v `docs/release-candidate.md`, stack se vydá na pokyn „udělej release“. Potom appka (§ 6), její vydání a deploy. Podrobné návrhy do repozitářů stacku (`docs/proposal-…`) vzniknou při implementaci z § 4–6.

## 9. Testy a ověření

- **caio-server:** `resolveLanguageDocument` (jazyk z `Config.languages`, chybějící soubor, neznámý segment), 301 `/en` → `/en/`, výjimka trailing slash pro `/en/`, `/en/prices/` → `/en/prices`, přednost jazyka před UVE, `res.locals.caioDocument` i bez prefixu, bez `caio.languages` beze změny.
- **caio-devkit:** vznikne `index.<lang>.html` pro každý jazyk se správným `lang` a `data-uu-app-base`, skript je jen v `index.html`, háček appky se zavolá, náhrada, která netrefí, shodí build, UVE se jménem jazyka shodí build.
- **caio-ui:** `SpaProvider` s jazyky i bez nich, `saveLanguage` a přesměrovací skript používají tentýž klíč.
- **Appka:**
  - `routes.test.js`: každá stránka a každý prostor mají slug v každém jazyce a slugy jsou v jazyce unikátní.
  - Router: mapa pro každý jazyk, cizí slug je přesměrování.
  - `pagePath`, `parsePage`, `getLanguageUrl`, `localizedUrl`.
  - Sitemap (75 adres, alternativy).
  - `spa-routes.json` a `spa-routes.test.js` (301 cizího slugu s prefixem, 404 s tělem jazyka, `/cs/…`).
  - `lsi.test.js` proti `caio.languages`.
  - `lazy-libs.test.js` (admin mimo `index.js`).
- **Ručně** (`npm start` nad čerstvým buildem):
  - `curl` na celou tabulku z § 2.
  - V prohlížeči:
    - přepnutí na `de` z `/cenik?prostor=kuchyne` vede na `/de/preise?prostor=kuchyne`,
    - pak `/` přesměruje na `/de/`,
    - `/cs/` zůstane česky,
    - `/en/prices` s uloženou `de` zůstane anglicky,
    - Zpět/Vpřed, logo a odkazy uvnitř `/de/`,
    - rezervace z `/pl/rezerwacja` uloží `lang: "pl"`,
    - admin na `/admin/`.
- **Po nasazení:** Rich Results Test, kontrola `hreflang` v Search Console, odeslání nové sitemapy.

## 10. Rozhodnutí majitele (2026-10-16)

1. Jazykové dokumenty jsou `index.<lang>.html`.
2. Názvy stránek v adrese jsou v jazyce stránky (§ 6.3). Prostor `dvorek` je ve všech jazycích jen „dvůr“ (yard, hof, podworko, dvor), bez sýpky. Ke zbytku tabulky slugů majitel neměl námitky.
3. `roubenyraj.cz` je vždycky česky a jazyk prohlížeče se nebere v potaz.
4. Volba z přepínače se uloží. Na každé stránce bez jazyka v adrese skript v `index.html` hned na začátku přesměruje na uložený jazyk. Adresa s jazykem uloženou volbu ignoruje. `/cs` existuje.
5. Obsluha jazykových adres (dokument podle prefixu) je ve stacku.
6. Konfigurace se neopakuje (§ 0).
7. Admin je vlastní UVE (§ 6.0).
8. Kořen jazyka je `/en/` s lomítkem.
