# Implementační plán v1

Jak se `caio_propertyman` v1 postaví — krok za krokem, v pořadí, v jakém se to má dělat.

**Co tenhle dokument je:** postup a konkrétní kód/rozhodnutí na úrovni „tohle napsat do tohohle
souboru". **Co není:** zadání (to je [design-v1.md](../design-v1.md)) ani cílový stav
(to je [design.md](../design.md)). Když si plán a design odporují, vyhrává design — a tenhle
dokument se opraví.

Související: [wip.md](./wip.md) (co blokuje) · [decisions.md](./decisions.md) (co je rozhodnuto) ·
[ux-design-system.md](./ux-design-system.md) (jak to má vypadat).

> **Ověřeno proti zdrojákům `caio-architecture` 2026-08-29.** Všechna tvrzení o chování
> `caio-server`/`caio-devkit`/`caio-ui` níže jsou z aktuálních zdrojáků, ne z jejich README —
> kořenový `caio-architecture/README.md` má v „Known issues" tři ze čtyř bodů už neplatné.

---

## 0. Mapa etap

| Etapa | Co vznikne | Hotovo, když |
|---|---|---|
| ~~**0**~~ | prostředí, tarbally, Mongo | ✅ Node 24.19.0 LTS, npm 11.17.0, tarbally přebalené, Mongo běží |
| ~~**1**~~ | scaffold v existujícím repu | ✅ appka běží na `:8080`, build projde |
| ~~**2**~~ | kostra serveru, `sys/health` | ✅ `/sys/health` vrací `mongoConfigured: true` |
| ~~**3**~~ | `reservation` dao + crud | ✅ ověřeno proti Mongu (14 kontrol) |
| ~~**4**~~ | `availability/get`, `price/calculate`, `reservation/create` | ✅ ověřeno curlem včetně validací, kolize a honeypotu |
| ~~**5**~~ | email notifikace | ⚠️ napsáno, **neověřeno naostro** — chybí SMTP účet |
| ~~**6**~~ | iCal export + import | ✅ export i parser ověřeny; ⚠️ proti reálným feedům portálů neověřeno |
| ~~**7**~~ | FE: design systém + layout | ✅ ověřeno v prohlížeči; ⚠️ mobilní layout vizuálně neověřen |
| ~~**8**~~ | FE: obsah a statické sekce | ✅ všech 10 sekcí + routy, ověřeno v prohlížeči |
| **9** | FE: galerie | ⏳ mřížka a lightbox hotové, **chybí skutečné fotky** (placeholdery) |
| ~~**10**~~ | FE: rezervační UI | ✅ ověřeno v prohlížeči — formulář založil rezervaci v Mongu |
| **11** | deploy | běží na GAE, Cloud Scheduler volá sync |

Server jde **před** frontendem, protože rezervační UI (etapa 10) je jediná část FE se živými
daty a bez API se nedá dodělat. Etapy 7–9 by šlo dělat paralelně se serverem.

---

## Etapa 0 — prostředí

Nic z toho není kód, ale bez toho se nedá začít. Detaily a proč v [wip.md](./wip.md).

**0.1 Node 24.** *Hotovo 2026-08-30* — `winget install --id OpenJS.NodeJS.LTS` dalo
**24.19.0 + npm 11.17.0**, což přesně sedí na `runtime: nodejs24` v `app.yaml`.

> Instalace vyžaduje **UAC potvrzení**. Z neinteraktivní session se to zasekne na `consent.exe`
> a nic nenainstaluje — spouštět tak, aby šel dialog odkliknout.

> Nebrat „nejnovější" doslova: winget nabízí i Node 26, ale GAE runtime pro něj neexistuje,
> takže by rozdíl dev/prod jen otočil.

**0.2 Přebalit tarbally.** Tarbally v `caio-architecture/*/dist/` jsou **starší než zdrojáky** —
`caio-create-app-0.1.0.tgz` je z 25. 8., ale od té doby se změnily tři šablony
(`templates/client/package.json.ejs` — přibyl `uu5imagingg01`, `templates/root/.env*.ejs` —
přibyl `GCS_BUCKET_NAME`) a `uu5-loader.js`. Scaffold ze starého tarballu vygeneruje appku,
která neodpovídá devkitu.

```bash
cd caio-server  && npm install && npm run package
cd ../caio-ui   && npm install && npm pack --pack-destination dist
cd ../caio-devkit && npm install && npm pack -w caio-devkit -w caio-create-app --pack-destination dist
tar -tzf caio-devkit/dist/caio-create-app-0.1.0.tgz | grep templates | head
```

**0.3 Mongo.** Lokálně je `mongod 4.2.3` → dev jede na `mongodb://127.0.0.1:27017/caio-propertyman`.
Atlas je potřeba až pro produkci (etapa 11).

> **Past:** `caio-server` si k `MONGODB_URI` sám lepí `"?retryWrites=true&w=majority"`
> (`caio-server-dao/config/config.js`), takže **URI nesmí mít vlastní query string**. Atlas ho
> v „Connect" dialogu dává — všechno od `?` dál umazat.

---

## Etapa 1 — scaffold do existujícího repa

`caio-create-app` nemá argument cílové složky — běží v `process.cwd()`. V neprázdné složce jen
vypíše varování, nic neblokuje a `git init` nevolá, takže `.git` přežije. Repo má dnes jen
`design*.md`, `docs/` a `ux/` — **není co přepsat**.

```bash
cd caio_propertyman
npx --registry=https://repo.plus4u.net/repository/public-javascript/ \
    --package=../caio-architecture/caio-devkit/dist/caio-create-app-0.1.0.tgz caio-create-app
```

Odpovědi na tři prompty: `appName` = `caio_propertyman` (= jméno repa; z něj se odvodí
`client/package.json` `name` a tím i `OUTPUT_NAME`), `serverPort` = `8080`,
`clientPort` = `3000` (nepoužívá se, viz níže).

> **Tři pasti, každá ověřená naostro 2026-08-30:**
>
> 1. `npx <cesta-k-tarballu>` bez `--package=` na npm 10 **tiše neudělá nic** (exit 0, žádný
>    výstup). Musí to být `--package=` + jméno příkazu zvlášť.
> 2. **`--registry=…public-javascript/` je nutný.** Globální `~/.npmrc` míří na
>    `repo.plus4u.net/repository/plus4unet-sbx-npm` s auth tokenem, který vrací
>    **401 `Unable to authenticate`**. Repozitáře `caio-*` mají vlastní `.npmrc` na veřejný
>    mirror, proto jim `npm install` projde — ale npx si stahuje závislosti mimo ně
>    a spadne. (Scaffoldovaná appka dostane správný `.npmrc` sama.)
> 3. **`caio-create-app` nejde ovládat rourou.** Nemá žádné CLI přepínače a `prompts`
>    potřebuje TTY — `printf 'x\n8080\n3000\n' | …` nacpe úplně všechno do prvního pole
>    (vznikne `appName: "caio_propertyman8080300078"`). Buď se odpovědi vyplní ručně, nebo
>    se zavolá `copyTemplate` z `src/index.js` přímo a přeskočí se jen `getConfig()` —
>    zbytek scaffoldu je čisté kopírování šablon a čtyři `mkdir`.

**1.1 Závěrečné `npm install` selžou** (404 na `caio-server`/`caio-devkit`/`caio-ui` — nejsou
publikované). To je očekávané. Přepsat čtyři závislosti na tarbally a nainstalovat znovu:

```jsonc
// package.json
"dependencies":    { "caio-server": "file:../caio-architecture/caio-server/dist/caio-server-0.1.0.tgz" },
"devDependencies": { "caio-devkit": "file:../caio-architecture/caio-devkit/dist/caio-devkit-0.1.0.tgz",
                     "nodemon": "^3.1.14" }
```
```jsonc
// client/package.json
"dependencies":    { …, "caio-ui": "file:../../caio-architecture/caio-ui/dist/caio-ui-0.1.0.tgz" },
"devDependencies": { "vite": "^6.3.5",
                     "caio-devkit": "file:../../caio-architecture/caio-devkit/dist/caio-devkit-0.1.0.tgz" }
```

Cesty jsou relativní k `package.json`, ve kterém stojí — `caio_propertyman` i `caio-architecture`
jsou sourozenci ve `workspace/git/`, takže z rootu appky je to `../caio-architecture/…`
a z `client/` o úroveň víc.

Pak `npm install` v rootu a `cd client && npm install`.

> **Past při iteraci:** verze zůstává `0.1.0`, takže npm bere tarbally z cache. Když se
> v `caio-*` něco změní a přebalí, `npm install` to nemusí vzít — pak
> `tar -xzf … --strip-components=1` ručně do `node_modules/<pkg>/`.

**1.2 Uklidit po scaffoldu.**
- Smazat prázdné `server/api/`, `server/abl/`, `server/dao/` — jdeme dělením podle entity
  ([decisions.md](./decisions.md)).
- `README.md.ejs` vygeneroval dlouhé české README, které **obsahuje neplatnou informaci**
  o nutnosti předávat `publicPath` (opraveno v `caio-server@b328eef`). Přepsat na krátké README
  tohohle projektu s odkazy na `design.md` a `docs/`.
- Do `.gitignore` doplnit `/public/` už scaffold dává správně (s lomítkem — bez něj by git
  ignoroval i `client/public/`, kde budou fotky galerie).
- Doplnit `.env.development` o proměnné z [design-v1.md § 9](../design-v1.md#9-env-v1)
  (`ICAL_*`, `SMTP_*`, `OWNER_EMAIL`).

**1.3 Ověřit, že to jede.** *(Provedeno 2026-08-30 — výsledky níže.)*

```
npm run build                          → ✅ public/index.html + index.js, libs/ 41 MB, 23 knihoven
GET /sys/health                        → {}      (vestavěný vrací jen { version }, a to je
                                                  prázdné mimo npm skript → proto etapa 2.3)
GET /                                  → 200     SPA
GET /gallery                           → 200     deep link → SPA fallback funguje
GET /missing.png                       → 404     chybějící soubor s příponou nevrací index.html
GET /auth/config                       → 200     /auth/* je namountované automaticky
```

Build hlásí `not in node_modules, left out of the import map: uu_gdsg01`. **Je to neškodné** —
`uu_gdsg01` je deklarovaný external, který nikdo neinstaluje; skutečný GDS balíček
`uu_gdsg01-unicorn` (ten, co nese `UuGds.setMeaningColor`) v mapě **je**. Stejné hlášení má
i referenční `app-v1`.

Pak `npm run dev` a otevřít **`http://localhost:8080`** — tedy
**serverový port, ne 3000**. Devkit nespouští Vite dev server: klienta staví ve watch režimu
rovnou do `public/` a servíruje ho express, takže API i frontend jsou same-origin.
Důsledky, se kterými se počítá po celý zbytek plánu:
- **není HMR** — po uložení je nutný refresh,
- `VITE_PORT` / `clientPort` je mrtvá konfigurace,
- `Call` může volat relativní URI, není potřeba proxy ani CORS.

---

## Etapa 2 — kostra serveru

### 2.1 Struktura

Podle [design-v1.md § 3](../design-v1.md#3-struktura-v1), dělení podle entity:

```
server/
├── index.js
├── api.js
├── config.js               # konstanty v1 (kapacita, minNights, ceník, propertyId)
├── reservation/{dao,crud,api}.js
├── calendar/api.js
└── services/{ical-export,ical-import,availability,price,email}.js
```

### 2.2 `server/index.js`

```javascript
import { App } from "caio-server";
import api from "./api.js";

App.init({ api });   // publicPath se resolvuje z process.cwd() — nepředávat
```

### 2.3 `server/api.js` a vlastní `sys/health`

`Command.createCommands` staví mapu jako `{ "sys/health": …, ...api }`, takže **vlastní klíč
`sys/health` ten vestavěný přepíše**. Vestavěný vrací jen `{ version }` — a `npm_package_version`
je navíc naplněné jen při startu přes npm skript.

```javascript
import { readFileSync } from "fs";

// Verzi čteme z package.json, ne z process.env.npm_package_version -- ta proměnná existuje
// jen při startu přes npm skript, takže `node server/index.js` by hlásil undefined.
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

const sysApi = {
  "sys/health": {
    method: "get",
    fn: async () => ({
      version,
      env: process.env.NODE_ENV || "development",
      uptime: Math.round(process.uptime()),
      // Konfigurace se hlásí, ne testuje -- health musí odpovědět i když je Mongo dole,
      // aby šlo odlišit "server neběží" od "server běží, databáze ne".
      mongoConfigured: !!process.env.MONGODB_URI,
      icalConfigured: !!(process.env.ICAL_FEED_BOOKING || process.env.ICAL_FEED_ECHALUPY),
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.OWNER_EMAIL),
    }),
  },
};

export default {
  ...sysApi,
  // ...reservationApi,   (etapa 3-4)
  // ...calendarApi,      (etapa 6)
};
```

**Kontrola etapy 2** — *hotovo 2026-08-30:*

```
NODE_ENV=development → {"version":"0.1.0","env":"development","uptime":8,
                        "mongoConfigured":true,"icalConfigured":false,"smtpConfigured":false}
NODE_ENV=production  → {…,"env":"production","mongoConfigured":false,…}
```

Produkční `false` je správně — `.env` má `MONGODB_URI` zatím prázdné (doplní se v etapě 11).
Podstatné je, že se ty dva režimy **liší**, takže příznak něco měří a není natvrdo `true`.

### 2.4 Čtyři věci o frameworku, které tvarují všechen kód níž

Tohle nejsou zajímavosti — každá z nich mění, jak se píše use case.

1. **`validator` má rozbitou chybovou cestu.** Když validátor hodí výjimku,
   `getDtoIn` pošle 400 — ale **nezastaví se** a `fn` se stejně zavolá s nevalidním `dtoIn`.
   U `reservation/create` by to znamenalo, že se rezervace i tak zapíše, a následné `res.json()`
   spadne na `ERR_HTTP_HEADERS_SENT`.
   → **Validace patří na první řádky `fn`** a hlásí se
   `throw new AppError.Failed(msg, { status: 400, code: "…" })`. Pole `validator` používat
   nanejvýš na *přetypování* (jeho návratová hodnota nahradí `dtoIn`), nikdy na odmítnutí.

2. **`dtoIn` z GETu jsou stringy.** Query parametry se nepřetypovávají — jen hodnoty, které
   začínají `{` nebo `[`, se zkusí `JSON.parse`. `dateFrom`, `guestCount`, `pageSize` tedy
   přijdou jako text. → Přetypovat explicitně, nespoléhat na `==`.

3. **Bez `auth` je `identity` vždy `undefined`.** Autentizační middleware se připojí jen když
   je `auth` pravdivé. Ve v1 to nevadí (všechny use casy jsou veřejné), ale je to důvod, proč
   `calendar/sync` nemůže poznat volajícího a musí se chránit sdíleným secretem.

4. **Chyba se serializuje čistě jen když je `instanceof Error` z `caio-server`.** Cokoli jiného
   (včetně `DaoError`) skončí jako `500 { message: "Unexpected exception" }` a detail zůstane
   jen v logu.
   ```javascript
   import { Error as AppError } from "caio-server";   // stíní globální Error — vždy přejmenovat
   ```

---

## Etapa 3 — `reservation` dao + crud

### 3.1 `reservation/dao.js`

Kolekce `reservation`, indexy podle [design-v1.md § 4](../design-v1.md#4-datový-model-v1).

```javascript
import { Dao } from "caio-server";

class ReservationDao extends Dao {
  constructor() { super("reservation"); }

  createIndexes() {
    return Promise.all([
      super.createIndex({ dateFrom: 1, dateTo: 1 }),
      super.createIndex({ state: 1 }),
      // unikátní jen tam, kde icalFeedCode NENÍ null — jinak by unikátnost sahala
      // i na vlastní rezervace, které mají icalFeedCode: null všechny
      super.createIndex(
        { icalFeedCode: 1, icalUid: 1 },
        { unique: true, partialFilterExpression: { icalFeedCode: { $type: "string" } } },
      ),
    ]);
  }

  // Překrývající se termíny: existující.dateFrom < nový.dateTo && existující.dateTo > nový.dateFrom
  findOverlapping(dateFrom, dateTo) {
    return this.find({ state: { $ne: "cancelled" }, dateFrom: { $lt: dateTo }, dateTo: { $gt: dateFrom } });
  }

  findForExport() {
    return this.find({ icalFeedCode: null, state: { $ne: "cancelled" } });
  }

  findByFeed(icalFeedCode) { return this.find({ icalFeedCode }); }
}

export default new ReservationDao();
```

Co se dědí a nemusí se psát: `sys.cts`/`sys.mts` se doplňují samy, `sys` je v `create`
**rezervovaný klíč** (jinak `DaoError`), `_id` ⇄ `id` se převádí oběma směry, `find` má
default `pageSize: 1000`.

> `createIndexes()` se volá z konstruktoru **fire-and-forget**. Nikdy nespoléhat na to, že
> index existuje, když přijde první request — proto je kolizní kontrola v kódu (§ 4.3),
> ne jen v indexu.

> Dao vrací `id` jako **`ObjectId`**, ne string. Do JSON odpovědi to jde jako string, ale
> uvnitř serveru se to nesmí porovnávat `===` se stringem.

### 3.2 `reservation/crud.js`

```javascript
import { Crud, Error as AppError } from "caio-server";
import dao from "./dao.js";

class ReservationCrud extends Crud {
  constructor() { super("reservation", dao); }
  // business metody přijdou v etapě 4 a 6
}

export default new ReservationCrud();
```

`Crud` dává `list/get/create/createMany/update/delete/deleteMany` s chybovými kódy
`caio-server/reservation/<op>`. `_getData` odstraňuje `_id` — přebít, až bude potřeba schovat
`contact` z veřejných odpovědí.

**Kontrola etapy 3:** skript, který zavolá `dao.create({…})` a `dao.findOverlapping(…)`,
vrátí očekávané záznamy.

---

## Etapa 4 — veřejné API rezervací

Tři use casy z [design-v1.md § 6](../design-v1.md#6-rezervace). Všechny **bez `auth`**.

### 4.1 `server/config.js` — konstanty v1

Ceník, kapacita a `minNights` jsou ve v1 natvrdo. **Stejná čísla musí renderovat i stránka
ceníku** ([ux-design-system.md § 4](./ux-design-system.md#4-sekce-stránky-pořadí-podle-předlohy),
sekce 6) — proto jedno místo na serveru a jedno v `client/src/content/pricing.js`, a je potřeba
je držet v souladu. (Sjednocení přijde ve v2, až bude ceník v DB.)

**Sazba závisí na třech osách** (zadání z 2026-08-30):

1. **kanál** — `web` / `booking` (portál má jiný ceník, typicky vyšší kvůli provizi)
2. **počet osob** — do 5 včetně / 6 a víc
3. **délka pobytu** — čím víc nocí, tím nižší cena za noc

Tabulka je `rates[kanál][skupinaOsob][odKolikaNocí] = Kč za noc`. Hledá se **nejvyšší práh,
který je ≤ počtu nocí** — u tabulky `{1,3,5,7}` dostane pobyt na 4 noci sazbu z prahu 3.
Sazba je jednotná pro celý pobyt, odvozená od jeho celkové délky (počítat ji po nocích
by nedávalo smysl).

**Ceník není schválený** — `pricing.approved: false`. Viz [wip.md](./wip.md) pro tabulku
k doplnění a pro otevřenou otázku, k čemu přesně slouží `booking` sazby.

### 4.2 `services/price.js`

Cena se **vždy počítá na serveru**, hodnota z klienta se ignoruje. Používá ji
`price/calculate` i `reservation/create`, aby se nemohly rozejít.

Vstup `{ dateFrom, dateTo, guestCount, channel }` →
`{ nights, guestCount, channel, pricePerNight, totalPrice, provisional, breakdown }`.

**Pojistka proti smyšleným cenám:** `assertPricingApproved()` hodí v produkci 503, dokud je
`approved: false`. Ve vývoji se počítá dál (jinak by nešlo stavět frontend) a odpověď nese
`provisional: true`.

> **Pojistka musí být PRVNÍ řádek use casu, ne až u výpočtu ceny.** `reservation/create` se
> ptá do Monga dřív (rate limit), takže s pojistkou schovanou hlouběji vracel 500
> z nedostupné DB místo čistého 503 — ověřeno 2026-08-30.

### 4.3 `services/availability.js`

```javascript
import dao from "../reservation/dao.js";

// Jen obsazené intervaly — bez jmen, kontaktů a bez informace, odkud obsazenost je.
export async function getOccupied(dateFrom, dateTo) {
  const list = await dao.findOverlapping(dateFrom, dateTo);
  return list.map(({ dateFrom, dateTo }) => ({ dateFrom, dateTo }));
}

export async function isFree(dateFrom, dateTo) {
  return (await dao.findOverlapping(dateFrom, dateTo)).length === 0;
}
```

Jeden dotaz nad jednou kolekcí bez ohledu na `source` — proto obsazenost z portálů blokuje web
a naopak. To je celý důvod, proč jsou rezervace i importy v jedné kolekci.

### 4.4 `reservation/api.js`

```javascript
"availability/get":   { method: "get",  fn: … }   // { dateFrom, dateTo } → { occupiedList }
"price/calculate":    { method: "get",  fn: … }   // → { nights, totalPrice, breakdown }
"reservation/create": { method: "post", fn: … }   // → { id, state, nights, totalPrice }
```

`reservation/create` dělá v tomhle pořadí:
1. **validace na začátku `fn`** (viz § 2.4/1) — `dateFrom < dateTo`, `dateFrom` není v minulosti,
   `nights >= minNights`, `guestCount` v rozsahu, tvar emailu a telefonu, délka `note`.
   **Chybu házet s `paramMap` ve tvaru, kterému rozumí `uu5g05-forms`** — klient pak chybu
   ukáže u konkrétního pole bez další práce (viz etapa 10.2):
   ```javascript
   throw new AppError.Failed("Neplatný vstup", {
     status: 400,
     code: "caio-propertyman/reservation/invalidDtoIn",
     paramMap: { invalidValueKeyMap: { guestCount: true }, missingKeyMap: { email: true } },
   });
   ```
2. **honeypot** — skryté pole z formuláře; když je vyplněné, tvářit se úspěšně a nic nezapsat;
3. **kolizní kontrola** `isFree()` → jinak `409` `caio-propertyman/reservation/dateOccupied`;
4. **výpočet ceny** na serveru;
5. `dao.create({ …, state: "pending", source: "web", icalFeedCode: null,
   icalUid: "res-<id>@caio-propertyman" })`;
6. email (etapa 5) — **v try/catch**, selhání mailu nesmí shodit rezervaci.

**Anti-spam.** `reservation/create` je veřejný POST, který píše do DB. `express-rate-limit`
nejde přidat jako middleware po `App.init` — `App.init` už poslouchá a use casy jsou
zaregistrované. Buď rate limit **uvnitř `fn`** (počet záznamů z jedné IP za den dotazem nad
kolekcí), nebo obalit `fn` vlastní funkcí. Volím dotaz nad kolekcí — nepotřebuje stav v paměti
a přežije restart instance na GAE.

**Race condition.** Dvě současné žádosti o stejný termín obě projdou kolizní kontrolou.
Ve v1 to řeší kombinace `pending` + potvrzení člověkem; korektní řešení (transakce nebo lock)
je věc v2. `Dao` vystavuje `client`/`db` gettery, kdyby se to řešilo dřív.

**Kontrola etapy 4:** `curl` na `availability/get` a `reservation/create`; druhý pokus o stejný
termín vrátí 409.

---

## Etapa 5 — email notifikace

`services/email.js`, nodemailer + Google SMTP. Nová rezervace → mail vlastníkovi
(`OWNER_EMAIL`) a potvrzení hostovi, že žádost přijata a **čeká na potvrzení**.

Bez tohohle o rezervaci nikdo neví, protože v1 nemá admin. Odesílání vždy v `try/catch`
a zalogovat — nedoručený mail nesmí zneplatnit zapsanou rezervaci.

---

## Etapa 6 — iCal

Podle [design-v1.md § 7](../design-v1.md#7-ical-synchronizace). Tady se dá udělat nejvíc škody,
takže dvě pravidla nad všemi ostatními:

> **Export bere jen `icalFeedCode: null`.** Importované záznamy do feedu nepatří — portál by
> dostal zpátky své vlastní rezervace jako cizí blokace a přes dva portály by se to množilo.
>
> **Každý dotaz importu je filtrovaný na `icalFeedCode` toho jednoho feedu.** Bez toho mazací
> krok sáhne na vlastní rezervace z webu nebo na záznamy druhého portálu.

### 6.1 Export — `calendar/ical`

Není JSON, takže se odpověď posílá ručně a `fn` vrátí `false`:

```javascript
"calendar/ical": {
  method: "get",
  fn: async ({ res }) => {
    res.type("text/calendar").send(await IcalExport.build());
    return false;   // dtoOut === false → framework už neposílá JSON
  },
},
```

Jeden `VEVENT` na záznam: `UID` = `icalUid`, `DTSTART;VALUE=DATE`/`DTEND;VALUE=DATE`
(celodenní, `DTEND` exklusivně), neutrální `SUMMARY` („Obsazeno"). Feed je **veřejná URL bez
autorizace** — nesmí obsahovat žádná osobní data.

> Feed **musí** být use case, ne `app.get` přidaný po `App.init`. Cesta `/calendar/ical` nemá
> příponu, takže by ji spolkl catch-all `/*splat` a vrátil `index.html`.

### 6.2 Import — `calendar/sync`

Feedy z `.env` (`ICAL_FEED_BOOKING`, `ICAL_FEED_ECHALUPY`). Pro každý feed: stáhnout →
naparsovat → spárovat na `{ icalFeedCode, icalUid }` → create / update / delete.

- Z `VEVENT`u se bere **jen `UID` a termín**. `SUMMARY`/`DESCRIPTION` s osobními údaji hosta
  se zahazují — e-chalupy se musí brát ve variantě „s detaily" (jinak mění UID cizích
  rezervací), a ta ta osobní data nese.
- **Chyba jednoho feedu nesmí shodit druhý** — každý zpracovat samostatně, výsledek zalogovat.
- Idempotence: spustit 2× a ověřit, že nevznikly duplikáty.

**Ochrana:** `auth: ["owner"]` nejde (cron se nepřihlásí, a v1 stejně nemá přihlašování).
Sdílený secret `ICAL_SYNC_SECRET` v hlavičce nebo `X-Appengine-Cron`, kontrolovaný na začátku
`fn`.

**Kontrola etapy 6:** feed se načte v Booking extranetu; import spuštěný 2× nevytvoří duplikáty;
rezervace z webu zůstane po importu netknutá.

---

## Frontend — co je ověřené, než se začne psát

Referencí je `workspace/app-v1` (poslední změna 26. 8., tedy **po** přechodu na loader
architekturu) a knihovní kód `caio-ui`. Pět věcí, které určují, jak FE vypadá:

**F1. `UiApp.Top` ani `UiApp.Page` nejsou exportované.** `caio-ui-app/exports.js` reexportuje
jen `spa-provider`, `spa` a `with-route` — komponenty `Top`/`Page` v balíčku existují a README
je popisuje, ale z barrelu se k nim nedostaneš a `package.json` nemá `exports` mapu, takže ani
hluboký import není rozumný. **Header, footer a layout si appka staví sama** — což nám tady
vyhovuje, protože předloha má vlastní hlavičku, ne aplikační top bar.

**F2. Root barrel `import { UiApp } from "caio-ui"` funguje** (od 24. 8.). Není potřeba
importovat podmoduly.

**F3. Bootstrap je tříúrovňový a v appce se nemění:**
```jsx
<UiApp.SpaProvider languageList={["cs"]}>   {/* AppBackground → LanguageList → Language → Session → Route */}
  <UiApp.Spa>                                {/* ErrorBoundary → ModalBus → AlertBus */}
    <Router />
  </UiApp.Spa>
</UiApp.SpaProvider>
```
Routing je `useRouter(ROUTE_MAP)` z `uu5g05`, kde klíč = cesta a hodnota je element,
`{ redirect }` nebo `{ rewrite }`. Navigace `const [, setRoute] = useRoute(); setRoute("gallery")`.

**F4. Volání serveru je `UiElements.Call.cmdGet/cmdPost` s relativní URI.** Žádný base URL,
žádná proxy — dev i produkce jsou same-origin. Chyba ≥400 se hodí jako `Error` s `e.message`
a `e.dtoOut` (tam je `code`, `paramMap`).

**F5. `Uu5Elements` je business design systém, ne vzhled naší předlohy.** `Uu5Elements.Text
category="story" segment="heading"` vyrenderuje **uu5 typografii**, ne Fraunces — a `colorScheme`
míchá barvy z GDS palety, ne z naší.
→ **Rozhodnutí:** veřejný web se sází **sémantickým HTML (`<h1>`, `<p>`, `<section>`) stylovaným
přes `Config.Css.css()`**, ne přes `Uu5Elements.Text`. `Uu5Elements` se použije tam, kde dodává
chování, ne vzhled: `Modal` (lightbox galerie), `AlertBus` (výsledek odeslání formuláře),
`Calendar`, `Pending`, a `uu5g05-forms` pro rezervační formulář.
Zaznamenáno v [decisions.md](./decisions.md).

**F6. Barvy uu5 komponent se přebarvují `UuGds.setMeaningColor`.** Existuje API pro brand paletu —
z hexu si GDS odvodí všech 17 odstínů včetně hover stavů:

```jsx
// client/src/main.jsx — MUSÍ být před createRoot(...).render()
import Uu5Elements from "uu5g05-elements";
Uu5Elements.UuGds.setMeaningColor("primary", "#315833");   // forest/primary z předlohy
Uu5Elements.UuGds.setMeaningColor("secondary", "#AE794C"); // accent (terakota)
```

> **Není to reaktivní** — mutuje modulový stav. Zavolat před prvním renderem, jinak už
> vyrenderované komponenty barvu nepřepočítají.

Přebít jde jen osm „meanings" (`primary, secondary, dim, neutral, important, positive, warning,
negative`). **Typografie, spacing ani radius přes žádné API přebít nejdou** — proto F5.

---

## Etapa 7 — design systém a layout

### 7.1 `client/src/config/config.js`

`Config.Css.css()` je stylovací primitivum celého stacku (emotion pod kapotou) a řeší pořadí
stylů mezi načtenými knihovnami. Zkopírovat vzor z `caio-ui`, jen s vlastním `TAG`:

```javascript
import { Utils } from "uu5g05";
import theme from "./theme.js";

const TAG = "PropertyMan.";

export default {
  TAG,
  Css: Utils.Css.createCssModule(
    TAG.replace(/\.$/, "").toLowerCase().replace(/\./g, "-").replace(/[^a-z-]/g, ""),
    process.env.NAME + "/" + process.env.OUTPUT_NAME + "@" + process.env.VERSION,
  ),
  theme,
};
```

> `process.env.NAME` / `OUTPUT_NAME` / `VERSION` **dodává devkit** přes `define:` z
> `client/package.json`. Bez nich to v prohlížeči spadne na `process is not defined` — proto se
> `vite.config.js` nechává prázdný.

### 7.2 `client/src/config/theme.js` — tokeny z předlohy

Hodnoty jsou v [ux-design-system.md](./ux-design-system.md), tady jen dostanou jména. Jedno
místo, odkud čerpají všechny komponenty — žádné hexy roztroušené po JSX.

```javascript
export default {
  color: {
    bg: "#FBF9F0", cream: "#F9F5E8", forest: "#1E3E23", primary: "#315833",
    fg: "#1E2715", muted: "#F0EDE0", mutedFg: "#646553",
    accent: "#AE794C", border: "#DFDBCB", card: "#FFFDF9", onDark: "#FBF9F0",
  },
  font: {
    display: '"Fraunces", Georgia, serif',
    body: '"Karla", system-ui, sans-serif',
  },
  text: {
    h1: { fontSize: 60, lineHeight: "63px", fontWeight: 600, letterSpacing: "-0.015em" },
    h2: { fontSize: 36, lineHeight: "40px", fontWeight: 600, letterSpacing: "-0.015em" },
    h3: { fontSize: 20, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.012em" },
    body: { fontSize: 16, lineHeight: 1.6 },
    eyebrow: { fontSize: 11, lineHeight: "16.5px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase" },
  },
  radius: 8,
  sectionPad: { xs: 48, m: 72, l: 96 },
  maxWidth: 1140,
};
```

`h1: 60px` je desktopová hodnota — responzivně se zmenšuje (viz 7.4).

### 7.3 Fonty

Fraunces ani Karla nejsou systémové. **Lokálně, ne z Google Fonts CDN**: appka běží na GAE,
third-party request na fonty je zbytečná latence i cookie/GDPR téma, a offline/PWA režim by
o sazbu přišel.

1. `.woff2` (Fraunces 600 + Karla 400/700, latin-ext kvůli češtině) do
   `client/public/assets/fonts/` — `client/public/` se kopíruje do buildu 1:1.
2. `client/src/fonts.css` s `@font-face` (`font-display: swap`), importované z `main.jsx`.
   Vite ho vyemituje do `public/assets/<jméno>-<hash>.css`.
3. **Přebít globální pravidlo uu5.** `uu5g05` injektuje `html { font-family: Roboto, ClearSans,
   sans-serif; line-height: 1.2 }` jako emotion global. Žádný token pro UI font neexistuje —
   jediná cesta je vlastní global se **stejným nebo pozdějším `owner`** pořadím:
   ```javascript
   Config.Css.injectGlobal({ html: { fontFamily: theme.font.body, lineHeight: 1.6 } });
   ```

> **Past:** Fraunces je variabilní font s osami `SOFT`/`WONK`. Stačí statická instance, ale
> musí to být **váha 600** — v 400 nadpisy zeslábnou a vzhled se rozpadne.

### 7.4 Layout komponenty

Do `client/src/components/layout/`:

| Komponenta | Co dělá |
|---|---|
| `section.jsx` | obal sekce: `variant` (`bg` \| `cream` \| `forest`), vertikální padding podle `useScreenSize()`, vnitřní kontejner `maxWidth` + boční padding |
| `eyebrow.jsx` | prostrkaný `uppercase` štítek — nejvýraznější prvek rytmu předlohy |
| `heading.jsx` | `<h1>`–`<h3>` s Fraunces a záporným prostrkáním |
| `button.jsx` | plné (`forest` podklad) a outline varianty; `as="a"` pro odkazy |
| `card.jsx` | 1px `border`, podklad `card`, radius 8, **bez stínu** |
| `header.jsx` | sticky lišta: nad hero průhledná se světlým textem, po odscrollování krémová s tmavým; logo dlaždice + navigace + tlačítko *Rezervovat*; na mobilu burger |
| `footer.jsx` | `forest` pruh, název vlevo, copyright vpravo |

Responzivita přes `useScreenSize()` z `uu5g05` (`"xs" | "s" | "m" | "l" | "xl"`) — stejně to
dělá `caio-ui` v `page.jsx`. Na media queries uvnitř jednoho `css()` objektu je
`Utils.Style.getMinMediaQueries(screenSize, styles)`. Zlomy: **XS 480 · S 768 · M 992 · L 1360**.

**Čtyři pasti `Config.Css.css()`, které stojí za to znát dopředu:**

- **Styly se automaticky převádějí na logické vlastnosti.** `left` → `insetInlineStart`,
  `paddingLeft` → `paddingInlineStart`, `borderTopLeftRadius` → `borderStartStartRadius`,
  `textAlign: "left"` → `"start"`, víc­dílné `padding`/`margin` zkratky se rozloží.
  → Psát logické vlastnosti rovnou, ať se výsledek nechová překvapivě.
- **`useSpacing()` má obrácené aliasy** — `spaceA === d` a `spaceD === a`. Používat prosté
  klíče `a`/`b`/`c`/`d`.
- **z-index:** uu5 má `modal: 1000`, `alert: 2000`, `popover: 990`. **Sticky header musí zůstat
  pod 990**, jinak překryje otevřený popover.
- Druhý argument `createCssModule` je `owner` (atribut `data-owner` na `<style>`), ne pořadový
  klíč — drží sheets jedné knihovny pohromadě.

**Kontrola etapy 7** — *hotovo 2026-08-30, ověřeno v prohlížeči na `/home`:*

- Fraunces 600 i Karla se načítají z `/assets/fonts/` (`font/woff2`, 4 soubory, ~104 kB)
- diakritika sedí (`latin-ext` subset) — kontrolní věta „Příšerně řeřavý žluťoučký kůň…“
- barvy, prostrkané eyebrow štítky, karty bez stínu i zvýrazněná karta s pilulkou odpovídají `ux/`
- lišta se při scrollu překlápí z průhledné do krémové

> **Past, na kterou jsem narazil: průhledná lišta musí být `position: fixed`, ne `sticky`.**
> Se `sticky` se lišta nad hero *skládá*, ne *překrývá* — takže leží na podkladu stránky
> a světlý text na krému úplně zmizí (název i celá navigace byly neviditelné).
> `fixed` ale vypadává z toku, takže obsah je nutné odsadit ručně: `page.jsx` přidává
> `paddingBlockStart: HEADER_HEIGHT` všude, kde lišta průhledná není, a hero si odsazení
> řeší samo přes `padTop`, aby fotka byla vidět i za lištou.

---

## Etapa 8 — obsah a statické sekce

### 8.1 `client/src/content/*.js`

Pravidla z [design-v1.md § 5](../design-v1.md#5-veřejný-web--obsah-natvrdo): všechen text
a strukturovaná data jako **exportované konstanty ve tvaru budoucích entit**, nikdy inline
v JSX. Texty jako LSI objekty (`{ cs: "…" }`), i když se renderuje jen `cs` — přidání jazyka
je pak doplnění klíče, ne refaktor.

Soubory: `property.js` (název, adresa, kapacita, GPS, statistiky do hero pruhu) ·
`amenities.js` · `gallery.js` · `pricing.js` · `reviews.js` · `attractions.js` · `faq.js` ·
`contact.js` · `reservationTerms.js`.

Tvar drží [design.md § 6](../design.md#6-datový-model-mongodb), aby výměna za `Call.cmdGet`
ve v3 byla náhrada importu, ne přepsání stránky:

```javascript
// content/faq.js
export default [
  { question: { cs: "Kdy je check-in a check-out?" },
    answer: { cs: "Příjezd od 15:00, odjezd do 10:00. Jiný čas rádi domluvíme." }, order: 10 },
  // …
];

// content/attractions.js  — pozor na `distanceKm`, ne "4 km" jako text
export default [
  { title: { cs: "Hrad Kost" }, description: { cs: "Jeden z nejzachovalejších gotických hradů v Čechách." },
    category: "culture", distanceKm: 4, order: 10 },
];
```

> **Ceník je na dvou místech** — `client/src/content/pricing.js` (co se zobrazí) a
> `server/config.js` (podle čeho se počítá cena). Musí se shodovat. Sjednotí se ve v2, až bude
> ceník v DB; do té doby to je poznámka v obou souborech.

### 8.2 Sekce a routy

Sekce jsou komponenty v `components/sections/` — jedna na každý řádek tabulky v
[ux-design-system.md § 4](./ux-design-system.md#4-sekce-stránky-pořadí-podle-předlohy):
`hero` · `stats` · `about` · `gallery` · `pricing` · `reservation` · `reviews` ·
`surroundings` · `faq` · `contact`.

Podle [decisions.md](./decisions.md): **`home` skládá všechny sekce pod sebe** (= předloha 1:1,
kotvy `#galerie`, `#cenik` fungují) a **každá sekce má navíc vlastní routu**, která renderuje
tutéž komponentu samostatně. Sekce tedy nesmí být závislá na tom, co je nad ní.

```jsx
// client/src/router.jsx
const ROUTE_MAP = {
  "": { redirect: "home" },
  home: <Home />,
  about: <About />, gallery: <Gallery />, pricing: <Pricing />,
  reservation: <Reservation />, reviews: <Reviews />,
  surroundings: <Surroundings />, faq: <Faq />, contact: <Contact />,
  "*": <NotFound />,
};
```

Routy `news` (aktuality) design-v1 zmiňuje — ve v1 zůstane prázdná/skrytá, dokud není obsah.

**FAQ accordion:** ověřit, jestli `uu5g05-elements` má použitelnou komponentu; pokud ne, je to
~20 řádků vlastního kódu se `useState`. Nesázet na to, že existuje, dokud se to neuvidí.

**Kontrola etapy 8** — *hotovo 2026-08-30, ověřeno v prohlížeči:* všech 10 sekcí na `home`
odpovídá screenshotům `01`–`08`, každá má i vlastní routu, FAQ accordion se rozbaluje,
lightbox galerie se otevírá.

> **Past: menu se musí umět chovat dvěma způsoby.** Na `home` jsou sekce pod sebou, takže
> menu scrolluje na kotvy (`#galerie`). Na samostatné routě (`/pricing`) ta kotva na stránce
> **neexistuje** a odkaz nedělá vůbec nic. Položky menu proto nesou **kotvu i routu**
> (`{ anchor, route }`) a `Header` i `Button` podle aktuální routy vyberou správný cíl.
> Týká se to i tlačítek uvnitř sekcí („Rezervovat“, „Prohlédnout galerii“) — proto to umí
> přímo `Button` přes dvojici props `anchor` + `route`, ne každé volání zvlášť.

> **Past: `Section` potřebuje `inlineSize: 100%` na vnitřním kontejneru.** Hero si nastavuje
> `display: flex` (svislé vycentrování), čímž se z kontejneru stane flex položka — a ta se
> bez explicitní šířky smrskne na obsah, takže se hero vycentrovalo místo zarovnání vlevo.

---

## Etapa 9 — galerie

Fotky se v v1 **nenahrávají** — jsou v gitu jako zmenšené WebP a nasazují se s appkou.

**Cesta:** `client/public/assets/gallery/*.webp` → build → `public/assets/gallery/…` →
`express.static(publicPath)` → veřejná URL `/assets/gallery/<soubor>.webp`.

Před commitem zmenšit (strop ~2000 px na delší straně) a uložit jako WebP — jdou do gitu
i do každého deploye.

Seznam je konstanta `content/gallery.js` ve tvaru budoucí entity
(`{ src, caption: { cs }, order }`). Stránka renderuje mřížku s lightboxem
(`Uu5Elements.Modal`).

**Tři věci, které to tiše rozbijí:**

- **`.gitignore` musí mít `/public/` s lomítkem.** Bez lomítka git matchuje `public/`
  v jakékoli úrovni — tedy i `client/public/`, a fotky by se nedostaly do gitu ani do deploye.
  Scaffold to má správně, jen to nepokazit při úpravě.
- **Nedávat fotky do root `public/`.** Je to build output — devkit z něj na začátku každého
  buildu maže všechno kromě `libs/`. Zdroj je vždy `client/public/`.
- **Nenastavovat `build.assetsDir`** ve `vite.config.js`. Devkit nastavuje
  `rollupOptions.output.assetFileNames`, které má nad `assetsDir` přednost, takže by se to
  tiše ignorovalo. Hashované assety jdou do `public/assets/<jméno>-<hash>.<ext>`, fotky do
  `public/assets/gallery/` — sdílejí složku, ale ne jména, takže to funguje.

`UiElements.Image` v1 potřeba není (`referrerPolicy="no-referrer"` řeší cizí zdroje, ne naši
statiku) — stačí `<img>`.

**Kontrola etapy 9:** po `npm run build` jsou fotky v `public/assets/gallery/` a dostupné na
`/assets/gallery/…`. Ověřit i po deployi — chybějící soubor teď vrací 404, ne tiše `index.html`.

---

## Etapa 10 — rezervační UI

Jediná část FE se živými daty. Komponenty do `components/reservation/`.

### 10.1 Kalendář obsazenosti

Nad `availability/get`, který vrací **jen obsazené intervaly** — bez jmen, kontaktů a bez
informace, odkud obsazenost je.

```javascript
const { occupiedList } = await UiElements.Call.cmdGet("availability/get", { dateFrom, dateTo });
```

Vykreslit měsíční mřížku s obsazenými dny jako neklikatelné. Pozor: `dateTo` je **exklusivní**
(den odjezdu), takže den odjezdu jedné rezervace je zároveň možný den příjezdu další.

**Použitá komponenta: `Uu5Calendar.SimpleCalendar` z `uu5calendarg01`** (zadání z 2026-08-30).
Balíček je v registry (`2.9.1`), do import mapy se přidá sám a `uuBuildSettings.externals`
má prázdné — `react-big-calendar` si nese zabundlovaný, takže loaderu nic nechybí.

Exportuje `BigCalendar`, `SimpleCalendar`, `Scheduler`, `DatePicker`, `ViewButton`, `Timeline`.
`SimpleCalendar` je ta správná: měsíční pohled a hlavně **`renderDayIndicator`**, kterému
přijde `Utils.Event({ date })` s JS datem a vrácený uzel se vykreslí pod číslo dne — tam
patří tečka obsazenosti.

> **`SimpleCalendar` neumí přepínat měsíce.** Nemá žádné šipky ani hlavičku s názvem měsíce,
> takže bez vlastní navigace by host viděl jen aktuální měsíc a na příští sezónu se nedostal.
> Hlavička s `‹ Srpen 2026 ›` je proto vlastní, nad komponentou.

### 10.2 Formulář

`uu5g05-forms` — `Form.Provider` / `Form.View` s `gridLayout` / `SubmitButton`. Pole podle
předlohy (screenshot `04-rezervace`): Příjezd, Odjezd, Jméno a příjmení, Počet osob, E-mail,
Telefon, Poznámka.

```jsx
<Uu5Forms.Form.Provider
  onSubmit={(e) => UiElements.Call.cmdPost("reservation/create", e.data.value)}
  onSubmitted={(e) => setConfirmation(e.data.submitResult)}   // NE onSubmitSuccess — ten neexistuje
>
  <Uu5Forms.Form.View gridLayout={{ xs: "stay, name, guestCount, email, phone, note",
                                    s: "stay stay, name guestCount, email phone, note note" }}>
    <Uu5Forms.FormDateRange
      name="stay" label={{ cs: "Termín pobytu" }} required
      min={today} step={2}                                     // step = minimální počet nocí
      onValidate={async (e) => { /* dotaz na availability/get */ }}
    />
    <Uu5Forms.FormNumber name="guestCount" label={{ cs: "Počet osob" }} min={1} max={8} required />
    <Uu5Forms.FormEmail name="email" label={{ cs: "E-mail" }} required />
    <Uu5Forms.FormText
      name="phone" label={{ cs: "Telefon" }}
      pattern="^\+?[0-9 ]{9,}$"                                 // pattern SE MUSÍ ukotvit sám
      inputAttrs={{ type: "tel", inputMode: "tel", autoComplete: "tel" }}
    />
    <Uu5Forms.FormTextArea name="note" label={{ cs: "Poznámka" }} />
  </Uu5Forms.Form.View>
  <Uu5Forms.SubmitButton>Odeslat poptávku</Uu5Forms.SubmitButton>
</Uu5Forms.Form.Provider>
```

`gridLayout` gramatika: čárka = nový řádek, mezera = sloupce v řádku, `.` = prázdná buňka,
opakované jméno = colspan. `Form.View` klonuje každé dítě s `name` a přiřadí mu `gridArea`.

**Šest věcí, které se u tohohle formuláře snadno zkazí:**

- **`FormPhone` neexistuje.** Telefon je `FormText` s `pattern` + `inputAttrs` (viz výše).
- **`pattern` se nekotví automaticky** jako v HTML — uu5 dělá `value.match(pattern)`, takže
  `^…$` je na nás. Bez toho projde `abc+420777123456xyz`.
- **`FormEmail` má vlastní regex** — nepřidávat k němu `pattern`.
- **`FormDateRange` vrací během výběru `[from, undefined]`** — ošetřit. Na blur si pár sám
  seřadí, takže obrácený rozsah nepřijde.
- **`step` je páka na minimální počet nocí** (`step={2}` = jen sudé délky? ne — validuje
  `daysDiff % step === 0`, takže na „aspoň 2 noci" je potřeba vlastní `onValidate`, `step`
  se hodí na „jen celé týdny"). Ověřit chování, než se na to spolehne.
- **`Form.Provider` se věší na `useRouteLeave`** — rozdělaný formulář vyvolá potvrzovací dialog
  při odchodu ze stránky. Buď je to žádoucí, nebo `disableLeaveConfirmation`.

**Chyby ze serveru se mapují na pole samy.** `setErrorToInputs` čte `error.paramMap` (klíče
`missingKeyMap`, `invalidTypeKeyMap`, `invalidValueKeyMap`, `invalidKeyMap`) a nastaví chybu
konkrétnímu inputu. `caio-server` `Error` `paramMap` nese → **validační chyby v `fn`
(etapa 4.4) házet s `paramMap` v tomhle tvaru** a klient je zobrazí u správného pole zadarmo.

Validace běží **on blur a on submit**, ne při psaní (`validateOnChange` je `false`).

> Formulář je vizuálně **karta na `forest` podkladu** — uu5 inputy se budou muset dostylovat
> přes `Config.Css.css()` na obalu, aby ladily s předlohou. Tohle je nejpravděpodobnější místo,
> kde se uu5 design systém pobije s předlohou; když to bude bolet víc než pomáhat, formulář
> se napíše ručně (validace je stejně na serveru).

**Honeypot:** skryté pole, které člověk nevyplní. Musí být opravdu skryté (ne `type="hidden"`,
ale mimo viewport + `aria-hidden` + `tabIndex={-1}`).

### 10.3 Přepočet ceny a stavy

Při změně termínu nebo počtu osob zavolat `price/calculate` a zobrazit cenu. **Zobrazená cena
je informativní** — server ji při `reservation/create` počítá znovu a hodnotu z klienta ignoruje.

Stavy, které musí UI umět:
- **úspěch** → potvrzení, že žádost je přijatá a **čeká na potvrzení vlastníkem** (rezervace
  vzniká jako `pending`, viz [design-v1.md § 6](../design-v1.md#6-rezervace)) — nesmí to
  vypadat jako závazně potvrzený termín,
- **obsazeno** (409 `…/dateOccupied`) → nabídnout jiný termín, obnovit kalendář,
- **chyba validace** (400) → zvýraznit pole,
- **chyba sítě/serveru** → obecná hláška přes `Uu5Elements.useAlertBus()`.

**Kontrola etapy 10** — *hotovo 2026-08-30, proklikáno v prohlížeči:* vyplněný formulář
(15.–19. 9. 2026, 4 osoby) založil rezervaci, cena 14 400 Kč se dopočítala průběžně,
potvrzení jasně říká „Termín zatím není závazně potvrzený“ a záznam je v Mongu.
Tečky obsazenosti v kalendáři sedí na dny 31. 8.–3. 9. a **ne** na 4. 9. — den odjezdu
je zase volný.

> **`Form.Provider` vyvolává nativní dialog „Opustit stránku?“.** Věší se sám na
> `useRouteLeave`, takže rozdělaný formulář hlídá odchod ze stránky — i klik na „Galerie“
> v menu. V interní aplikaci to dává smysl, na veřejném webu to hosta jen vyděsí.
> Řeší to prop **`disableLeaveConfirmation`**.
> (Při ladění se to projeví jako „zamrzlý prohlížeč“ — nativní dialog zablokuje renderer
> i screenshoty, takže to vypadá na nekonečnou smyčku v kódu.)

> **Bílá karta uvnitř `forest` sekce si musí přepsat `color`.** Sekce nastavuje světlý text
> a karta dědí — takže nadpis, který si barvu neurčí sám, je krémový na bílé a prakticky
> neviditelný. Nastavit `color: theme.color.fg` na kartě, ne na jednotlivých prvcích.

> **Picker `FormDateRange` nemá `role="dialog"`** a nerenderuje textový input, dokud ho
> nezafokusuješ — je to `span[role="button"]`, který teprve po kliknutí odkryje masku
> `DD.MM.RRRR - DD.MM.RRRR`. Pro automatizované proklikání je spolehlivější do masky psát
> než klikat na dny (popover se mezi kliky posouvá).

---

## Etapa 11 — deploy

1. Atlas cluster, `MONGODB_URI` **bez query stringu** (§ 0.3) do `.env`.
2. `gcloud auth login && gcloud config set project <id>` — `caio-devkit deploy` volá
   `gcloud app deploy` bez argumentů.
3. `npm run deploy` (= build do `public/` + `gcloud app deploy`).
   `.gcloudignore` vylučuje `client/` a `node_modules/`, ale **`.env` nahrává** — tam je
   produkční konfigurace.
4. Cloud Scheduler → `POST /calendar/sync` s hlavičkou se secretem, perioda 15–30 min.
5. Zadat náš feed do Booking extranetu a `klient.e-chalupy.cz/obsazenost-import/`.
6. Ověřit na produkci: statika, deep linky, fotky galerie, `sys/health`.

**Zkouška naostro:** rezervace z webu se objeví v Booking i e-chalupy kalendáři; obsazenost
z obou portálů zablokuje termín na webu.

---

## Rizika a jak se hlídají

| Riziko | Kde se řeší |
|---|---|
| `validator` nezastaví `fn` → zapsaná nevalidní rezervace | § 2.4/1 — validace v `fn` |
| Import nefiltrovaný na `icalFeedCode` smaže vlastní rezervace | § 6 — pravidlo nahoře |
| Špatná varianta e-chalupového exportu → falešné rezervace | § 6.2 — varianta „s detaily" |
| Prodleva iCalu → overbooking | rezervace jsou `pending`, potvrzuje člověk |
| Race condition dvou současných rezervací | § 4.4 — vědomě odloženo do v2 |
| Veřejný `reservation/create` → spam | § 4.4 — honeypot + rate limit dotazem |
| Veřejný iCal feed → únik dat hostů | § 6.1 — jen termín a neutrální `SUMMARY` |
| Fotky galerie se nedostanou do gitu | `/public/` v `.gitignore` **s lomítkem** (§ 1.2) |
| Bez adminu vlastník o rezervaci neví | etapa 5 — email |
| uu5 design systém přebije vzhled předlohy | F5 — vlastní HTML + `Config.Css`, uu5 jen na chování |
| Nezakotvený `pattern` propustí nesmysl | § 10.2 — `^…$` psát ručně |
| `setMeaningColor` zavolaný pozdě neudělá nic | F6 — před `createRoot().render()` |
| Fonty se nenačtou → sazba spadne na Georgia | § 7.3 — lokální `.woff2` + `injectGlobal` |
| Stará šablona ze zastaralého tarballu | § 0.2 — přebalit před scaffoldem |
| Dev na Node 20, produkce na 24 | § 0.1 — nainstalovat Node 24 |
