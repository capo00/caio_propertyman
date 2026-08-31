// Časté dotazy. Tvar drží budoucí entitu `faq` (design.md § 6).
//
// TODO OBSAH: placeholder z předlohy (ux/07-faq.jpg). Odpovědi o storno podmínkách
// a záloze musí potvrdit vlastník — jsou to závazné údaje, ne marketingový text.

export default [
  {
    question: { cs: "Kdy je check-in a check-out?" },
    answer: { cs: "Příjezd od 15:00, odjezd do 10:00. Jiný čas rádi domluvíme." },
    order: 10,
  },
  {
    question: { cs: "Jak probíhá rezervace?" },
    answer: {
      cs:
        "Vyplníte nezávaznou poptávku s termínem a počtem osob. Do 24 hodin se ozveme " +
        "s potvrzením dostupnosti a přesnou cenou. Teprve pak je termín závazně váš.",
    },
    order: 20,
  },
  {
    question: { cs: "Je možné storno?" },
    answer: { cs: "Storno zdarma do 30 dnů před příjezdem. Později se vrací záloha podle domluvy." },
    order: 30,
  },
  {
    question: { cs: "Je roubenka vhodná i v zimě?" },
    answer: {
      cs:
        "Ano. Chalupa je zateplená, topí se kamny na dřevo i elektrickým topením a dřevo " +
        "je v ceně. K chalupě se dá dojet autem i v zimě.",
    },
    order: 40,
  },
  {
    question: { cs: "Můžeme vzít psa?" },
    answer: { cs: "Můžete. Zahrada je celá oplocená. Prosíme jen, aby pes nespal v postelích." },
    order: 50,
  },
];
