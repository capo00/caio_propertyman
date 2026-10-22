// H9 — Reservation changed (guest, after an edit with "Send the guest an email" checked).
// Lists what changed, the current state and the payment details for what is due now.
import { p, facts, list, quote, signature } from "../blocks.js";
import { STATE } from "../../reservation/states.js";
import { depositPayment, balancePayment, hasUnpaidBalance, isFullPayment } from "./_shared.js";

// Labels of the changed fields per language. A field not listed here is left out of the changes.
const FIELD_LABEL = {
  cs: {
    dateFrom: "Příjezd",
    dateTo: "Odjezd",
    guestCount: "Počet osob",
    "payment.totalPrice": "Celková cena",
    "payment.deposit.amount": "Záloha",
    "payment.deposit.dueDate": "Splatnost zálohy",
    "payment.balance.dueDate": "Splatnost doplatku",
  },
  en: {
    dateFrom: "Arrival",
    dateTo: "Departure",
    guestCount: "Guests",
    "payment.totalPrice": "Total price",
    "payment.deposit.amount": "Deposit",
    "payment.deposit.dueDate": "Deposit due date",
    "payment.balance.dueDate": "Balance due date",
  },
  de: {
    dateFrom: "Anreise",
    dateTo: "Abreise",
    guestCount: "Personen",
    "payment.totalPrice": "Gesamtpreis",
    "payment.deposit.amount": "Anzahlung",
    "payment.deposit.dueDate": "Fälligkeit der Anzahlung",
    "payment.balance.dueDate": "Fälligkeit der Restzahlung",
  },
  pl: {
    dateFrom: "Przyjazd",
    dateTo: "Wyjazd",
    guestCount: "Liczba osób",
    "payment.totalPrice": "Cena całkowita",
    "payment.deposit.amount": "Zaliczka",
    "payment.deposit.dueDate": "Termin płatności zaliczki",
    "payment.balance.dueDate": "Termin płatności dopłaty",
  },
  sk: {
    dateFrom: "Príchod",
    dateTo: "Odchod",
    guestCount: "Počet osôb",
    "payment.totalPrice": "Celková cena",
    "payment.deposit.amount": "Záloha",
    "payment.deposit.dueDate": "Splatnosť zálohy",
    "payment.balance.dueDate": "Splatnosť doplatku",
  },
};
const DATE_FIELDS = new Set(["dateFrom", "dateTo", "payment.deposit.dueDate", "payment.balance.dueDate"]);
const PRICE_FIELDS = new Set(["payment.totalPrice", "payment.deposit.amount"]);

function value(c, field, raw) {
  if (raw == null) return "—";
  if (DATE_FIELDS.has(field)) return c.f.date(raw);
  if (PRICE_FIELDS.has(field)) return c.f.price(raw);
  return String(raw);
}

/** List of changes "Label: before → after" in the email's language. */
function changeList(c) {
  const labels = FIELD_LABEL[c.lang] ?? FIELD_LABEL.cs;
  return list((c.changes ?? []).filter(({ field }) => labels[field]).map(({ field, from, to }) => `${labels[field]}: ${value(c, field, from)} → ${value(c, field, to)}`));
}

/** What is due now -- the same for all languages. */
function due(c) {
  const pay = c.r.payment;
  const depositDue = c.r.state === STATE.AWAITING_DEPOSIT && pay?.deposit && !pay.deposit.paidDate;
  return { pay, depositDue, balanceDue: !depositDue && c.r.state === STATE.CONFIRMED && hasUnpaidBalance(c) };
}

export default {
  code: "reservationChanged",
  recipient: "guest",
  cs: {
    subject: (c) => `Změna vaší rezervace — ${c.stay}`,
    body: (c) => {
      const { pay, depositDue, balanceDue } = due(c);
      return [
        p("Dobrý den,"),
        p("ve vaší rezervaci v Roubeném ráji jsme upravili:"),
        changeList(c),
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
        balanceDue && balancePayment(c),
        p("S pozdravem"),
        signature(),
      ];
    },
  },
  en: {
    subject: (c) => `Change to your booking — ${c.stay}`,
    body: (c) => {
      const { pay, depositDue, balanceDue } = due(c);
      return [
        p("Hello,"),
        p("We have made the following changes to your booking at Roubený ráj:"),
        changeList(c),
        quote(c.message),
        p("Current details:"),
        facts([
          ["Dates", c.stay],
          c.r.guestCount && ["Guests", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Total price", c.f.price(pay.totalPrice)],
          depositDue && [isFullPayment(c) ? "Full amount" : "Deposit", `${c.f.price(pay.deposit.amount)}, due by ${c.f.date(pay.deposit.dueDate)}`],
          hasUnpaidBalance(c) && ["Balance", `${c.f.price(c.balanceAmount)}, due by ${c.f.date(pay.balance.dueDate)}`],
        ]),
        depositDue && depositPayment(c),
        balanceDue && balancePayment(c),
        p("Kind regards"),
        signature(),
      ];
    },
  },
  de: {
    subject: (c) => `Änderung Ihrer Buchung — ${c.stay}`,
    body: (c) => {
      const { pay, depositDue, balanceDue } = due(c);
      return [
        p("Guten Tag,"),
        p("an Ihrer Buchung im Roubený ráj haben wir Folgendes geändert:"),
        changeList(c),
        quote(c.message),
        p("Aktueller Stand:"),
        facts([
          ["Termin", c.stay],
          c.r.guestCount && ["Personen", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Gesamtpreis", c.f.price(pay.totalPrice)],
          depositDue && [isFullPayment(c) ? "Zu zahlen" : "Anzahlung", `${c.f.price(pay.deposit.amount)}, fällig am ${c.f.date(pay.deposit.dueDate)}`],
          hasUnpaidBalance(c) && ["Restzahlung", `${c.f.price(c.balanceAmount)}, fällig am ${c.f.date(pay.balance.dueDate)}`],
        ]),
        depositDue && depositPayment(c),
        balanceDue && balancePayment(c),
        p("Mit freundlichen Grüßen"),
        signature(),
      ];
    },
  },
  pl: {
    subject: (c) => `Zmiana Państwa rezerwacji — ${c.stay}`,
    body: (c) => {
      const { pay, depositDue, balanceDue } = due(c);
      return [
        p("Dzień dobry,"),
        p("W Państwa rezerwacji w obiekcie Roubený ráj zmieniliśmy:"),
        changeList(c),
        quote(c.message),
        p("Aktualny stan:"),
        facts([
          ["Termin", c.stay],
          c.r.guestCount && ["Liczba osób", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Cena całkowita", c.f.price(pay.totalPrice)],
          depositDue && [isFullPayment(c) ? "Cała kwota" : "Zaliczka", `${c.f.price(pay.deposit.amount)}, płatna do ${c.f.date(pay.deposit.dueDate)}`],
          hasUnpaidBalance(c) && ["Dopłata", `${c.f.price(c.balanceAmount)}, płatna do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        depositDue && depositPayment(c),
        balanceDue && balancePayment(c),
        p("Z pozdrowieniami"),
        signature(),
      ];
    },
  },
  sk: {
    subject: (c) => `Zmena vašej rezervácie — ${c.stay}`,
    body: (c) => {
      const { pay, depositDue, balanceDue } = due(c);
      return [
        p("Dobrý deň,"),
        p("vo vašej rezervácii v ubytovaní Roubený ráj sme upravili:"),
        changeList(c),
        quote(c.message),
        p("Aktuálny stav:"),
        facts([
          ["Termín", c.stay],
          c.r.guestCount && ["Počet osôb", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Celková cena", c.f.price(pay.totalPrice)],
          depositDue && [isFullPayment(c) ? "Celá suma" : "Záloha", `${c.f.price(pay.deposit.amount)}, splatná do ${c.f.date(pay.deposit.dueDate)}`],
          hasUnpaidBalance(c) && ["Doplatok", `${c.f.price(c.balanceAmount)}, splatný do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        depositDue && depositPayment(c),
        balanceDue && balancePayment(c),
        p("S pozdravom"),
        signature(),
      ];
    },
  },
};
