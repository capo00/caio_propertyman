// H8 — Děkujeme za návštěvu (host, po „Ukončit pobyt“). Odkaz na hodnocení zatím není (docs/wip.md).
import { p, quote, signature } from "../blocks.js";
import { balancePayment, hasUnpaidBalance } from "./_shared.js";

export default {
  code: "thankYou",
  recipient: "guest",
  cs: {
    subject: () => "Děkujeme za návštěvu Roubeného ráje",
    body: (c) => [
      p("Dobrý den,"),
      p("děkujeme, že jste u nás byli. Doufáme, že jste si pobyt užili."),
      quote(c.message),
      hasUnpaidBalance(c) && p(`Ještě evidujeme nezaplacený doplatek ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Těšíme se na další shledání."),
      signature(),
    ],
  },
};
