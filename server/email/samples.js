// Vzorové rezervace pro náhled e-mailů (`npm run email:preview`) a testy. Každá šablona
// dostane rezervaci ve stavu, ve kterém se reálně posílá.

const contact = { name: "Jan Novák", email: "jan.novak@seznam.cz", phone: "+420 777 123 456" };

const base = {
  id: "6710c0ffee00000000000001",
  source: "web",
  lang: "cs",
  dateFrom: "2026-11-07",
  dateTo: "2026-11-09",
  guestCount: 4,
  contact,
  note: "Přistýlka prosím, přijedeme kolem 18:00.",
  desc: null,
  reminder: {},
  eventList: [],
};

const plan = {
  totalPrice: 9000,
  variableSymbol: "26110701",
  deposit: { amount: 4500, dueDate: "2026-10-11", paidDate: null },
  balance: { dueDate: "2026-10-24", paidDate: null },
};

const fullPlan = {
  totalPrice: 9000,
  variableSymbol: "26102001",
  deposit: { amount: 9000, dueDate: "2026-10-11", paidDate: null },
  balance: null,
};

const requested = { ...base, state: "requested", payment: { totalPrice: 9000, variableSymbol: null, deposit: null, balance: null } };
const awaiting = { ...base, state: "awaitingDeposit", payment: plan };
const awaitingFull = { ...base, state: "awaitingDeposit", dateFrom: "2026-10-20", dateTo: "2026-10-23", payment: fullPlan };
const confirmed = { ...base, state: "confirmed", payment: { ...plan, deposit: { ...plan.deposit, paidDate: "2026-10-10" } } };
const confirmedPaid = { ...confirmed, payment: { ...confirmed.payment, balance: { ...plan.balance, paidDate: "2026-10-22" } } };

/** [kód šablony, popisek varianty, rezervace, volby] */
export const SAMPLES = [
  ["requestReceived", "žádost přijata", requested, {}],
  ["ownerNewRequest", "nová žádost (vlastník)", requested, {}],
  ["depositRequested", "záloha 50 %", awaiting, { message: "Přistýlku připravíme, těšíme se!" }],
  ["depositRequested", "celá částka (14 a méně dní)", awaitingFull, {}],
  ["requestRejected", "zamítnuto", { ...requested, state: "rejected" }, { message: "V tomto termínu už máme jinou rezervaci." }],
  ["depositReminder", "připomínka zálohy", awaiting, {}],
  ["reservationConfirmed", "záloha přijata, doplatek zbývá", confirmed, {}],
  ["reservationConfirmed", "celá částka přijata", { ...awaitingFull, state: "confirmed", payment: { ...fullPlan, deposit: { ...fullPlan.deposit, paidDate: "2026-10-10" } } }, {}],
  ["reservationExpired", "propadlo", { ...awaiting, state: "expired" }, {}],
  ["reservationCancelled", "storno se zaplacenou zálohou", { ...confirmed, state: "cancelled" }, { message: "Na vaši žádost." }],
  ["arrivalInfo", "informace k příjezdu, doplatek zaplacený", confirmedPaid, {}],
  ["thankYou", "děkujeme", { ...confirmedPaid, state: "completed" }, {}],
  ["reservationChanged", "posunutá splatnost zálohy", { ...awaiting, payment: { ...plan, deposit: { ...plan.deposit, dueDate: "2026-10-14" } } }, {
    message: "Domluvili jsme se po telefonu.",
    changes: [{ field: "payment.deposit.dueDate", from: "2026-10-11", to: "2026-10-14" }],
  }],
  ["balanceReminder", "připomínka doplatku", confirmed, {}],
  ["ownerDepositOverdue", "záloha po splatnosti (vlastník)", awaiting, {}],
];
