// H9 — Změna rezervace (host, po úpravě se zaškrtnutým „Poslat hostovi e-mail“).
// Vypíše, co se změnilo, aktuální stav a platební údaje k tomu, co je právě k úhradě.
import { p, facts, list, quote, signature } from "../blocks.js";
import { STATE } from "../../reservation/states.js";
import { depositPayment, balancePayment, hasUnpaidBalance, isFullPayment } from "./_shared.js";

const FIELD_LABEL = {
  dateFrom: "Příjezd",
  dateTo: "Odjezd",
  guestCount: "Počet osob",
  "payment.totalPrice": "Celková cena",
  "payment.deposit.amount": "Záloha",
  "payment.deposit.dueDate": "Splatnost zálohy",
  "payment.balance.dueDate": "Splatnost doplatku",
};
const DATE_FIELDS = new Set(["dateFrom", "dateTo", "payment.deposit.dueDate", "payment.balance.dueDate"]);
const PRICE_FIELDS = new Set(["payment.totalPrice", "payment.deposit.amount"]);

function value(c, field, raw) {
  if (raw == null) return "—";
  if (DATE_FIELDS.has(field)) return c.f.date(raw);
  if (PRICE_FIELDS.has(field)) return c.f.price(raw);
  return String(raw);
}

export default {
  code: "reservationChanged",
  recipient: "guest",
  cs: {
    subject: (c) => `Změna vaší rezervace — ${c.stay}`,
    body: (c) => {
      const pay = c.r.payment;
      const depositDue = c.r.state === STATE.AWAITING_DEPOSIT && pay?.deposit && !pay.deposit.paidDate;
      return [
        p("Dobrý den,"),
        p("ve vaší rezervaci v Roubeném ráji jsme upravili:"),
        list((c.changes ?? []).filter(({ field }) => FIELD_LABEL[field]).map(({ field, from, to }) => `${FIELD_LABEL[field]}: ${value(c, field, from)} → ${value(c, field, to)}`)),
        quote(c.message),
        p("Aktuální stav:"),
        facts([
          ["Termín", c.stay],
          c.r.guestCount && ["Počet osob", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Celková cena", c.f.price(pay.totalPrice)],
          depositDue && [isFullPayment(c) ? "Celá částka" : "Záloha", `${c.f.price(pay.deposit.amount)}, splatná do ${c.f.date(pay.deposit.dueDate)}`],
          hasUnpaidBalance(c) && ["Doplatek", `${c.f.price(c.balanceAmount)}, splatný do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        depositDue && depositPayment(c),
        !depositDue && c.r.state === STATE.CONFIRMED && hasUnpaidBalance(c) && balancePayment(c),
        p("S pozdravem"),
        signature(),
      ];
    },
  },
};
