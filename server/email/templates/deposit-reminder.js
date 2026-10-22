// H4 — Deposit reminder (guest, cron 24 h before the due date — the cron is postponed).
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
  en: {
    subject: (c) => `Reminder: ${isFullPayment(c) ? "payment" : "deposit"} for your stay ${c.stay} — due ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const due = c.f.date(c.r.payment.deposit.dueDate);
      const full = isFullPayment(c);
      return [
        p("Hello,"),
        p(`This is a reminder that your booking at Roubený ráj for ${c.stay} is awaiting your ${full ? "payment" : "deposit"}.`),
        depositPayment(c),
        p(`If you have not paid ${full ? "in full" : "the deposit"} by ${due}, we will cancel the booking and release the dates. If you pay at the last minute, please send us proof of payment to ${config.email.contact.email} — a transfer can take up to two working days to arrive.`),
        p("If you have already paid, thank you, and please ignore this message."),
        p("Kind regards"),
        signature(),
      ];
    },
  },
  de: {
    subject: (c) => `Erinnerung: ${isFullPayment(c) ? "Zahlung" : "Anzahlung"} für Ihren Aufenthalt ${c.stay} — fällig am ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const due = c.f.date(c.r.payment.deposit.dueDate);
      const what = isFullPayment(c) ? "die Zahlung" : "die Anzahlung";
      return [
        p("Guten Tag,"),
        p(`wir möchten Sie daran erinnern, dass für Ihre Buchung im Roubený ráj für den Termin ${c.stay} noch ${what} aussteht.`),
        depositPayment(c),
        p(`Ist ${what} bis zum ${due} nicht eingegangen, stornieren wir die Buchung und geben den Termin frei. Wenn Sie erst kurz vor Fristende zahlen, schicken Sie uns bitte einen Zahlungsnachweis an ${config.email.contact.email} — eine Überweisung kann bis zu zwei Werktage dauern.`),
        p("Falls Sie bereits bezahlt haben, vielen Dank — dann betrachten Sie diese Nachricht bitte als gegenstandslos."),
        p("Mit freundlichen Grüßen"),
        signature(),
      ];
    },
  },
  pl: {
    subject: (c) => `Przypomnienie: ${isFullPayment(c) ? "płatność" : "zaliczka"} za pobyt ${c.stay} — termin płatności ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const due = c.f.date(c.r.payment.deposit.dueDate);
      const full = isFullPayment(c);
      return [
        p("Dzień dobry,"),
        p(`Przypominamy, że Państwa rezerwacja w obiekcie Roubený ráj na termin ${c.stay} czeka na ${full ? "płatność" : "wpłatę zaliczki"}.`),
        depositPayment(c),
        p(`Jeśli ${full ? "płatność" : "zaliczka"} nie zostanie uregulowana do ${due}, anulujemy rezerwację i zwolnimy termin. Jeśli płacą Państwo w ostatniej chwili, prosimy o przesłanie potwierdzenia płatności na ${config.email.contact.email} — zaksięgowanie przelewu może potrwać nawet dwa dni robocze.`),
        p("Jeśli już Państwo zapłacili, dziękujemy i prosimy zignorować tę wiadomość."),
        p("Z pozdrowieniami"),
        signature(),
      ];
    },
  },
  sk: {
    subject: (c) => `Pripomienka: ${isFullPayment(c) ? "platba" : "záloha"} za pobyt ${c.stay} — splatnosť ${c.f.date(c.r.payment.deposit.dueDate)}`,
    body: (c) => {
      const due = c.f.date(c.r.payment.deposit.dueDate);
      const full = isFullPayment(c);
      return [
        p("Dobrý deň,"),
        p(`pripomíname, že vaša rezervácia v ubytovaní Roubený ráj na termín ${c.stay} čaká na úhradu${full ? "" : " zálohy"}.`),
        depositPayment(c),
        p(`Ak ${full ? "platba" : "záloha"} nebude uhradená do ${due}, rezerváciu zrušíme a termín uvoľníme. Ak platíte na poslednú chvíľu, pošlite nám, prosím, potvrdenie o platbe na ${config.email.contact.email} — prevod sa môže pripisovať aj dva pracovné dni.`),
        p("Ak ste už zaplatili, ďakujeme a túto správu ignorujte."),
        p("S pozdravom"),
        signature(),
      ];
    },
  },
};
