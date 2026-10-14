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
  en: {
    subject: (c) => `Unfortunately we cannot confirm ${c.stay}`,
    body: (c) => [
      p("Hello,"),
      p(`Thank you for your interest in Roubený ráj. Unfortunately we cannot confirm ${c.stay} for you.`),
      quote(c.message),
      p("We have released the provisional hold. We would be glad to welcome you another time; you can find available dates on our website."),
      link("Available dates", c.web),
      p("Kind regards"),
      signature(),
    ],
  },
  de: {
    subject: (c) => `Den Termin ${c.stay} können wir Ihnen leider nicht bestätigen`,
    body: (c) => [
      p("Guten Tag,"),
      p(`vielen Dank für Ihr Interesse am Roubený ráj. Den Termin ${c.stay} können wir Ihnen leider nicht bestätigen.`),
      quote(c.message),
      p("Die vorläufige Reservierung haben wir aufgehoben. Gerne begrüßen wir Sie ein anderes Mal, freie Termine finden Sie auf unserer Website."),
      link("Freie Termine", c.web),
      p("Mit freundlichen Grüßen"),
      signature(),
    ],
  },
  pl: {
    subject: (c) => `Niestety nie możemy potwierdzić terminu ${c.stay}`,
    body: (c) => [
      p("Dzień dobry,"),
      p(`Dziękujemy za zainteresowanie obiektem Roubený ráj. Niestety nie możemy Państwu potwierdzić terminu ${c.stay}.`),
      quote(c.message),
      p("Wstępną blokadę terminu anulowaliśmy. Chętnie powitamy Państwa innym razem, wolne terminy znajdą Państwo na naszej stronie."),
      link("Wolne terminy", c.web),
      p("Z pozdrowieniami"),
      signature(),
    ],
  },
  sk: {
    subject: (c) => `Termín ${c.stay} vám, žiaľ, nemôžeme potvrdiť`,
    body: (c) => [
      p("Dobrý deň,"),
      p(`ďakujeme za záujem o Roubený ráj. Termín ${c.stay} vám, žiaľ, nemôžeme potvrdiť.`),
      quote(c.message),
      p("Predbežnú blokáciu sme zrušili. Radi vás privítame inokedy, voľné termíny nájdete na webe."),
      link("Voľné termíny", c.web),
      p("S pozdravom"),
      signature(),
    ],
  },
};
