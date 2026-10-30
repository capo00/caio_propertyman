// Z barrelu se vezme jen `Call` (caio-ui `sideEffects: false`), `Crud` s tabulkami do webu
// nepřijde (design-v2.md § 4). Přístup přes tečku, ne destrukturováním jmenného prostoru.
import { UiElements } from "caio-ui";

const Call = UiElements.Call;

// Jedno místo, kde se volá server. Bez toho by byly názvy use casů rozsypané po komponentách
// a přejmenování endpointu by znamenalo hledat je po celém klientovi.
//
// URI jsou relativní -- dev i produkce jsou same-origin (devkit servíruje klienta ze
// serverového portu), takže žádný base URL ani proxy neexistuje.
//
// Chyba >= 400 se hodí jako Error s `message` a `dtoOut` (tam je `code` a `paramMap`).

const Calls = {
  /** Obsazené intervaly pro kalendář. Vrací JEN termíny, žádná osobní data. */
  getAvailability(dateFrom, dateTo) {
    return Call.cmdGet("availability/get", { dateFrom, dateTo });
  },

  /** Orientační cena. Závazná je až ta, kterou spočítá server při vytvoření rezervace. */
  calculatePrice(dateFrom, dateTo, guestCount) {
    return Call.cmdGet("price/calculate", { dateFrom, dateTo, guestCount });
  },

  /** Ceny za pobyt pro stránku Ceník, spočtené stejně jako cena rezervace. */
  listPrices() {
    return Call.cmdGet("price/list");
  },

  createReservation(dtoIn) {
    return Call.cmdPost("reservation/create", dtoIn);
  },

  /**
   * Recenze pro veřejnou sekci. Bez přihlášení vrací server JEN schválené -- filtr `approved`
   * je konstanta na serveru, ne parametr, aby se `state=pending` nedalo vyžádat zvenčí
   * (design-v2.md § 7).
   */
  listReviews() {
    return Call.cmdGet("review/list");
  },
};

/** Kód chyby ze serveru, ať se na něj dá reagovat bez porovnávání textu hlášky. */
export function errorCodeOf(e) {
  return e?.dtoOut?.code ?? null;
}

export default Calls;
