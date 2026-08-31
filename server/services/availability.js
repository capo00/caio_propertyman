import dao from "../reservation/dao.js";

// Jeden dotaz nad jednou kolekcí bez ohledu na `source` -- proto obsazenost z portálů blokuje
// web a naopak. To je celý důvod, proč jsou vlastní rezervace i importy v jedné kolekci.

/**
 * Obsazené intervaly pro kalendář. Vrací JEN termíny -- žádná jména, kontakty ani informaci,
 * odkud obsazenost je. Endpoint je veřejný, takže se odsud nesmí dostat nic osobního.
 */
export async function getOccupied(dateFrom, dateTo) {
  const list = await dao.findOverlapping(dateFrom, dateTo);
  return list
    .map(({ dateFrom, dateTo }) => ({ dateFrom, dateTo }))
    .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
}

/** Je termín volný? Ostré nerovnosti v findOverlapping -- navazující pobyty nekolidují. */
export async function isFree(dateFrom, dateTo) {
  const list = await dao.findOverlapping(dateFrom, dateTo);
  return list.length === 0;
}
