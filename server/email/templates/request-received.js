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
  en: {
    subject: (c) => `We have received your booking request — ${c.stay}`,
    body: (c) => [
      p("Hello,"),
      p("Thank you for your interest in Roubený ráj. We have received your booking request and are now checking that the dates are available."),
      facts([
        ["Dates", c.stay],
        ["Guests", String(c.r.guestCount)],
        c.r.payment?.totalPrice != null && ["Estimated price", c.f.price(c.r.payment.totalPrice)],
        c.r.note && ["Your note", c.r.note],
      ]),
      p("We are provisionally holding the dates for you. We will get back to you within 24 hours."),
      p("This message is not a booking confirmation."),
      p("Kind regards"),
      signature(),
    ],
  },
  de: {
    subject: (c) => `Wir haben Ihre Buchungsanfrage erhalten — ${c.stay}`,
    body: (c) => [
      p("Guten Tag,"),
      p("vielen Dank für Ihr Interesse am Roubený ráj. Wir haben Ihre Buchungsanfrage erhalten und prüfen nun, ob der Termin frei ist."),
      facts([
        ["Termin", c.stay],
        ["Personen", String(c.r.guestCount)],
        c.r.payment?.totalPrice != null && ["Voraussichtlicher Preis", c.f.price(c.r.payment.totalPrice)],
        c.r.note && ["Ihre Anmerkung", c.r.note],
      ]),
      p("Wir halten den Termin vorläufig für Sie frei und melden uns spätestens innerhalb von 24 Stunden."),
      p("Diese Nachricht ist keine Buchungsbestätigung."),
      p("Mit freundlichen Grüßen"),
      signature(),
    ],
  },
  pl: {
    subject: (c) => `Otrzymaliśmy Państwa zapytanie o rezerwację — ${c.stay}`,
    body: (c) => [
      p("Dzień dobry,"),
      p("Dziękujemy za zainteresowanie obiektem Roubený ráj. Otrzymaliśmy Państwa zapytanie o rezerwację i sprawdzamy teraz dostępność terminu."),
      facts([
        ["Termin", c.stay],
        ["Liczba osób", String(c.r.guestCount)],
        c.r.payment?.totalPrice != null && ["Orientacyjna cena", c.f.price(c.r.payment.totalPrice)],
        c.r.note && ["Państwa uwagi", c.r.note],
      ]),
      p("Wstępnie wstrzymujemy dla Państwa ten termin. Odezwiemy się najpóźniej w ciągu 24 godzin."),
      p("Ta wiadomość nie jest potwierdzeniem rezerwacji."),
      p("Z pozdrowieniami"),
      signature(),
    ],
  },
  sk: {
    subject: (c) => `Prijali sme vašu žiadosť o rezerváciu — ${c.stay}`,
    body: (c) => [
      p("Dobrý deň,"),
      p("ďakujeme za záujem o Roubený ráj. Vašu žiadosť o rezerváciu sme prijali a teraz overujeme dostupnosť termínu."),
      facts([
        ["Termín", c.stay],
        ["Počet osôb", String(c.r.guestCount)],
        c.r.payment?.totalPrice != null && ["Orientačná cena", c.f.price(c.r.payment.totalPrice)],
        c.r.note && ["Vaša poznámka", c.r.note],
      ]),
      p("Termín pre vás zatiaľ predbežne držíme. Ozveme sa vám najneskôr do 24 hodín."),
      p("Táto správa nie je potvrdením rezervácie."),
      p("S pozdravom"),
      signature(),
    ],
  },
};
