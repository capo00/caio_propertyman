// H2 — Termín schválen, čekáme na zálohu (host, po „Přijmout“, „Obnovit“ a ruční rezervaci
// nevytvořené jako potvrzená). Varianta „celá částka najednou“ při 14 a méně dnech do příjezdu.
import { p, facts, quote, signature } from "../blocks.js";
import { depositPayment, isFullPayment, cancellation } from "./_shared.js";

export default {
  code: "depositRequested",
  recipient: "guest",
  cs: {
    subject: (c) =>
      isFullPayment(c)
        ? `Termín je pro vás volný — prosíme o úhradu do ${c.f.date(c.r.payment.deposit.dueDate)}`
        : `Termín je pro vás volný — prosíme o zálohu do ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const pay = c.r.payment;
      const full = isFullPayment(c);
      const due = c.f.date(pay.deposit.dueDate);
      return [
        p("Dobrý den,"),
        p(`termín ${c.stay} je pro vás volný a rádi vás u nás přivítáme.`),
        facts([
          ["Počet osob", String(c.r.guestCount)],
          ["Celková cena", c.f.price(pay.totalPrice)],
          full && ["Celá částka", `${c.f.price(pay.deposit.amount)}, splatná do ${due}`],
          !full && ["Záloha", `${c.f.price(pay.deposit.amount)}, splatná do ${due}`],
          !full && ["Doplatek", `${c.f.price(c.balanceAmount)}, splatný do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        depositPayment(c),
        p(
          full
            ? `Termín pro vás držíme do ${due}. Pokud platba do té doby nedorazí, rezervaci zrušíme a termín uvolníme. Jakmile platbu přijmeme, pošleme vám potvrzení závazné rezervace.`
            : `Termín pro vás držíme do ${due}. Pokud záloha do té doby nedorazí, rezervaci zrušíme a termín uvolníme. Jakmile zálohu přijmeme, pošleme vám potvrzení závazné rezervace.`,
        ),
        cancellation(c),
        p("S pozdravem"),
        signature(),
      ];
    },
  },
  en: {
    subject: (c) =>
      isFullPayment(c)
        ? `Your dates are available — please pay by ${c.f.date(c.r.payment.deposit.dueDate)}`
        : `Your dates are available — please pay the deposit by ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const pay = c.r.payment;
      const full = isFullPayment(c);
      const due = c.f.date(pay.deposit.dueDate);
      return [
        p("Hello,"),
        p(`The dates ${c.stay} are available for you and we look forward to welcoming you.`),
        facts([
          ["Guests", String(c.r.guestCount)],
          ["Total price", c.f.price(pay.totalPrice)],
          full && ["Full amount", `${c.f.price(pay.deposit.amount)}, due by ${due}`],
          !full && ["Deposit", `${c.f.price(pay.deposit.amount)}, due by ${due}`],
          !full && ["Balance", `${c.f.price(c.balanceAmount)}, due by ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        depositPayment(c),
        p(
          full
            ? `We are holding the dates for you until ${due}. If the payment has not arrived by then, we will cancel the booking and release the dates. As soon as we receive the payment, we will send you a confirmation of your binding booking.`
            : `We are holding the dates for you until ${due}. If the deposit has not arrived by then, we will cancel the booking and release the dates. As soon as we receive the deposit, we will send you a confirmation of your binding booking.`,
        ),
        cancellation(c),
        p("Kind regards"),
        signature(),
      ];
    },
  },
  de: {
    subject: (c) =>
      isFullPayment(c)
        ? `Ihr Termin ist frei — bitte zahlen Sie bis ${c.f.date(c.r.payment.deposit.dueDate)}`
        : `Ihr Termin ist frei — bitte leisten Sie die Anzahlung bis ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const pay = c.r.payment;
      const full = isFullPayment(c);
      const due = c.f.date(pay.deposit.dueDate);
      return [
        p("Guten Tag,"),
        p(`der Termin ${c.stay} ist für Sie frei und wir freuen uns, Sie bei uns begrüßen zu dürfen.`),
        facts([
          ["Personen", String(c.r.guestCount)],
          ["Gesamtpreis", c.f.price(pay.totalPrice)],
          full && ["Gesamtbetrag", `${c.f.price(pay.deposit.amount)}, fällig bis ${due}`],
          !full && ["Anzahlung", `${c.f.price(pay.deposit.amount)}, fällig bis ${due}`],
          !full && ["Restzahlung", `${c.f.price(c.balanceAmount)}, fällig bis ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        depositPayment(c),
        p(
          full
            ? `Wir halten den Termin bis ${due} für Sie frei. Geht die Zahlung bis dahin nicht ein, stornieren wir die Buchung und geben den Termin frei. Sobald die Zahlung eingegangen ist, schicken wir Ihnen die Bestätigung Ihrer verbindlichen Buchung.`
            : `Wir halten den Termin bis ${due} für Sie frei. Geht die Anzahlung bis dahin nicht ein, stornieren wir die Buchung und geben den Termin frei. Sobald die Anzahlung eingegangen ist, schicken wir Ihnen die Bestätigung Ihrer verbindlichen Buchung.`,
        ),
        cancellation(c),
        p("Mit freundlichen Grüßen"),
        signature(),
      ];
    },
  },
  pl: {
    subject: (c) =>
      isFullPayment(c)
        ? `Termin jest dla Państwa wolny — prosimy o płatność do ${c.f.date(c.r.payment.deposit.dueDate)}`
        : `Termin jest dla Państwa wolny — prosimy o zaliczkę do ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const pay = c.r.payment;
      const full = isFullPayment(c);
      const due = c.f.date(pay.deposit.dueDate);
      return [
        p("Dzień dobry,"),
        p(`Termin ${c.stay} jest dla Państwa wolny i z przyjemnością Państwa u nas powitamy.`),
        facts([
          ["Liczba osób", String(c.r.guestCount)],
          ["Cena całkowita", c.f.price(pay.totalPrice)],
          full && ["Cała kwota", `${c.f.price(pay.deposit.amount)}, płatna do ${due}`],
          !full && ["Zaliczka", `${c.f.price(pay.deposit.amount)}, płatna do ${due}`],
          !full && ["Dopłata", `${c.f.price(c.balanceAmount)}, płatna do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        depositPayment(c),
        p(
          full
            ? `Termin wstrzymujemy dla Państwa do ${due}. Jeśli do tego czasu płatność nie wpłynie, anulujemy rezerwację i zwolnimy termin. Gdy tylko otrzymamy płatność, wyślemy Państwu potwierdzenie wiążącej rezerwacji.`
            : `Termin wstrzymujemy dla Państwa do ${due}. Jeśli do tego czasu zaliczka nie wpłynie, anulujemy rezerwację i zwolnimy termin. Gdy tylko otrzymamy zaliczkę, wyślemy Państwu potwierdzenie wiążącej rezerwacji.`,
        ),
        cancellation(c),
        p("Z pozdrowieniami"),
        signature(),
      ];
    },
  },
  sk: {
    subject: (c) =>
      isFullPayment(c)
        ? `Termín je pre vás voľný — prosíme o úhradu do ${c.f.date(c.r.payment.deposit.dueDate)}`
        : `Termín je pre vás voľný — prosíme o zálohu do ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const pay = c.r.payment;
      const full = isFullPayment(c);
      const due = c.f.date(pay.deposit.dueDate);
      return [
        p("Dobrý deň,"),
        p(`termín ${c.stay} je pre vás voľný a radi vás u nás privítame.`),
        facts([
          ["Počet osôb", String(c.r.guestCount)],
          ["Celková cena", c.f.price(pay.totalPrice)],
          full && ["Celá suma", `${c.f.price(pay.deposit.amount)}, splatná do ${due}`],
          !full && ["Záloha", `${c.f.price(pay.deposit.amount)}, splatná do ${due}`],
          !full && ["Doplatok", `${c.f.price(c.balanceAmount)}, splatný do ${c.f.date(pay.balance.dueDate)}`],
        ]),
        quote(c.message),
        depositPayment(c),
        p(
          full
            ? `Termín pre vás držíme do ${due}. Ak platba dovtedy nepríde, rezerváciu zrušíme a termín uvoľníme. Hneď ako platbu prijmeme, pošleme vám potvrdenie záväznej rezervácie.`
            : `Termín pre vás držíme do ${due}. Ak záloha dovtedy nepríde, rezerváciu zrušíme a termín uvoľníme. Hneď ako zálohu prijmeme, pošleme vám potvrdenie záväznej rezervácie.`,
        ),
        cancellation(c),
        p("S pozdravom"),
        signature(),
      ];
    },
  },
};
