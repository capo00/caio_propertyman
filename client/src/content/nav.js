// Položky horní navigace. Jen struktura -- popisky se čtou z LSI podle `label`, což je
// cesta klíčů do cs.json.
//
// Od rozpadu webu do rout (docs/proposal-routes.md) je v položce `route`, ne kotva.
// Výjimka je JEDNA: kontakt. Ten vlastní stránku nemá -- je to poslední sekce KAŽDÉ veřejné
// routy (vykresluje ji rám v app.jsx), takže položka zůstává kotvou `#kontakt` a chová se
// jako dřív, tedy plynulý scroll na aktuální stránce.
//
// `CaioApp.Top` obojí rozezná sám: `href` začínající `#` přeloží na scrollToAnchor, cokoli
// jiného na setRoute -- viz caio-ui/src/caio-ui-app/top.jsx, `withItemBehaviour`.
//
// Pozor: položka NEUMÍ routu s kotvou zároveň (`setRoute` by dostal "cenik#kalendar" jako
// celou routu). Kotvy uvnitř stránky proto řeší až obsah té stránky, ne menu.
//
// Menu je JEDNOÚROVŇOVÉ: ubytování nemá rozbalovací seznam prostorů, i když jejich stránky
// (`ubytovani/<code>`) existují. Na prostor se chodí z rozcestníku `ubytovani`, který je
// vypisuje jako karty (routes/ubytovani.jsx) ze stejného `content/spaces.js`. Menu tak
// zůstává krátké a cesta k prostoru je jedna, ne dvě.
//
// Časté dotazy v menu schválně nejsou -- stejně jako dřív. Vlastní routu `faq` mají,
// odkazuje na ni home i rozcestník ubytování.

const nav = [
  { code: "ubytovani", route: "ubytovani", label: ["header", "nav", "ubytovani"] },
  { code: "galerie", route: "galerie", label: ["header", "nav", "galerie"] },
  { code: "cenik", route: "cenik", label: ["header", "nav", "cenik"] },
  { code: "rezervace", route: "rezervace", label: ["header", "nav", "rezervace"] },
  { code: "recenze", route: "recenze", label: ["header", "nav", "recenze"] },
  { code: "okoli", route: "okoli", label: ["header", "nav", "okoli"] },
  { code: "kontakt", anchor: "#kontakt", label: ["header", "nav", "kontakt"] },
];

export default nav;
