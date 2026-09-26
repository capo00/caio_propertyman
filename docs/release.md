# Vydání do produkce

Co je potřeba udělat, než appka půjde na App Engine, a v jakém pořadí. Stav k **2026-09-25**.

Kód je připravený: appka běží proti **vydanému** stacku (`caio-server` 0.2.2, `caio-ui` 0.2.3,
`caio-devkit` 0.3.0), produkční build prochází a API i admin byly proti téhle trojici ověřené
lokálně. Co zbývá, je **konfigurace, obsah a jedno nevydané vydání devkitu** — ne kód appky.

---

## 1. Prerekvizity

Bez těchhle věcí deploy buď spadne, nebo nasadí web, který se hostovi neumí ukázat celý.

### 1.1 Vydat `caio-devkit` 0.3.1 — **blokující**

V klonu `caio-architecture/caio-devkit` leží nevydané opravy (`docs/release-candidate.md`),
z toho jedna je pro tenhle deploy zásadní: Node.js buildpack na Cloud Buildu spouští
`npm run build`, pokud ten script v `package.json` existuje — a to je v caio appce
`caio-devkit build`, tedy vite build v `client/`. Jenže `client/` je v `.gcloudignore`,
takže krok spadne na chybějící adresář a **deploy skončí na `step exited with non-zero
status: 51`**. Devkit 0.3.1 proto při deployi dopisuje do `app.yaml` i
`GOOGLE_NODE_RUN_SCRIPTS: ""`. S 0.3.0 se appka nenasadí.

Verze v `package.json` obou workspace balíčků je už zvednutá na 0.3.1, takže stačí spustit
release cyklus (`caio-devkit/docs/deploy.md`) — potřebuje GitHub PAT se `write:packages`
a `repo`:

```bash
cd ../caio-architecture/caio-devkit
npm run deploy
```

Pak v appce:

```bash
npm install            # caret ^0.3.0 si 0.3.1 vezme sám
cd client && npm install && cd ..
```

Obcházet to ručním dopsáním `GOOGLE_NODE_RUN_SCRIPTS` do `app.yaml` nemá smysl — oprava
v knihovně existuje, jen není publikovaná.

### 1.2 GCP projekt a `caio.deploy.project`

`caio-devkit` 0.3.0 bere cíl deploye **jen** z `package.json` appky, fallback na
`gcloud config get-value project` schválně nemá (jinak by nasazení do cizího projektu
zároveň uložilo `NPM_TOKEN` do jeho staging bucketu). Pole je založené, ale prázdné:

```jsonc
"caio": { "deploy": { "project": "", "keepVersions": 3 } }
```

Doplň id projektu. Projekt musí existovat, musí v něm být **založená App Engine appka**
(`gcloud app create`, region se pak už nemění) a účet přihlášený v gcloudu na něj musí
vidět — deploy to ověří přes `gcloud app describe` ještě před tím, než sáhne na token.

`keepVersions: 3` znamená, že po úspěšném nasazení zůstanou 3 nejnovější verze a starší se
smažou. Není to kosmetika: v každé nasazené verzi leží kompletní kopie nahraných zdrojáků
včetně `NPM_TOKEN`, který tam deploy dopsal.

**Jednorázová příprava projektu** (jen před prvním nasazením; `gcloud app deploy` projekt ani
App Engine appku založit neumí):

```powershell
gcloud auth login
gcloud app regions list --project=<project-id>
gcloud app create --region=<region> --project=<project-id>
gcloud app describe --project=<project-id>     # musí vypsat appku, ne chybu
```

- **Region se volí jednou a nedá se změnit** — jinam se appka dostane jen novým projektem.
  Rozhoduj podle regionu Atlasu, ne podle mapy: server jde do Monga na každý request.
- Pozor na historickou zvláštnost: App Engine `europe-west` **je** `europe-west1` (Belgie)
  a `--region=europe-west1` gcloud neuzná. Ostatní evropské regiony se píšou normálně
  (`europe-west3` Frankfurt, `europe-central2` Varšava).
- Projekt potřebuje **povolené fakturační konto** (bez něj `app create` projde, ale deploy
  spadne), **App Engine Admin API**
  (`gcloud services enable appengine.googleapis.com --project=<project-id>`) a účet s právem
  nasazovat (*App Engine Deployer* + *Cloud Build Editor*, nebo *Owner*).

Delší verze téhož je v `caio-apps/README.md`, *Jednorázová příprava GCP projektu* — propertyman
má ale vlastní projekt, appky se v jednom projektu nemíchají.

### 1.3 `NPM_TOKEN` v prostředí

Klasický GitHub PAT **jen se `read:packages`** (ne osobní se vším). Deploy ho dopíše do
`app.yaml` jako `build_env_variables`, aby si Cloud Build stáhl `@capo00/*`, a po deployi
ho zase odstraní — ale cestou se dostane do nahraných zdrojáků. Musí proto jít otočit bez
dopadu na cokoli jiného.

### 1.4 Produkční `.env`

`.env` v kořeni je **produkční konfigurace**: `.gcloudignore` ho schválně nefiltruje a
server ho v produkci čte (`NODE_ENV != development` → `dotenv.config()` nad `.env`).
Dnes je v něm vyplněné jen `JWT_LIFETIME`. Do gitu nepatří, takže tahle tabulka je jediné
místo, kde je napsané, co produkce potřebuje:

| Klíč | Bez něj |
|---|---|
| `MONGODB_URI` | server nastartuje, ale všechno kolem DB selže (Atlas; **bez query stringu**) |
| `JWT_SECRET` | od `caio-server` 0.2.0 povinné, přihlášení nefunguje |
| `GOOGLE_CLIENT_ID` / `_SECRET` | nenabídne se přihlášení Googlem; callback v konzoli musí mířit na `https://<doména>/auth/google/callback` |
| `ICAL_SYNC_SECRET` | `calendar/sync` z cronu vrací 503 (ruční sync z adminu jede dál) |
| `SMTP_HOST`/`_USER`/`_PASS`, `OWNER_EMAIL` | o nové rezervaci se nikdo nedozví, hostovi nechodí potvrzení ani storno |
| `SMTP_PASSWORD`, `MAIL_FROM`, `APP_URL` | `caio-server` nenabídne registraci e-mailem a heslem a neumí reset hesla |

**Pozor na dvojí pojmenování:** appka čte `SMTP_PASS`/`SMTP_FROM`, knihovna `SMTP_PASSWORD`/
`MAIL_FROM`. Není to překlep, je to dnešní stav ([design-v2.md § 9](../design-v2.md#9-env-v2));
vyplň obě dvojice stejnou hodnotou, jinak jedna půlka pošty tiše nechodí.

Co appka doopravdy vidí, řekne `GET /sys/health` — tajemství jsou tam jen jako `true`/`false`,
takže se na něj dá kouknout i v produkci.

### 1.5 `GOOGLE_MAPS_API_KEY` při buildu

Klíč se **zapéká do bundlu**, za běhu se nečte. `client/.env.development` se ale načte jen
v dev režimu — produkční build ho nevidí a mapa v sekci Kontakt zůstane placeholderem.
Ověřeno 2026-09-25: bez proměnné v prostředí je `googleMapsApiKey` v `public/index.js`
prázdný, s proměnnou tam je.

Deploy se proto pouští s klíčem v prostředí:

```bash
GOOGLE_MAPS_API_KEY=<klíč> npm run deploy
```

V Google Cloud konzoli mu přidej produkční doménu do *HTTP referrers* (dnes je omezený na
`localhost:8080`), jinak ho Google na ostrém webu odmítne.

### 1.6 Obsah, který musí schválit vlastník

- **Ceník.** `server/config.js` má `pricing.approved: false` a **vymyšlené sazby**. Dokud je
  to tak, server v produkci odmítne spočítat cenu a rezervační formulář je k ničemu — web by
  byl výkladní skříň. Přepsat sazby na skutečné a přepnout `approved: true`.
- **Recenze.** Sekce je prázdná (vymyšlené recenze jsou smazané). Skutečné se zadávají
  v adminu, `/admin/reviews`.
- **Feedy portálů.** Od v2 se zadávají v adminu (`/admin/ical`), ne v `.env`. Dokud tam
  nejsou, nic se nesynchronizuje a web nezná obsazenost z Bookingu ani z e-chalup. U e-chalup
  musí jít o variantu exportu **s detaily** (ta bez detailů mění UID a import by zakládal
  falešné rezervace).

---

## 2. Postup vydání

```bash
# 0) commit rozdělaných změn (aktualizace stacku, app.yaml, dokumentace)
git status
git add -A && git commit -m "…"

# 1) devkit 0.3.1 -- viz 1.1; přeskoč, jestli je vydaný a nainstalovaný
cd ../caio-architecture/caio-devkit && npm run deploy && cd -
npm install && (cd client && npm install)

# 2) kontrola, že appka neběží proti lokálním klonům stacku
npm run sync -- --status        # všechny řádky musí říkat "publikovaná"

# 3) produkční build a zkouška nanečisto
GOOGLE_MAPS_API_KEY=<klíč> npm run build
npm start                       # čte .env (produkční!), otevři http://localhost:8080
curl -s localhost:8080/sys/health

# 4) deploy
GOOGLE_MAPS_API_KEY=<klíč> npm run deploy
```

`npm run deploy` (= `caio-devkit deploy`) postupně: ověří `caio.deploy.project` a strop
instancí v `app.yaml`, sáhne na projekt přes `gcloud app describe`, postaví klienta, dopíše
`NPM_TOKEN` (a od 0.3.1 i `GOOGLE_NODE_RUN_SCRIPTS`) do `app.yaml`, nasadí, uklidí po sobě
`app.yaml` a smaže staré verze nad `keepVersions`.

Přihlášený gcloud účet deploy nekontroluje, jen ho vypíše — ověř si, že je ten správný
(`gcloud auth list`).

---

## 3. Po prvním nasazení

1. **Migrace rolí.** `caio-server` 0.2.1+ čte role z kolekce `sys_member`, ne z identity, a
   fallback schválně nemá. Nad produkční databází se pustí jednou (je idempotentní):

   ```bash
   MONGODB_URI=<produkční URI> node node_modules/caio-server/tools/migrate-profile-list.js
   ```

   Bez toho nemá v adminu nikdo žádnou roli. Že je to potřeba, hlásí server do logu při startu.

2. **Správce.** Vlastník si založí účet na `https://<doména>/login.html` a dostane roli:

   ```bash
   NODE_ENV=production npm run grant-role -- <e-mail> authorities
   ```

   První `authorities` musí vzniknout mimo appku — use case `member/set` sám `authorities`
   vyžaduje.

3. **Cron na `calendar/sync`.** Cloud Scheduler, HTTP POST na
   `https://<doména>/calendar/sync` s hlavičkou `X-Ical-Sync-Secret: <ICAL_SYNC_SECRET>`.
   App Engine cron (`cron.yaml`) se použít nedá — umí jen GET.

   ```bash
   gcloud scheduler jobs create http propertyman-ical-sync \
     --project <project-id> --location <region> --schedule "0 */3 * * *" \
     --uri "https://<doména>/calendar/sync" --http-method POST \
     --headers "X-Ical-Sync-Secret=<secret>"
   ```

4. **Ověřit na produkci** (etapa 7 z [design-v2.md](../design-v2.md)):
   - přihlášení — cookie je `secure` + `sameSite: strict`, chová se tedy jinak než na localhostu,
   - deep link `https://<doména>/admin/reservations` (přímé otevření, ne proklik),
   - `GET /sys/health` hlásí `mongoConfigured: true` a `smtpConfigured: true`,
   - založení rezervace z formuláře → přišel e-mail vlastníkovi,
   - potvrzení rezervace v adminu → přišel e-mail hostovi,
   - ruční sync feedu v adminu a pak spuštění cronu (`gcloud scheduler jobs run …`),
   - mapa v sekci Kontakt se vykreslí (= klíč se dostal do buildu a referrer sedí).

---

## 4. Co zůstává vědomě nedodělané

- Sekce recenzí je prázdná, dokud vlastník nezadá pravé recenze.
- Vzdálenosti v `content/attractions.js` jsou odhad po silnici, jen Kost (3 km) je z inzerátu.
- GPS v `content/property.js` je střed obce, ne číslo popisné.
- `.env` ani `client/.env.development` nejsou ve gitu a předlohu vedle sebe nemají; jedinou
  evidencí klíčů je tenhle dokument (§ 1.4 a § 1.5).
