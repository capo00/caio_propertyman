// H4 — Připomínka zálohy (host, cron 24 h před splatností — cron je odložený).
import config from "../../config.js";
import { p, signature } from "../blocks.js";
import { depositPayment, isFullPayment } from "./_shared.js";

export default {
  code: "depositReminder",
  recipient: "guest",
  cs: {
    subject: (c) => `Připomínka: ${isFullPayment(c) ? "platba" : "záloha"} za pobyt ${c.stay} — splatnost ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const due = c.f.date(c.r.payment.deposit.dueDate);
      const what = isFullPayment(c) ? "platba" : "záloha";
      return [
        p("Dobrý den,"),
        p(`připomínáme, že vaše rezervace v Roubeném ráji na termín ${c.stay} čeká na úhradu ${isFullPayment(c) ? "" : "zálohy"}`.trim() + "."),
        depositPayment(c),
        p(`Pokud ${what} nebude uhrazena do ${due}, rezervaci zrušíme a termín uvolníme. Platíte-li na poslední chvíli, pošlete nám prosím potvrzení o platbě na ${config.email.contact.email} — převod se může připisovat i dva pracovní dny.`),
        p("Pokud jste už zaplatili, děkujeme a tuto zprávu ignorujte."),
        p("S pozdravem"),
        signature(),
      ];
    },
  },
};
