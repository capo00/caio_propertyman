// H11 — Balance received (guest, after "Balance received" when the owner leaves the e-mail on).
// The stay is paid in full; the guest only learns that everything is in order. The arrival
// information is announced only while it has not been sent yet.
import { p, facts, quote, signature } from "../blocks.js";

/** The arrival information still to come -- not when it has already gone out. */
const arrivalPending = (c) => !c.r.reminder?.arrivalInfoSentAt;

export default {
  code: "balanceReceived",
  recipient: "guest",
  cs: {
    subject: (c) => `Doplatek jsme přijali — ${c.stay}`,
    body: (c) => [
      p("Dobrý den,"),
      p("doplatek jsme přijali, děkujeme. Pobyt je tím celý zaplacený a vše je v pořádku."),
      facts([
        ["Termín", c.stay],
        c.r.guestCount && ["Počet osob", String(c.r.guestCount)],
        ["Zaplaceno celkem", c.f.price(c.r.payment.totalPrice)],
      ]),
      quote(c.message),
      arrivalPending(c) && p("Dva dny před příjezdem vám pošleme informace k pobytu."),
      p("Těšíme se na vás."),
      signature(),
    ],
  },
  en: {
    subject: (c) => `Balance received — ${c.stay}`,
    body: (c) => [
      p("Hello,"),
      p("We have received your balance payment, thank you. Your stay is now paid in full and everything is in order."),
      facts([
        ["Dates", c.stay],
        c.r.guestCount && ["Guests", String(c.r.guestCount)],
        ["Paid in total", c.f.price(c.r.payment.totalPrice)],
      ]),
      quote(c.message),
      arrivalPending(c) && p("Two days before your arrival we will send you information for your stay."),
      p("We look forward to seeing you."),
      signature(),
    ],
  },
  de: {
    subject: (c) => `Restzahlung erhalten — ${c.stay}`,
    body: (c) => [
      p("Guten Tag,"),
      p("Ihre Restzahlung ist bei uns eingegangen, vielen Dank. Ihr Aufenthalt ist damit vollständig bezahlt und alles ist in Ordnung."),
      facts([
        ["Termin", c.stay],
        c.r.guestCount && ["Personen", String(c.r.guestCount)],
        ["Insgesamt bezahlt", c.f.price(c.r.payment.totalPrice)],
      ]),
      quote(c.message),
      arrivalPending(c) && p("Zwei Tage vor Ihrer Anreise schicken wir Ihnen Informationen zu Ihrem Aufenthalt."),
      p("Wir freuen uns auf Sie."),
      signature(),
    ],
  },
  pl: {
    subject: (c) => `Dopłata otrzymana — ${c.stay}`,
    body: (c) => [
      p("Dzień dobry,"),
      p("Otrzymaliśmy Państwa dopłatę, dziękujemy. Pobyt jest w całości opłacony i wszystko jest w porządku."),
      facts([
        ["Termin", c.stay],
        c.r.guestCount && ["Liczba osób", String(c.r.guestCount)],
        ["Zapłacono łącznie", c.f.price(c.r.payment.totalPrice)],
      ]),
      quote(c.message),
      arrivalPending(c) && p("Dwa dni przed przyjazdem wyślemy Państwu informacje dotyczące pobytu."),
      p("Z radością czekamy na Państwa przyjazd."),
      signature(),
    ],
  },
  sk: {
    subject: (c) => `Doplatok sme prijali — ${c.stay}`,
    body: (c) => [
      p("Dobrý deň,"),
      p("doplatok sme prijali, ďakujeme. Pobyt je tým celý zaplatený a všetko je v poriadku."),
      facts([
        ["Termín", c.stay],
        c.r.guestCount && ["Počet osôb", String(c.r.guestCount)],
        ["Zaplatené celkom", c.f.price(c.r.payment.totalPrice)],
      ]),
      quote(c.message),
      arrivalPending(c) && p("Dva dni pred príchodom vám pošleme informácie k pobytu."),
      p("Tešíme sa na vás."),
      signature(),
    ],
  },
};
