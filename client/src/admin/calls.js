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
 * veřejný endpoint je záměrně hloupý (honeypot, rate limit, vždy `pending` a `source: web`)
 * a admin do něj nepatří (design-v2.md § 6). Přesně na tohle má `CrudContext` prop `calls`.
 */
export const reservationCalls = entityCalls("reservation", {
  createItem: (dtoIn) => Call.cmdPost("reservation/createManual", dtoIn),
});

export const reviewCalls = entityCalls("review");

export const icalFeedCalls = entityCalls("icalFeed");

/** Potvrzení / storno rezervace. Server podle toho pošle hostovi e-mail. */
export function setReservationState(id, state) {
  return Call.cmdPost("reservation/setState", { id, state });
}

/** Ruční spuštění importu. Bez `code` projede všechny aktivní feedy. */
export function syncIcalFeed(code) {
  return Call.cmdPost("icalFeed/sync", code ? { code } : undefined);
}
