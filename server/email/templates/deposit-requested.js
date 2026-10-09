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
        cancellation(),
        p("S pozdravem"),
        signature(),
      ];
    },
  },
};
