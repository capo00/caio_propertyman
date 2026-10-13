# Návrh: meta údaje pro vyhledávače a sdílení (per-route)

- **Podklad:** [proposal-routes.md § 1, bod 4](./proposal-routes.md) (SEO: „jeden `<title>` a jeden popis na celý web“), [wip.md, bod 3](./wip.md#zadání-majitele-2026-09-27) (doména).
- **Stav (2026-10-13):** implementováno. Odchylky od původního návrhu jsou opravené přímo v textu níž.

## 1. Dnešní stav

- `client/index.html` má jen `<title>Roubený ráj</title>`, žádný `description`, `canonical`, `og:*` ani `twitter:*`.
- `client/src/tools/page-title.js` (`usePageTitle`) mění jen `document.title` podle routy („Ceník · Roubený ráj“).
- `public/assets/meta/og-image.jpg` existuje, ale nic na něj neodkazuje.
- Texty jsou v `client/src/lsi/cs.json`; prostory (`spaces.<code>`) už mají `title` a `perex`, takže jejich popis se nemusí psát znovu.

## 2. Co se má nastavit na každé stránce

| Tag | Hodnota |
| --- | --- |
| `<title>` | beze změny: `<stránka> · Roubený ráj`, home jen název |
| `meta description` | vlastní text routy, 70–155 znaků, česky |
| `link rel=canonical` | `<APP_URL>/<routa>`, home `<APP_URL>/` |
| `og:type` / `og:site_name` / `og:locale` | `website` / `Roubený ráj` / `cs_CZ` |
| `og:title`, `og:description`, `og:url` | stejné jako title, description a canonical |
| `og:image` + `twitter:card` | `<APP_URL>/assets/meta/og-image.jpg`, `summary_large_image`; prostory později vlastní fotka |
| `meta robots` | `noindex` na `/admin/*`, `/rezervace` až po rozhodnutí (viz § 6) |

Statické tagy (`og:site_name`, `og:locale`, `og:title`, `og:description`, `twitter:card`, `description`) jsou v `index.html`; `og:image` tam být nemůže, protože vyžaduje absolutní URL, a doplňuje se jen za běhu. Hook mění jen to, co se liší podle routy.

## 3. Jeden zdroj pravdy: `client/src/config/seo.js`

Tabulka routa → `{ titlePath, descriptionPath, path, noindex? }`. Nahradí `TITLE_PATH_BY_ROUTE` v `page-title.js` a použije ji i budoucí `sitemap.xml` a prerender (bod 1 z rozboru), takže se titulky, popisy a seznam URL nerozejdou.

```js
// Klíč = uu5Route. Cesty míří do LSI, žádné vlastní texty.
export const SEO_BY_ROUTE = {
  "": { description: ["seo", "home"] },                 // home
  ubytovani: { title: ["header", "nav", "ubytovani"], description: ["seo", "ubytovani"] },
  galerie: { ... }, cenik: { ... }, okoli: { ... }, faq: { ... }, kontakt: { ... },
  rezervace: { ..., noindex: false },
};
// ubytovani/<code>: title ["spaces", code, "title"], description ["spaces", code, "perex"]
```

Detail prostoru vezme popis z existujícího `spaces.<code>.perex`, takže přidání prostoru nevyžaduje zásah do `seo.js` (stejný princip jako dnes u titulku).

## 4. Hook

`usePageTitle` se přejmenuje na `usePageMeta` (jedno volání v `AppFrame`, `app.jsx:135`) a v jednom efektu nastaví title, description, canonical a `og:*`. Pomocná `setMeta(selector, attr, value)` si tag při prvním volání vytvoří, když v dokumentu není, a pak jen přepisuje. `useLsi` se volá vždy kvůli pravidlu hooků, stejně jako dnes; jako dep listy slouží spojené cesty, ne pole.

Admin routy: `noindex`, žádný canonical, title zůstává.

## 5. Nové LSI texty (`cs.json`, blok `seo`)

Návrhy popisů, ke schválení majitelem:

| Klíč | Text |
| --- | --- |
| `home` | Roubenka pro 10 hostů v Libošovicích v Českém ráji. Celý dům jen pro vás: krbová kamna, špejchar, ohniště a výlety na Kost i do Plakánku. |
| `ubytovani` | Tři ložnice, dvě koupelny, plně vybavená kuchyň a stodola s pingpongem. Prohlédněte si prostory roubenky Roubený ráj. |
| `galerie` | Fotografie roubenky, interiéru, zahrady a okolí Českého ráje. |
| `cenik` | Ceník pronájmu roubenky v Českém ráji podle sezóny a kalendář volných termínů. |
| `okoli` | Hrad Kost, Plakánek, skalní města a další cíle na výlet z Libošovic, včetně vzdáleností. |
| `faq` | Odpovědi na časté otázky: příjezd a odjezd, mazlíčci, vytápění, parkování a storno podmínky. |
| `kontakt` | Adresa, telefon, e-mail a mapa. Roubený ráj, Libošovice u Sobotky. |
| `rezervace` | Zjistěte volné termíny a pošlete nezávaznou žádost o rezervaci roubenky. |

Údaje v popisech (kapacita, vzdálenosti, storno) se opisují z `cs.json` a ceníku, takže před schválením je potřeba ověřit, že sedí.

## 6. Otevřené otázky

1. **Adresa webu.** Canonical i `og:url` potřebují absolutní adresu. **Rozhodnuto 2026-10-13:** jedna proměnná `APP_URL` (`https://roubenyraj.cz`) ze serverového `.env` v kořeni repa. `client/vite.config.js` ji čte při buildu a do bundlu ji dává přes `define` (`import.meta.env.VITE_*` v tomhle buildu nefunguje). Původní návrh se samostatnou `SITE_URL` pro klienta padl. Ne `window.location.origin`, protože `*.appspot.com` i vlastní doména by pak měly každá jiný canonical. Bez `APP_URL` hook canonical a `og:url` **nenastavuje** (lepší žádný než špatný).
2. **`/rezervace` indexovat?** Doporučení: ano, je to hledaná cílová stránka („rezervace roubenky“); formulář sám obsah neztrácí.
3. **Meta jen v prohlížeči nestačí pro náhledy sdílení.** Facebook, WhatsApp, Messenger i Seznam JS nespouštějí, uvidí jen statické tagy z `index.html` (tedy home text a `og-image`). Google JS spouští, takže per-route description a canonical přečte, ale se zpožděním. Plnohodnotně se to vyřeší až injektáží meta tagů do `index.html` nebo prerenderem. **Oprava 2026-10-13:** původně tu stálo, že to vyžaduje zásah do `caio-server`. Neplatí to: `App.init({ middlewareList })` umí namountovat vlastní middleware před SPA fallback, takže se to dá udělat v `server/` této appky (viz [proposal-seo-robots-sitemap.md § 3](./proposal-seo-robots-sitemap.md)). Překážka je jiná: server nečte `client/` (`.gcloudignore`), takže seznam rout a popisů by musel mít vlastní kopii.
4. **Jazyk.** Web je dnes jen česky. Při přidání další jazykové verze přibude `hreflang` a `og:locale:alternate`; teď se neřeší.

## 7. Rozsah implementace

- `client/src/config/seo.js` (nový), `client/src/tools/page-title.js` → `page-meta.js`, 1 řádek v `app.jsx`.
- `client/index.html`: statické `og:*`, `twitter:card`, `meta description` pro home, `theme-color`.
- `client/src/lsi/cs.json`: blok `seo`.
- Test na tabulku (každá veřejná routa z `nav.js` a každý prostor z `content.js` má popis do 155 znaků).
- Zápis do `decisions.md § Frontend` a odškrtnutí v `wip.md`.
