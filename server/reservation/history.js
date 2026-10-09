// Historie rezervace (`eventList`): kdo, kdy, co udělal a jaké e-maily k tomu odešly.
// Komunikace s hostem je součást události, ne samostatný seznam (docs/proposal-reservation-flow.md § 2.1).

/** Kdo akci udělal -- jen identita a jméno, nic dalšího z dokumentu identity. null = host / systém. */
export function actorOf(identity) {
  if (!identity) return null;
  const name = identity.name || [identity.firstName, identity.surname].filter(Boolean).join(" ") || null;
  return { identity: identity.identity ?? null, name };
}

/** Nová událost. Nedefinovaná pole se vynechají, ať historie nenese prázdné klíče. */
export function createEvent(type, fields = {}) {
  const event = { at: new Date().toISOString(), by: fields.by ?? null, type };
  for (const [key, value] of Object.entries(fields)) {
    if (key !== "by" && value !== undefined) event[key] = value;
  }
  if (!event.emailList) event.emailList = [];
  return event;
}

function get(object, path) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);
}

function same(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Rozdíl mezi dvěma stavy dokumentu v zadaných polích (tečková cesta). */
export function diff(before, after, pathList) {
  const changes = [];
  for (const field of pathList) {
    const from = get(before, field);
    const to = get(after, field);
    if (!same(from, to)) changes.push({ field, from: from ?? null, to: to ?? null });
  }
  return changes;
}
