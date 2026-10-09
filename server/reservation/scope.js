import { ACTIVE_STATE_LIST, ARCHIVED_STATE_LIST } from "./states.js";

// Rozdělení výpisu v adminu na Aktivní a Archiv (rozhodnutí majitele 2026-10-09).
//
// Archiv = všechno ukončené: pobyt proběhl, nebo je zrušený. U rezervace hosta to říká stav
// (`completed` označí vlastník po pobytu, zamítnutí / storno / propadnutí jsou konečné). Blokace
// termínu a importy z portálů ale žádné akce stavu nemají a zůstávají `confirmed` navždy -- ty jsou
// v archivu, jakmile termín skončí (`dateTo` je den odjezdu, exkluzivní).
//
// Potvrzená rezervace hosta, jejíž pobyt už proběhl, zůstává v Aktivních, dokud ji vlastník
// neukončí: čeká na něj krok (doplatek, ukončení pobytu).

export const SCOPE_LIST = ["active", "archive"];

// Rezervace hosta = vlastní (ne import) a s kontaktem; stejná definice jako `isGuestReservation`.
const NOT_GUEST = { $or: [{ icalFeedCode: { $ne: null } }, { contact: null }] };

/**
 * Mongo filtr rozsahu. `today` je ISO datum v časové zóně chalupy.
 *
 * Aktivní je doplněk archivu (`$nor`), ne vlastní výčet: záznam s neznámým stavem nebo bez
 * `dateTo` tak skončí v Aktivních a nezmizí z obou záložek (oponentní review 2026-10-09).
 */
export function scopeQuery(scope, today) {
  const archive = {
    $or: [
      { state: { $in: ARCHIVED_STATE_LIST } },
      { state: { $in: ACTIVE_STATE_LIST }, dateTo: { $lte: today }, ...NOT_GUEST },
    ],
  };
  return scope === "archive" ? archive : { $nor: [archive] };
}


/** Rozsah jednoho záznamu -- totéž pravidlo jako `scopeQuery` (admin podle něj vrací „Zpět“). */
export function scopeOf(item, today) {
  const guest = item.icalFeedCode == null && item.contact != null;
  if (ARCHIVED_STATE_LIST.includes(item.state)) return "archive";
  const ended = typeof item.dateTo === "string" && item.dateTo <= today;
  return ACTIVE_STATE_LIST.includes(item.state) && !guest && ended ? "archive" : "active";
}
