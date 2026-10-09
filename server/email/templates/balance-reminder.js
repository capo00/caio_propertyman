// H10 — Připomínka doplatku (host, cron 3 dny před splatností doplatku — cron je odložený).
import { p, signature } from "../blocks.js";
import { balancePayment } from "./_shared.js";

export default {
  code: "balanceReminder",
  recipient: "guest",
  cs: {
    subject: (c) => `Připomínka: doplatek za pobyt ${c.stay} — splatnost ${c.f.date(c.r.payment.balance.dueDate)}`,
    body: (c) => [
      p("Dobrý den,"),
      p(`blíží se váš pobyt v Roubeném ráji (${c.stay}). Připomínáme splatnost doplatku:`),
      balancePayment(c),
      p("Pokud jste už zaplatili, děkujeme a tuto zprávu ignorujte."),
      p("S pozdravem"),
      signature(),
    ],
  },
};
