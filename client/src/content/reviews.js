// Recenze. Tvar drží budoucí entitu `review` (design.md § 6) -- proto `rating` a `state`,
// i když se ve v1 nefiltruje.
//
// Autor, místo a text jsou v client/src/lsi/<lang>.json pod "reviews.<code>".
//
// TODO OBSAH: placeholder z předlohy (ux/05-recenze-okoli.jpg). Nevydávat za skutečné
// recenze skutečných hostů, dokud to skutečné recenze nebudou.

export default [
  { code: "novakovi", rating: 5, state: "approved", order: 10 },
  { code: "petr", rating: 5, state: "approved", order: 20 },
  { code: "marketaJan", rating: 5, state: "approved", order: 30 },
  { code: "dvorakovi", rating: 5, state: "approved", order: 40 },
];
