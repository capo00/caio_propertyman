// V2 — Záloha po splatnosti (vlastník, cron — cron je odložený). Interní: bez patičky.
import { p, link } from "../blocks.js";

export default {
  code: "ownerDepositOverdue",
  recipient: "owner",
  cs: {
    subject: (c) => `Záloha po splatnosti: ${c.stay}, ${c.r.contact?.name ?? ""}`.trim(),
    body: (c) => [
      p(`Záloha za rezervaci ${c.r.contact?.name ?? ""} (${c.stay}, VS ${c.r.payment?.variableSymbol}) měla dorazit do ${c.f.date(c.r.payment?.deposit?.dueDate)}. Rezervace pořád blokuje termín.`),
      p("Rozhodni v adminu — „Záloha přijata“, „Propadlo“, nebo prodluž splatnost úpravou."),
      link("Otevřít rezervaci", c.adminUrl),
    ],
  },
};
