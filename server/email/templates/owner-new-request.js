// V1 — Nová žádost (vlastník, hned po odeslání formuláře). Interní: bez patičky, Reply-To na hosta.
import { p, facts, link } from "../blocks.js";

export default {
  code: "ownerNewRequest",
  recipient: "owner",
  cs: {
    subject: (c) => `Nová žádost: ${c.stay}, ${c.r.contact.name}, ${c.r.guestCount} os.`,
    body: (c) => [
      p("Nová žádost o rezervaci z webu. Termín je předběžně blokovaný."),
      facts([
        ["Termín", c.stay],
        ["Počet osob", String(c.r.guestCount)],
        c.r.payment?.totalPrice != null && ["Cena", c.f.price(c.r.payment.totalPrice)],
      ]),
      facts([
        ["Jméno", c.r.contact.name],
        ["E-mail", c.r.contact.email],
        ["Telefon", c.r.contact.phone],
        c.r.note && ["Poznámka", c.r.note],
      ]),
      link("Přijmout nebo zamítnout v adminu", c.adminUrl),
    ],
  },
};
