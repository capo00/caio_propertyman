// Časté dotazy. Tvar drží budoucí entitu `faq` (design.md § 6).
//
// Otázky a odpovědi jsou v client/src/lsi/<lang>.json pod "faq.<code>".
//
// TODO OBSAH: placeholder z předlohy (ux/07-faq.jpg). Odpovědi o storno podmínkách
// a záloze musí potvrdit vlastník — jsou to závazné údaje, ne marketingový text.

export default [
  { code: "checkInOut", order: 10 },
  { code: "howToBook", order: 20 },
  { code: "cancellation", order: 30 },
  { code: "winter", order: 40 },
  { code: "pets", order: 50 },
];
