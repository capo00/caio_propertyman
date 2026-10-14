# Návrh: strukturovaná data (JSON-LD)

- **Podklad:** rozbor SEO z 2026-10-12, bod JSON-LD.
- **Stav (2026-10-14):** implementováno.

## 1. Co od toho čekat

Reálný přínos:
- Google pozná, že web je **ubytovací zařízení** s adresou, polohou, telefonem a oficiálními profily, a může ho spojit s Firemním profilem a mapou.
- **Název webu** ve výsledcích („Roubený ráj“ místo domény) Google bere ze strukturovaných dat `WebSite`.
- **Drobečková navigace** (`BreadcrumbList`) se ve výsledcích ukazuje místo holé URL.

Co **nečekat** (a proč to tu není):
- **Hvězdičky z recenzí:** hodnocení, které firma sbírá na vlastním webu, Google u `LocalBusiness` od 2019 nezobrazuje („self-serving reviews“). Proto chybí `aggregateRating`.
- **Otázky z FAQ ve výsledcích:** od srpna 2023 jen pro autoritativní weby (úřady, zdravotnictví). Proto chybí `FAQPage`.
- **`VacationRental`:** rich results jen pro partnery Google Vacation Rentals.

## 2. Web a roubenka: při buildu v `index.html`

Plugin `seoFiles` (`client/vite.config.js`) vloží přes `transformIndexHtml` do `<head>` index.html jeden `<script type="application/ld+json">` s `@graph` (`WebSite` + `LodgingBusiness`). Vidí ho každý crawler bez spuštění JS. Do `login.html` se nevkládá.

Skládá ho `buildStructuredData(appUrl, { minNightPrice })` v `client/src/config/seo-files.js`, jen z dat, která web už má:

| Pole | Zdroj |
| --- | --- |
| `name`, `description` | `cs.json` `property.name`, `seo.home` |
| `url`, `image` (og-image + první 3 fotky galerie) | `APP_URL`, `components/gallery/content.js` |
| `telephone`, `email`, `hasMap`, `sameAs` (Facebook, Instagram) | `components/contact/content.js` |
| `address`, `geo`, `checkinTime`, `checkoutTime`, `numberOfRooms` | `config/property.js` |
| `priceRange` („od 3 700 Kč za noc“) | `server/config.js` `pricing` (nižší z `firstNights.price` a `nextNight`). Čte ho `vite.config.js` při buildu, do bundlu klienta se nedostane |

- Bez `APP_URL` se blok nevloží (adresy musí být absolutní).
- `<` se v JSON zapisuje jako unicode escape (`serializeJsonLd`), aby text nemohl ukončit `<script>`.

## 3. Drobečková navigace: za běhu podle routy

`BreadcrumbList` je pro každou stránku jiný, takže ho `usePageMeta` (`client/src/tools/page-meta.js`) zapisuje do `<script id="ld-breadcrumb">`. Strukturu dává `getBreadcrumb(uu5Route)` v `client/src/config/seo.js`:

| Routa | Drobečky |
| --- | --- |
| `ubytovani/stodola` | Roubený ráj › Ubytování › Stodola |
| `cenik` a ostatní první úrovně | Roubený ráj › Ceník |
| home, admin, neznámá | žádné (script se odstraní) |

Google JS spouští, takže ho přečte. Až vznikne serverové vkládání meta tagů do HTML, přesune se breadcrumb tam.

## 4. Údaje od majitele (2026-10-14)

- **GPS** zůstává, jak je v `config/property.js`. Ověřeno, že je to jediné místo se souřadnicemi (mapa i JSON-LD čtou totéž) a že bod je od polohy, kterou poslal majitel, asi 5 m. Nepravdivé `TODO OBSAH` („střed obce“) je pryč.
- **Instagram** je finální, TODO v `contact/content.js` je pryč.
- **Ceník** je schválený a finální. Zastaralý oddíl ve `wip.md` je smazaný.

## 5. Ověření (2026-10-14)

- `npm test`: 112 testů, mimo jiné:
  - graf má `WebSite` a `LodgingBusiness` s údaji z datových souborů,
  - absolutní adresy, bez `APP_URL` nic,
  - escapování `<`,
  - `getBreadcrumb` pro prostor, první úroveň, home, admin a neznámou routu.
- `npm run build`: v `public/index.html` je jeden blok a projde `JSON.parse`, v `login.html` žádný. Fotky na uvedených adresách existují.
- Prohlížeč nad `npm start`:
  - `/ubytovani/stodola` má tři drobečky,
  - po „Zpět na ubytování“ dva,
  - `/cenik` dva,
  - na `/` žádné, zůstane jen statický blok.
- validator.schema.org (vložený kód: blok z `public/index.html` + breadcrumb pro Stodolu): `WebSite`, `LodgingBusiness`, `BreadcrumbList`, 0 chyb, 0 upozornění.
- **Po deployi:** [Rich Results Test](https://search.google.com/test/rich-results) na `https://roubenyraj.cz/` a `https://roubenyraj.cz/ubytovani/stodola`.
