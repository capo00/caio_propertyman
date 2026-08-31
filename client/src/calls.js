import { UiElements } from "caio-ui";

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
    return UiElements.Call.cmdGet("availability/get", { dateFrom, dateTo });
  },

  /** Orientační cena. Závazná je až ta, kterou spočítá server při vytvoření rezervace. */
  calculatePrice(dateFrom, dateTo, guestCount) {
    return UiElements.Call.cmdGet("price/calculate", { dateFrom, dateTo, guestCount });
  },

  createReservation(dtoIn) {
    return UiElements.Call.cmdPost("reservation/create", dtoIn);
  },
};

/** Kód chyby ze serveru, ať se na něj dá reagovat bez porovnávání textu hlášky. */
export function errorCodeOf(e) {
  return e?.dtoOut?.code ?? null;
}

export default Calls;
