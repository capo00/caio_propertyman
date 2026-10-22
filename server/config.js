// v1 constants. v1 has no `pricing` or `property` collection -- the price list and capacity are hardcoded
// (design-v1.md § 4). In v2 they get replaced by data from the DB and this file goes away.
import path from "node:path";
import { fileURLToPath } from "node:url";
// Deep import: only reads package.json, without Express and Mongo -- config.js is also loaded by the
// client build (vite.config.js) and the client tests.
import { readLanguageList } from "caio-server/src/caio-server-app/services/language.js";

// App root (package.json with `caio.languages`), not `process.cwd()`: the client build runs in client/.
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default {
  propertyId: "roubenka",

  // 9 fixed beds + 1 extra bed (listing on e-chalupy.cz, Libošovice 6).
  capacity: { min: 1, max: 10 },

  minNights: 2,

  // July and August by the week only (owner, 2026-10-12): a stay that has at least one night ONTO
  // a day in this range ("MM-DD", a night belongs to the day of the morning departure) must have exactly
  // `nights` nights. Enforced by services/stay-rules.js.
  summerWeekOnly: { from: "07-01", to: "08-31", nights: 7 },

  // Cap on the length of a stay. Not in the brief, but without it a single request could block
  // the cottage for ten years.
  maxNights: 60,

  maxNoteLength: 2000,

  // Anti-spam for the public reservation/create (design-v1.md § 6).
  rateLimit: { maxPerIpPerDay: 5 },

  // Site languages, the single source is package.json (`caio.languages`, the first is the default); the same
  // list is read by caio-server (/en/… addresses) and caio-devkit (index.<lang>.html). A reservation
  // remembers the guest's language and e-mails go to them in it -- if a template exists for it, otherwise
  // in Czech (docs/impl-plan-reservation-flow.md § 1).
  languages: readLanguageList(APP_ROOT),

  // Payments for a reservation from the web (docs/proposal-reservation-flow.md, decision 2026-10-08).
  // All "days" are counted from today's date in `timeZone`, not in UTC -- around midnight the
  // due date would otherwise come out a day off.
  reservation: {
    timeZone: "Europe/Prague",
    depositPercent: 50,
    // Default deposit due date = day of acceptance + 3 days (until 23:59).
    depositDueDays: 3,
    // Acceptance 14 or fewer days before arrival: the full amount at once, no balance payment.
    fullPaymentDaysBeforeArrival: 14,
    // Default balance due date = arrival − 14 days.
    balanceDueDaysBeforeArrival: 14,
    // Cancellation terms (owner 2026-10-10): fee in % of the stay price by days until arrival,
    // `maxDays` inclusive. Above the last band (61+ days) free. See reservation/cancellation.js.
    cancellationPolicy: [
      { maxDays: 14, percent: 100 },
      { maxDays: 30, percent: 50 },
      { maxDays: 60, percent: 25 },
    ],
  },

  // E-mails to the guest (server/email/). Name and contact mirror the web (LSI `property.name`,
  // client/src/components/contact/content.js) -- the server cannot read client files.
  email: {
    propertyName: "Roubený ráj",
    contact: { phone: "+420 723 872 512", email: "capkova.leni@gmail.com" },
    address: "Libošovice 6, 507 44 Libošovice",
    // Web address for links (admin in the e-mail to the owner). APP_URL is also in the
    // caio-server configuration (password reset), so it is already in the production .env.
    webUrl: () => (process.env.APP_URL || "http://localhost:8080").replace(/\/+$/, ""),
    // Not delivered yet (docs/wip.md). null = the line is left out of the e-mail.
    arrivalInfo: { keys: null, parking: null, wifiName: null, wifiPassword: null },
  },

  // Account for deposits and balance payments. Number for people, IBAN for the QR payment (verified by the owner 2026-10-08).
  bankAccount: { number: "6338724003/0800", iban: "CZ9808000000006338724003", bic: "GIBACZPX" },

  // Invoices on request (docs/proposal-invoice-pdf.md). The owner has an IČO and is not a VAT payer.
  // Supplier details filled in by the owner 2026-10-11. If any were missing (null), in production the
  // invoice is not issued (503) and in development „DOPLNIT“ is printed instead. `registry` is the full footer sentence
  // („Zapsán v živnostenském rejstříku vedeném …“), `address` can have multiple lines (\n).
  invoice: {
    supplier: { name: "Ondřej Čapek", address: "Na Škvárách 117/3, 28401 Kutná Hora", ico: "10965114", registry: "Zapsán v živnostenském rejstříku vedeném v Kutné Hoře" },
  },

  pricing: {
    // Price list approved by the owner 2026-10-12. The guest always sees only ONE resulting price
    // for the stay -- the breakdown into nights, surcharges and cleaning is never shown anywhere.
    approved: true,

    // Calculation (services/price.js):
    //
    //   night i (1..N):  the first two nights `firstNights`, each further one `nextNight`
    //   a night "onto" day D (D = the day of the morning departure) is a holiday night if D is a holiday,
    //   and a weekend night if D is Saturday or Sunday -- weekend though ONLY for a stay of up to
    //   `weekendSurchargeMaxNights` nights; a longer stay has the weekend at the regular price, a holiday not.
    //   Exception: a stay in the summer season (`summerWeekOnly`) has no holiday surcharge -- all
    //   summer weeks cost the same.
    //
    //   New Year's Eve term:  sum of nights × silvester
    //   Christmas term:       sum of nights × christmas  (even if it is also a New Year's Eve term)
    //   otherwise:            each weekend/holiday night × holiday, the others × 1
    //
    //   price = (subtotal + cleaning) rounded UP to roundTo
    //
    // Multipliers are in PERCENT, not 1.2 / 1.8 / 2: computation uses whole numbers only.
    // In floating point 7600 × 1.2 could come out as 9120.000000001 and rounding up would
    // turn it into 500 Kč more.
    firstNights: { count: 2, price: 3800 },
    nextNight: 3700,
    cleaning: 1500,
    roundTo: 500,
    surchargePercent: { holiday: 120, christmas: 180, silvester: 200 },
    weekendSurchargeMaxNights: 5,

    // Christmas term: contains nights ONTO all of these days (i.e. the nights 23→24 and 24→25 Dec).
    // A stay shorter than `minNights` is not sold over Christmas.
    christmas: { nightsOnto: ["12-24", "12-25"], minNights: 3 },
    // New Year's Eve term: contains the night onto 1 Jan (31 Dec→1 Jan).
    silvester: { nightsOnto: ["01-01"] },

    // Holidays as "MM-DD", valid every year. Good Friday and Easter Monday move,
    // those are computed by services/holidays.js. Further days can simply be added here.
    holidays: ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"],
    easterHolidays: true,
  },

  checkIn: "15:00",
  checkOut: "10:00",
};
