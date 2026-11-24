// Peníze, které zadává modal změny stavu a modal připomínky (návrh majitelky 2026-11-24): co se
// předvyplní a co se pošle serveru. Bez uu5, ať jde testovat samostatně (modal-money.test.js).
// Jak se změna zapíše do platebního plánu, rozhoduje jen server (server/reservation/crud.js).

/** Akce, které označí platbu jako přijatou -- jen ty berou skutečně přijatou částku a datum. */
export const PAID_ACTION_LIST = ["markDepositPaid", "markBalancePaid"];

/** Částka, kterou „… přijata“ předvyplní: ta, kterou rezervace chce. null = akce částku nebere. */
export function receivedDefault(item, action) {
  if (action === "markDepositPaid") return item?.depositAmount ?? null;
  if (action === "markBalancePaid") return item?.balanceAmount ?? null;
  return null;
}

/**
 * Co modal změny stavu pošle serveru kromě e-mailu (do akce i do náhledu):
 * - „… přijata“: datum a částka vždy (server je bere jako skutečnost, i když se nezměnily);
 * - přijetí žádosti: cena jen změněná -- jinak platí uložená a historie nedostane prázdnou změnu;
 * - ostatní akce nic.
 */
export function transitionMoneyDtoIn({ action, item, price, paidAmount, paidDate }) {
  if (PAID_ACTION_LIST.includes(action)) return { paidDate, paidAmount };
  if (action === "approve" && price !== (item?.totalPrice ?? null)) return { totalPrice: price };
  return {};
}

/** Částka a splatnost platby, kterou připomínka žádá (výchozí hodnoty polí). */
export function reminderPlan(item, email) {
  if (email === "depositReminder") return { amount: item?.depositAmount ?? null, dueDate: item?.depositDueDate ?? "" };
  if (email === "balanceReminder") return { amount: item?.balanceAmount ?? null, dueDate: item?.balanceDueDate ?? "" };
  return { amount: null, dueDate: "" };
}

/** Jen změněné hodnoty připomínky -- prázdný objekt = beze změny („Uložit“ nemá co uložit). */
export function reminderPlanChanges(plan, { amount, dueDate }) {
  if (!plan) return {};
  return { ...(amount !== plan.amount ? { amount } : null), ...(dueDate !== plan.dueDate ? { dueDate } : null) };
}
