# caio_propertyman v1 — první verze

Rozpad první implementační verze. Cílový stav a společná rozhodnutí o stacku jsou
v [design.md](./design.md) — tento dokument je nepřepisuje, jen zužuje na to, co se udělá teď.

---

## 1. Rozsah v1

**Je v v1:**

1. **Veřejný web** — jedna SPA, všechny sekce, obsah **natvrdo v komponentách**.
2. **Vytváření rezervací** — formulář na webu, rezervace se ukládá do MongoDB.
3. **iCal synchronizace** s Booking.com a e-chalupy — export vlastního feedu i import cizích.
4. **Galerie ze statických souborů** — zmenšené WebP v gitu, nasazené s appkou a servírované
   na veřejné URL `/assets/gallery/…`.

**Není v v1** (jde do v2/v3 podle [design.md § 11](./design.md#11-etapy)):

admin SPA a CRUD obrazovky · přihlašování hostů a „moje rezervace“ · upload fotek a `BinaryStore` ·
WYSIWYG editace obsahu · ceník / aktuality / recenze / zajímavosti / FAQ z databáze ·
finance a reporty · platební brána · víc jazyků (jen `cs`) · holiday tarify a slevy ·
kalendářový pohled pro vlastníka

---

## 2. Prerekvizity

Bez těchto věcí se v1 nerozjede — pořešit **před** psaním kódu:

| # | Co | Proč |
|---|---|---|
| 1 | ~~Oprava importovatelnosti `caio-ui` do Vite~~ — **hotovo 2026-08-24** (`caio-ui@af16b88`), stejně jako `OUTPUT_NAME` a `publicPath`; frontend build ale mezitím přešel na loader architekturu, viz [design.md § 12](./design.md#12-odchylky-od-stacku-a-co-vyřešit-dřív-než-se-začne) |
| 2 | Tarbally `caio-server`, `caio-ui`, `caio-devkit` | balíčky nejsou v registry, appka se zakládá z `file:` cest |
| 3 | Přístup do registry `repo.plus4u.net` | `uu5*` balíčky nejsou na npmjs |
| 4 | GCP projekt + povolený App Engine (`nodejs24`) | deploy |
| 5 | **MongoDB Atlas cluster + `MONGODB_URI` — vždy povinné.** Appka sice od `caio-server` úkolu #1 (2026-08-25) nastartuje i bez něj (`Dao` se připojuje líně, `sys/health` hlásí `mongoConfigured: false`), ale `reservation`/`availability` — celý smysl v1 — bez Mongo nefungují. Na rozdíl od Google OAuth (řádek 6) tohle není volitelné. |
| 6 | ~~Google OAuth client (ID + secret)~~ — **v1 nepotřebuje**: `caio-server` úkol #3 (2026-08-25) udělal providery bez credentials tiché místo pádu startu, a v1 přihlašování stejně nemá (§ 1) |
| 7 | Přístup do extranetu Booking.com a do `klient.e-chalupy.cz` | odtud se vytáhnou import URL jejich kalendářů a nastaví se náš exportní feed (§ 7) |
| 8 | Fotky galerie v použitelné velikosti | nasazují se s appkou, takže se před commitem zmenší a zkomprimují (§ 8) |

`BinaryStore` ani Google Drive service account v1 **nepotřebuje** — přišly by až s uploadem
fotek z adminu ve v2.

---

## 3. Struktura v1

```
caio_propertyman/
├── server/
│   ├── index.js                  # App.init({ api, publicPath })
│   ├── api.js                    # merge api map
│   ├── reservation/              # rezervace z webu i importovaná obsazenost
│   │   ├── dao.js
│   │   ├── crud.js
│   │   └── api.js                # reservation/create
│   ├── calendar/
│   │   └── api.js                # calendar/ical, calendar/sync, availability/get
│   └── services/
│       ├── ical-export.js
│       ├── ical-import.js
│       ├── availability.js       # kolizní logika
│       ├── price.js              # výpočet ceny z konstant (v1 nemá pricing kolekci)
│       └── email.js              # notifikace o nové rezervaci
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── public/                   # Vite publicDir — kopíruje se do buildu 1:1
│   │   └── assets/
│   │       └── gallery/          # fotky (.webp) → po buildu /assets/gallery/… (§ 8)
│   └── src/
│       ├── main.jsx
│       ├── spa.jsx               # UiApp.SpaProvider + Spa + route mapa
│       ├── routes/               # home, about, gallery, pricing, reservation,
│       │                         # news, reviews, surroundings, faq, contact
│       ├── components/           # layout, top bar, kalendář obsazenosti, rezervační formulář
│       └── content/              # VŠECHEN textový obsah + seznam fotek jako konstanty (§ 5)
├── public/                       # build output — caio-devkit build ho maže a přepisuje!
├── app.yaml
├── .env / .env.development
└── package.json
```

Jedna SPA = jeden `index.html`, takže se v1 **neřeší** dvojí HTML entry ani wildcard use case pro
`admin.html` ([design.md § 4](./design.md#4-dvě-spa-na-jednom-gae-service)) — catch-all
`/*splat` → `index.html` z `App.init` v1 stačí. Přidání admin bundlu je pak izolovaná změna
ve `vite.config.js` + `server/spa/api.js`.

`client/vite.config.js` je **prázdný `createViteConfig()`** — externals, loader, import mapu
i `define` pro `OUTPUT_NAME` dodává devkit. Pokud v něm něco musí zůstat, chybí to v devkitu.

`server/index.js`:

```javascript
import { App } from "caio-server";
import api from "./api.js";

App.init({ api });   // publicPath se resolvuje z process.cwd()
```

---

## 4. Datový model v1

**Jedna vlastní kolekce.** Kolekce `property`, `pricing`, `news`, `review`, `attraction`, `faq`,
`finance_record`, `ical_feed`, `ecc_*` ani `sys_binary` v v1 **nevznikají** — jejich obsah je
natvrdo v komponentách, respektive ve statických souborech.

### reservation

Rezervace z webu i obsazenost naimportovaná z portálů. Rozlišuje je `source` a `icalFeedCode`,
ne samostatná kolekce ([design.md § 6](./design.md#6-datový-model-mongodb)).

```
propertyId    "roubenka"          // konstanta, připraveno na multi-property
dateFrom      "2026-09-04"        // ISO datum
dateTo        "2026-09-07"        // ISO datum, exklusivně (den odjezdu)
nights        3
guestCount    4
totalPrice    9000                // null u importovaných
state         pending             // web: pending | cancelled; import: confirmed
source        web                 // web | booking | echalupy
contact       { name, email, phone }   // null u importovaných
note          "..."
icalUid       "res-<id>@caio-propertyman"   // u importovaných UID z feedu
icalFeedCode  null                // null = vzniklo u nás; booking | echalupy = z importu
sys           { cts, mts }
```

| | `source` | `icalFeedCode` | `contact` | `state` |
|---|---|---|---|---|
| Rezervace z webu | `web` | null | vyplněn | `pending` |
| Import z portálu | `booking` / `echalupy` | `booking` / `echalupy` | null | `confirmed` |

`icalFeedCode` je v celé logice rozhodující pole: co má `null`, to se **exportuje** do našeho
feedu a import na to nesmí sáhnout; co má hodnotu, to import vlastní a nesmí to jít do exportu
(§ 7). Ruční blokace vlastníka (`source: manual`) v1 nejsou — nemá je kde zadat, přijdou s adminem
ve v2.

Indexy (v `dao.js` přes `createIndex`):
- `{ dateFrom: 1, dateTo: 1 }` — kalendář a kolizní kontrola
- `{ icalFeedCode: 1, icalUid: 1 }` — párování při importu, unikátní jako **partial index**
  jen pro dokumenty, kde `icalFeedCode` není null (jinak by unikátnost sahala i na vlastní
  rezervace, které mají `icalFeedCode: null` všechny)
- `{ state: 1 }`

---

## 5. Veřejný web — obsah natvrdo

Routy: `home` · `about` (o roubence) · `gallery` · `pricing` (ceník) · `reservation`
(kalendář obsazenosti + formulář) · `news` (akce/aktuality) · `reviews` · `surroundings`
(zajímavosti v okolí) · `faq` (časté dotazy) · `contact` (kontakt + mapa).

Pravidla pro „natvrdo“, aby se to v v3 dalo vyměnit za DB/WYSIWYG bez přepisování stránek:

- Všechen text a strukturovaná data (ceník, aktuality, recenze, zajímavosti, FAQ, seznam fotek)
  žijí v `client/src/content/*.js` jako exportované konstanty — **nikdy inline v JSX stránky**.
  Stránka data jen renderuje.
- Datové struktury konstant mají **stejný tvar jako budoucí entity**
  ([design.md § 6](./design.md#6-datový-model-mongodb)) — např. `faq.js` exportuje pole
  `{ question, answer, order }`. Výměna zdroje dat je pak náhrada importu za `Call.cmdGet`.
- Texty se píšou jako LSI objekty (`{ cs: "..." }`), i když se renderuje jen `cs`. Přidání
  jazyka je pak doplnění klíče, ne refaktor.

Layout a horní lišta jsou vlastní komponenty nad `uu5g05-elements` — `UiApp.Top` ani `UiApp.Page`
nejsou z `caio-ui` exportované ([design.md § 12/7](./design.md#12-odchylky-od-stacku-a-co-vyřešit-dřív-než-se-začne)).

---

## 6. Rezervace

### API

| Use case | Metoda | Auth | dtoIn | dtoOut |
|---|---|---|---|---|
| `availability/get` | get | ne | `{ dateFrom, dateTo }` | `{ occupiedList: [{ dateFrom, dateTo }] }` |
| `price/calculate` | get | ne | `{ dateFrom, dateTo, guestCount }` | `{ nights, totalPrice, breakdown }` |
| `reservation/create` | post | ne | `{ dateFrom, dateTo, guestCount, contact, note }` | `{ id, state, nights, totalPrice }` |

`availability/get` vrací **jen obsazené intervaly** — sloučené záznamy `reservation` bez ohledu
na `source`, bez jmen, kontaktů a bez informace, odkud obsazenost je. Jeden dotaz nad jednou
kolekcí; vyloučí se jen `state: cancelled`.

### Validace na serveru (`validator` + `crud.js`)

`dateFrom < dateTo` · `dateFrom` není v minulosti · `nights >= MIN_NIGHTS` ·
`guestCount` v rozsahu kapacity · email a telefon ve tvaru · délka `note` ·
**kolizní kontrola** proti všem nezrušeným záznamům v `reservation` (vlastním i importovaným).

Cena se **vždy počítá na serveru** (`services/price.js` nad konstantami ceníku, stejnými, jaké
renderuje stránka `pricing`). Hodnota z klienta se ignoruje.

### Stav a overbooking

Rezervace vzniká jako **`pending`** a potvrzuje ji vlastník mimo aplikaci (telefonicky / mailem).
Důvod: iCal se na straně portálů stahuje s prodlevou (typicky desítky minut), takže dvojí
rezervace téhož termínu ve stejné chvíli jde technicky udělat. `pending` je i tak v exportovaném
feedu, takže termín portály zablokují co nejdřív.

Kolizní kontrola má **race condition** — dvě současné žádosti o stejný termín obě projdou.
V v1 to řeším unikátním indexem nad `{ propertyId, dateFrom }` jako pojistkou proti duplicitě
a tím, že rezervace jsou `pending` a potvrzuje je člověk. Plnohodnotné řešení (transakce nebo
lock na termín) je věc v2.

### Anti-spam

`reservation/create` je **veřejný POST, který píše do DB**. V v1 minimálně: honeypot pole ve
formuláři, rate limit podle IP (`express-rate-limit`) a strop na počet rezervací z jedné IP za den.

### Notifikace

Nová rezervace → email vlastníkovi (a potvrzení hostu, že žádost přijata a čeká na potvrzení).
nodemailer + Google SMTP. Bez toho by o rezervaci nikdo nevěděl, protože v1 nemá admin.

---

## 7. iCal synchronizace

Oba portály iCal umí obousměrně — ověřeno 2026-08-22:

| Portál | Odkud vezmeme jejich feed (import k nám) | Kam zadáme náš feed (export k nim) |
|---|---|---|
| e-chalupy | `klient.e-chalupy.cz/obsazenost-export-ics/` | `klient.e-chalupy.cz/obsazenost-import/` |
| Booking.com | extranet → Rates & Availability → Calendar sync | tamtéž (import externího kalendáře) |

Nastavuje se **per jednotka** — u nás jedna roubenka = jedna jednotka, takže jeden pár URL
na portál.

> **Past u e-chalup:** export mají ve dvou variantách a je nutné vzít tu **„s detaily“**.
> Varianta bez detailů podle dokumentace Trevlixu mění UID cizích rezervací a vydává je za
> vlastní — párování na UID by přestalo fungovat a naimportovaly by se falešné rezervace.
> Varianta s detaily ovšem nese osobní údaje hosta, které při importu zahazujeme (viz níže).

### Export — `calendar/ical` (get, public)

Generuje `VCALENDAR` z `reservation`, **jen ze záznamů s `icalFeedCode: null`** (tedy z toho, co
vzniklo u nás) a ve stavu `pending`. Importované záznamy do feedu nepatří — portál by dostal
zpátky své vlastní rezervace jako cizí blokace a přes dva portály by se to navzájem množilo.

Jeden `VEVENT` na záznam: `UID` = `icalUid`, `DTSTART;VALUE=DATE` / `DTEND;VALUE=DATE`
(celodenní, `DTEND` exklusivně), neutrální `SUMMARY` (např. „Obsazeno“).

Feed je **veřejná URL bez autorizace** (portály jiné neumí), takže nesmí obsahovat žádná osobní
data hosta — jen termín.

Odpověď se posílá ručně, protože není JSON:

```javascript
"calendar/ical": {
  method: "get",
  fn: async ({ res }) => {
    res.type("text/calendar").send(await IcalExport.build());
    return false;   // dtoOut === false → framework už neposílá JSON
  },
},
```

### Import — `calendar/sync` (post)

Feedy jsou v v1 v `.env` (`ICAL_FEED_BOOKING`, `ICAL_FEED_ECHALUPY`) — kolekce `ical_feed`
a její správa v adminu přijde v v2.

Pro každý feed: stáhnout → naparsovat `VEVENT`y → promítnout do `reservation` párováním na
`{ icalFeedCode, icalUid }`:

- UID ve feedu a ne v DB → **create** (`source` = kód feedu, `icalFeedCode` = kód feedu,
  `state: confirmed`, `contact: null`, `totalPrice: null`)
- UID v obou, jiný termín → **update**
- UID v DB a ne ve feedu → **delete**

**Každý dotaz importu je filtrovaný na `icalFeedCode` toho jednoho feedu** — jinak by mazací krok
sáhl na vlastní rezervace (`icalFeedCode: null`) nebo na záznamy druhého portálu. Tohle je při
sloučených kolekcích ta nejdůležitější věc, kterou v importu nezkazit.

Import je idempotentní a opakované spuštění nevytváří duplikáty. Z `VEVENT`u se bere
**jen `UID` a termín** — `SUMMARY`/`DESCRIPTION` s osobními údaji hosta se zahazují a neukládají.
Chyba jednoho feedu (nedostupnost, rozbitý formát) **nesmí** shodit import druhého — každý feed
se zpracuje samostatně a výsledek se zaloguje.

**Spouštění:** Cloud Scheduler → `POST /calendar/sync`. Use case nemůže mít `auth: ["owner"]`
(cron se nepřihlásí), takže se chrání shared secretem (`ICAL_SYNC_SECRET` v hlavičce) nebo
hlavičkou `X-Appengine-Cron`. Perioda: 15–30 min.

### Rozsah synchronizace

Přenáší se **jen obsazenost termínů** — žádné ceny, hosté ani platby. To je limit iCalu,
ne rozhodnutí projektu. Booking.com Connectivity API je v cílovém stavu jako budoucí náhrada
([design.md § 8](./design.md#ical-synchronizace-bookingcom-e-chalupy)).

**Zdroje ověření:**
[Trevlix — oboustranná synchronizace s e-chalupy](https://www.trevlix.cz/cz/icalendar-e-chalupy/oboustranna-synchronizace-obsazenosti-trevlixu-s-katalogem/) ·
[Trevlix — e-chalupy.cz iCalendar](https://www.trevlix.cz/cz/icalendar-e-chalupy/) ·
[e-chalupy — kalendář obsazenosti](https://www.e-chalupy.cz/obsazenost/kalendar.php)

---

## 8. Galerie — statické soubory

V v1 se fotky **nenahrávají**, jsou v gitu jako už zmenšené **WebP** a nasazují se s appkou.
Žádný `BinaryStore`, žádné Google Drive, žádná kolekce.

**Cesta souboru:** `client/public/assets/gallery/*.webp` → (`caio-devkit build`, který staví
rovnou do rootu) `public/assets/gallery/…` → `express.static(publicPath)` z `App.init` →
veřejná URL `/assets/gallery/<soubor>.webp`.

Zdrojová složka je `client/public/assets/` — `client/public/` je Vite publicDir, tedy jediná
složka, jejíž obsah se kopíruje do buildu 1:1 bez konfigurace.

`client/vite.config.js` zůstává prázdný `createViteConfig()`. Původní návrh tady nastavoval
`build.assetsDir: "build"`, aby si Vite nesypal hashované bundly do `/assets/` k fotkám — **to už
nedělej**: devkit nastavuje `rollupOptions.output.assetFileNames`, které má nad `assetsDir`
přednost, takže by se ta volba tiše ignorovala.

Jak to tedy vypadá: hashované assety jdou do `public/assets/<jméno>-<hash>.<ext>`, fotky do
`public/assets/gallery/`. Sdílejí složku, ale ne jména (fotky jsou v podadresáři), takže to
funguje. Komu se to nelíbí, ať dá galerii do `client/public/gallery/` a URL bude `/gallery/…`.

**Dvě věci, které to tiše rozbijí:**

- **Scaffoldový `.gitignore` měl `public/`** bez úvodního lomítka, což git matchuje
  v **jakékoli** úrovni — tedy i `client/public/`. Fotky by se nedostaly do gitu ani do deploye
  a vypadalo by to jako chyba buildu. **Opraveno přímo v šabloně** —
  `caio-devkit/packages/caio-create-app/templates/root/gitignore` teď má `/public/`, nová
  appka tedy scaffolduje se správnou variantou rovnou (`.gcloudignore` byl v pořádku už předtím —
  vylučuje `client/`, ne zbuilděné `public/`).
- **Nedávat fotky do root `public/`.** Je to build output — `caio-devkit build` do něj staví
  rovnou a devkit z něj na začátku každého buildu smaže všechno kromě `libs/`, takže cokoliv tam
  vloženého ručně zmizí. Zdroj je vždy `client/public/`.
- **Přidat si vlastní `express.static` mount navíc nejde** — `App.init` registruje catch-all
  `/*splat` jako poslední routu a aplikaci vrátí až potom, takže middleware přidaný po
  `App.init` se k requestu nedostane. Statika musí jít přes `publicPath`.

**Seznam fotek** je konstanta v `client/src/content/gallery.js`, ve tvaru budoucí entity:

```javascript
export default [
  { src: "/assets/gallery/roubenka-zima-01.webp", caption: { cs: "Zimní pohled na roubenku" }, order: 10 },
  { src: "/assets/gallery/interier-svetnice.webp", caption: { cs: "Světnice" }, order: 20 },
];
```

Fotky jdou do gitu i do každého deploye, takže se před commitem zmenší (rozumný strop cca 2000 px
na delší straně) a uloží jako WebP. Stránka galerie renderuje seznam s lightboxem;
`UiElements.Image` v1 potřeba není (`referrerPolicy="no-referrer"` řeší obrázky z Google Drive,
ne vlastní statiku) — přijde až s `BinaryStore` ve v2.

Přechod na v2: komponenta galerie zůstane, jen se zdroj dat vymění z importu konstanty
za `Call.cmdGet("gallery/list")`.

---

## 9. ENV v1

```
PORT=8080
MONGODB_URI=...                       # povinné — appka naběhne i bez něj, ale rezervace/obsazenost nefungují (§ 2)
GOOGLE_CLIENT_ID=...                  # nepovinné — v1 login nemá (§ 2)
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
ICAL_FEED_BOOKING=https://...
ICAL_FEED_ECHALUPY=https://...        # varianta exportu S DETAILY (§ 7)
ICAL_SYNC_SECRET=...
SMTP_HOST=... SMTP_USER=... SMTP_PASS=...
OWNER_EMAIL=...                       # kam chodí notifikace o rezervaci
```

---

## 10. Postup implementace

1. **Scaffold** — `npx --package=../caio-architecture/caio-devkit/dist/caio-create-app-0.1.0.tgz caio-create-app`,
   přesměrovat `caio-*` závislosti na tarbally, `npm install` v rootu i v `client/`.
2. **Rozjet prázdnou appku** — `.env` s `MONGODB_URI` (Google OAuth proměnné v1 nepotřebuje, § 2),
   `npm run dev`, ověřit `sys/health` (naběhne i bez Mongo, jen nahlásí `mongoConfigured: false`).
3. **Ověřit `caio-ui`** — import `UiApp`/`UiElements` do `client/src/spa.jsx`. Bloker č. 1 je
   vyřešený (a ověřený na referenční appce), takže tenhle krok je jen kontrola, že build projde
   a stránka se vyrenderuje — ne rizikový milník jako dřív.
4. **Skelet veřejné SPA** — layout, top bar, routing, prázdné stránky.
5. **Statický obsah** — `client/src/content/*` + render všech stránek kromě rezervace.
6. **Galerie** — fotky (WebP) do `client/public/assets/gallery/`,
   `content/gallery.js`, stránka s lightboxem. Ověřit, že po `npm run build` jsou fotky
   v `public/assets/gallery/` a dostupné na `/assets/gallery/...`.
7. **Rezervace backend** — `reservation` dao/crud/api, `services/price.js`,
   `services/availability.js`, validace, `availability/get`, `price/calculate`,
   `reservation/create`, rate limit.
8. **Rezervace frontend** — kalendář obsazenosti nad `availability/get`, formulář, přepočet ceny,
   stavy (úspěch / obsazeno / chyba).
9. **Email notifikace** — `services/email.js`, notifikace vlastníkovi + potvrzení hostu.
10. **iCal export** — `services/ical-export.js`, `calendar/ical`, zadat URL do Booking extranetu
    a do `klient.e-chalupy.cz/obsazenost-import/`.
11. **iCal import** — `services/ical-import.js`, `calendar/sync`, ochrana secretem,
    idempotence (spustit 2× a zkontrolovat, že nevznikly duplikáty), zahazování osobních údajů
    z e-chalupového feedu „s detaily“.
12. **Deploy** — `app.yaml`, `npm run deploy`, Cloud Scheduler na `calendar/sync`,
    ověřit statiku a deep linky na produkci.
13. **Zkouška naostro** — rezervace z webu se objeví v Booking i e-chalupy kalendáři; obsazenost
    z obou portálů zablokuje termín na webu.

---

## 11. Rizika v1

| Riziko | Dopad | Jak s ním v1 zacházím |
|---|---|---|
| ~~`caio-ui` se nedá naimportovat do Vite~~ | — | **vyřešeno 2026-08-24**, riziko zaniklo |
| Špatná varianta e-chalupového exportu | falešné rezervace v DB | použít variantu **s detaily**, osobní údaje při importu zahodit (§ 7) |
| Import nefiltrovaný na `icalFeedCode` | smaže vlastní rezervace z webu | každý dotaz importu filtrovat na kód feedu; partial unique index (§ 4, § 7) |
| Prodleva iCalu → overbooking | dvojí rezervace termínu | rezervace jsou `pending` a potvrzuje je člověk; export obsahuje i `pending` |
| Race condition při současných rezervacích | duplicitní rezervace | unikátní index + `pending`; korektní řešení v v2 |
| Veřejný `reservation/create` | spam v DB, spam v mailu | honeypot + rate limit podle IP |
| Veřejný iCal feed | únik dat o hostech | ve feedu je jen termín a neutrální `SUMMARY` |
| Bez adminu není vidět rezervace | vlastník o rezervaci neví | email notifikace (§ 6); jinak Mongo Atlas UI |
| Změna fotek vyžaduje deploy | vlastník si galerii nezmění sám | vědomé zjednodušení v1; upload z adminu přijde ve v2 |
