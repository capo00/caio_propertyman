import dao from "../reservation/dao.js";
import { STATE } from "../reservation/states.js";

// Předběžná obsazenost: žádost nebo přijatá rezervace, za kterou zatím nic nepřišlo. Web ji
// ukazuje jinou barvou než potvrzenou (aspoň částečně zaplacenou), blokaci a import
// (majitel 2026-10-09).
const TENTATIVE_STATE_LIST = [STATE.REQUESTED, STATE.AWAITING_DEPOSIT];

// Jeden dotaz nad jednou kolekcí bez ohledu na `source` -- proto obsazenost z portálů blokuje
// web a naopak. To je celý důvod, proč jsou vlastní rezervace i importy v jedné kolekci.

/**
 * Obsazené intervaly pro kalendář. Vrací JEN termíny a jestli jsou předběžné (`tentative`) --
 * žádná jména, kontakty ani informaci, odkud obsazenost je. Endpoint je veřejný, takže se odsud
 * nesmí dostat nic osobního.
 */
export async function getOccupied(dateFrom, dateTo) {
  const list = await dao.findOverlapping(dateFrom, dateTo);
  return list
    .map(({ dateFrom, dateTo, state }) => ({ dateFrom, dateTo, tentative: TENTATIVE_STATE_LIST.includes(state) }))
    .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
}

/** Je termín volný? Ostré nerovnosti v findOverlapping -- navazující pobyty nekolidují. */
export async function isFree(dateFrom, dateTo) {
  const list = await dao.findOverlapping(dateFrom, dateTo);
  return list.length === 0;
}
