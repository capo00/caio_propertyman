// H6b — Reservation cancelled (guest, after "Cancel").
import config from "../../config.js";
import { p, quote, signature } from "../blocks.js";
import { computeCancellation } from "../../reservation/cancellation.js";
import { todayIn } from "../../services/dates.js";

/** Settlement written at cancellation (`reservation.cancellation`); for a preview before it, as of today. */
function settlement(c) {
  return c.r.cancellation ?? computeCancellation(c.r, todayIn(config.reservation.timeZone));
}

export default {
  code: "reservationCancelled",
  recipient: "guest",
  cs: {
    subject: (c) => `Rezervace zrušena — ${c.stay}`,
    body: (c) => {
      const s = settlement(c);
      return [
        p("Dobrý den,"),
        p(`vaše rezervace v Roubeném ráji na termín ${c.stay} byla zrušena.`),
        quote(c.message),
        s.paid > 0 &&
          p(
            s.refund > 0
              ? `Podle storno podmínek (${c.f.days(s.daysToArrival)} před příjezdem: poplatek ${c.f.percent(s.percent)} z ceny, tj. ${c.f.price(s.fee)}) vám ze zaplacené částky ${c.f.price(s.paid)} vrátíme ${c.f.price(s.refund)}.`
              : `Podle storno podmínek (${c.f.days(s.daysToArrival)} před příjezdem: poplatek ${c.f.percent(s.percent)} z ceny, tj. ${c.f.price(s.fee)}) zaplacená částka ${c.f.price(s.paid)} propadá jako storno poplatek.`,
          ),
        p(`Pokud zrušení není podle vašeho přání, ozvěte se nám prosím na ${config.email.contact.phone} nebo ${config.email.contact.email}.`),
        p("S pozdravem"),
        signature(),
      ];
    },
  },
  en: {
    subject: (c) => `Booking cancelled — ${c.stay}`,
    body: (c) => {
      const s = settlement(c);
      return [
        p("Hello,"),
        p(`Your booking at Roubený ráj for ${c.stay} has been cancelled.`),
        quote(c.message),
        s.paid > 0 &&
          p(
            s.refund > 0
              ? `Under the cancellation policy (${c.f.days(s.daysToArrival)} before arrival: a fee of ${c.f.percent(s.percent)} of the price, i.e. ${c.f.price(s.fee)}), we will refund you ${c.f.price(s.refund)} of the ${c.f.price(s.paid)} you have paid.`
              : `Under the cancellation policy (${c.f.days(s.daysToArrival)} before arrival: a fee of ${c.f.percent(s.percent)} of the price, i.e. ${c.f.price(s.fee)}), the ${c.f.price(s.paid)} you have paid is retained as the cancellation fee.`,
          ),
        p(`If you did not request this cancellation, please contact us at ${config.email.contact.phone} or ${config.email.contact.email}.`),
        p("Kind regards"),
        signature(),
      ];
    },
  },
  de: {
    subject: (c) => `Buchung storniert — ${c.stay}`,
    body: (c) => {
      const s = settlement(c);
      return [
        p("Guten Tag,"),
        p(`Ihre Buchung im Roubený ráj für den Termin ${c.stay} wurde storniert.`),
        quote(c.message),
        s.paid > 0 &&
          p(
            s.refund > 0
              ? `Gemäß den Stornobedingungen (${c.f.days(s.daysToArrival)} vor Anreise: Gebühr ${c.f.percent(s.percent)} des Preises, also ${c.f.price(s.fee)}) erstatten wir Ihnen von dem gezahlten Betrag ${c.f.price(s.paid)} insgesamt ${c.f.price(s.refund)}.`
              : `Gemäß den Stornobedingungen (${c.f.days(s.daysToArrival)} vor Anreise: Gebühr ${c.f.percent(s.percent)} des Preises, also ${c.f.price(s.fee)}) wird der gezahlte Betrag von ${c.f.price(s.paid)} als Stornogebühr einbehalten.`,
          ),
        p(`Falls die Stornierung nicht Ihrem Wunsch entspricht, melden Sie sich bitte unter ${config.email.contact.phone} oder ${config.email.contact.email}.`),
        p("Mit freundlichen Grüßen"),
        signature(),
      ];
    },
  },
  pl: {
    subject: (c) => `Rezerwacja anulowana — ${c.stay}`,
    body: (c) => {
      const s = settlement(c);
      return [
        p("Dzień dobry,"),
        p(`Państwa rezerwacja w obiekcie Roubený ráj na termin ${c.stay} została anulowana.`),
        quote(c.message),
        s.paid > 0 &&
          p(
            s.refund > 0
              ? `Zgodnie z warunkami rezygnacji (${c.f.days(s.daysToArrival)} przed przyjazdem: opłata ${c.f.percent(s.percent)} ceny, tj. ${c.f.price(s.fee)}) z wpłaconej kwoty ${c.f.price(s.paid)} zwrócimy Państwu ${c.f.price(s.refund)}.`
              : `Zgodnie z warunkami rezygnacji (${c.f.days(s.daysToArrival)} przed przyjazdem: opłata ${c.f.percent(s.percent)} ceny, tj. ${c.f.price(s.fee)}) wpłacona kwota ${c.f.price(s.paid)} przepada jako opłata za rezygnację.`,
          ),
        p(`Jeśli anulowanie nie jest zgodne z Państwa życzeniem, prosimy o kontakt pod numerem ${config.email.contact.phone} lub na adres ${config.email.contact.email}.`),
        p("Z pozdrowieniami"),
        signature(),
      ];
    },
  },
  sk: {
    subject: (c) => `Rezervácia zrušená — ${c.stay}`,
    body: (c) => {
      const s = settlement(c);
      return [
        p("Dobrý deň,"),
        p(`vaša rezervácia v ubytovaní Roubený ráj na termín ${c.stay} bola zrušená.`),
        quote(c.message),
        s.paid > 0 &&
          p(
            s.refund > 0
              ? `Podľa stornovacích podmienok (${c.f.days(s.daysToArrival)} pred príchodom: poplatok ${c.f.percent(s.percent)} z ceny, t. j. ${c.f.price(s.fee)}) vám zo zaplatenej sumy ${c.f.price(s.paid)} vrátime ${c.f.price(s.refund)}.`
              : `Podľa stornovacích podmienok (${c.f.days(s.daysToArrival)} pred príchodom: poplatok ${c.f.percent(s.percent)} z ceny, t. j. ${c.f.price(s.fee)}) zaplatená suma ${c.f.price(s.paid)} prepadá ako stornopoplatok.`,
          ),
        p(`Ak ste o zrušenie nežiadali alebo s ním nesúhlasíte, ozvite sa nám, prosím, na ${config.email.contact.phone} alebo ${config.email.contact.email}.`),
        p("S pozdravom"),
        signature(),
      ];
    },
  },
};
