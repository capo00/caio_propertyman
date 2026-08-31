// Ceník pro veřejnou stránku.
//
// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ ČÍSLA MUSÍ SEDĚT S server/config.js. Server podle SVÝCH hodnot počítá cenu          │
// │ rezervace, tohle je jen to, co se zobrazuje -- když se rozejdou, host uvidí jinou   │
// │ částku, než jakou dostane v potvrzení. Sjednotí se ve v2, až bude ceník v DB.       │
// │                                                                                    │
// │ CENÍK NENÍ SCHVÁLENÝ (`approved: false`) -- sazby jsou vymyšlené. Dokud to platí,   │
// │ sekce ceníku pod kartami vypíše upozornění, aby se placeholder nedal splést         │
// │ s platnou nabídkou.                                                                │
// └────────────────────────────────────────────────────────────────────────────────────┘
//
// Popisky skupin, prahů i poznámek jsou v client/src/lsi/<lang>.json pod "pricing".

export const approved = false;

// Sazba závisí na počtu osob (do 5 / od 6) a na délce pobytu (víc nocí = levněji).
// Zobrazujeme sloupce podle skupin osob a řádky podle prahů délky.
export const guestTiers = [{ code: "upTo5" }, { code: "over5" }];

export const nightTiers = [
  { code: "n1", minNights: 1 },
  { code: "n3", minNights: 3 },
  { code: "n5", minNights: 5 },
  { code: "n7", minNights: 7, highlighted: true },
];

// Kč za noc. Zrcadlí `pricing.rates.web` v server/config.js.
export const rates = {
  upTo5: { 1: 3900, 3: 3600, 5: 3300, 7: 3000 },
  over5: { 1: 4900, 3: 4600, 5: 4300, 7: 4000 },
};

export const notes = ["wholeCottage", "included", "longerIsCheaper"];

export default { approved, guestTiers, nightTiers, rates, notes };
