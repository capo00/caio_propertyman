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

- **Předloha je one-page, appka bude mít routy** (2026-08-29). Lovable prototyp v `ux/`
  je jedna dlouhá stránka se scroll kotvami (`#galerie`, `#cenik`, …), zatímco
  [design-v1.md § 5](../design-v1.md#5-veřejný-web--obsah-natvrdo) předepisuje routy
  (`home`, `gallery`, `pricing`, …) a design.md je má i v cílovém stavu.
  Řešení: **`home` je celá one-page předloha** (všechny sekce pod sebou, kotvy fungují)
  a **každá sekce má navíc vlastní routu**, která renderuje tutéž komponentu sekce samostatně.
  Sekce jsou tedy komponenty v `components/sections/`, routy i home je jen skládají.
  Vizuál předlohy zůstane 1:1, routy z designu existují, a menu může odkazovat na kotvy
  i na routy podle toho, co se ukáže jako lepší.

- **Veřejný web se sází sémantickým HTML + `Config.Css.css()`, ne `Uu5Elements.Text`**
  (2026-08-29). `uu5g05-elements` je business design systém: `Uu5Elements.Text
  category="story" segment="heading"` vyrenderuje uu5 typografii, ne Fraunces, a `colorScheme`
  míchá barvy z GDS palety. Typografii ani spacing **nejde přebít žádným API** — jediné, co se
  přebít dá, je osm barevných „meanings" přes `UuGds.setMeaningColor`. Kdybychom vzhled předlohy
  cpali do `Uu5Elements`, bojujeme s knihovnou v každé komponentě.
  `Uu5Elements` se proto používá tam, kde dodává **chování**, ne vzhled: `Modal`, `AlertBus`,
  `Calendar`, `Pending`, a `uu5g05-forms` na rezervační formulář. Ty se přebarví
  `setMeaningColor("primary", "#315833")` v `main.jsx`.
  (Pro admin SPA ve v2 to bude naopak — tam je uu5 design systém výhoda a `UiElements.Crud`
  ušetří většinu práce.)

- **Layout si appka staví sama** (2026-08-29) — ne rozhodnutí, spíš daná věc:
  `caio-ui-app/exports.js` reexportuje jen `spa-provider`, `spa` a `with-route`.
  `UiApp.Top`/`UiApp.Page` v balíčku existují a README je popisuje, ale z barrelu nejsou
  dostupné a `package.json` nemá `exports` mapu. Nám to vyhovuje — předloha má vlastní
  hlavičku webu, ne aplikační top bar.

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
