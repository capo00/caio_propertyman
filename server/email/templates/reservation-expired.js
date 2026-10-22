// H6a — Reservation expired (guest, after "Expired").
import config from "../../config.js";
import { p, quote, signature } from "../blocks.js";
import { isFullPayment } from "./_shared.js";

export default {
  code: "reservationExpired",
  recipient: "guest",
  cs: {
    subject: (c) => `Rezervace zrušena — ${isFullPayment(c) ? "platba" : "záloha"} nedorazila: ${c.stay}`,
    body: (c) => [
      p("Dobrý den,"),
      p(`protože jsme do ${c.f.date(c.r.payment?.deposit?.dueDate)} neobdrželi ${isFullPayment(c) ? "platbu" : "zálohu"}, vaši rezervaci termínu ${c.stay} jsme zrušili a termín uvolnili.`),
      quote(c.message),
      p(`Pokud jste ${isFullPayment(c) ? "platbu" : "zálohu"} mezitím poslali, ozvěte se nám prosím na ${config.email.contact.phone} nebo ${config.email.contact.email} — domluvíme se.`),
      p("S pozdravem"),
      signature(),
    ],
  },
  en: {
    subject: (c) => `Booking cancelled — ${isFullPayment(c) ? "payment" : "deposit"} not received: ${c.stay}`,
    body: (c) => [
      p("Hello,"),
      p(`As we did not receive ${isFullPayment(c) ? "the payment" : "the deposit"} by ${c.f.date(c.r.payment?.deposit?.dueDate)}, we have cancelled your booking for ${c.stay} and released the dates.`),
      quote(c.message),
      p(`If you have sent ${isFullPayment(c) ? "the payment" : "the deposit"} in the meantime, please contact us at ${config.email.contact.phone} or ${config.email.contact.email} and we will sort it out.`),
      p("Kind regards"),
      signature(),
    ],
  },
  de: {
    subject: (c) => `Buchung storniert — ${isFullPayment(c) ? "Zahlung" : "Anzahlung"} nicht eingegangen: ${c.stay}`,
    body: (c) => [
      p("Guten Tag,"),
      p(`da ${isFullPayment(c) ? "die Zahlung" : "die Anzahlung"} bis zum ${c.f.date(c.r.payment?.deposit?.dueDate)} nicht bei uns eingegangen ist, haben wir Ihre Buchung für den Termin ${c.stay} storniert und den Termin freigegeben.`),
      quote(c.message),
      p(`Falls Sie ${isFullPayment(c) ? "die Zahlung" : "die Anzahlung"} inzwischen überwiesen haben, melden Sie sich bitte unter ${config.email.contact.phone} oder ${config.email.contact.email} — wir finden eine Lösung.`),
      p("Mit freundlichen Grüßen"),
      signature(),
    ],
  },
  pl: {
    subject: (c) => `Rezerwacja anulowana — ${isFullPayment(c) ? "płatność" : "zaliczka"} nie wpłynęła: ${c.stay}`,
    body: (c) => [
      p("Dzień dobry,"),
      p(`Ponieważ do ${c.f.date(c.r.payment?.deposit?.dueDate)} nie otrzymaliśmy ${isFullPayment(c) ? "płatności" : "zaliczki"}, anulowaliśmy Państwa rezerwację na termin ${c.stay} i zwolniliśmy termin.`),
      quote(c.message),
      p(`Jeśli w międzyczasie wysłali Państwo ${isFullPayment(c) ? "płatność" : "zaliczkę"}, prosimy o kontakt pod numerem ${config.email.contact.phone} lub na adres ${config.email.contact.email} — na pewno znajdziemy rozwiązanie.`),
      p("Z pozdrowieniami"),
      signature(),
    ],
  },
  sk: {
    subject: (c) => `Rezervácia zrušená — ${isFullPayment(c) ? "platba" : "záloha"} neprišla: ${c.stay}`,
    body: (c) => [
      p("Dobrý deň,"),
      p(`keďže sme do ${c.f.date(c.r.payment?.deposit?.dueDate)} nedostali ${isFullPayment(c) ? "platbu" : "zálohu"}, vašu rezerváciu termínu ${c.stay} sme zrušili a termín uvoľnili.`),
      quote(c.message),
      p(`Ak ste ${isFullPayment(c) ? "platbu" : "zálohu"} medzitým poslali, ozvite sa nám, prosím, na ${config.email.contact.phone} alebo ${config.email.contact.email} — dohodneme sa.`),
      p("S pozdravom"),
      signature(),
    ],
  },
};
