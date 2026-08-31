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

export const approved = false;

// Sazba závisí na počtu osob (do 5 / od 6) a na délce pobytu (víc nocí = levněji).
// Zobrazujeme sloupce podle skupin osob a řádky podle prahů délky.
export const guestTiers = [
  { code: "upTo5", label: { cs: "1–5 osob" } },
  { code: "over5", label: { cs: "6 a více osob" } },
];

export const nightTiers = [
  { minNights: 1, label: { cs: "1–2 noci" } },
  { minNights: 3, label: { cs: "3–4 noci" } },
  { minNights: 5, label: { cs: "5–6 nocí" } },
  { minNights: 7, label: { cs: "7 nocí a víc" }, highlighted: true },
];

// Kč za noc. Zrcadlí `pricing.rates.web` v server/config.js.
export const rates = {
  upTo5: { 1: 3900, 3: 3600, 5: 3300, 7: 3000 },
  over5: { 1: 4900, 3: 4600, 5: 4300, 7: 4000 },
};

export const notes = [
  { cs: "Ceny jsou za celou chalupu, nikoliv za osobu." },
  { cs: "Dřevo, povlečení a ručníky jsou vždy v ceně." },
  { cs: "Čím delší pobyt, tím nižší cena za noc." },
];

export default { approved, guestTiers, nightTiers, rates, notes };
