// Recenze. Tvar drží budoucí entitu `review` (design.md § 6) -- proto `rating` a `state`,
// i když se ve v1 nefiltruje.
//
// TODO OBSAH: placeholder z předlohy (ux/05-recenze-okoli.jpg). Nevydávat za skutečné
// recenze skutečných hostů, dokud to skutečné recenze nebudou.

export default [
  {
    author: { cs: "Rodina Nováková" },
    place: { cs: "Liberec" },
    rating: 5,
    text: { cs: "Jezdíme sem třetí rok. Majitelé jsou vstřícní, chalupa je pořád jako nová a zahrada je pro děti ráj." },
    state: "approved",
    order: 10,
  },
  {
    author: { cs: "Petr S." },
    place: { cs: "Hradec Králové" },
    rating: 5,
    text: { cs: "Přijeli jsme na prodloužený víkend s partou. Kuchyň zvládne uvařit pro osm lidí, terasa je nádherná. Vřele doporučuji." },
    state: "approved",
    order: 20,
  },
  {
    author: { cs: "Markéta a Jan" },
    place: { cs: "Praha" },
    rating: 5,
    text: { cs: "Sauna po celodenním výšlapu na Trosky je přesně to, co člověk potřebuje. Ticho, žádní sousedé." },
    state: "approved",
    order: 30,
  },
  {
    author: { cs: "Rodina Dvořákova" },
    place: { cs: "Pardubice" },
    rating: 5,
    text: { cs: "Vzali jsme psa a nikdo se nemračil. Oplocená zahrada je pro nás zásadní." },
    state: "approved",
    order: 40,
  },
];
