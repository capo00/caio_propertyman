// Časté dotazy. Tvar drží budoucí entitu `faq` (design.md § 6).
//
// Otázky a odpovědi jsou v client/src/lsi/<lang>.json pod "faq.<code>".
//
// TODO OBSAH: odpovědi o storno podmínkách a záloze musí potvrdit vlastník — jsou to
// závazné údaje, ne marketingový text. Zbytek odpovídá inzerátu na e-chalupy.cz
// (topení, parkování, úschova kol, zákaz zvířat).

export default [
  { code: "checkInOut", order: 10 },
  { code: "howToBook", order: 20 },
  { code: "cancellation", order: 30 },
  { code: "winter", order: 40 },
  { code: "rain", order: 50 },
  { code: "bikes", order: 60 },
  { code: "pets", order: 70 },
];
