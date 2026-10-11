// Konstanty v1. Ve v1 není kolekce `pricing` ani `property` -- ceník a kapacita jsou natvrdo
// (design-v1.md § 4). Ve v2 se to nahradí daty z DB a tenhle soubor zmizí.

export default {
  propertyId: "roubenka",

  // 9 pevných lůžek + 1 přistýlka (inzerát na e-chalupy.cz, Libošovice 6).
  capacity: { min: 1, max: 10 },

  minNights: 2,

  // Strop na délku pobytu. Není v zadání, ale bez něj by šlo jedním requestem zablokovat
  // roubenku na deset let.
  maxNights: 60,

  maxNoteLength: 2000,

  // Anti-spam pro veřejný reservation/create (design-v1.md § 6).
  rateLimit: { maxPerIpPerDay: 5 },

  // Jazyky webu (přepínač ve FE). Rezervace si pamatuje jazyk hosta a e-maily mu jdou v něm --
  // pokud pro něj existuje šablona, jinak česky (docs/impl-plan-reservation-flow.md § 1).
  languages: ["cs", "en", "de", "sk"],

  // Platby u rezervace z webu (docs/proposal-reservation-flow.md, rozhodnutí 2026-10-08).
  // Všechna "dny" se počítají od dnešního data v `timeZone`, ne v UTC -- kolem půlnoci by
  // jinak splatnost vyšla o den jinak.
  reservation: {
    timeZone: "Europe/Prague",
    depositPercent: 50,
    // Výchozí splatnost zálohy = den přijetí + 3 dny (do 23:59).
    depositDueDays: 3,
    // Přijetí 14 a méně dní před příjezdem: celá částka najednou, bez doplatku.
    fullPaymentDaysBeforeArrival: 14,
    // Výchozí splatnost doplatku = příjezd − 14 dní.
    balanceDueDaysBeforeArrival: 14,
    // Storno podmínky (majitel 2026-10-10): poplatek v % z ceny pobytu podle dní do příjezdu,
    // `maxDays` včetně. Nad posledním pásmem (61+ dní) zdarma. Viz reservation/cancellation.js.
    cancellationPolicy: [
      { maxDays: 14, percent: 100 },
      { maxDays: 30, percent: 50 },
      { maxDays: 60, percent: 25 },
    ],
  },

  // E-maily hostovi (server/email/). Název a kontakt zrcadlí web (LSI `property.name`,
  // client/src/components/contact/content.js) -- server klientské soubory číst nemůže.
  email: {
    propertyName: "Roubený ráj",
    contact: { phone: "+420 723 872 512", email: "capkova.leni@gmail.com" },
    address: "Libošovice 6, 507 44 Libošovice",
    // Adresa webu pro odkazy (admin v e-mailu vlastníkovi). APP_URL je i v konfiguraci
    // caio-serveru (reset hesla), takže v produkčním .env už je.
    webUrl: () => (process.env.APP_URL || "http://localhost:8080").replace(/\/+$/, ""),
    // Zatím nedodané (docs/wip.md). null = řádek se v e-mailu vynechá.
    arrivalInfo: { keys: null, parking: null, wifiName: null, wifiPassword: null },
  },

  // Účet pro zálohy a doplatky. Číslo pro lidi, IBAN pro QR platbu (ověřený majitelem 2026-10-08).
  bankAccount: { number: "6338724003/0800", iban: "CZ9808000000006338724003" },

  // Faktury na žádost (docs/proposal-invoice-pdf.md). Majitel má IČO a není plátce DPH.
  // Údaje dodavatele doplnil majitel 2026-10-11. Kdyby některá chyběla (null), v produkci se
  // faktura nevystaví (503) a ve vývoji se místo ní vytiskne „DOPLNIT“. `registry` je celá věta do patičky
  // („Zapsán v živnostenském rejstříku vedeném …“), `address` může mít víc řádků (\n).
  invoice: {
    supplier: { name: "Ondřej Čapek", address: "Na Škvárách 117/3, 28401 Kutná Hora", ico: "10965114", registry: "Zapsán v živnostenském rejstříku vedeném v Kutné Hoře" },
  },

  pricing: {
    // ┌─────────────────────────────────────────────────────────────────────────────────┐
    // │ CENÍK NENÍ SCHVÁLENÝ. Všechny sazby níž jsou VYMYŠLENÉ -- drží jen tvar, ne      │
    // │ hodnoty. Až budou skutečná čísla, přepsat sazby a přepnout `approved` na true.   │
    // │                                                                                 │
    // │ Dokud je `approved: false`, server v produkci ODMÍTNE spočítat cenu (viz         │
    // │ services/price.js). Ve vývoji počítá dál, aby šlo dělat frontend, ale k hostům   │
    // │ se smyšlená částka nedostane.                                                   │
    // └─────────────────────────────────────────────────────────────────────────────────┘
    approved: false,

    // Sazba se hledá podle TŘÍ os: kanál -> počet osob -> délka pobytu.
    //
    // 1) Kanál: `web` je náš web -- podle něj se počítá cena každé rezervace z formuláře.
    //    `booking` je REFERENČNÍ ceník pro Booking.com (vyšší, aby pokryl provizi portálu).
    //    Rozhodnuto 2026-08-30: `booking` sazby jsou POUZE podklad, který vlastník ručně
    //    opisuje do extranetu. Server s nimi nikde nepočítá a nikde je nezobrazuje --
    //    rezervace z Bookingu chodí přes iCal, ten cenu nenese, a zůstávají tak
    //    s `totalPrice: null`. Nepřidávat je do žádného výpočtu, dokud to někdo nezadá.
    // 2) Počet osob: do 5 včetně / 6 a víc.
    // 3) Délka pobytu: čím delší pobyt, tím nižší cena za noc. Klíč = od kolika nocí
    //    sazba platí; hledá se nejvyšší práh, který je <= počtu nocí.
    guestTiers: [
      { code: "upTo5", maxGuests: 5, label: "1–5 osob" },
      { code: "over5", maxGuests: Infinity, label: "6 a více osob" },
    ],

    // Kč za noc. VŠECHNO NÍŽ JE PLACEHOLDER.
    rates: {
      web: {
        upTo5: { 1: 3900, 3: 3600, 5: 3300, 7: 3000 },
        over5: { 1: 4900, 3: 4600, 5: 4300, 7: 4000 },
      },
      booking: {
        upTo5: { 1: 4500, 3: 4200, 5: 3900, 7: 3500 },
        over5: { 1: 5600, 3: 5300, 5: 5000, 7: 4600 },
      },
    },
  },

  checkIn: "15:00",
  checkOut: "10:00",
};
