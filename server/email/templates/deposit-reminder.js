// H4 — Deposit reminder (guest). Sent by the owner from the admin (docs/proposal-admin-emails.md);
// the cron that was to send it 24 h before the due date is postponed.
//
// The text follows the phase (reservation/states.js `reminderPhase`):
// - `beforeDue`: pay by the due date, otherwise we cancel;
// - `overdue`: the due date has passed, pay as soon as possible (no due date in the QR code);
// - `fullDue`: the deposit is overdue and it is time for the balance too -- the whole price at once,
//   by the balance due date (or as soon as possible once that has passed too).
//
// Every language has the same blocks per phase (`body`), only the texts differ (`TEXTS`).
import { SITE } from "../site.js";
import { p, quote, signature } from "../blocks.js";
import { depositPayment, fullAmountPayment, fullAmountDueDate, isFullPayment, reminderPhaseOf } from "./_shared.js";

const EMAIL = SITE.contact.email;

const TEXTS = {
  cs: {
    hello: "Dobrý den,",
    regards: "S pozdravem",
    beforeDue: {
      subject: ({ stay, due, full }) => `Připomínka: ${full ? "platba" : "záloha"} za pobyt ${stay} — splatnost ${due}`,
      intro: ({ stay, full }) => `připomínáme, že vaše rezervace v Roubeném ráji na termín ${stay} čeká na úhradu ${full ? "" : "zálohy"}`.trim() + ".",
      deadline: ({ due, full }) => `Pokud ${full ? "platba" : "záloha"} nebude uhrazena do ${due}, rezervaci zrušíme a termín uvolníme. Platíte-li na poslední chvíli, pošlete nám prosím potvrzení o platbě na ${EMAIL} — převod se může připisovat i dva pracovní dny.`,
      paid: "Pokud jste už zaplatili, děkujeme a tuto zprávu ignorujte.",
    },
    overdue: {
      subject: ({ stay, full }) => `${full ? "Platba" : "Záloha"} za pobyt ${stay} je po splatnosti`,
      intro: ({ stay, due, full }) => `vaše rezervace v Roubeném ráji na termín ${stay} čeká na ${full ? "platbu" : "úhradu zálohy"}, která byla splatná do ${due}. Zatím ji u nás neevidujeme.`,
    },
    fullDue: {
      subject: ({ stay }) => `Platba za pobyt ${stay} — prosíme o úhradu celé částky`,
      intro: ({ stay, due, amount }) => `vaše rezervace v Roubeném ráji na termín ${stay} čeká na úhradu zálohy, která byla splatná do ${due}. Zatím ji u nás neevidujeme a mezitím je na řadě i doplatek, proto vás prosíme rovnou o úhradu celé částky ${amount}.`,
      deadline: ({ fullDue }) => `Pokud celá částka nebude uhrazena do ${fullDue}, rezervaci zrušíme a termín uvolníme.`,
    },
    asap: "Prosíme o úhradu co nejdříve, jinak budeme muset rezervaci zrušit a termín uvolnit.",
    proof: `Pokud jste už zaplatili, pošlete nám prosím potvrzení o platbě na ${EMAIL} — převod se může připisovat i dva pracovní dny.`,
  },
  en: {
    hello: "Hello,",
    regards: "Kind regards",
    beforeDue: {
      subject: ({ stay, due, full }) => `Reminder: ${full ? "payment" : "deposit"} for your stay ${stay} — due ${due}`,
      intro: ({ stay, full }) => `This is a reminder that your booking at Roubený ráj for ${stay} is awaiting your ${full ? "payment" : "deposit"}.`,
      deadline: ({ due, full }) => `If you have not paid ${full ? "in full" : "the deposit"} by ${due}, we will cancel the booking and release the dates. If you pay at the last minute, please send us proof of payment to ${EMAIL} — a transfer can take up to two working days to arrive.`,
      paid: "If you have already paid, thank you, and please ignore this message.",
    },
    overdue: {
      subject: ({ stay, full }) => `Your ${full ? "payment" : "deposit"} for the stay ${stay} is overdue`,
      intro: ({ stay, due, full }) => `Your booking at Roubený ráj for ${stay} is awaiting your ${full ? "payment" : "deposit"}, which was due by ${due}. We have not received it yet.`,
    },
    fullDue: {
      subject: ({ stay }) => `Payment for your stay ${stay} — please pay the full amount`,
      intro: ({ stay, due, amount }) => `Your booking at Roubený ráj for ${stay} is awaiting your deposit, which was due by ${due}. We have not received it yet, and it is now time to pay the balance as well, so we kindly ask you to pay the full amount of ${amount} at once.`,
      deadline: ({ fullDue }) => `If the full amount has not been paid by ${fullDue}, we will cancel the booking and release the dates.`,
    },
    asap: "Please pay as soon as possible, otherwise we will have to cancel the booking and release the dates.",
    proof: `If you have already paid, please send us proof of payment to ${EMAIL} — a transfer can take up to two working days to arrive.`,
  },
  de: {
    hello: "Guten Tag,",
    regards: "Mit freundlichen Grüßen",
    beforeDue: {
      subject: ({ stay, due, full }) => `Erinnerung: ${full ? "Zahlung" : "Anzahlung"} für Ihren Aufenthalt ${stay} — fällig am ${due}`,
      intro: ({ stay, full }) => `wir möchten Sie daran erinnern, dass für Ihre Buchung im Roubený ráj für den Termin ${stay} noch ${full ? "die Zahlung" : "die Anzahlung"} aussteht.`,
      deadline: ({ due, full }) => `Ist ${full ? "die Zahlung" : "die Anzahlung"} bis zum ${due} nicht eingegangen, stornieren wir die Buchung und geben den Termin frei. Wenn Sie erst kurz vor Fristende zahlen, schicken Sie uns bitte einen Zahlungsnachweis an ${EMAIL} — eine Überweisung kann bis zu zwei Werktage dauern.`,
      paid: "Falls Sie bereits bezahlt haben, vielen Dank — dann betrachten Sie diese Nachricht bitte als gegenstandslos.",
    },
    overdue: {
      subject: ({ stay, full }) => `${full ? "Zahlung" : "Anzahlung"} für Ihren Aufenthalt ${stay} ist überfällig`,
      intro: ({ stay, due, full }) => `für Ihre Buchung im Roubený ráj für den Termin ${stay} steht noch ${full ? "die Zahlung" : "die Anzahlung"} aus, die bis zum ${due} fällig war. Bisher ist sie bei uns nicht eingegangen.`,
    },
    fullDue: {
      subject: ({ stay }) => `Zahlung für Ihren Aufenthalt ${stay} — bitte überweisen Sie den Gesamtbetrag`,
      intro: ({ stay, due, amount }) => `für Ihre Buchung im Roubený ráj für den Termin ${stay} steht noch die Anzahlung aus, die bis zum ${due} fällig war. Bisher ist sie bei uns nicht eingegangen, und inzwischen ist auch die Restzahlung an der Reihe. Wir bitten Sie daher, gleich den Gesamtbetrag von ${amount} zu überweisen.`,
      deadline: ({ fullDue }) => `Ist der Gesamtbetrag bis zum ${fullDue} nicht eingegangen, stornieren wir die Buchung und geben den Termin frei.`,
    },
    asap: "Bitte zahlen Sie so bald wie möglich, andernfalls müssen wir die Buchung stornieren und den Termin freigeben.",
    proof: `Falls Sie bereits bezahlt haben, schicken Sie uns bitte einen Zahlungsnachweis an ${EMAIL} — eine Überweisung kann bis zu zwei Werktage dauern.`,
  },
  pl: {
    hello: "Dzień dobry,",
    regards: "Z pozdrowieniami",
    beforeDue: {
      subject: ({ stay, due, full }) => `Przypomnienie: ${full ? "płatność" : "zaliczka"} za pobyt ${stay} — termin płatności ${due}`,
      intro: ({ stay, full }) => `Przypominamy, że Państwa rezerwacja w obiekcie Roubený ráj na termin ${stay} czeka na ${full ? "płatność" : "wpłatę zaliczki"}.`,
      deadline: ({ due, full }) => `Jeśli ${full ? "płatność" : "zaliczka"} nie zostanie uregulowana do ${due}, anulujemy rezerwację i zwolnimy termin. Jeśli płacą Państwo w ostatniej chwili, prosimy o przesłanie potwierdzenia płatności na ${EMAIL} — zaksięgowanie przelewu może potrwać nawet dwa dni robocze.`,
      paid: "Jeśli już Państwo zapłacili, dziękujemy i prosimy zignorować tę wiadomość.",
    },
    overdue: {
      subject: ({ stay, full }) => `${full ? "Płatność" : "Zaliczka"} za pobyt ${stay} — minął termin płatności`,
      intro: ({ stay, due, full }) => `Państwa rezerwacja w obiekcie Roubený ráj na termin ${stay} czeka na ${full ? "płatność" : "wpłatę zaliczki"}, której termin upłynął ${due}. Do tej pory jej nie otrzymaliśmy.`,
    },
    fullDue: {
      subject: ({ stay }) => `Płatność za pobyt ${stay} — prosimy o wpłatę całej kwoty`,
      intro: ({ stay, due, amount }) => `Państwa rezerwacja w obiekcie Roubený ráj na termin ${stay} czeka na wpłatę zaliczki, której termin upłynął ${due}. Do tej pory jej nie otrzymaliśmy, a tymczasem nadszedł też czas na dopłatę, dlatego prosimy od razu o wpłatę całej kwoty ${amount}.`,
      deadline: ({ fullDue }) => `Jeśli cała kwota nie zostanie uregulowana do ${fullDue}, anulujemy rezerwację i zwolnimy termin.`,
    },
    asap: "Prosimy o wpłatę jak najszybciej, w przeciwnym razie będziemy musieli anulować rezerwację i zwolnić termin.",
    proof: `Jeśli już Państwo zapłacili, prosimy o przesłanie potwierdzenia płatności na ${EMAIL} — zaksięgowanie przelewu może potrwać nawet dwa dni robocze.`,
  },
  sk: {
    hello: "Dobrý deň,",
    regards: "S pozdravom",
    beforeDue: {
      subject: ({ stay, due, full }) => `Pripomienka: ${full ? "platba" : "záloha"} za pobyt ${stay} — splatnosť ${due}`,
      intro: ({ stay, full }) => `pripomíname, že vaša rezervácia v ubytovaní Roubený ráj na termín ${stay} čaká na úhradu${full ? "" : " zálohy"}.`,
      deadline: ({ due, full }) => `Ak ${full ? "platba" : "záloha"} nebude uhradená do ${due}, rezerváciu zrušíme a termín uvoľníme. Ak platíte na poslednú chvíľu, pošlite nám, prosím, potvrdenie o platbe na ${EMAIL} — prevod sa môže pripisovať aj dva pracovné dni.`,
      paid: "Ak ste už zaplatili, ďakujeme a túto správu ignorujte.",
    },
    overdue: {
      subject: ({ stay, full }) => `${full ? "Platba" : "Záloha"} za pobyt ${stay} je po splatnosti`,
      intro: ({ stay, due, full }) => `vaša rezervácia v ubytovaní Roubený ráj na termín ${stay} čaká na ${full ? "platbu" : "úhradu zálohy"}, ktorá bola splatná do ${due}. Zatiaľ ju u nás neevidujeme.`,
    },
    fullDue: {
      subject: ({ stay }) => `Platba za pobyt ${stay} — prosíme o úhradu celej sumy`,
      intro: ({ stay, due, amount }) => `vaša rezervácia v ubytovaní Roubený ráj na termín ${stay} čaká na úhradu zálohy, ktorá bola splatná do ${due}. Zatiaľ ju u nás neevidujeme a medzitým je na rade aj doplatok, preto vás prosíme rovno o úhradu celej sumy ${amount}.`,
      deadline: ({ fullDue }) => `Ak celá suma nebude uhradená do ${fullDue}, rezerváciu zrušíme a termín uvoľníme.`,
    },
    asap: "Prosíme o úhradu čo najskôr, inak budeme musieť rezerváciu zrušiť a termín uvoľniť.",
    proof: `Ak ste už zaplatili, pošlite nám, prosím, potvrdenie o platbe na ${EMAIL} — prevod sa môže pripisovať aj dva pracovné dni.`,
  },
};

/** Values the texts are filled with. */
function values(c) {
  const fullDue = fullAmountDueDate(c);
  return {
    stay: c.stay,
    due: c.f.date(c.r.payment.deposit.dueDate),
    full: isFullPayment(c),
    amount: c.f.price(c.r.payment.totalPrice),
    fullDue: fullDue ? c.f.date(fullDue) : null,
  };
}

/** The e-mail in one language and phase: the same blocks for all languages. */
function body(c, t) {
  const phase = reminderPhaseOf(c, "depositReminder");
  const v = values(c);
  const intro = p(t[phase].intro(v));
  const message = quote(c.message);
  const end = [p(t.regards), signature()];
  if (phase === "fullDue") {
    return [p(t.hello), intro, message, fullAmountPayment(c), p(v.fullDue ? t.fullDue.deadline(v) : t.asap), p(t.proof), ...end];
  }
  if (phase === "overdue") {
    return [p(t.hello), intro, message, depositPayment(c, { dueDate: null }), p(t.asap), p(t.proof), ...end];
  }
  return [p(t.hello), intro, message, depositPayment(c), p(t.beforeDue.deadline(v)), p(t.beforeDue.paid), ...end];
}

const language = (lang) => ({
  subject: (c) => TEXTS[lang][reminderPhaseOf(c, "depositReminder")].subject(values(c)),
  body: (c) => body(c, TEXTS[lang]),
});

export default {
  code: "depositReminder",
  recipient: "guest",
  cs: language("cs"),
  en: language("en"),
  de: language("de"),
  pl: language("pl"),
  sk: language("sk"),
};
