// Práce s ISO daty ("2026-09-04"). Celá appka drží termíny jako řetězce, ne Date:
// jsou to celodenní údaje bez času, lexikografické porovnání je totožné s chronologickým
// (takže Mongo umí $lt/$gt přímo nad nimi) a nemůže do nich vlézt časová zóna.
//
// Všechny převody na Date jdou přes UTC. S lokálním časem by pobyt přes přechod na letní čas
// vyšel na 6,96 nebo 7,04 dne a zaokrouhlení by ukázalo špatný počet nocí.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Je to platné ISO datum? Hlídá i neexistující dny -- "2026-02-30" projde regexem, ale ne tímhle. */
export function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = toUtcDate(value);
  // Date.UTC přeteče ("2026-02-30" -> 2. března), takže zpětný převod musí dát tentýž řetězec.
  return !Number.isNaN(date.getTime()) && toIso(date) === value;
}

export function toUtcDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date) {
  return date.toISOString().slice(0, 10);
}

/** Dnešek v UTC. Pro "termín nesmí být v minulosti" -- host rezervuje na celé dny. */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso, days) {
  return toIso(new Date(toUtcDate(iso).getTime() + days * MS_PER_DAY));
}

/** Počet nocí mezi příjezdem a odjezdem. dateTo je exkluzivní, takže je to prostý rozdíl dnů. */
export function nightsBetween(dateFrom, dateTo) {
  return Math.round((toUtcDate(dateTo).getTime() - toUtcDate(dateFrom).getTime()) / MS_PER_DAY);
}
