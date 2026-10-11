import Call from "caio-ui/src/caio-ui-elements/call";

// Volání serveru z adminu. Stejný důvod jako u client/src/calls.js: názvy use casů na jednom
// místě, ne rozsypané po komponentách.

/**
 * Mapa volání pro `UiElements.CrudContext`.
 *
 * Předává se VŽDYCKY, i když endpointy sedí na konvenci `entity/list|create|update|delete`.
 * Důvod: výchozí mapa v `CrudContext` obsahuje i `createMany` a `deleteMany` a `Crud` podle
 * jejich přítomnosti kreslí tlačítko „Vytvořit více“ a hromadné mazání. Tyhle use casy server
 * nemá, takže by nabízel akci, která skončí na 404.
 */
export function entityCalls(entity, overrides = {}) {
  return {
    list: (dtoIn) => Call.cmdGet(`${entity}/list`, dtoIn),
    createItem: (dtoIn) => Call.cmdPost(`${entity}/create`, dtoIn),
    updateItem: (dtoIn) => Call.cmdPost(`${entity}/update`, dtoIn),
    deleteItem: (dtoIn) => Call.cmdPost(`${entity}/delete`, dtoIn),
    ...overrides,
  };
}

/**
 * Rezervace. `createItem` míří na `reservation/createManual`, ne na `reservation/create`:
 * veřejný endpoint je záměrně hloupý (honeypot, captcha, rate limit, vždy `requested` a `source: web`)
 * a admin do něj nepatří (design-v2.md § 6). Přesně na tohle má `CrudContext` prop `calls`.
 */
export const reservationCalls = entityCalls("reservation", {
  createItem: (dtoIn) => Call.cmdPost("reservation/createManual", dtoIn),
});

export const reviewCalls = entityCalls("review");

export const icalFeedCalls = entityCalls("icalFeed");

/** Detail rezervace včetně historie (`eventList`) a jazyků, ve kterých jde poslat e-mail. */
export function getReservation(id) {
  return Call.cmdGet("reservation/get", { id });
}

/**
 * Změna stavu (docs/proposal-reservation-flow.md § 3). Server ověří, že je akce z aktuálního
 * stavu povolená, a podle `sendEmail` pošle hostovi e-mail.
 */
export function transitionReservation(dtoIn) {
  return Call.cmdPost("reservation/transition", dtoIn);
}

/** E-mail, který by akce poslala -- bez zápisu. `{ email: null }` = akce e-mail nemá. */
export function previewReservationEmail(dtoIn) {
  return Call.cmdGet("reservation/emailPreview", dtoIn);
}

/**
 * Náhledy e-mailu k formulářům (nová rezervace, úprava) -- stejný dtoIn jako uložení, nic se
 * nezapíše. `{ email: null }` = uložení by e-mail neposlalo.
 */
export function previewCreateEmail(dtoIn) {
  return Call.cmdPost("reservation/createEmailPreview", dtoIn);
}

export function previewUpdateEmail(dtoIn) {
  return Call.cmdPost("reservation/updateEmailPreview", dtoIn);
}

/** Ruční spuštění importu. Bez `code` projede všechny aktivní feedy. */
export function syncIcalFeed(code) {
  return Call.cmdPost("icalFeed/sync", code ? { code } : undefined);
}

/**
 * Faktury na žádost (docs/proposal-invoice-pdf.md). PDF chodí v JSONu jako `pdfBase64`,
 * stažení si z něj udělá klient (`components/invoice/download.js`).
 */
export function getInvoiceDraft(reservationId) {
  return Call.cmdGet("invoice/draft", { reservationId });
}

export function listInvoices(reservationId) {
  return Call.cmdGet("invoice/list", { reservationId });
}

export function createInvoice(dtoIn) {
  return Call.cmdPost("invoice/create", dtoIn);
}

export function downloadInvoice(id) {
  return Call.cmdGet("invoice/download", { id });
}

export function cancelInvoice(id) {
  return Call.cmdPost("invoice/cancel", { id });
}
