// Položky horní navigace. Jen struktura -- popisky jsou v LSI pod "header.nav.<code>".
//
// `anchor` je id sekce na home. Web je jedna stránka, takže menu nikam nenaviguje,
// jen scrolluje (docs/decisions.md). Staré routy `/gallery` a spol. přesto existují --
// vyrenderují home a doscrollují na tuhle kotvu, ať nespadnou existující odkazy.

const nav = [
  { code: "about", anchor: "#o-roubence" },
  { code: "gallery", anchor: "#galerie" },
  { code: "pricing", anchor: "#cenik" },
  { code: "reservation", anchor: "#rezervace" },
  { code: "reviews", anchor: "#recenze" },
  { code: "surroundings", anchor: "#okoli" },
  { code: "contact", anchor: "#kontakt" },
];

export default nav;
