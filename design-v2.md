# caio_propertyman v2 — admin

Rozpad druhé implementační verze. Cílový stav a společná rozhodnutí o stacku jsou
v [design.md](./design.md), první verze v [design-v1.md](./design-v1.md) — tenhle dokument
je nepřepisuje, jen zužuje na to, co se udělá teď.

---

## 1. Rozsah v2

**Je v v2:**

1. **Admin jako vlastní UVE** — vlastní vizuální entita (vlastní lišta, vlastní menu, vlastní
   route strom pod `/admin`), oddělená od veřejného webu. **Včetně přihlášení** (profil `authorities`).
2. **Rezervace** — seznam s filtry, zakládání ručních rezervací a blokací, editace, mazání,
   potvrzení a storno (včetně e-mailu hostovi).
3. **Recenze** — CRUD v adminu a **veřejný web je bere z databáze** místo z konstant.
4. **Správa iCal feedů** — kolekce `ical_feed` místo proměnných v `.env`, CRUD v adminu,
   ruční spuštění synchronizace a stav posledního běhu.

**Není v v2** (jde do v3 podle [design.md § 11](./design.md#11-etapy)):

WYSIWYG editace obsahu (`UiEcc` + vlastní `ecc*` backend) · ceník z databáze · aktuality ·
galerie přes `BinaryStore` a upload fotek · zajímavosti a FAQ z databáze · nemovitost
(`property`) a nastavení z databáze · finance a reporty · kalendářový pohled na rezervace ·
dashboard · přihlašování hostů a „moje rezervace“ · víc jazyků · holiday tarify a slevy ·
platební brána

Dvě věci, které v1 dokumenty slibovaly do v2 a v2 je **vědomě neřeší** — důvody v § 11:
race condition při souběžných rezervacích a kalendářový pohled pro vlastníka.

---

## 2. Prerekvizity

| # | Co | Proč |
|---|---|---|
| 1 | **`JWT_SECRET` v `.env`** | v1 přihlášení nemá, takže nebyl potřeba. Default je `GOOGLE_CLIENT_SECRET` (`caio-server-auth/config/config.js`) — bez Google OAuth tedy není žádný a token se nepodepíše čím. |
| 2 | **První `authorities` se nastaví ručně v Mongu** | Klasický bootstrap problém: use case, který role přiděluje (`identity/update` z `Authentication.createApi()`), sám vyžaduje profil `authorities`, takže první ho nemá kdo udělit. Postup: zaregistrovat se na `/login.html`, pak v `sys_identity` doplnit `profileList: ["authorities"]`. Dalším už to jde z appky, pokud si namountuje `Authentication.createApi()` — proto `authorities`, a ne vlastní jméno role (§ 5). |
| 3 | **`uu5codekitg01-forms` a `uu5tilesg02-controls` do `client/package.json`** | `UiElements.Crud` je importuje staticky (`crud.jsx`, `uu5tilesg02-extension/list-block.jsx`). **Nic to neblokuje** (ověřeno 2026-09-14): v `node_modules` i v import mapě už jsou, protože je `caio-ui` má v `peerDependencies` a devkit walkuje i ty. Do `package.json` appky patří stejně — závislost, na které stojí celý admin, nemá být vidět jen nepřímo. |
| 4 | **Skutečné recenze** (text, jméno, hodnocení) | e-chalupy hlásí 4,8/5 ze 14 recenzí, texty ale nemáme. Placeholdery z `content/reviews.js` se do databáze **nemigrují** — jsou vymyšlené (docs/wip.md). |
| 5 | **URL obou iCal feedů** (Booking, e-chalupy — varianta „s detaily“) | v1 je má v `.env`, v2 se zadávají v adminu a z `.env` mizí. |

Ceník (`pricing.approved`) ani SMTP účet **nejsou** prerekvizitou v2 — admin se rozjede
i bez nich, jen `reservation/createManual` narazí na stejnou pojistku jako veřejný
`reservation/create` (503 `price/notApproved` v produkci) a e-maily se jen zalogují.

---

## 3. Co přibude ve struktuře

```
server/
├── review/                       # NOVÉ
│   ├── dao.js
│   ├── crud.js
│   └── api.js                    # review/list|create|update|delete
├── ical-feed/                    # NOVÉ
│   ├── dao.js
│   ├── crud.js
│   └── api.js                    # icalFeed/list|create|update|delete + icalFeed/sync
├── reservation/
│   ├── crud.js                   # + listForAdmin, createManual, setState, guard importovaných
│   └── api.js                    # + use casy pro správce
├── calendar/api.js               # calendar/sync (cron) -- feedy z DB místo z .env (§ 8)
└── services/
    ├── ical-import.js            # feedy z kolekce, ne z process.env
    └── email.js                  # + potvrzení / storno hostovi
client/src/
├── admin/                        # NOVÉ — vlastní UVE
│   ├── app.jsx                   # UiApp.Page: admin lišta, menu, odhlášení
│   ├── router.jsx                # route mapa adminu
│   ├── calls.js                  # volání serveru z adminu
│   └── routes/
│       ├── reservations.jsx
│       ├── reviews.jsx
│       └── ical-feeds.jsx
└── components/sections/reviews.jsx   # zdroj dat: konstanta -> review/list
```

`server/spa/api.js` z [design.md § 4](./design.md#4-dvě-spa-na-jednom-gae-service) v2 **nevzniká** —
viz § 4.

---

## 4. Kde admin fyzicky žije

`design.md § 4` počítá s druhým HTML entry (`admin.html`) a vlastním bundlem. **Tak jak je
popsaný, dnes nepostaví** — přečteno ve zdrojácích `caio-devkit` (stav 2026-09-14, ne spuštěno):

- `createViteConfig` má `build.rollupOptions.output.entryFileNames` natvrdo `"index.js"`
  (`packages/caio-devkit/src/vite/base-config.js`), takže dva entry chunky by si sáhly na
  totéž jméno souboru;
- plugin `caio-devkit:uu5-loader` vkládá do **každého** HTML `Uu5Loader.import("/index.js")`
  (`transformIndexHtml`, jeden `entryFileName` pro celý build), takže `admin.html` by
  nabootoval veřejnou SPA.

**Rozhodnuto (2026-09-14, majitel): jeden `index.html`, admin je lazy route strom pod
`/admin`.** `Utils.Component.lazy` (uu5g05) nad `src/admin/`, takže se admin kód i jeho
knihovny stáhnou teprve tomu, kdo na `/admin` opravdu přijde. Server se nemění vůbec:
catch-all `/*splat` z `App.init` vrací `index.html` na každou cestu bez přípony, takže deep
link `/admin/reservations` funguje sám a `server/spa/api.js` není k čemu.

Důvod, kterým `design.md § 4` dva bundly obhajuje („host si netahá admin kód“), drží i tady —
dělicí čára se jen posune z HTML entry na dynamický import. Za v2, kde má admin tři obrazovky,
nestojí změna build pipeline celého stacku. `design.md § 4` zůstává popisem cílového stavu;
až bude admin velký nebo se `caio-devkit` opraví z jiného důvodu (`entryFileNames: "[name].js"`
a výběr entry v `transformIndexHtml` podle zpracovávaného HTML), je přechod na dva bundly
izolovaná změna ve `vite.config.js` + `server/spa/api.js`, přesně jak to
`design-v1.md § 3` předpokládá.

**Ověřeno 2026-09-14 v prohlížeči — a samotný lazy import nestačil.** Chunk vznikl
(`chunks/admin-*.js`, 44,7 kB), ale veřejná stránka si i tak stahovala `uu5tilesg02*`
i `uu5codekitg01-forms`. Příčina není v devkitu ani v `withLazy`, ale v **kořenovém barrelu
`caio-ui`**: `index.js` reexportuje `UiElements` (→ `Crud` → tiles + Monaco) a `UiEcc`
(→ richtext), balíček nemá `sideEffects: false`, takže je tree shaking nevyhodí — a `UiApp`
si `UiAuth` táhne sám kvůli `withRoute`. Stačilo tedy kdekoli v appce napsat
`import { UiApp } from "caio-ui"` a celý admin stack byl v entry chunku.

Řešení je **importovat submoduly, ne barrel** (`caio-ui` nemá `exports` mapu, takže cesta
vede přes `src/`, viz jeho *Known issues*):

| Kde | Import |
|---|---|
| `app.jsx`, `router.jsx` | `caio-ui/src/caio-ui-app` |
| `admin/top.jsx` | `caio-ui/src/caio-ui-auth` |
| `calls.js`, `admin/calls.js` | `caio-ui/src/caio-ui-elements/call` |
| jen obrazovky adminu (lazy chunk) | `caio-ui/src/caio-ui-elements` |

K tomu patří **dvouřádková změna v `caio-ui`**: `caio-ui-auth/identity-item.jsx`
a `form-identity-select.jsx` importovaly celý barrel `../caio-ui-elements` kvůli jedinému
`Call.cmdGet`. Tím tekly tabulky a Monaco do **každé** appky postavené na `Spa`, i čistě
veřejné. Teď importují `../caio-ui-elements/call`.

Výsledek (změřeno na `/home`): `index.js` 163,7 kB → 121,9 kB a z `libs/` se nenačte **žádná**
z knihoven `uu5tilesg02*` / `uu5codekitg01-forms` / `uu5richtextg01*`; admin chunk se stáhne
teprve při otevření `/admin`. **Pravidlo pro tuhle appku: `caio-ui` se importuje po
submodulech; kořenový barrel jen tam, kde se opravdu používá všechno.**

**Lišta a rám stránky.** `UiApp.Spa` skládá rám z props `top`/`footer`; admin má ale jinou
lištu i jiné menu než web. Řeší se tím, že `app.jsx` vybere `top`/`footer` podle aktuální
routy (`useRoute()`), ne dvěma `Page` komponentami vnořenými do sebe. Admin lišta: název
appky, menu (Rezervace · Recenze · Kalendáře) a **tlačítko odhlášení**
(`UiAuth.useSession().logout()`) — `Top` z `caio-ui` identity tlačítko zatím nemá
(`displayIdentity` prop je v README avizovaný, v `src/caio-ui-app/top.jsx` neexistuje),
takže ho dodá appka jako položku `menu.itemList`.

**Vzhled adminu je čisté GDS.** Žádná Fraunces, žádná Karla, žádné `Section`/`Heading`/`Photo`
z veřejného webu — ty komponenty existují kvůli grafické předloze, kterou admin nemá.
Jediné, co se přebírá, je `setMeaningColor("primary", theme.color.forest)` kvůli kontinuitě
značky. Platí pravidlo z [docs/decisions.md](./docs/decisions.md): uu5 se nastavuje propsy,
přestylování jen se schválením majitele — v adminu tedy prakticky žádné.

---

## 5. Přihlášení a autorizace

**Přihlašovací stránku appka nepíše.** `/login.html` (Google, e-mail + heslo, registrace,
reset hesla) dodává `caio-devkit` a v `public/` už leží. `UiAuth.useSession().login()` ji
otevře v popupu a identitu pošle zpátky přes `postMessage`.

| Vrstva | Jak |
|---|---|
| Route guard | `UiApp.withRoute(Component, { profileList: ["authorities"] })` — nepřihlášený dostane `UiAuth.Unauthenticated` (má v sobě tlačítko *Přihlásit se*), přihlášený bez profilu `UiAuth.Unauthorized` |
| Server | `auth: ["authorities"]` u každého admin use casu |
| Zdroj rolí | **databáze, ne token** — `GET /auth` i `authentication` čtou `profileList` z `sys_identity`, takže odebraná role platí okamžitě a uniklý `JWT_SECRET` role nerozdává |

Route guard je UX, ne bezpečnostní hranice. Co uživatel smí, rozhoduje `auth` na serveru;
guard jen zařídí, že se nenabízí obrazovka, ze které by se vrátilo 401.

**Profil je `authorities`, ne vlastní `owner`** (rozhodnuto 2026-09-14, majitel; `design.md § 5`
je srovnaný). Je to profil, se kterým počítá sám `caio-server`: `Authentication.createApi()`
(`identity/adminList`, `identity/update`) ho má natvrdo jako jediný, který smí sahat na
identity. S vlastním jménem role by správce appky potřeboval role dvě — jednu na appku
a `authorities` na správu uživatelů. Profil `guest` (registrovaný host) přibude až s guest
loginem ve v3.

**Které providery se nabídnou, rozhoduje `.env`, ne kód.** `GET /auth/config` vrací seznam
providerů, pro které má deployment credentials, a přihlašovací stránka podle toho kreslí
tlačítka. Kromě Googlu (`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`) zvládne `caio-server`
i **Facebook** (`FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET`) — tvrzení `design.md § 12, bod 5`,
že ho framework nemá, neplatí (ověřeno v `caio-server-auth/helpers/providers.js`, opraveno
2026-09-14). Zapnout ho je tedy věc dvou proměnných; bez nich se nenabízí a nic to nerozbije.
Stejně tak reset hesla: nabídne se, jen když má deployment poštu (§ 9).

**Nové závislosti a co to stojí.** `UiElements.Crud` staticky importuje `uu5codekitg01-forms`
(modál *Zobrazit data* a hromadné zakládání stojí na Monaco editoru) a `uu5tilesg02-controls`.
V `public/libs` zabírají ~17 MB, z toho 15,9 MB je `uu5codekitg01-forms/dist/vs` — Monaco,
které si stahuje **jeho vlastní loader až při otevření editoru**. Runtime cena pro admina je
tedy ~70 kB (`uu5codekitg01-forms.min.js`), ne 16 MB.

**Změřeno 2026-09-14: ta cena za deploy už byla zaplacená před v2.** Import mapa se staví
z tranzitivního uzávěru včetně `peerDependencies`, a `caio-ui` obě knihovny mezi nimi má —
takže v `public/libs` ležely (a nasazovaly se) už ve v1, kde je nepoužívala ani jedna
obrazovka. v2 je tedy poprvé k něčemu používá; nezdražuje deploy, jen zlevňuje veřejný web
(§ 4). Kdyby ~17 MB v deployi vadilo, je cesta ven nepoužít `UiElements.Crud` a postavit
tabulky přímo nad `uu5tilesg02` — víc kódu ve všech třech obrazovkách. **Zůstáváme u `Crud`**,
přesně proto existuje.

---

## 6. Rezervace v adminu

### API

Všechno `auth: ["authorities"]`. Veřejné `reservation/create`, `availability/get` a `price/calculate`
zůstávají **beze změny** — do veřejné cesty se nesahá.

| Use case | Metoda | dtoIn | dtoOut |
|---|---|---|---|
| `reservation/list` | get | `{ state, source, dateFrom, dateTo, pageInfo }` (vše volitelné) | `{ itemList, pageInfo }` |
| `reservation/createManual` | post | `{ dateFrom, dateTo, guestCount?, contact?, reason?, note?, totalPrice? }` | záznam |
| `reservation/update` | post | `{ id, ...změny }` | záznam |
| `reservation/delete` | post | `{ id }` | `{}` |
| `reservation/setState` | post | `{ id, state }` | záznam |

**Proč `createManual`, a ne `reservation/create`:** jedna cesta = jeden handler a veřejné
`reservation/create` je záměrně hloupé (honeypot, rate limit, vždycky `pending`, vždycky
`source: "web"`). Míchat do něj admin větev znamená rozhodovat o autorizaci uvnitř use casu.
`UiElements.CrudContext.create()` čeká konvenci `entity/create`, ale umí prop `calls` —
admin si tedy předá vlastní mapu volání (`createItem: () => Call.cmdPost("reservation/createManual", …)`).
To je přesně ten případ, na který `calls` v `caio-ui` je.

**Filtrovaný a stránkovaný `list`.** Základní `Crud.list()` filtr neumí a vrací prosté pole.
`caio-server` mezitím přidal `Crud.listPage()` nad `Dao.findPage()`, které vrací
`{ itemList, pageInfo: { pageIndex, pageSize, total } }` — přesně tvar, který `useDataList`
(a tím `UiElements.Crud`) potřebuje, aby vůbec načetl druhou stránku. Tím je vyřešená
i otevřená otázka [design.md § 12, bod 11](./design.md#12-odchylky-od-stacku-a-co-vyřešit-dřív-než-se-začne).
`reservation/list` tedy přepisuje `list` nad `dao.findPage(filter, pageInfo, { dateFrom: -1 })`.

**Dvě pasti na dtoIn, obě už jednou zaplacené v v1:**

- **GET dtoIn přijde jako řetězce.** Query parametry se nepřetypovávají — jen hodnoty
  začínající `{` nebo `[` projdou `JSON.parse` (`caio-server-app/services/command.js`).
  `pageInfo` tedy dorazí jako objekt, ale `state` a data jako stringy. Převádět ručně,
  stejně jako v `server/reservation/api.js`.
- **Pole `validator` se nesmí použít na odmítnutí.** Když hodí výjimku, `getDtoIn` sice pošle
  400, ale `fn` se stejně zavolá — u zapisujícího use casu by to znamenalo zápis a pak pád na
  `ERR_HTTP_HEADERS_SENT`. Validace patří do `fn`, jak to dělá v1.

### Co admin nesmí

**Záznam s `icalFeedCode != null` je read-only.** Je vlastnictvím importu: příští běh
`calendar/sync` ho podle UID přepíše nebo smaže, takže ruční editace by tiše zmizela.
`update`, `delete` i `setState` proto takový záznam odmítnou (400
`caio-propertyman/reservation/importedRecord`). Kdo chce obsazenost z portálu zrušit, zruší
ji na portálu. V tabulce se importované záznamy poznají sloupcem *Zdroj* a dají se odfiltrovat.

**`clientIp` se nikdy nevrací klientovi.** Je to osobní údaj sbíraný jen kvůli rate limitu;
`listForAdmin` ho odstraňuje ze všech položek. Kontakt hosta (`contact`) se naopak vrací —
to je smysl celé obrazovky —, ale jen tady, nikdy z veřejných use casů.

### Blokace termínu

Blokace je `reservation/createManual` se `source: "manual"`, `reason` (`maintenance` | `owner`)
a bez `contact` — samostatná entita ani `blockedDate/*` use casy neexistují
([design.md § 6](./design.md#6-datový-model-mongodb)). Obojí vzniká rovnou jako `confirmed`
a obojí má `icalFeedCode: null`, takže se **exportuje** do našeho feedu a portály termín
zablokují.

**Ve formuláři to není přepínač typu záznamu, ale vyplněnost** (upřesněno při implementaci):
jeden modál se všemi poli, kde kontakt dělá z termínu rezervaci a *Důvod blokace* z něj dělá
blokaci. Přepínač by znamenal vlastní formulář se stavem místo `Crud.generateInputs` — dvě
obrazovky kódu navíc za rozdíl, který je z vyplněných polí stejně vidět.

Kolizní kontrola (`services/availability.js`) platí i tady, ale vlastník ji smí **přebít**
(`force: true` v dtoIn) — dvojitý zápis termínu je jeho věc a někdy je to legitimní
(přesun hosta, oprava po chybě portálu). Bez `force` vrátí stejnou 409 jako veřejná cesta.

### Potvrzení a storno

`reservation/setState` přepíná `pending → confirmed | cancelled` (a `confirmed → cancelled`)
a **pošle hostovi e-mail** přes `services/email.js`. Bez toho je stav `pending` z v1 prázdné
gesto: host dostal mail „žádost přijata, čeká na potvrzení“ a nikdy by se nedozvěděl výsledek.
Selhání e-mailu nesmí shodit změnu stavu — stejné `try/catch` jako v `reservation/create`.

`cancelled` záznam se z exportního feedu vypadne sám (`findForExport` filtruje
`state: { $ne: "cancelled" }`), takže se termín na portálech uvolní při příštím stažení.

---

## 7. Recenze

### Kolekce `review`

```
propertyId    "roubenka"
author        "Novákovi"           // jak se host podepsal
place         "Praha"              // volitelné
text          "..."
rating        5                    // 1-5
date          "2026-08-14"         // kdy pobyt/recenze proběhla
state         approved             // pending | approved | rejected
response      null                 // odpověď vlastníka, volitelné
order         10
sys           { cts, mts }
```

Proti [design.md § 6](./design.md#6-datový-model-mongodb) chybí `guestId` a `reservationId` —
v2 nemá přihlašování hostů, takže recenze zakládá výhradně vlastník (opisem z e-chalup nebo
podle mailu). Obě pole přibudou s guest loginem ve v3; dokud nejsou, nemá je co plnit.

Index: `{ state: 1, order: 1 }`.

### API

| Use case | Metoda | Auth | Popis |
|---|---|---|---|
| `review/list` | get | — | Bez přihlášení vrací **jen `approved`**; správci (`authorities`) vrací vše a přijímá filtr podle `state` |
| `review/create` | post | `["authorities"]` | |
| `review/update` | post | `["authorities"]` | |
| `review/delete` | post | `["authorities"]` | |

Jeden `list` pro obojí je záměr: `Authentication.resolveIdentity` běží **před každým** use
casem, veřejné nevyjímaje, takže `fn` vidí `identity` i bez `auth` a může odpovědět podle
toho, kdo se ptá (README `caio-server`, *Every use case sees who is asking*). Druhý use case
(`review/listAll`) by znamenal dvě místa, kde se rozhoduje, co je veřejné.

Pojistka, kterou u toho nezkazit: **`state` se nesmí brát z dtoIn, dokud se neví, že se ptá
`authorities`.** Jinak si kdokoli vyžádá `state: "pending"`.

### Veřejný web

`components/sections/reviews.jsx` přejde z importu `content/reviews.js` na
`Call.cmdGet("review/list")` — komponenta zůstává, mění se zdroj dat, přesně jak to
předpokládá [design-v1.md § 5](./design-v1.md#5-veřejný-web--obsah-natvrdo).

Tím **texty recenzí opouštějí LSI**. Je to správně: nejsou to překlady rozhraní, ale obsah od
hostů — stejná úvaha, jaká už nechala adresu a telefon v `content/contact.js`
([docs/decisions.md](./docs/decisions.md)). `content/reviews.js` a klíče `reviews.*`
v `lsi/cs.json` se **smažou**, ne migrují: jsou vymyšlené.

Sekce se **nevyrenderuje vůbec**, když seznam přijde prázdný — prázdný blok „Recenze“ na webu
vypadá hůř než jeho nepřítomnost, a než budou skutečné recenze, bude prázdný.

---

## 8. iCal feedy z databáze

### Kolekce `ical_feed`

```
propertyId    "roubenka"
code          "booking"            // NEMĚNNÉ, váže se na reservation.icalFeedCode
name          "Booking.com"
url           "https://..."
state         active               // active | inactive
lastSync      { at, state, importedCount, message }
sys           { cts, mts }
```

Proti [design.md § 6](./design.md#6-datový-model-mongodb) tu **není `source`** (booking |
echalupy | other): duplikoval by `code`, protože právě kód feedu se zapisuje importovaným
záznamům do `reservation.source`. Jedna hodnota, jedno místo.

**Spojovací klíč zůstává `icalFeedCode`, ne `icalFeedId`.** [design.md § 6](./design.md#6-datový-model-mongodb)
mluví o referenci na `_id`, jenže v1 má v `reservation` kód (`"booking"`, `"echalupy"`) a nad
ním **partial unique index** `{ icalFeedCode: 1, icalUid: 1 }`. Přechod na id by znamenal
migraci dat i indexu a nekoupil by nic — feedů jsou dva a kód je čitelný v logu i v Mongo UI.
Odchylka je vědomá; `design.md § 6` se tím **neruší**, jen ho v2 nenaplňuje. Cena: `code` musí
být od založení neměnný, takže ve formuláři je editovatelný jen při zakládání.

### Co se změní v importu

`services/ical-import.js` dnes čte `process.env.ICAL_FEED_BOOKING` / `_ECHALUPY` z konstanty
`FEEDS`. Nahradí to `icalFeedCrud.listActive()`. Zbytek logiky se **nemění** — párování na
`{ icalFeedCode, icalUid }`, zahazování osobních údajů z `VEVENT`, izolace chyby jednoho feedu
od druhého. Po každém feedu se zapíše `lastSync`, aby admin viděl, kdy naposledy co dorazilo.

Proměnné `ICAL_FEED_*` z `.env` (a z `sys/health` v `server/api.js`) **zmizí**.

### Mazání feedu maže i jeho obsazenost

Smazání feedu bez úklidu by nechalo v `reservation` záznamy s jeho `icalFeedCode`, které už
nikdy nikdo neaktualizuje ani nesmaže — trvale obsazené termíny, ke kterým neexistuje zdroj.
`icalFeed/delete` proto v jedné operaci smaže i `reservation` s tím kódem
(`dao.deleteByFilter({ icalFeedCode })`) a v potvrzovacím dialogu řekne kolik jich je.
Deaktivace (`state: "inactive"`) je ta měkká varianta: sync feed přeskočí, záznamy zůstanou.

### Spuštění syncu: dva use casy, ne jeden

Cron a admin jsou dva volající s úplně jinou autorizací, takže dostávají **každý svůj use
case** nad jednou sdílenou službou (`services/ical-import.js`). Rozhodnuto 2026-09-14
(majitel) — dřív to byl jeden use case s `auth` jako funkcí.

| Use case | Metoda | Auth | Kdo volá |
|---|---|---|---|
| `calendar/sync` | post | shared secret (`ICAL_SYNC_SECRET` v hlavičce) nebo `X-Appengine-Cron` | Cloud Scheduler |
| `icalFeed/sync` | post | `["authorities"]` | tlačítko *Synchronizovat teď* v adminu |

`calendar/sync` tím zůstává **beze změny** proti v1 včetně ochrany secretem — jen si feedy
vezme z kolekce místo z `.env`. Kdo mění cron, nesahá na admin cestu a naopak.

`icalFeed/sync` bere volitelné `dtoIn.code` a pustí jen jeden feed — to je, co admin volá
u konkrétního řádku tabulky. Vrací totéž, co zapíše do `lastSync`, aby šel výsledek ukázat
rovnou v UI, bez druhého dotazu na seznam.

Proč ne jeden use case s `auth` jako funkcí (což `caio-server` umí): jedna funkce by mísila
dvě různé bezpečnostní úvahy — sdílený secret pro stroj a roli pro člověka — a každá změna
v jedné z nich by se musela promýšlet i za tu druhou. Dva use casy stojí pár řádků navíc
a autorizaci má každý zapsanou v deklaraci, kde je vidět na první pohled.

---

## 9. ENV v2

Proti [design-v1.md § 9](./design-v1.md#9-env-v1):

```
JWT_SECRET=...            # NOVĚ POVINNÉ -- v1 login nemá, v2 ano (§ 2)
ICAL_FEED_BOOKING=...     # ZRUŠENO -- feedy jsou v kolekci ical_feed (§ 8)
ICAL_FEED_ECHALUPY=...    # ZRUŠENO
```

Zbytek (`PORT`, `MONGODB_URI`, `GOOGLE_CLIENT_*`, `ICAL_SYNC_SECRET`, `SMTP_*`, `OWNER_EMAIL`)
beze změny. `GCS_BUCKET_NAME` v2 pořád není potřeba — `BinaryStore` přijde s galerií ve v3.

**Past: appka a framework si pro poštu čtou jiné proměnné.** `services/email.js` chce
`SMTP_HOST`, `SMTP_USER`, **`SMTP_PASS`**, `SMTP_FROM`, `OWNER_EMAIL`; reset hesla
v `caio-server-auth` chce `SMTP_HOST`, `SMTP_USER`, **`SMTP_PASSWORD`**, `MAIL_FROM`
a `APP_URL`. Kdo chce mít funkční obojí, vyplní obě jména hesla stejnou hodnotou. Bez toho
se odkaz „Zapomenuté heslo?“ na přihlašovací stránce vůbec nenabídne (`/auth/config` hlásí
`passwordResetEnabled: false`) — což je korektní chování, ne chyba.

---

## 10. Postup implementace

**Stav k 2026-09-14: etapy 1–6 hotové a ověřené (curlem i v prohlížeči), zbývá 7 (deploy).**
Co se u toho našlo a rozhodlo, je dopsané v příslušných paragrafech a v
[docs/decisions.md](./docs/decisions.md).

1. **Přihlášení a prázdný admin.** Route strom pod `/admin` s `withRoute({ profileList: ["authorities"] })`,
   admin lišta s odhlášením, `JWT_SECRET`, ruční `authorities` v Mongu. Ověřit všechny tři stavy:
   nepřihlášený → `Unauthenticated`, přihlášený bez role → `Unauthorized`, `authorities` → obrazovka.
   Tady se taky rozhodne § 4 (a ověří lazy chunk).
2. **Závislosti a `Crud` naprázdno.** `uu5codekitg01-forms` + `uu5tilesg02-controls` do
   `client/package.json`. Ověřit, co je v `public/libs` a co se opravdu stahuje — obojí bylo
   jinak, než dokument čekal (§ 4, § 5).
3. **Rezervace — server.** `listForAdmin` (filtr + `findPage`), `createManual`, `update`/`delete`
   s odmítnutím importovaných, `setState` + e-mail hostovi. Ověřit curlem včetně toho, že
   importovaný záznam opravdu nejde editovat.
4. **Rezervace — obrazovka.** `CrudContext` s vlastními `calls`, filtry (stav, zdroj, termín),
   formulář rezervace/blokace, akce *Potvrdit* / *Stornovat* přes `getItemActionList`.
5. **Recenze.** Kolekce, use casy, admin obrazovka, přepnutí veřejné sekce na `review/list`,
   smazání `content/reviews.js` a klíčů `reviews.*` z LSI. Ověřit, že nepřihlášený
   `review/list` nevidí `pending`.
6. **iCal feedy.** Kolekce, CRUD, `ical-import.js` na DB, `lastSync`, mazání feedu i jeho
   záznamů, `icalFeed/sync` pro tlačítko v adminu (cron dál volá `calendar/sync`). Ověřit spuštěním **dvakrát**,
   že nevznikly duplikáty a vlastní rezervace zůstaly nedotčené. Vyhodit `ICAL_FEED_*`.
7. **Deploy a zkouška naostro.** Přihlášení v produkci (cookie `secure`+`sameSite: strict`),
   deep link `/admin/reservations`, cron na `calendar/sync` dál funguje přes secret.

---

## 11. Rizika v2 a co v2 vědomě neřeší

| Riziko | Dopad | Jak s ním v2 zacházím |
|---|---|---|
| Lazy chunk se nerozdělí tak, jak čekám | veřejný web tahá `uu5tilesg02*` a Monaco | ověřit hned v etapě 1, ne až u deploye (§ 4); fallback je oprava `caio-devkit` a dva bundly |
| Ruční editace importovaného záznamu | změna tiše zmizí při příštím syncu | server ji odmítne, UI je jen odfiltruje (§ 6) |
| Smazání feedu bez úklidu | trvale obsazené termíny bez zdroje | mazání feedu maže i jeho rezervace, v dialogu je jejich počet (§ 8) |
| `review/list` prozradí `pending` recenze | na webu se ukáže neschválený text | `state` z dtoIn se čte, až když je jasné, že volá správce (§ 7) |
| Únik kontaktů hostů z adminu | osobní data | admin use casy mají `auth: ["authorities"]`; `clientIp` se nevrací nikdy, `contact` jen správci (§ 6) |
| +16 MB v deployi kvůli Monaco | pomalejší deploy | vědomá cena za `UiElements.Crud`; runtime dopad ~70 kB (§ 5) |
| Role se přiděluje ručně v Mongu | první správce se nezaloží sám | týká se jen prvního (§ 2); dalším stačí namountovat `Authentication.createApi()`, protože profil je `authorities` |

**Co v2 vědomě neřeší**, ačkoli to v1 dokumenty do v2 slibovaly:

- **Race condition při souběžných rezervacích** ([design-v1.md § 6](./design-v1.md#6-rezervace)).
  Unikátní index nad `{ propertyId, dateFrom }` nejde omezit na nezrušené záznamy
  (`partialFilterExpression` nezná `$ne` ani `$in`), takže by zablokoval i znovuobsazení
  zrušeného termínu; transakce vyžadují replica set, což lokální `mongod` není — nešlo by to
  otestovat jinde než na Atlasu. Zůstává tedy `pending` + potvrzení člověkem, které v2 poprvé
  dostává pořádné UI, takže je kolize aspoň **vidět**.
- **Kalendářový pohled na rezervace** ([design.md § 9](./design.md#9-frontend-routy)). Jádro je
  tabulka; kalendář je pohled navíc, který nepotřebuje žádnou změnu API — jde doplnit kdykoli
  později nad týmž `reservation/list`.
