// H7 — Arrival information (guest, cron 2 days before arrival — the cron is postponed).
// The content (keys, parking, Wi-Fi) is filled in by the owner in the Settings (`app.private.arrival`,
// server/app-settings/); what is empty is left out. It is one text for all languages -- when the
// owner supplies it, decide whether it is also written translated (docs/wip.md § Jazyky).
import { SITE } from "../site.js";
import { p, facts, link, signature } from "../blocks.js";
import { balancePayment, hasUnpaidBalance } from "./_shared.js";

const MAP_URL = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address)}`;

/** Rows with the arrival details; `l` = labels in the email's language. */
function arrivalFacts(c, l) {
  const info = c.settings.arrival;
  return facts([
    [l.address, SITE.address],
    [l.arrival, l.arrivalTime],
    [l.departure, l.departureTime],
    info.keys && [l.keys, info.keys],
    info.parking && [l.parking, info.parking],
    info.wifiName && ["Wi-Fi", info.wifiPassword ? `${info.wifiName} / ${info.wifiPassword}` : info.wifiName],
    [l.contact, SITE.contact.phone],
  ]);
}

export default {
  code: "arrivalInfo",
  recipient: "guest",
  cs: {
    subject: (c) => `Informace k příjezdu — ${c.f.date(c.r.dateFrom)}`,
    body: (c) => [
      p("Dobrý den,"),
      p("za dva dny se u nás uvidíme. Tady je vše, co se vám bude hodit:"),
      arrivalFacts(c, { address: "Adresa", arrival: "Příjezd", arrivalTime: `od ${SITE.checkIn}`, departure: "Odjezd", departureTime: `do ${SITE.checkOut}`, keys: "Klíče", parking: "Parkování", contact: "Kontakt" }),
      link("Mapa", MAP_URL()),
      hasUnpaidBalance(c) && p(`Zatím neevidujeme doplatek ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Šťastnou cestu!"),
      signature(),
    ],
  },
  en: {
    subject: (c) => `Arrival information — ${c.f.date(c.r.dateFrom)}`,
    body: (c) => [
      p("Hello,"),
      p("We will see you in two days. Here is everything you will need:"),
      arrivalFacts(c, { address: "Address", arrival: "Check-in", arrivalTime: `from ${SITE.checkIn}`, departure: "Check-out", departureTime: `by ${SITE.checkOut}`, keys: "Keys", parking: "Parking", contact: "Contact" }),
      link("Map", MAP_URL()),
      hasUnpaidBalance(c) && p(`We have not yet received the balance of ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Have a safe journey!"),
      signature(),
    ],
  },
  de: {
    subject: (c) => `Informationen zur Anreise — ${c.f.date(c.r.dateFrom)}`,
    body: (c) => [
      p("Guten Tag,"),
      p("in zwei Tagen sehen wir uns. Hier ist alles, was Sie brauchen werden:"),
      arrivalFacts(c, { address: "Adresse", arrival: "Anreise", arrivalTime: `ab ${SITE.checkIn} Uhr`, departure: "Abreise", departureTime: `bis ${SITE.checkOut} Uhr`, keys: "Schlüssel", parking: "Parken", contact: "Kontakt" }),
      link("Karte", MAP_URL()),
      hasUnpaidBalance(c) && p(`Die Restzahlung von ${c.f.price(c.balanceAmount)} ist bei uns noch nicht eingegangen.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Gute Reise!"),
      signature(),
    ],
  },
  pl: {
    subject: (c) => `Informacje o przyjeździe — ${c.f.date(c.r.dateFrom)}`,
    body: (c) => [
      p("Dzień dobry,"),
      p("Za dwa dni się zobaczymy. Oto wszystko, co się Państwu przyda:"),
      arrivalFacts(c, { address: "Adres", arrival: "Przyjazd", arrivalTime: `od ${SITE.checkIn}`, departure: "Wyjazd", departureTime: `do ${SITE.checkOut}`, keys: "Klucze", parking: "Parking", contact: "Kontakt" }),
      link("Mapa", MAP_URL()),
      hasUnpaidBalance(c) && p(`Nie otrzymaliśmy jeszcze dopłaty w wysokości ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Szczęśliwej podróży!"),
      signature(),
    ],
  },
  sk: {
    subject: (c) => `Informácie k príchodu — ${c.f.date(c.r.dateFrom)}`,
    body: (c) => [
      p("Dobrý deň,"),
      p("o dva dni sa u nás uvidíme. Tu je všetko, čo sa vám bude hodiť:"),
      arrivalFacts(c, { address: "Adresa", arrival: "Príchod", arrivalTime: `od ${SITE.checkIn}`, departure: "Odchod", departureTime: `do ${SITE.checkOut}`, keys: "Kľúče", parking: "Parkovanie", contact: "Kontakt" }),
      link("Mapa", MAP_URL()),
      hasUnpaidBalance(c) && p(`Zatiaľ sme neprijali doplatok ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Šťastnú cestu!"),
      signature(),
    ],
  },
};
