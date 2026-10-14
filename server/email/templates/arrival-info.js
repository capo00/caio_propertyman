// H7 — Informace k příjezdu (host, cron 2 dny před příjezdem — cron je odložený).
// Obsah (klíče, parkování, Wi-Fi) dodá majitel do config.email.arrivalInfo (docs/wip.md);
// do té doby se ty řádky vynechají. Je jeden pro všechny jazyky -- až ho majitel dodá, musí
// se rozhodnout, jestli ho psát i přeloženě (docs/wip.md § Jazyky).
import config from "../../config.js";
import { p, facts, link, signature } from "../blocks.js";
import { balancePayment, hasUnpaidBalance } from "./_shared.js";

const MAP_URL = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.email.address)}`;

/** Řádky s údaji k příjezdu; `l` = popisky v jazyce e-mailu. */
function arrivalFacts(l) {
  const info = config.email.arrivalInfo;
  return facts([
    [l.address, config.email.address],
    [l.arrival, l.arrivalTime],
    [l.departure, l.departureTime],
    info.keys && [l.keys, info.keys],
    info.parking && [l.parking, info.parking],
    info.wifiName && ["Wi-Fi", info.wifiPassword ? `${info.wifiName} / ${info.wifiPassword}` : info.wifiName],
    [l.contact, config.email.contact.phone],
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
      arrivalFacts({ address: "Adresa", arrival: "Příjezd", arrivalTime: "od 15:00", departure: "Odjezd", departureTime: "do 10:00", keys: "Klíče", parking: "Parkování", contact: "Kontakt" }),
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
      arrivalFacts({ address: "Address", arrival: "Check-in", arrivalTime: "from 15:00", departure: "Check-out", departureTime: "by 10:00", keys: "Keys", parking: "Parking", contact: "Contact" }),
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
      arrivalFacts({ address: "Adresse", arrival: "Anreise", arrivalTime: "ab 15:00 Uhr", departure: "Abreise", departureTime: "bis 10:00 Uhr", keys: "Schlüssel", parking: "Parken", contact: "Kontakt" }),
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
      arrivalFacts({ address: "Adres", arrival: "Przyjazd", arrivalTime: "od 15:00", departure: "Wyjazd", departureTime: "do 10:00", keys: "Klucze", parking: "Parking", contact: "Kontakt" }),
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
      arrivalFacts({ address: "Adresa", arrival: "Príchod", arrivalTime: "od 15:00", departure: "Odchod", departureTime: "do 10:00", keys: "Kľúče", parking: "Parkovanie", contact: "Kontakt" }),
      link("Mapa", MAP_URL()),
      hasUnpaidBalance(c) && p(`Zatiaľ neevidujeme doplatok ${c.f.price(c.balanceAmount)}.`),
      hasUnpaidBalance(c) && balancePayment(c),
      p("Šťastnú cestu!"),
      signature(),
    ],
  },
};
