// H6b — Rezervace stornována (host, po „Stornovat“).
import config from "../../config.js";
import { p, quote, signature } from "../blocks.js";
import { computeCancellation } from "../../reservation/cancellation.js";
import { todayIn } from "../../services/dates.js";

export default {
  code: "reservationCancelled",
  recipient: "guest",
  cs: {
    subject: (c) => `Rezervace zrušena — ${c.stay}`,
    body: (c) => {
      // Výpočet zapsaný při stornu (`reservation.cancellation`); u náhledu před stornem ke dnešku.
      const s = c.r.cancellation ?? computeCancellation(c.r, todayIn(config.reservation.timeZone));
      return [
        p("Dobrý den,"),
        p(`vaše rezervace v Roubeném ráji na termín ${c.stay} byla zrušena.`),
        quote(c.message),
        s.paid > 0 &&
          p(
            s.refund > 0
              ? `Podle storno podmínek (${s.daysToArrival} dní před příjezdem: poplatek ${s.percent} % z ceny, tj. ${c.f.price(s.fee)}) vám ze zaplacené částky ${c.f.price(s.paid)} vrátíme ${c.f.price(s.refund)}.`
              : `Podle storno podmínek (${s.daysToArrival} dní před příjezdem: poplatek ${s.percent} % z ceny, tj. ${c.f.price(s.fee)}) zaplacená částka ${c.f.price(s.paid)} propadá jako storno poplatek.`,
          ),
        p(`Pokud zrušení není podle vašeho přání, ozvěte se nám prosím na ${config.email.contact.phone} nebo ${config.email.contact.email}.`),
        p("S pozdravem"),
        signature(),
      ];
    },
  },
};
