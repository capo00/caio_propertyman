// Obsazenost po půldnech -- čistá logika bez uu5, ať jde testovat (occupancy.test.js).
//
// Obsazenost z availability/get jsou intervaly NOCÍ: `dateFrom` je den příjezdu, `dateTo`
// (EXKLUZIVNÍ) den odjezdu. Příjezd je odpoledne a odjezd dopoledne, takže den má dvě půlky:
// dopoledne patří noci PŘED ním (odjíždějící host), odpoledne noci PO něm (přijíždějící host).
// Den příjezdu cizí rezervace je proto dopoledne volný -- host si ho může vybrat jako konec
// svého termínu -- a den odjezdu je odpoledne volný jako začátek (majitel 2026-11-06).
//
// uu5g05 1.54 (alfa) to v `dateMap` Calendaru i FormDateRange umí vyjádřit: `disabled:
// "exceptEnd"` / `"exceptStart"` pustí den jen jako konec / začátek rozsahu a `className`
// den rozdělí úhlopříčkou na dvě barvy (components/occupancy-date-map.js).

const MS_PER_DAY = 86400000;

const shiftDay = (iso, days) => new Date(Date.parse(iso) + days * MS_PER_DAY).toISOString().slice(0, 10);

/**
 * Noc začínající daným dnem → "confirmed" | "tentative". Potvrzená obsazenost má přednost:
 * noc, kde se kryje s předběžnou, je prostě obsazená.
 */
export function occupiedNights(occupiedList) {
  const nights = new Map();
  for (const { dateFrom, dateTo, tentative } of occupiedList ?? []) {
    for (let iso = dateFrom; iso < dateTo; iso = shiftDay(iso, 1)) {
      if (!tentative || !nights.has(iso)) nights.set(iso, tentative ? "tentative" : "confirmed");
    }
  }
  return nights;
}

/**
 * Každý den, kterého se obsazenost aspoň půlkou týká → `{ am, pm }`: druh obsazenosti
 * dopoledne (noc před dnem) a odpoledne (noc po dni), `null` = ta půlka je volná.
 */
export function occupiedDays(occupiedList) {
  const nights = occupiedNights(occupiedList);
  const days = new Map();
  for (const [night, kind] of nights) {
    days.set(night, { am: nights.get(shiftDay(night, -1)) ?? null, pm: kind });
    const next = shiftDay(night, 1);
    if (!nights.has(next)) days.set(next, { am: kind, pm: null });
  }
  return days;
}

/**
 * Jak se den vybírá a kreslí:
 * - `disabled`: `true` (celý den obsazený), `"exceptEnd"` (odpoledne obsazené -- jen jako
 *   konec termínu), `"exceptStart"` (dopoledne obsazené -- jen jako začátek);
 * - `kind`: druh obsazenosti pro barvu celého dne, když jsou obě půlky stejné;
 * - `split`: `[dopoledne, odpoledne]`, když se půlky liší (`null` = volná půlka).
 */
export function dayRule({ am, pm }) {
  if (am && pm) return am === pm ? { disabled: true, kind: am, split: null } : { disabled: true, kind: am, split: [am, pm] };
  if (pm) return { disabled: "exceptEnd", kind: null, split: [null, pm] };
  return { disabled: "exceptStart", kind: null, split: [am, null] };
}
