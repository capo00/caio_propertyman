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
 * Co jiná přijatá částka změní na plánu, ať to majitelka vidí před potvrzením. Plán po akci počítá
 * server v náhledu (`emailPreview` → `plan`), tady se jen porovná s rezervací:
 * - změněná cena (doplatek nebo celá částka najednou) → `{ totalPrice }`;
 * - změněný doplatek (záloha) → `{ balanceAmount }`, 0 = doplatek odpadá (zaplaceno vše).
 * null = beze změny nebo náhled zatím není.
 */
export function planChange(item, plan) {
  if (!item || !plan) return null;
  if (plan.totalPrice !== item.totalPrice) return { totalPrice: plan.totalPrice };
  if (plan.balanceAmount !== item.balanceAmount) return { balanceAmount: plan.balanceAmount ?? 0 };
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

/** Kolik dní před splatností doplatku už připomínka zálohy žádá celou částku (server EMAIL_WINDOW.balanceReminder). */
const FULL_DUE_DAYS = 3;

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Celá částka, kterou připomínka zálohy žádá ve fázi `fullDue` (server/reservation/states.js
 * `reminderPhase`): záloha je po splatnosti a do splatnosti doplatku zbývají 3 dny a méně. E-mail
 * pak chce celou cenu do splatnosti doplatku (`dueDate`), po ní co nejdříve (`dueDate` null).
 * null = jiná fáze (žádá se jen záloha nebo doplatek).
 */
export function reminderFullDue(item, email, today) {
  if (email !== "depositReminder" || !item?.depositDueDate || today <= item.depositDueDate) return null;
  if (!item.balanceDueDate || item.balancePaidDate || !(item.balanceAmount > 0)) return null;
  if (today < addDaysIso(item.balanceDueDate, -FULL_DUE_DAYS)) return null;
  return { amount: item.totalPrice, dueDate: item.balanceDueDate >= today ? item.balanceDueDate : null };
}

/** Jen změněné hodnoty připomínky -- prázdný objekt = beze změny („Uložit“ nemá co uložit). */
export function reminderPlanChanges(plan, { amount, dueDate }) {
  if (!plan) return {};
  return { ...(amount !== plan.amount ? { amount } : null), ...(dueDate !== plan.dueDate ? { dueDate } : null) };
}
