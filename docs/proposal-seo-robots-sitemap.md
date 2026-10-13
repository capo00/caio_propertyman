# Návrh: `robots.txt` a `sitemap.xml`

- **Podklad:** [proposal-seo-meta.md](./proposal-seo-meta.md) a rozbor SEO z 2026-10-12 (bod 3).
- **Stav (2026-10-13):** implementováno. První verze návrhu (middleware na serveru, `robots.txt` podle hostitele, druhá kopie seznamu cest) padla; níž je zjednodušená verze, kterou majitel schválil.

## 1. Výchozí stav

- Ani jeden soubor neexistoval. `/robots.txt` a `/sitemap.xml` končily 404 (`caio-server` vrací 404 pro cestu s příponou, kterou `express.static` nenašel).
- Devkit kopíruje statické soubory z `client/src/assets/` jen pod **`/assets/`**, do kořene jde jen `favicon.ico`. `robots.txt` musí ležet v kořeni domény.
- Doména je `roubenyraj.cz` (i s `www`). `APP_URL=https://roubenyraj.cz` už je v serverovém `.env`.

## 2. Řešení: oba soubory vznikají při buildu

| Soubor | Kde | Kdo a kdy |
| --- | --- | --- |
| `robots.txt` | `public/robots.txt`, na webu `/robots.txt` | plugin `seoFiles` v `client/vite.config.js` při každém `npm run build` (deploy build spouští) |
| `sitemap.xml` | `public/sitemap.xml`, na webu `/sitemap.xml` | tentýž plugin |

Server se nemění: oba soubory vrací `express.static` jako každý jiný statický soubor.

- **Obsah** skládá `client/src/config/seo-files.js` (`buildRobotsTxt`, `buildSitemapXml`) ze seznamu rout v `client/src/config/seo.js`, tedy ze stejného zdroje jako canonical a meta tagy. Druhá kopie seznamu na serveru není.
- **Plugin** zapisuje ve `writeBundle`, ze stejného důvodu jako devkitový `publicDir`: uu5-loader výstup při `buildStart` vyprázdní, takže dřívější zápis by watch rebuild smazal. Vlastní plugin přidává appka přes `plugins` v `createViteConfig`, devkit se nemění.
- **Doména** je jedna proměnná `APP_URL` pro server i klienta. Build ji čte z `.env` v kořeni repa (proměnná v prostředí buildu má přednost). `SITE_URL` z předchozího kroku zanikla.

## 3. Obsah

**`robots.txt`**

```
User-agent: *
Disallow: /admin
Disallow: /login.html
Disallow: /auth/
Disallow: /sys/
Disallow: /availability/
Disallow: /calendar/
Disallow: /icalFeed/
Disallow: /invoice/
Disallow: /price/
Disallow: /reservation/
Disallow: /review/

Sitemap: https://roubenyraj.cz/sitemap.xml
```

Zakázaný je admin, přihlášení a prefixy use casů ze `server/*/api.js`. Že žádný prefix nechybí, hlídá `seo-files.test.js`: přečte `server/*/api.js` a porovná. (Při první implementaci tak chytil zapomenutý `icalFeed`.)

**`sitemap.xml`**: `<url><loc>` pro každou veřejnou routu, tedy 9 stránek a 6 detailů prostorů, s absolutní adresou z `APP_URL`. Bez `<lastmod>` (pravdivý údaj o změně obsahu nemáme), bez `<priority>` a `<changefreq>` (Google je nečte).

## 4. Rozhodnutí majitele (2026-10-13)

1. **`robots.txt` je stejný pro hlavní doménu i technickou adresu `*.appspot.com`.** Duplicitu řeší canonical na každé stránce (míří na `APP_URL`), ne zákaz: zakázanou stránku Google nenačte, a tak neuvidí ani canonical, a adresa se pak může dostat do výsledků jako holý odkaz. Tím odpadl middleware podle hostitele i kontrola `seoHostMatches` v `sys/health`.
2. **Bez `APP_URL`** vznikne `robots.txt` bez řádku `Sitemap:` a sitemapa se nevytvoří (případná stará se z `public/` smaže).
3. **`www`:** `CANONICAL_HOST=roubenyraj.cz` v `.env`, takže `caio-server` přesměruje `www.roubenyraj.cz` na hlavní host (301). `APP_URL` musí být právě ten host. Zapsáno v `release.md`.
4. **Obrázkový sitemap** (`<image:image>`) se teď nedělá. Přidá se po nasazení, pokud bude Search Console hlásit málo indexovaných fotek.
5. **404 pro neznámé routy** se navrhne zvlášť. Seznam platných cest tam musí zahrnout i `admin/*` a legacy přesměrování z `client/src/router.jsx` (`LEGACY_ROUTES`: anglické cesty `/about`, `/gallery`, `/pricing`, `/reservation`, `/reviews`, `/surroundings`, `/contact` z doby, kdy byl web jedna stránka s kotvami). Dnes je přesměrovává až klient a server pro ně vrací 200. Zvážit 301 přímo na serveru, které vyhledávačům předá i hodnotu starých odkazů.

## 5. Co zbývá po nasazení

- V Google Search Console ověřit doménu `roubenyraj.cz` (DNS TXT) a odeslat `https://roubenyraj.cz/sitemap.xml`.
- Po změně `APP_URL` je potřeba nový build a deploy, ne jen restart serveru: adresa je zapečená v `public/`.
