# Návrh: skutečná 404 pro neznámé adresy

- **Podklad:** rozbor SEO z 2026-10-12 (bod 4), [proposal-seo-robots-sitemap.md § 4.5](./proposal-seo-robots-sitemap.md).
- **Stav (2026-10-13):** implementováno. Odchylky od návrhu jsou opravené přímo v textu (lomítko na konci, home jako routa `""`).

## 1. Dnešní stav

- **Každá adresa bez přípony vrací 200.** SPA fallback v `caio-server` pošle `index.html` na cokoli, co není soubor ani use case. Teprve klient vykreslí `NotFound` a od minulého bodu přidá `noindex`. Google tomu říká *soft 404*: stránka tvrdí 200, ale je prázdná. V Search Console se to hlásí jako chyba a překlepy nebo smazané stránky můžou zůstat v indexu.
- **Staré anglické adresy** (`LEGACY_ROUTES` v `client/src/router.jsx`: `/about`, `/gallery`, …) přesměrovává klient. Komentář u nich tvrdí, že chrání „existující odkazy a to, co má naindexovaný Google“. Web ale ještě nikdy nebyl veřejně a doména dřív žádný jiný web neměla, takže žádné takové odkazy neexistují.
- **`/home`** je tatáž stránka jako `/` (router má `"": { redirect: "home" }`), taky s 200.
- **Lomítko na konci** (`/cenik/`) dnes skončí na klientské „nenalezeno“, protože uu5g05 `RouteProvider` z něj udělá routu `cenik/` (ověřeno v prohlížeči 2026-10-13).
- **Klient přepisoval `/` na `/home`** (`"": { redirect: "home" }`) a logo mířilo na `home`, takže úvodní stránka měla v adresním řádku `/home`.

## 2. Cíl

| Požadavek | Odpověď |
| --- | --- |
| `/`, `/cenik`, `/ubytovani/stodola`, `/admin/reservations`, … (známá routa) | 200, `index.html` (beze změny) |
| `/home` | **301** na `/`, query string zůstává |
| `/cenik/` (lomítko na konci) | **301** na `/cenik`, query string zůstává -- řeší `caio-server` od 0.4.1 (§ 5.3) |
| `/nesmysl`, `/ubytovani/neexistuje`, `/about` | **404** a tělo `index.html`, takže host pořád uvidí stránku „nenalezeno“ s menu |
| use casy, `/auth/*`, `/sys/*`, soubory s příponou, požadavky na JSON | beze změny, middleware je pustí dál |

## 3. Řešení

### 3.1 Server: middleware v `server/spa-routes/`

`App.init({ api, middlewareList })` namountuje middleware **za** `express.static` a auth a **před** use casy a SPA fallback, takže `caio-server` se nemění.

Na pořadí záleží: use casy se registrují **až po** `middlewareList`. Middleware proto musí pustit dál každou cestu, která je use case (klíče z `server/api.js`, plus `/sys/` a `/auth/`). Kdyby to nedělal, dostal by třeba iCal feed `/calendar/ical` pro Booking.com 404 místo kalendáře, protože jeho stahovač posílá `Accept: */*` a vypadá jako prohlížeč.

Dál stejné podmínky, jaké používá fallback v `caio-server`: jen `GET`/`HEAD`, jen cesta bez přípony, jen požadavek, který chce HTML. UVE (`public/<segment>.html`, kromě rezervovaných `login` a `index`) taky propustí.

Rozhodování je čistá funkce `resolveNavigation(path, routes)` → `{ status, location }`, kterou jde testovat bez Expressu. Middleware kolem ní je pár řádků.

### 3.2 Odkud server ví, které routy existují

Server nesmí číst `client/` (na App Engine se nenahrává). Stejně jako u sitemapy proto seznam **zapíše build**: plugin `seoFiles` v `client/vite.config.js` přidá `public/spa-routes.json`:

```json
{
  "routes": ["", "home", "ubytovani", "ubytovani/stodola", "cenik", "admin/reservations", "…"],
  "redirects": { "home": "" }
}
```

Soubor je veřejný, ale nic nového neprozrazuje: všechny routy včetně adminu už jsou v JS bundlu.

Server ho čte líně při první navigaci a znovu jen po změně (`mtime`), stejně jako `caio-server` hledá UVE: `caio-devkit start` zapisuje do `public/` až za běhu serveru. **Když soubor chybí** (vývoj před prvním buildem), middleware jen pustí požadavek dál, chování je jako dnes, a server to jednou vypíše do konzole.

### 3.3 Klient: jeden seznam rout

Aby se `spa-routes.json` nemohl rozejít s routerem, přesune se seznam do nového `client/src/config/routes.js`:

- `ADMIN_SCREENS` (`reservations`, `reservation`, `reviews`, `ical`),
- veřejné routy už jsou v `seo.js` (`listSeoRoutes`).

`router.jsx` z nich `ROUTE_MAP` sestaví a plugin z nich zapíše JSON. `REDIRECTS` obsahuje `home → ""` a `admin → admin/reservations`.

**Home je routa `""`** (adresa `/`), `home` jen přesměrování. Kdyby zůstalo `"": { redirect: "home" }`, klient by `/` přepsal na `/home` a server ho 301 vrátil zpět na `/`, takže by se adresa při každém obnovení přehazovala. Logo v liště míří na `/`.

**`LEGACY_ROUTES` se z routeru smažou.** Web je úplně nový, takže staré anglické adresy nikdo nemá v odkazech ani v záložkách a Google je nezná. Po smazání skončí na 404 jako každá jiná neznámá adresa.

## 4. Testy

- `server/spa-routes/spa-routes.test.js`:
  - `resolveNavigation`: známá routa i s lomítkem na konci, `/home` a `/admin`, neznámá, neexistující prostor, `/about` (už 404), poškozené URL kódování, zděděné vlastnosti objektu (`/toString`),
  - middleware: use case, `/calendar/ical` s `Accept: */*`, soubor s příponou, JSON požadavek, chybějící `spa-routes.json`.
- `client/src/config/seo-files.test.js`: JSON obsahuje každou routu z `listSeoRoutes()`, `home` a admin.

## 5. Rozhodnutí majitele (2026-10-13)

1. **Web je úplně nový,** na `roubenyraj.cz` dřív nic neběželo. Žádné staré adresy se nepřesměrovávají a `LEGACY_ROUTES` se mažou (§ 3.3).
2. **`/home` → `/` 301:** ano.
3. **Lomítko na konci:** všechny adresy musí fungovat s `/<name>` i `/<name>/` a je to **vlastnost `caio-architecture`**, ne appky. Middleware proto bere `/cenik/` jako známou routu (200, žádné 301 ani 404) a klientské vykreslení se tady neobchází. **Doplněno 2026-10-14:** řeší to `caio-server` 0.4.1, který navigaci s lomítkem přesměruje (301) dřív, než se dostane k middlewaru appky (`caio-server/docs/proposal-trailing-slash.md`, čeká na vydání).

## 6. Rozsah implementace

- `server/spa-routes/spa-routes.js` a test, 1 řádek v `server/index.js` (`middlewareList`).
- `client/src/config/routes.js` (nový), `router.jsx` z něj sestaví mapu a přijde o `LEGACY_ROUTES`, `vite.config.js` (plugin zapíše i `spa-routes.json`), `seo-files.js` a test.
- Zápis do `decisions.md`, odškrtnutí ve `wip.md`.
- Ověření na běžícím serveru (`npm start` nad čerstvým buildem): `curl` na `/home`, `/cenik/`, neznámou adresu, `/calendar/ical` a jeden use case.

## 7. Ověření (2026-10-13)

`npm start` nad čerstvým buildem, bez databáze (`MONGODB_URI=""`):

| Adresa | Výsledek |
| --- | --- |
| `/`, `/cenik`, `/cenik/`, `/ubytovani/stodola` | 200 |
| `/home`, `/home?x=1` | 301 na `/`, `/?x=1` |
| `/admin` | 301 na `/admin/reservations` |
| `/about`, `/nesmysl`, `/ubytovani/neexistuje` | 404 |
| `/robots.txt`, `/sitemap.xml`, `/login.html` | 200 |
| `/neexistuje.js` | 404 (beze změny, `caio-server`) |
| `/calendar/ical` s `Accept: */*` | dojde k use casu (bez databáze 500 „MONGODB_URI is not set“, tedy ne 404 z middlewaru) |
| `/sys/health` | 200 |

V prohlížeči: `/` zůstává `/`, logo ze stránky ceníku i tlačítko „Zpět na úvod“ na `/nesmysl` vedou na `/`, canonical `https://roubenyraj.cz/`.
