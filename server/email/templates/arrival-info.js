// H7 — Informace k příjezdu (host, cron 2 dny před příjezdem — cron je odložený).
// Obsah (klíče, parkování, Wi-Fi) dodá majitel do config.email.arrivalInfo (docs/wip.md);
// do té doby se ty řádky vynechají.
import config from "../../config.js";
import { p, facts, link, signature } from "../blocks.js";
import { balancePayment, hasUnpaidBalance } from "./_shared.js";

export default {
  code: "arrivalInfo",
  recipient: "guest",
  cs: {
    subject: (c) => `Informace k příjezdu — ${c.f.date(c.r.dateFrom)}`,
    body: (c) => {
      const info = config.email.arrivalInfo;
      return [
        p("Dobrý den,"),
        p("za dva dny se u nás uvidíme. Tady je vše, co se vám bude hodit:"),
        facts([
          ["Adresa", config.email.address],
          ["Příjezd", "od 15:00"],
          ["Odjezd", "do 10:00"],
          info.keys && ["Klíče", info.keys],
          info.parking && ["Parkování", info.parking],
          info.wifiName && ["Wi-Fi", info.wifiPassword ? `${info.wifiName} / ${info.wifiPassword}` : info.wifiName],
          ["Kontakt", config.email.contact.phone],
        ]),
        link("Mapa", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.email.address)}`),
        hasUnpaidBalance(c) && p(`Zatím neevidujeme doplatek ${c.f.price(c.balanceAmount)}.`),
        hasUnpaidBalance(c) && balancePayment(c),
        p("Šťastnou cestu!"),
        signature(),
      ];
    },
  },
};
