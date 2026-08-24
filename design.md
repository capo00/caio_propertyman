# caio_propertyman — cílový stav

Web pro pronájem nemovitostí (krátkodobé pronájmy). Postaveno na stacku
[`caio-architecture`](../caio-architecture/README.md) — `caio-devkit` (scaffold + dev/build/deploy),
`caio-server` (Express + MongoDB backend), `caio-ui` (React nad `uu5g05`).

Tento dokument popisuje **cílový stav**. První implementační verze je v [design-v1.md](./design-v1.md).

---

## 1. Produktové zadání

- Primárně **web pro pronájem nemovitostí**. Datový model počítá s více nemovitostmi, provozně
  bude zatím **jedna nemovitost** (roubenka).
- **Dvě SPA**: veřejný web pro hosty a administrace pro vlastníka.
- Sekce veřejného webu: **akce/aktuality**, **o roubence**, **galerie**, **ceník**,
  **rezervace včetně kalendáře obsazenosti**, **recenze**, **zajímavosti v okolí**,
  **časté dotazy**, **kontakt**.
- Obsah webu je cílově editovatelný **WYSIWYG** editorem přímo ve stránce (`caio-ui` `UiEcc`).
- Rezervace se **ukládají do databáze** a **synchronizují** s externími portály.
- **Obrázky/soubory se ukládají** (Google Drive přes `caio-server` `BinaryStore`), ne jako
  součást buildu.

---

## 2. Stack

| Vrstva | Co se použije |
|---|---|
| Scaffold + tooling | `caio-devkit` — `npx caio-create-app`, pak `caio-devkit start\|build\|deploy` |
| Backend | `caio-server` — `App.init({ api, publicPath, authList })`, `Dao`, `Crud`, `Error`, `Authentication`, `BinaryStore` |
| Frontend | `caio-ui` — `UiApp.SpaProvider`/`Spa`/`withRoute`, `UiAuth`, `UiElements.Call`/`CrudContext`/`Crud`/`Image`, `UiEcc` |
| UI knihovny | `uu5g05`, `uu5g05-elements`, `uu5g05-forms`, `uu5tilesg02*`, `uu5richtextg01-elements` (registry `repo.plus4u.net`) |
| Databáze | MongoDB Atlas |
| Soubory | Google Drive (přes `BinaryStore`), metadata v Mongu (kolekce `sys_binary`) |
| Deploy | Google App Engine, `runtime: nodejs24`, jeden GAE service (Express servíruje API i statiku) |
| Auth | Google OAuth 2.0 + email/password z `caio-server` `Authentication` (JWT v cookie) |
| Email | nodemailer + Google SMTP |

Prerekvizity: **Node.js 24**, MongoDB, `gcloud` CLI, přístup do registry `repo.plus4u.net`.

Dokud nejsou `caio-server`/`caio-ui`/`caio-devkit` publikované v registry, appka se zakládá
z lokálních tarballů — postup je v
[caio-devkit README](../caio-architecture/caio-devkit/README.md#vytvoření-appky-z-lokálních-tarballů),
zde ho neduplikuji.

---

## 3. Struktura projektu

Drží konvenci, kterou `caio-devkit start|build|deploy` předpokládá (`server/`, `client/`, `public/`,
`.env` / `.env.development` v rootu).

```
caio_propertyman/
├── server/
│   ├── index.js                  # App.init({ api, publicPath }) + BinaryStore.init
│   ├── property/                 # jedna složka = jedna entita
│   │   ├── dao.js                # extends Dao
│   │   ├── crud.js               # extends Crud (business logika)
│   │   └── api.js                # mapa use casů { "property/get": { method, auth, fn } }
│   ├── pricing/
│   ├── reservation/              # rezervace, importovaná obsazenost i blokace
│   ├── ical-feed/
│   ├── news/
│   ├── review/
│   ├── attraction/
│   ├── faq/
│   ├── finance/
│   ├── gallery/
│   ├── ecc/                      # eccPage + eccSection (backend pro UiEcc)
│   ├── spa/
│   │   └── api.js                # use casy, které servírují admin.html (viz 4.)
│   ├── services/
│   │   ├── ical-export.js        # generování VCALENDAR feedu
│   │   ├── ical-import.js        # parsování cizích feedů
│   │   ├── availability.js       # kolizní logika nad reservation
│   │   ├── price.js              # výpočet ceny z pricing tarifů
│   │   └── email.js
│   └── api.js                    # merge všech entitních api map
├── client/
│   ├── index.html                # veřejná SPA  → src/web/main.jsx
│   ├── admin.html                # admin SPA    → src/admin/main.jsx
│   ├── vite.config.js            # createViteConfig({ build.rollupOptions.input, define })
│   ├── package.json
│   └── src/
│       ├── web/
│       │   ├── main.jsx
│       │   ├── spa.jsx           # UiApp.SpaProvider + Spa + route mapa
│       │   └── routes/
│       ├── admin/
│       │   ├── main.jsx
│       │   ├── spa.jsx
│       │   └── routes/
│       ├── components/           # sdílené komponenty (kalendář, galerie, top bar, ...)
│       ├── content/              # staticky psaný obsah (v1; cílově nahrazeno UiEcc)
│       └── lsi/                  # jazykové soubory
├── public/                       # build output (caio-devkit build)
├── app.yaml                      # runtime: nodejs24
├── .env / .env.development
└── package.json                  # scripts dev/build/deploy → caio-devkit
```

### Backend vrstvení

`api.js` (routing + `auth` + `validator`) → `crud.js` (business logika, `extends Crud`) →
`dao.js` (Mongo, `extends Dao`).

Use case se definuje jako `{ method: "get"|"post", auth, validator, fn }`, `fn` dostává
`{ useCase, method, dtoIn, identity, req, res, next, publicPath }` a vrací `dtoOut`.
Vrácení `false` znamená „odpověď jsem poslal sám“ — tím se řeší netypické odpovědi
(iCal feed jako `text/calendar`, CSV export, servírování `admin.html`).

Pojmenování use casů pro entity, které mají mít v adminu hotovou CRUD obrazovku, drží konvenci
`entity/list|create|createMany|update|delete|deleteMany` — na to se 1:1 váže
`UiElements.CrudContext.create("entity")`.

---

## 4. Dvě SPA na jednom GAE service

Scaffold `caio-create-app` generuje **jednu** SPA (`client/index.html`). Dvě SPA se doplní ručně
ve dvou krocích:

**a) Build dvou bundlů** — `client/vite.config.js`:

```javascript
import { createViteConfig } from "caio-devkit/vite";
import { resolve } from "path";

export default createViteConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
```

**b) Routing na serveru.** `App.init` registruje na konci catch-all
`app.get("/*splat")` → `public/index.html`. Deep link `/admin/reservations` by tedy vrátil
**veřejnou** SPA. Řeší se use casy registrovanými **před** catch-allem (`Command.createCommands`
běží dřív), které pošlou `admin.html`:

```javascript
// server/spa/api.js
import path from "path";

const sendAdmin = ({ res, publicPath }) => {
  res.sendFile(path.resolve(publicPath, "admin.html"));
  return false; // dtoOut === false → framework už neposílá JSON
};

export default {
  "admin": { method: "get", fn: sendAdmin },
  "admin/*splat": { method: "get", fn: sendAdmin },   // Express 5 wildcard
};
```

Alternativy, pokud by wildcard v klíči use casu dělal problém: hash routing v admin SPA
(`/admin.html#/reservations`), nebo jedna SPA se dvěma route stromy. Rozhodnutí: jdeme
variantou výše, admin má vlastní bundle (host si netahá admin kód).

---

## 5. Autentizace a profily

`caio-server` `Authentication` je inicializován automaticky v `App.init` a mountuje
`/auth`, `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/google`, `/auth/google/callback`.
Na frontendu to obsluhuje `UiAuth.SessionProvider` / `useSession()` (součást `UiApp.SpaProvider`).

- **Podporováno frameworkem:** Google OAuth + email/password. JWT v cookie, payload obsahuje
  `identity, firstName, surname, name, email, photo, profileList`.
- **Profily:** `guest` (registrovaný host), `owner` (vlastník/správce). Autorizace use casu
  se dělá `auth: ["owner"]`.
- **Facebook OAuth framework nemá.** Buď se vypustí, nebo se doimplementuje vlastní passport
  strategie v appce. Cílový stav: vypuštěno (viz 13.).
- **Přiřazení profilu není v API.** `profileList` se do identity dokumentu zapisuje mimo
  framework — pro `owner` ručně v Mongu, nebo si appka doplní vlastní use case
  `identity/setProfileList` s `auth: ["owner"]`. Změna profilu se propíše do tokenu až při
  dalším přihlášení.
- **Rezervace nevyžaduje přihlášení.** Host zadá kontakt do formuláře. Přihlášení je volitelné
  a přináší „moje rezervace“ a možnost napsat recenzi.

---

## 6. Datový model (MongoDB)

`Dao` doplňuje `sys.cts` / `sys.mts` sám a mapuje `id` ↔ `_id`; klíč `sys` v datech je rezervovaný.

### property
- `name`, `description`, `rules` — LSI objekty
- `address` — street, city, zip, gps (lat, lng)
- `capacity` — beds, extraBeds
- `amenities` — pole stringů (wifi, parking, sauna, ...)
- `photoList` — pole `{ binaryId, order, caption (LSI) }`
- `minNights`, `checkIn`, `checkOut`
- `state` — active | inactive

### pricing
- `propertyId`, `type` (standard | weekend | holiday), `label` (LSI)
- `dateRange` — `{ from, to }` pro holiday/weekend bloky
- `price` — fixní cena bloku (holiday/weekend)
- `rates` — `{ "2": cena, ... "7": cena }` (jen standard, dle počtu nocí)
- `priority` — holiday > weekend > standard

### reservation

**Jedna kolekce pro všechnu obsazenost** — vlastní rezervace z webu, rezervace naimportované
z portálů i ruční blokace vlastníka. Liší se jen hodnotami polí, ne kolekcí. Díky tomu je
kalendář obsazenosti i kolizní kontrola jeden dotaz nad jednou kolekcí.

- `propertyId`, `guestId` (null u nepřihlášeného hosta a u neguestových záznamů)
- `dateFrom`, `dateTo`, `nights`, `guestCount`
- `totalPrice`, `discountedPrice`, `discountReason` (lastMinute | coupon | custom)
- `state` — pending | confirmed | cancelled | completed
- `source` — **web** (rezervace z našeho webu) | **manual** (zadal vlastník) |
  **booking** / **echalupy** (naimportováno z portálu)
- `reason` — maintenance | owner (jen u `source: manual`, když nejde o platící hosta), jinak null
- `contact` — `{ name, email, phone }` (null u importovaných a u blokací)
- `note`
- `payment` — `{ state: pending|paid|refunded, paidDate, method }`
- `icalUid` — UID záznamu. U vlastních záznamů generujeme my, u importovaných je to UID z feedu.
- `icalFeedId` — reference na `ical_feed`, **null u všeho, co vzniklo u nás**. Tohle je
  rozhodující pole: podle něj se pozná, co se smí exportovat a čeho se smí dotknout import.

| | `source` | `icalFeedId` | `contact` | `state` |
|---|---|---|---|---|
| Rezervace z webu | `web` | null | vyplněn | pending → confirmed |
| Rezervace zadaná vlastníkem | `manual` | null | volitelně | confirmed |
| Blokace (údržba, vlastní pobyt) | `manual` | null | null | confirmed |
| Import z portálu | `booking` / `echalupy` | id feedu | null | confirmed |

Kombinace polí, které se hlídají v `crud.js`: `contact` je povinný jen pro `source: web`,
cena jen tam, kde jde o platícího hosta, a záznam s `icalFeedId != null` se nesmí editovat
ručně (přepsal by ho příští import).

### ical_feed
Konfigurace externích kalendářů (spravuje admin).
- `propertyId`, `name`, `source` (booking | echalupy | other), `url`
- `state` — active | inactive
- `lastSync` — `{ at, state: ok|failed, importedCount, message }`

### news
- `propertyId`, `title` (LSI), `content` (LSI)
- `type` — news | event | lastMinute
- `validFrom`, `validTo`, `state` (active | archived), `binaryId`

### review
- `propertyId`, `guestId`, `reservationId`
- `rating` (1–5), `text`, `state` (pending | approved | rejected), `response`

### attraction
Zajímavosti v okolí.
- `propertyId`, `title` (LSI), `description` (LSI)
- `category` — nature | culture | sport | gastro | kids | other
- `distanceKm`, `url`, `gps`, `binaryId`, `order`, `state`

### faq
- `propertyId`, `question` (LSI), `answer` (LSI), `order`, `state`

### finance_record
- `propertyId`, `type` (income | expense)
- `category` — rental | cleaning | repair | utilities | tax | insurance | supplies | other
- `amount`, `date`, `description`, `reservationId`, `taxDeductible`

### ecc_page / ecc_section
Backend pro WYSIWYG (`UiEcc`) — `caio-server` ho **nedodává**, appka si ho implementuje sama
(viz 8. Editace obsahu).
- `ecc_page` — `code`, `name`, `sectionList` (pole `sectionId`, drží pořadí)
- `ecc_section` — `pageId`, `data.uu5String`, `lock` (`{ identity, at }`)

### sys_identity, sys_binary
Spravuje `caio-server` (`Authentication`, `BinaryStore`). `sys_binary` drží
`name, gFileId, size, mimeType` a vrací `uri` na Google Drive.

---

## 7. API use cases

### Public (bez autorizace)
| Use case | Metoda | Popis |
|---|---|---|
| `property/get` | get | Info o nemovitosti |
| `availability/get` | get | Obsazenost pro kalendář (jen obsazeno/volno, bez zdroje a osobních dat) |
| `pricing/list` | get | Ceník |
| `price/calculate` | get | Cena pro zadaný termín a počet hostů |
| `reservation/create` | post | Vytvoření rezervace (i nepřihlášeným) |
| `news/list` | get | Aktivní aktuality/akce |
| `review/list` | get | Schválené recenze |
| `attraction/list` | get | Zajímavosti v okolí |
| `faq/list` | get | Časté dotazy |
| `gallery/list` | get | Fotogalerie (binaryId + uri + popisek) |
| `eccPage/load` | get | Obsah stránky pro WYSIWYG režim |
| `calendar/ical` | get | iCal feed pro Booking/e-chalupy (`text/calendar`, `return false`) |
| `admin`, `admin/*splat` | get | Servírování `admin.html` |

### Guest (`auth: true`)
`reservation/myList`, `reservation/cancel`, `review/create`

### Owner (`auth: ["owner"]`)
- **Rezervace a blokace:** `reservation/list`, `get`, `create`, `update`, `delete`, `setState`
  (blokace termínu je `reservation/create` se `source: manual` a `reason` — samostatné
  `blockedDate/*` use casy neexistují)
- **Ceník:** `pricing/list`, `create`, `update`, `delete`
- **Obsah:** `news/*`, `attraction/*`, `faq/*` (`list|create|update|delete`)
- **Recenze:** `review/listAll`, `review/approve`, `review/respond`
- **Galerie:** `gallery/upload` (multipart), `gallery/update`, `gallery/delete`
- **Nemovitost:** `property/update`
- **iCal:** `icalFeed/list|create|update|delete`, `calendar/sync`
- **Finance:** `finance/list|create|update|delete`, `finance/report`, `finance/export` (CSV)
- **WYSIWYG:** `eccPage/create`, `eccPage/createSectionBefore`, `eccPage/createSectionAfter`,
  `eccPage/updateSectionOrder`, `eccPage/deleteSection`, `eccSection/list`,
  `eccSection/lock`, `eccSection/unlock`

Pozn.: základní `Crud.list({ pageInfo, idList })` **nefiltruje** podle libovolného `dtoIn` a vrací
prosté pole (bez `pageInfo`). Kde je potřeba filtr (rezervace podle stavu/termínu/zdroje, finance
podle období), přepíše se `list` v `crud.js` nad vlastní `dao.find(filter, pageInfo, sort)`.

---

## 8. Klíčové funkcionality

### iCal synchronizace (Booking.com, e-chalupy)

Synchronizace obsazenosti probíhá **zatím výhradně přes iCal** — v obou směrech.

**Export (my → portály):** `calendar/ical` generuje `VCALENDAR` z kolekce `reservation`, ale
**jen ze záznamů s `icalFeedId: null`** (tedy `source` = web | manual) ve stavu pending nebo
confirmed. Importované záznamy se do feedu nedávají — jinak by portál dostal zpátky své vlastní
rezervace jako cizí blokace a přes dva portály by se to navzájem množilo.

Jeden `VEVENT` na záznam: `UID` = `icalUid`, `DTSTART`/`DTEND` jako `VALUE=DATE` (celodenní),
`DTEND` exklusivně. Booking.com a e-chalupy si tuto URL zadají jako externí kalendář. Feed je
veřejný, proto obsahuje jen termín a neutrální `SUMMARY` — **žádná osobní data hosta**.

**Import (portály → my):** admin si v `ical_feed` založí feed (název, zdroj, URL).
`calendar/sync` projde aktivní feedy, stáhne a naparsuje je a promítne do `reservation`:
- párování podle `icalFeedId` + `UID` → existující záznam se aktualizuje, nový vznikne
  (se `source` podle feedu, `state: confirmed`, bez `contact` a bez ceny), záznam zmizelý
  z feedu se smaže — import je tedy idempotentní,
- **mazací i aktualizační krok je vždy filtrovaný na `icalFeedId` toho jednoho feedu.** Vlastní
  rezervace (`icalFeedId: null`) ani záznamy druhého feedu se nesmí dostat do dosahu importu,
- z `VEVENT`u se bere **jen termín a UID**. Pokud feed obsahuje osobní údaje hosta
  (`SUMMARY`, `DESCRIPTION`), zahodí se — neukládají se,
- výsledek se zapíše do `lastSync` (počet, stav, chybová zpráva).

**Nastavení na straně portálů** (ověřeno 2026-08-22, viz zdroje v [design-v1.md § 7](./design-v1.md#7-ical-synchronizace)):

| Portál | Export (jejich feed → my) | Import (náš feed → jim) |
|---|---|---|
| e-chalupy | `klient.e-chalupy.cz/obsazenost-export-ics/` | `klient.e-chalupy.cz/obsazenost-import/` |
| Booking.com | extranet → Rates & Availability → Calendar sync | tamtéž (import externího kalendáře) |

Obojí se nastavuje **per jednotka** (u nás jedna roubenka = jedna jednotka). E-chalupy nabízejí
export ve dvou variantách a **je nutné použít tu „s detaily“** — varianta bez detailů podle
dokumentace Trevlixu mění UID cizích rezervací a vydává je za vlastní, což by rozbilo párování
na UID a naimportovalo falešné rezervace. Varianta s detaily ovšem nese osobní údaje hosta, proto
se při importu zahazují (viz výše).

**Kolizní kontrola** při `reservation/create` je jeden dotaz nad `reservation` bez ohledu na
`source`, takže obsazenost z portálů blokuje web a naopak — to je hlavní důvod, proč je všechna
obsazenost v jedné kolekci.

**Spouštění syncu:** ručně z adminu + automaticky. Automatika na GAE: Cloud Scheduler → HTTP
call na `calendar/sync` (chráněný hlavičkou `X-Appengine-Cron` nebo shared secretem, protože
`auth: ["owner"]` cron nesplní).

**Limity iCalu, se kterými se počítá:** přenáší jen termíny — žádné ceny, hosty ani platby;
a zpoždění dané periodou stahování na straně portálu (typicky desítky minut), takže u termínu
rezervovaného ve dvou kanálech ve stejnou chvíli **reálně hrozí overbooking**. Proto rezervace
z webu vzniká ve stavu `pending` a potvrzuje ji vlastník.

**Do budoucna:** Booking.com Connectivity API místo iCalu (obousměrně ceny, dostupnost,
rezervace).

### Editace obsahu (WYSIWYG)

Cílový stav: textové sekce webu (o roubence, provozní řád, kontakt, intro, perexy) jsou
editovatelné in-place přes `UiEcc.Page` — klik na sekci otevře editor
(`uu5richtextg01-elements`), uložení jde přes `eccSection/unlock`.

Dvě věci k tomu patří:
- **Backend si musí appka napsat** — `caio-server` `eccPage`/`eccSection` use casy nemá.
  Postaví se na `Dao`/`Crud` (kolekce `ecc_page`, `ecc_section`), ale samotné `Crud` nestačí
  (pořadí sekcí, lock, insert before/after).
- **`UiEcc` má edit režim navázaný na profil `"operatives"`.** Vlastník tedy musí mít
  v `profileList` i `operatives`, nebo se `UiEcc` upraví/forkne na profil `owner`.

Strukturovaný obsah (aktuality, ceník, galerie, zajímavosti, FAQ, recenze) zůstává v entitách
a edituje se přes CRUD obrazovky v adminu — WYSIWYG je pro volný text.

### Galerie a soubory

`BinaryStore.Binary.create({ file, name })` uloží soubor na Google Drive a metadata do Mongu
a vrátí `uri`. Multipart request framework rozparsuje sám (`Command.getDtoIn` → `dtoIn.file` je
multer file), takže `gallery/upload` je jen tenká obálka nad `BinaryStore`.

- `BinaryStore.init(app, { googleDiskAuthPath })` musí zavolat appka — `App.init` ho nevolá.
- `GOOGLE_DISK_PUBLIC_FOLDER_ID` + service account key jsou povinné.
- Obrázky z Drive se renderují `UiElements.Image` (nastavuje `referrerPolicy="no-referrer"`,
  bez toho je Drive nevrátí).
- Pořadí a popisky fotek drží `property.photoList` (`binaryId`, `order`, `caption`).

V v1 se `BinaryStore` **nepoužívá** — fotky jsou statické soubory nasazené s appkou
(viz [design-v1.md § 8](./design-v1.md#8-galerie--statické-soubory)). Přechod na `BinaryStore`
znamená vyměnit zdroj dat galerie z konstanty za `gallery/list`; komponenta galerie zůstává.

### Ceny

Priorita `holiday` (fixní cena za celý blok, nelze rezervovat část) > `weekend` (fixní cena za
víkendový blok) > `standard` (cena z `rates` podle počtu nocí). Vlastník může na rezervaci
aplikovat slevu (`discountedPrice` + `discountReason`). Výpočet je v `services/price.js` a
používá ho jak `price/calculate`, tak `reservation/create` — cena se na serveru vždy
**přepočítá**, hodnota z klienta se nepřebírá.

### Email notifikace

Nová rezervace (hostu potvrzení, vlastníkovi notifikace), potvrzení/storno rezervace,
připomínka 3 dny před příjezdem, výzva k recenzi po check-outu. nodemailer + Google SMTP.

### Finance

Automatický `income` záznam při potvrzení rezervace, manuální výdaje s kategorizací, měsíční
přehled příjmy/výdaje, roční přehled pro daňové přiznání (§ 9 ZDP), CSV export.

---

## 9. Frontend routy

### Veřejná SPA (`index.html` → `src/web/`)
`home` · `about` (o roubence) · `gallery` · `reservation` (kalendář obsazenosti + formulář) ·
`pricing` · `news` (akce/aktuality) · `reviews` · `surroundings` (zajímavosti v okolí) ·
`faq` (časté dotazy) · `contact` (kontakt + mapa) · `rules` · `my/reservations` (jen `guest`)

### Admin SPA (`admin.html` → `src/admin/`)
`dashboard` · `reservations` (rezervace, importovaná obsazenost i blokace — filtr podle `source`) ·
`reservations/calendar` · `reservations/detail` ·
`pricing` · `news` · `reviews` · `attractions` · `faq` · `gallery` · `content` (WYSIWYG) ·
`finance` · `finance/report` · `settings` (property, iCal feedy, notifikace)

Route guard: `UiApp.withRoute(Component, { profileList: ["owner"] })` — nepřihlášený dostane
`UiAuth.Unauthenticated`, přihlášený bez profilu `UiAuth.Unauthorized`.

**Pozor:** `UiApp` exportuje jen `SpaProvider`, `Spa` a `withRoute`. `Top` ani `Page`
v `caio-ui-app/exports.js` **nejsou** (i když je README zmiňuje), takže horní lišta a layout
appky se staví z `uu5g05-elements` vlastní komponentou v `client/src/components/`.

---

## 10. ENV a deploy

`.env` (produkce) / `.env.development` (dev, `NODE_ENV=development`) vedle `package.json`:

| Proměnná | K čemu |
|---|---|
| `PORT` | port serveru (default 8080) |
| `MONGODB_URI` | MongoDB Atlas — **povinné, jinak appka nestartuje** |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth — **povinné, jinak appka nestartuje** |
| `JWT_SECRET`, `JWT_LIFETIME` | app token (default secret = `GOOGLE_CLIENT_SECRET`, lifetime `1d`) |
| `GOOGLE_DISK_PUBLIC_FOLDER_ID` | Drive folder pro `BinaryStore` |
| `SMTP_*` | odesílání emailů (vlastní, mimo framework) |
| `ICAL_SYNC_SECRET` | shared secret pro cron volání `calendar/sync` |
| `VITE_PORT` | dev port klienta (v `client/`) |

Deploy: `npm run deploy` (= `caio-devkit deploy` → `vite build` → `client/dist` → `public/` →
`gcloud app deploy`). `app.yaml` = `runtime: nodejs24`.

---

## 11. Etapy

| Etapa | Obsah | Dokument |
|---|---|---|
| **v1** | Veřejný web (obsah natvrdo v komponentách), vytváření rezervací do DB, iCal sync s Booking a e-chalupy, galerie ze statických souborů | [design-v1.md](./design-v1.md) |
| **v2** | Plný admin: rezervace (CRUD, kalendářový pohled, stavy), ceník, aktuality, blokované termíny, správa iCal feedů, galerie přes `BinaryStore` (upload z adminu), recenze, email notifikace, přihlášení hostů a „moje rezervace“ | — |
| **v3** | WYSIWYG editace obsahu (`UiEcc` + vlastní `ecc*` backend), finance a reporty, zajímavosti a FAQ z DB, holiday tarify a slevy, víc jazyků, dashboard | — |

---

## 12. Odchylky od stacku a co vyřešit dřív, než se začne

Ověřeno proti zdrojákům `caio-architecture` (stav 2026-08-22), **aktualizováno 2026-08-24**.
Před startem znovu překontrolovat podle `git log` příslušného repa.

**Frontend build se 2026-08-24 změnil od základu.** `caio-devkit` uu5 knihovny **nebundluje** —
zůstávají externals a za běhu je načítá `uu5loaderg01` z generované import mapy nad kopiemi
v `public/libs/`. Praktické důsledky pro tuhle appku:

- `client/vite.config.js` má být **prázdný `createViteConfig()`** — externals, SystemJS výstup,
  loader, import mapu i `define` (včetně `OUTPUT_NAME`) dodává devkit;
- **vývoj neběží na Vite dev serveru.** `npm run dev` staví klienta ve watch režimu do `public/`
  a servíruje ho express, takže se appka otevírá na **serverovém portu**, frontend i API jsou
  same-origin (žádná proxy) a **není HMR** — po uložení je potřeba refresh;
- `public/libs/` je ~40 MB, když appka táhne celý uu5 stack. Do mapy (a tím do deploye) jde
  tranzitivní uzávěr `uu5*`/`uu_*` z `client/package.json`, takže **nepoužitá závislost se
  nasazuje**. Před releasem projít `client/package.json` a vyhodit, co appka nepoužívá
  (samotný `uu5codekitg01` je 18 MB).

Podrobně v `caio-devkit/README.md`, sekce *Frontend architektura*, a `caio-devkit/docs/vite-uu5.md`.

**Blokery**

1. ~~**`caio-ui` se nedá naimportovat do Vite.**~~ **Vyřešeno** (`caio-ui@af16b88`) — zdroje s JSX
   jsou přejmenované na `.jsx`. Navíc funguje i root barrel `import { UiApp } from "caio-ui"`,
   takže `UiEcc` už není zablokované loaderem (backend pro něj `caio-server` pořád nemá, viz 8.).
2. ~~**`caio-ui` čte `process.env.OUTPUT_NAME`**~~ — **vyřešeno**, `createViteConfig` ho definuje
   z `client/package.json`. Do `define` v appce nepatří.
3. ~~**Default `publicPath` v `caio-server` míří vedle**~~ — **vyřešeno** (`caio-server@b328eef`),
   resolvuje se z `process.cwd()`. `App.init({ api })` stačí. Tamtéž se opravil SPA fallback:
   cesta s příponou souboru už nevrací `index.html` se statusem 200, ale 404 — takže chybějící
   fotka v galerii je vidět jako chyba, ne jako tiše servírovaná stránka.
4. **`App.init` volá `Auth.init` bezpodmínečně** a `caio-server` staví `MongoClient` už při
   importu. Prázdný `GOOGLE_CLIENT_ID` nebo `MONGODB_URI` shodí start (`TypeError` /
   `MongoParseError`). Google OAuth credentials a Mongo URI musí být vyplněné od první minuty,
   i když v1 přihlašování nepoužívá.

**Odchylky od původního zadání**

5. **Facebook OAuth** framework nemá — vypuštěno (viz 5.).
6. **Víc jazyků:** `UiApp.SpaProvider` má `LanguageListProvider languageList={["cs"]}` natvrdo.
   Multijazyčnost tedy znamená nepoužít `SpaProvider`, ale složit si providery vlastní (nebo
   poslat PR do `caio-ui`). Datový model drží LSI objekty od začátku, renderuje se zatím `cs`.
7. **`UiApp.Top` / `UiApp.Page` a `UiEcc.Section` nejsou exportované** — layout a top bar si
   appka staví sama, `UiEcc` se používá přes `Page` / `CreatePageButton`.
8. **`UiEcc` edit režim je vázaný na profil `"operatives"`**, ne na `owner` (viz 8.).
9. **`BinaryStore.init` nemountuje žádné routy** (router v `api/routes.js` je importovaný, ale
   nepoužitý) a `App.init` ho nevolá. Upload endpoint je věc appky.
10. **`Crud.list` vrací prosté pole a neumí filtr** — filtrované výpisy potřebují override
    (viz 7.).

**K ověření**

11. Chování `useDataList` v `UiElements.CrudContext` nad `list`, které vrací pole bez `pageInfo` —
    ověřit na první admin CRUD obrazovce, než se na ní postaví všechny ostatní.

(iCal na straně e-chalup byl ověřen — export i import existují, viz 8.)

---

## 13. Budoucí rozšíření (mimo scope)

Booking.com Connectivity API místo iCalu · online platební brána (Stripe/GoPay/Comgate) ·
víc nemovitostí v provozu · Facebook/Apple login · SMS notifikace · dynamické ceny ·
věrnostní program · mobilní aplikace
