// H5 — Rezervace potvrzena (host, po „Záloha přijata“; i ruční rezervace vytvořená jako potvrzená).
import { p, facts, quote, signature } from "../blocks.js";
import { balancePayment, hasUnpaidBalance, cancellation } from "./_shared.js";

export default {
  code: "reservationConfirmed",
  recipient: "guest",
  cs: {
    subject: (c) => `Rezervace je závazně potvrzena — ${c.stay}`,
    body: (c) => {
      const pay = c.r.payment;
      const depositPaid = Boolean(pay?.deposit?.paidDate);
      const fullPaid = depositPaid && !pay.balance;
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
        cancellation(),
        p("Těšíme se na vás."),
        signature(),
      ];
    },
  },
};
