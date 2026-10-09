// H6a — Rezervace propadla (host, po „Propadlo“).
import config from "../../config.js";
import { p, quote, signature } from "../blocks.js";
import { isFullPayment } from "./_shared.js";

export default {
  code: "reservationExpired",
  recipient: "guest",
  cs: {
    subject: (c) => `Rezervace zrušena — ${isFullPayment(c) ? "platba" : "záloha"} nedorazila (${c.stay})`,
    body: (c) => [
      p("Dobrý den,"),
      p(`protože jsme do ${c.f.date(c.r.payment?.deposit?.dueDate)} neobdrželi ${isFullPayment(c) ? "platbu" : "zálohu"}, vaši rezervaci termínu ${c.stay} jsme zrušili a termín uvolnili.`),
      quote(c.message),
      p(`Pokud jste ${isFullPayment(c) ? "platbu" : "zálohu"} mezitím poslali, ozvěte se nám prosím na ${config.email.contact.phone} nebo ${config.email.contact.email} — domluvíme se.`),
      p("S pozdravem"),
      signature(),
    ],
  },
};
