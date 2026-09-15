// Položky horní navigace. Jen struktura -- popisky se čtou z LSI podle `label`, což je
// cesta klíčů do cs.json (u prostorů se tak nemusí psát jejich názvy podruhé).
//
// Od rozpadu webu do rout (docs/proposal-routes.md) je v položce `route`, ne kotva.
// Výjimka je JEDNA: kontakt. Ten vlastní stránku nemá -- je to poslední sekce KAŽDÉ veřejné
// routy (vykresluje ji rám v app.jsx), takže položka zůstává kotvou `#kontakt` a chová se
// jako dřív, tedy plynulý scroll na aktuální stránce.
//
// `CaioApp.Top` obojí rozezná sám: `href` začínající `#` přeloží na scrollToAnchor, cokoli
// jiného na setRoute, a do `itemList` položky se zanořuje rekurzivně (dropdown dostane
// `onLabelClick`) -- viz caio-ui/src/caio-ui-app/top.jsx, `withItemBehaviour`.
//
// Pozor: položka NEUMÍ routu s kotvou zároveň (`setRoute` by dostal "cenik#kalendar" jako
// celou routu). Kotvy uvnitř stránky proto řeší až obsah té stránky, ne menu.
//
// Časté dotazy v menu schválně nejsou -- stejně jako dřív. Vlastní routu `faq` mají,
// odkazuje na ni home i rozcestník ubytování.

import spaces from "./spaces.js";

const nav = [
  {
    code: "ubytovani",
    route: "ubytovani",
    label: ["header", "nav", "ubytovani"],
    // Prostory se do menu berou ze stejného zdroje jako stránky, ať se nemůžou rozejít.
    children: [...spaces]
      .sort((a, b) => a.order - b.order)
      .map((space) => ({
        code: space.code,
        route: `ubytovani/${space.code}`,
        label: ["spaces", space.code, "title"],
      })),
  },
  { code: "galerie", route: "galerie", label: ["header", "nav", "galerie"] },
  { code: "cenik", route: "cenik", label: ["header", "nav", "cenik"] },
  { code: "rezervace", route: "rezervace", label: ["header", "nav", "rezervace"] },
  { code: "recenze", route: "recenze", label: ["header", "nav", "recenze"] },
  { code: "okoli", route: "okoli", label: ["header", "nav", "okoli"] },
  { code: "kontakt", anchor: "#kontakt", label: ["header", "nav", "kontakt"] },
];

export default nav;
