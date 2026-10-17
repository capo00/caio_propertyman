// Položky horní navigace. Jen struktura -- popisky se čtou z LSI podle `label`, což je
// cesta klíčů do cs.json.
//
// Od rozpadu webu do rout (docs/proposal-routes.md) míří položka na stránku, ne na kotvu.
// Kontakt až do 2026-09-28 býval jedinou výjimkou (kotva `#kontakt`, protože vlastní routu
// neměl) -- od té doby má routu `kontakt` s plnou mapou (docs/decisions.md, § Frontend)
// a menu na ni teď taky míří. Kotva `#kontakt` dál existuje -- je to `id` kompaktní podoby
// na patičce KAŽDÉ stránky (`compact`, app.jsx) -- jen na ni už nic v menu neodkazuje.
//
// `CaioApp.Top` `href` začínající `#` přeloží na scrollToAnchor, cokoli jiného na setRoute --
// viz caio-ui/src/caio-ui-app/top.jsx, `withItemBehaviour`.
//
// Pozor: položka NEUMÍ routu s kotvou zároveň (`setRoute` by dostal "cenik#kalendar" jako
// celou routu). Kotvy uvnitř stránky proto řeší až obsah té stránky, ne menu.
//
// Menu je JEDNOÚROVŇOVÉ: ubytování nemá rozbalovací seznam prostorů, i když jejich stránky
// (`ubytovani/<code>`) existují. Na prostor se chodí z rozcestníku `ubytovani`, který je
// vypisuje jako karty (components/accommodation/accommodation.jsx) ze stejných dat
// (components/accommodation/content.js). Menu tak zůstává krátké a cesta k prostoru je
// jedna, ne dvě.
//
// Časté dotazy v menu schválně nejsou -- stejně jako dřív. Vlastní routu `faq` mají,
// odkazuje na ni home i rozcestník ubytování.
//
// Položka nese jen `code` stránky (anglicky, interní). Adresa je v config/routes.js
// (`PAGES`) v každém jazyce zvlášť (docs/proposal-seo-lang-urls.md § 6.3); `route`
// s českým slugem tu býval do 2026-10-16.

const nav = [
  { code: "accommodation", label: ["header", "nav", "ubytovani"] },
  { code: "gallery", label: ["header", "nav", "galerie"] },
  { code: "pricing", label: ["header", "nav", "cenik"] },
  { code: "reservation", label: ["header", "nav", "rezervace"] },
  { code: "reviews", label: ["header", "nav", "recenze"] },
  { code: "surroundings", label: ["header", "nav", "okoli"] },
  { code: "contact", label: ["header", "nav", "kontakt"] },
];

export default nav;
