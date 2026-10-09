// H3 — Žádost zamítnuta (host, po „Zamítnout“).
import { p, quote, link, signature } from "../blocks.js";

export default {
  code: "requestRejected",
  recipient: "guest",
  cs: {
    subject: (c) => `Termín ${c.stay} vám bohužel nemůžeme potvrdit`,
    body: (c) => [
      p("Dobrý den,"),
      p(`děkujeme za zájem o Roubený ráj. Termín ${c.stay} vám bohužel nemůžeme potvrdit.`),
      quote(c.message),
      p("Předběžnou blokaci jsme zrušili. Rádi vás přivítáme jindy, volné termíny najdete na webu."),
      link("Volné termíny", c.web),
      p("S pozdravem"),
      signature(),
    ],
  },
};
