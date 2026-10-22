// H8 — Thank you for your stay (guest, after "Complete stay"). No link to a review yet (docs/wip.md).
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
  en: {
    subject: () => "Thank you for staying at Roubený ráj",
    body: (c) => [
      p("Hello,"),
      p("Thank you for staying with us. We hope you enjoyed your stay."),
      quote(c.message),
      hasUnpaidBalance(c) && p(`Our records still show an unpaid balance of ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("We'd love to welcome you back."),
      signature(),
    ],
  },
  de: {
    subject: () => "Vielen Dank für Ihren Besuch im Roubený ráj",
    body: (c) => [
      p("Guten Tag,"),
      p("vielen Dank, dass Sie bei uns waren. Wir hoffen, Sie haben Ihren Aufenthalt genossen."),
      quote(c.message),
      hasUnpaidBalance(c) && p(`Bei uns ist noch eine offene Restzahlung von ${c.f.price(c.balanceAmount)} vermerkt.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Wir freuen uns auf ein Wiedersehen."),
      signature(),
    ],
  },
  pl: {
    subject: () => "Dziękujemy za pobyt w obiekcie Roubený ráj",
    body: (c) => [
      p("Dzień dobry,"),
      p("Dziękujemy, że byli Państwo naszymi gośćmi. Mamy nadzieję, że pobyt się Państwu podobał."),
      quote(c.message),
      hasUnpaidBalance(c) && p(`Nadal widzimy nieopłaconą dopłatę w wysokości ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Do zobaczenia następnym razem."),
      signature(),
    ],
  },
  sk: {
    subject: () => "Ďakujeme za návštevu v ubytovaní Roubený ráj",
    body: (c) => [
      p("Dobrý deň,"),
      p("ďakujeme, že ste u nás boli. Dúfame, že ste si pobyt užili."),
      quote(c.message),
      hasUnpaidBalance(c) && p(`Ešte evidujeme nezaplatený doplatok ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Tešíme sa na ďalšie stretnutie."),
      signature(),
    ],
  },
};
