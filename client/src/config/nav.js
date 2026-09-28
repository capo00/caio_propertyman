// Položky horní navigace. Jen struktura -- popisky se čtou z LSI podle `label`, což je
// cesta klíčů do cs.json.
//
// Od rozpadu webu do rout (docs/proposal-routes.md) je v položce `route`, ne kotva.
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
// `code` (anglicky, interní) a `route` (česky bez diakritiky, jde do URL) jsou od
// 2026-09-28 schválně DVĚ různé hodnoty (docs/decisions.md, § Frontend) -- `code` dřív
// jen kopíroval `route`, což byl jediný český interní identifikátor v kódu appky.

const nav = [
  { code: "accommodation", route: "ubytovani", label: ["header", "nav", "ubytovani"] },
  { code: "gallery", route: "galerie", label: ["header", "nav", "galerie"] },
  { code: "pricing", route: "cenik", label: ["header", "nav", "cenik"] },
  { code: "reservation", route: "rezervace", label: ["header", "nav", "rezervace"] },
  { code: "reviews", route: "recenze", label: ["header", "nav", "recenze"] },
  { code: "surroundings", route: "okoli", label: ["header", "nav", "okoli"] },
  { code: "contact", route: "kontakt", label: ["header", "nav", "kontakt"] },
];

export default nav;
