// H5 — Rezervace potvrzena (host, po „Záloha přijata“; i ruční rezervace vytvořená jako potvrzená).
import { p, facts, quote, signature } from "../blocks.js";
import { balancePayment, hasUnpaidBalance, cancellation } from "./_shared.js";

/** Co je zaplacené -- stejné pro všechny jazyky. */
function paid(c) {
  const pay = c.r.payment;
  const depositPaid = Boolean(pay?.deposit?.paidDate);
  return { pay, depositPaid, fullPaid: depositPaid && !pay.balance };
}

export default {
  code: "reservationConfirmed",
  recipient: "guest",
  cs: {
    subject: (c) => `Rezervace je závazně potvrzena — ${c.stay}`,
    body: (c) => {
      const { pay, depositPaid, fullPaid } = paid(c);
      return [
        p("Dobrý den,"),
        p(
          fullPaid
            ? "platbu jsme přijali, děkujeme. Vaše rezervace v Roubeném ráji je závazně potvrzena."
            : depositPaid
              ? "zálohu jsme přijali, děkujeme. Vaše rezervace v Roubeném ráji je závazně potvrzena."
              : "vaše rezervace v Roubeném ráji je závazně potvrzena.",
        ),
        facts([
          ["Termín", c.stay],
          c.r.guestCount && ["Počet osob", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Celková cena", c.f.price(pay.totalPrice)],
          depositPaid && !fullPaid && ["Přijatá záloha", c.f.price(pay.deposit.amount)],
          hasUnpaidBalance(c) && ["Zbývá doplatit", `${c.f.price(c.balanceAmount)}, splatný do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        hasUnpaidBalance(c) && balancePayment(c),
        p("Příjezd od 15:00, odjezd do 10:00. Dva dny před příjezdem vám pošleme informace k pobytu."),
        cancellation(c),
        p("Těšíme se na vás."),
        signature(),
      ];
    },
  },
  en: {
    subject: (c) => `Your booking is confirmed — ${c.stay}`,
    body: (c) => {
      const { pay, depositPaid, fullPaid } = paid(c);
      return [
        p("Hello,"),
        p(
          fullPaid
            ? "We have received your payment, thank you. Your booking at Roubený ráj is now confirmed and binding."
            : depositPaid
              ? "We have received your deposit, thank you. Your booking at Roubený ráj is now confirmed and binding."
              : "Your booking at Roubený ráj is confirmed and binding.",
        ),
        facts([
          ["Dates", c.stay],
          c.r.guestCount && ["Guests", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Total price", c.f.price(pay.totalPrice)],
          depositPaid && !fullPaid && ["Deposit received", c.f.price(pay.deposit.amount)],
          hasUnpaidBalance(c) && ["Balance to pay", `${c.f.price(c.balanceAmount)}, due by ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        hasUnpaidBalance(c) && balancePayment(c),
        p("Check-in from 15:00, check-out by 10:00. Two days before your arrival we will send you information for your stay."),
        cancellation(c),
        p("We look forward to seeing you."),
        signature(),
      ];
    },
  },
  de: {
    subject: (c) => `Ihre Buchung ist verbindlich bestätigt — ${c.stay}`,
    body: (c) => {
      const { pay, depositPaid, fullPaid } = paid(c);
      return [
        p("Guten Tag,"),
        p(
          fullPaid
            ? "Ihre Zahlung ist bei uns eingegangen, vielen Dank. Ihre Buchung im Roubený ráj ist verbindlich bestätigt."
            : depositPaid
              ? "Ihre Anzahlung ist bei uns eingegangen, vielen Dank. Ihre Buchung im Roubený ráj ist verbindlich bestätigt."
              : "Ihre Buchung im Roubený ráj ist verbindlich bestätigt.",
        ),
        facts([
          ["Termin", c.stay],
          c.r.guestCount && ["Personen", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Gesamtpreis", c.f.price(pay.totalPrice)],
          depositPaid && !fullPaid && ["Erhaltene Anzahlung", c.f.price(pay.deposit.amount)],
          hasUnpaidBalance(c) && ["Noch zu zahlen", `${c.f.price(c.balanceAmount)}, fällig bis ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        hasUnpaidBalance(c) && balancePayment(c),
        p("Anreise ab 15:00 Uhr, Abreise bis 10:00 Uhr. Zwei Tage vor Ihrer Anreise schicken wir Ihnen Informationen zu Ihrem Aufenthalt."),
        cancellation(c),
        p("Wir freuen uns auf Sie."),
        signature(),
      ];
    },
  },
  pl: {
    subject: (c) => `Rezerwacja jest wiążąco potwierdzona — ${c.stay}`,
    body: (c) => {
      const { pay, depositPaid, fullPaid } = paid(c);
      return [
        p("Dzień dobry,"),
        p(
          fullPaid
            ? "Otrzymaliśmy Państwa płatność, dziękujemy. Rezerwacja w obiekcie Roubený ráj jest wiążąco potwierdzona."
            : depositPaid
              ? "Otrzymaliśmy Państwa zaliczkę, dziękujemy. Rezerwacja w obiekcie Roubený ráj jest wiążąco potwierdzona."
              : "Państwa rezerwacja w obiekcie Roubený ráj jest wiążąco potwierdzona.",
        ),
        facts([
          ["Termin", c.stay],
          c.r.guestCount && ["Liczba osób", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Cena całkowita", c.f.price(pay.totalPrice)],
          depositPaid && !fullPaid && ["Otrzymana zaliczka", c.f.price(pay.deposit.amount)],
          hasUnpaidBalance(c) && ["Pozostało do zapłaty", `${c.f.price(c.balanceAmount)}, płatne do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        hasUnpaidBalance(c) && balancePayment(c),
        p("Przyjazd od 15:00, wyjazd do 10:00. Dwa dni przed przyjazdem wyślemy Państwu informacje dotyczące pobytu."),
        cancellation(c),
        p("Cieszymy się na Państwa przyjazd."),
        signature(),
      ];
    },
  },
  sk: {
    subject: (c) => `Rezervácia je záväzne potvrdená — ${c.stay}`,
    body: (c) => {
      const { pay, depositPaid, fullPaid } = paid(c);
      return [
        p("Dobrý deň,"),
        p(
          fullPaid
            ? "platbu sme prijali, ďakujeme. Vaša rezervácia v ubytovaní Roubený ráj je záväzne potvrdená."
            : depositPaid
              ? "zálohu sme prijali, ďakujeme. Vaša rezervácia v ubytovaní Roubený ráj je záväzne potvrdená."
              : "vaša rezervácia v ubytovaní Roubený ráj je záväzne potvrdená.",
        ),
        facts([
          ["Termín", c.stay],
          c.r.guestCount && ["Počet osôb", String(c.r.guestCount)],
          pay?.totalPrice != null && ["Celková cena", c.f.price(pay.totalPrice)],
          depositPaid && !fullPaid && ["Prijatá záloha", c.f.price(pay.deposit.amount)],
          hasUnpaidBalance(c) && ["Zostáva doplatiť", `${c.f.price(c.balanceAmount)}, splatný do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        hasUnpaidBalance(c) && balancePayment(c),
        p("Príchod od 15:00, odchod do 10:00. Dva dni pred príchodom vám pošleme informácie k pobytu."),
        cancellation(c),
        p("Tešíme sa na vás."),
        signature(),
      ];
    },
  },
};
