// H10 — Balance reminder (guest, cron 3 days before the balance is due — the cron is postponed).
import { p, signature } from "../blocks.js";
import { balancePayment } from "./_shared.js";

export default {
  code: "balanceReminder",
  recipient: "guest",
  cs: {
    subject: (c) => `Připomínka: doplatek za pobyt ${c.stay} — splatnost ${c.f.date(c.r.payment.balance.dueDate)}`,
    body: (c) => [
      p("Dobrý den,"),
      p(`blíží se váš pobyt v Roubeném ráji, ${c.stay}. Připomínáme splatnost doplatku:`),
      balancePayment(c),
      p("Pokud jste už zaplatili, děkujeme a tuto zprávu ignorujte."),
      p("S pozdravem"),
      signature(),
    ],
  },
  en: {
    subject: (c) => `Reminder: balance for your stay ${c.stay} — due ${c.f.date(c.r.payment.balance.dueDate)}`,
    body: (c) => [
      p("Hello,"),
      p(`Your stay at Roubený ráj, ${c.stay}, is coming up. This is a reminder that the balance is due:`),
      balancePayment(c),
      p("If you have already paid, thank you, and please ignore this message."),
      p("Kind regards"),
      signature(),
    ],
  },
  de: {
    subject: (c) => `Erinnerung: Restzahlung für Ihren Aufenthalt ${c.stay} — fällig am ${c.f.date(c.r.payment.balance.dueDate)}`,
    body: (c) => [
      p("Guten Tag,"),
      p(`Ihr Aufenthalt im Roubený ráj, ${c.stay}, rückt näher. Wir möchten Sie an die Fälligkeit der Restzahlung erinnern:`),
      balancePayment(c),
      p("Falls Sie bereits bezahlt haben, vielen Dank — dann betrachten Sie diese Nachricht bitte als gegenstandslos."),
      p("Mit freundlichen Grüßen"),
      signature(),
    ],
  },
  pl: {
    subject: (c) => `Przypomnienie: dopłata za pobyt ${c.stay} — termin płatności ${c.f.date(c.r.payment.balance.dueDate)}`,
    body: (c) => [
      p("Dzień dobry,"),
      p(`Zbliża się Państwa pobyt w obiekcie Roubený ráj, ${c.stay}. Przypominamy o terminie płatności dopłaty:`),
      balancePayment(c),
      p("Jeśli już Państwo zapłacili, dziękujemy i prosimy zignorować tę wiadomość."),
      p("Z pozdrowieniami"),
      signature(),
    ],
  },
  sk: {
    subject: (c) => `Pripomienka: doplatok za pobyt ${c.stay} — splatnosť ${c.f.date(c.r.payment.balance.dueDate)}`,
    body: (c) => [
      p("Dobrý deň,"),
      p(`blíži sa váš pobyt v ubytovaní Roubený ráj, ${c.stay}. Pripomíname splatnosť doplatku:`),
      balancePayment(c),
      p("Ak ste už zaplatili, ďakujeme a túto správu ignorujte."),
      p("S pozdravom"),
      signature(),
    ],
  },
};
