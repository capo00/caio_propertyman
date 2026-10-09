// H1 — Žádost přijata (host, hned po odeslání formuláře).
import { p, facts, signature } from "../blocks.js";

export default {
  code: "requestReceived",
  recipient: "guest",
  cs: {
    subject: (c) => `Přijali jsme vaši žádost o rezervaci — ${c.stay}`,
    body: (c) => [
      p("Dobrý den,"),
      p("děkujeme za zájem o Roubený ráj. Vaši žádost o rezervaci jsme přijali a teď ověřujeme dostupnost termínu."),
      facts([
        ["Termín", c.stay],
        ["Počet osob", String(c.r.guestCount)],
        c.r.payment?.totalPrice != null && ["Orientační cena", c.f.price(c.r.payment.totalPrice)],
        c.r.note && ["Vaše poznámka", c.r.note],
      ]),
      p("Termín pro vás zatím předběžně držíme. Ozveme se vám nejpozději do 24 hodin."),
      p("Tato zpráva není potvrzením rezervace."),
      p("S pozdravem"),
      signature(),
    ],
  },
};
