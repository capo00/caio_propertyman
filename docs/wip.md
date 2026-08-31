# Rozdělané věci / backlog

Živý seznam — položky mažu, jak se vyřeší (výsledek jde do [decisions.md](./decisions.md)
nebo do příslušného dokumentu), přidávám nové, jak vzniknou.
Formát je schválně stejný jako `caio-devkit/docs/wip.md`.

---

## Kde jsme skončili (2026-08-30)

**Hotovo: etapy 0–8 a 10.** Zbývá **9** (galerie — čeká na fotky) a **11** (deploy).
Podrobnosti u každé etapy v [impl-plan-v1.md](./impl-plan-v1.md), tabulka nahoře má stav.

Appka běží: `npm run dev` → **http://localhost:8080** (serverový port, ne 3000; není HMR).

**Co existuje:**

- **Server** (~900 řádků, 13 souborů): `reservation` dao/crud/api, `availability/get`,
  `price/calculate`, `reservation/create` s honeypotem a rate limitem, e-mailové notifikace,
  iCal export i import. Ověřeno proti Mongu a curlem.
- **Frontend**: designový systém z předlohy (Fraunces + Karla lokálně), 10 sekcí,
  routy, galerie s lightboxem, rezervační formulář + kalendář obsazenosti nad
  `uu5calendarg01`. Ověřeno proklikáním v prohlížeči — formulář opravdu založí rezervaci.

**První věc zítra:** rozhodnout, jestli jít na **etapu 11 (deploy)**, nebo počkat na
ceník a fotky. Deploy jde udělat i s placeholdery — server v produkci cenu stejně
odmítne spočítat, dokud není `pricing.approved: true`, takže by šlo o nasazení
„výkladní skříně" bez funkčních rezervací.

**Past, na kterou jsem narazil při vývoji:** testovací servery spuštěné na pozadí
přežívají ukončení nadřazeného příkazu a drží port 8080, takže další `npm run dev`
spadne na `EADDRINUSE`. Když se to stane: `netstat -ano | findstr :8080` a zabít ten PID.

---

## Otevřené

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
(rozhodnuto 2026-08-30). Struktura sekcí na to je připravená, obsah se vymění v
`client/src/content/*.js` — každý soubor má nahoře `TODO OBSAH` s tím, co je v něm smyšlené.

**Nejcitlivější položky** (tyhle nesmí jít na produkci tak, jak jsou):

- `contact.js` — telefon `+420 777 123 456` a e-mail jsou vymyšlené; mohly by patřit někomu jinému
- `reviews.js` — čtyři „recenze“ od neexistujících hostů
- `property.js` — adresa Libošovice 74 a GPS souřadnice
- `faq.js` — odpovědi o storno podmínkách a záloze jsou závazné údaje, musí je potvrdit vlastník

**Fotky:** `gallery.js` má u všech položek `src: null`, což `components/photo.jsx` vykreslí
jako tónovanou plochu s popiskem. Až budou skutečné fotky: zmenšit na ~2000 px, uložit jako
`.webp` do `client/public/assets/gallery/` a doplnit `src`. Nic jiného se nemění.

## Neblokující, ale ověřit

- **`NODE_ENV=production` nejde otestovat proti lokálnímu Mongu.** `caio-server` si
  v produkci k URI přilepí `ssl=true` (`src/caio-server-dao/config/config.js`), takže
  lokální `mongod` bez TLS spadne na `ECONNRESET` (ověřeno 2026-08-30). Produkční build
  jde lokálně proklepat jen s Atlasem, nebo dočasně přes `NODE_ENV=development`.

- **`design.md` říká Google Drive pro `BinaryStore`, `caio-server` mezitím přešel na GCS**
  (`GCS_BUCKET_NAME`, `caio-devkit/docs/how-to-set-gcs.md`, commity z 26. 8.).
  v1 `BinaryStore` nepoužívá (galerie je statická), takže to nic neblokuje — ale
  `design.md § 2/§ 8` je v tomhle bodě neaktuální a před v2 se musí přepsat.
- **Mobilní layout není vizuálně ověřený.** Burger menu i responzivní varianty jsou
  napsané, ale Chrome má okno maximalizované a `resize_window` na něj nemá vliv
  (nástroj hlásí úspěch, `window.innerWidth` zůstává 1536). Až se okno půjde zmenšit —
  nebo v DevTools device módu — projít: burger, rozbalené menu, zmenšené nadpisy
  (`theme.textMobile`), patičku pod sebou.
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
- **`caio-ui` je z velké části česky natvrdo** (tlačítka a dialogy `Crud`, tooltipy `Top`).
  Pro v1 (jen `cs`) je to jedno, pro budoucí multijazyčnost ne.
- **GCP projekt s povoleným App Engine** — `gcloud` CLI je nainstalované (582.0.0),
  projekt zatím neověřen.
