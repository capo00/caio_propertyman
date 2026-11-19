// H10 — Balance reminder (guest). Sent by the owner from the admin (docs/proposal-admin-emails.md);
// the cron that was to send it 3 days before the balance is due is postponed.
//
// The text follows the phase (reservation/states.js `reminderPhase`): `beforeDue` reminds of the
// due date, `overdue` asks to pay as soon as possible (no due date in the QR code).
import { SITE } from "../site.js";
import { p, quote, signature } from "../blocks.js";
import { balancePayment, reminderPhaseOf } from "./_shared.js";

const EMAIL = SITE.contact.email;

const TEXTS = {
  cs: {
    hello: "Dobrý den,",
    regards: "S pozdravem",
    beforeDue: {
      subject: ({ stay, due }) => `Připomínka: doplatek za pobyt ${stay} — splatnost ${due}`,
      intro: ({ stay }) => `blíží se váš pobyt v Roubeném ráji, ${stay}. Připomínáme splatnost doplatku:`,
      end: "Pokud jste už zaplatili, děkujeme a tuto zprávu ignorujte.",
    },
    overdue: {
      subject: ({ stay }) => `Doplatek za pobyt ${stay} je po splatnosti`,
      intro: ({ stay, due }) => `u vaší rezervace v Roubeném ráji na termín ${stay} zatím neevidujeme doplatek, který byl splatný do ${due}. Prosíme o úhradu co nejdříve:`,
      end: `Pokud jste už zaplatili, pošlete nám prosím potvrzení o platbě na ${EMAIL} — převod se může připisovat i dva pracovní dny.`,
    },
  },
  en: {
    hello: "Hello,",
    regards: "Kind regards",
    beforeDue: {
      subject: ({ stay, due }) => `Reminder: balance for your stay ${stay} — due ${due}`,
      intro: ({ stay }) => `Your stay at Roubený ráj, ${stay}, is coming up. This is a reminder that the balance is due:`,
      end: "If you have already paid, thank you, and please ignore this message.",
    },
    overdue: {
      subject: ({ stay }) => `The balance for your stay ${stay} is overdue`,
      intro: ({ stay, due }) => `We have not yet received the balance for your booking at Roubený ráj for ${stay}, which was due by ${due}. Please pay it as soon as possible:`,
      end: `If you have already paid, please send us proof of payment to ${EMAIL} — a transfer can take up to two working days to arrive.`,
    },
  },
  de: {
    hello: "Guten Tag,",
    regards: "Mit freundlichen Grüßen",
    beforeDue: {
      subject: ({ stay, due }) => `Erinnerung: Restzahlung für Ihren Aufenthalt ${stay} — fällig am ${due}`,
      intro: ({ stay }) => `Ihr Aufenthalt im Roubený ráj, ${stay}, rückt näher. Wir möchten Sie an die Fälligkeit der Restzahlung erinnern:`,
      end: "Falls Sie bereits bezahlt haben, vielen Dank — dann betrachten Sie diese Nachricht bitte als gegenstandslos.",
    },
    overdue: {
      subject: ({ stay }) => `Restzahlung für Ihren Aufenthalt ${stay} ist überfällig`,
      intro: ({ stay, due }) => `für Ihre Buchung im Roubený ráj für den Termin ${stay} ist die Restzahlung, die bis zum ${due} fällig war, bei uns noch nicht eingegangen. Bitte zahlen Sie so bald wie möglich:`,
      end: `Falls Sie bereits bezahlt haben, schicken Sie uns bitte einen Zahlungsnachweis an ${EMAIL} — eine Überweisung kann bis zu zwei Werktage dauern.`,
    },
  },
  pl: {
    hello: "Dzień dobry,",
    regards: "Z pozdrowieniami",
    beforeDue: {
      subject: ({ stay, due }) => `Przypomnienie: dopłata za pobyt ${stay} — termin płatności ${due}`,
      intro: ({ stay }) => `Zbliża się Państwa pobyt w obiekcie Roubený ráj, ${stay}. Przypominamy o terminie płatności dopłaty:`,
      end: "Jeśli już Państwo zapłacili, dziękujemy i prosimy zignorować tę wiadomość.",
    },
    overdue: {
      subject: ({ stay }) => `Dopłata za pobyt ${stay} — minął termin płatności`,
      intro: ({ stay, due }) => `Do tej pory nie otrzymaliśmy dopłaty za Państwa rezerwację w obiekcie Roubený ráj na termin ${stay}, której termin upłynął ${due}. Prosimy o wpłatę jak najszybciej:`,
      end: `Jeśli już Państwo zapłacili, prosimy o przesłanie potwierdzenia płatności na ${EMAIL} — zaksięgowanie przelewu może potrwać nawet dwa dni robocze.`,
    },
  },
  sk: {
    hello: "Dobrý deň,",
    regards: "S pozdravom",
    beforeDue: {
      subject: ({ stay, due }) => `Pripomienka: doplatok za pobyt ${stay} — splatnosť ${due}`,
      intro: ({ stay }) => `blíži sa váš pobyt v ubytovaní Roubený ráj, ${stay}. Pripomíname splatnosť doplatku:`,
      end: "Ak ste už zaplatili, ďakujeme a túto správu ignorujte.",
    },
    overdue: {
      subject: ({ stay }) => `Doplatok za pobyt ${stay} je po splatnosti`,
      intro: ({ stay, due }) => `pri vašej rezervácii v ubytovaní Roubený ráj na termín ${stay} zatiaľ neevidujeme doplatok, ktorý bol splatný do ${due}. Prosíme o úhradu čo najskôr:`,
      end: `Ak ste už zaplatili, pošlite nám, prosím, potvrdenie o platbe na ${EMAIL} — prevod sa môže pripisovať aj dva pracovné dni.`,
    },
  },
};

const values = (c) => ({ stay: c.stay, due: c.f.date(c.r.payment.balance.dueDate) });

function body(c, t) {
  const phase = reminderPhaseOf(c, "balanceReminder");
  const texts = t[phase];
  return [
    p(t.hello),
    p(texts.intro(values(c))),
    quote(c.message),
    balancePayment(c, phase === "overdue" ? { dueDate: null } : undefined),
    p(texts.end),
    p(t.regards),
    signature(),
  ];
}

const language = (lang) => ({
  subject: (c) => TEXTS[lang][reminderPhaseOf(c, "balanceReminder")].subject(values(c)),
  body: (c) => body(c, TEXTS[lang]),
});

export default {
  code: "balanceReminder",
  recipient: "guest",
  cs: language("cs"),
  en: language("en"),
  de: language("de"),
  pl: language("pl"),
  sk: language("sk"),
};
