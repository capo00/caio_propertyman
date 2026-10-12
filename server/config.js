// Konstanty v1. Ve v1 není kolekce `pricing` ani `property` -- ceník a kapacita jsou natvrdo
// (design-v1.md § 4). Ve v2 se to nahradí daty z DB a tenhle soubor zmizí.

export default {
  propertyId: "roubenka",

  // 9 pevných lůžek + 1 přistýlka (inzerát na e-chalupy.cz, Libošovice 6).
  capacity: { min: 1, max: 10 },

  minNights: 2,

  // Červenec a srpen jen na týden (majitel, 2026-10-12): pobyt, který má aspoň jednu noc NA
  // den v tomhle rozmezí ("MM-DD", noc patří dni, kdy se ráno odjíždí), musí mít přesně
  // `nights` nocí. Hlídá services/stay-rules.js.
  summerWeekOnly: { from: "07-01", to: "08-31", nights: 7 },

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
    // Ceník schválený majitelem 2026-10-12. Host vidí vždycky jen JEDNU výslednou cenu
    // za pobyt -- rozpad na noci, příplatky a úklid se nikde nezobrazuje.
    approved: true,

    // Výpočet (services/price.js):
    //
    //   noc i (1..N):  první dvě noci `firstNights`, každá další `nextNight`
    //   noc "na" den D (D = den, kdy se ráno odjíždí) je sváteční, když je D svátek,
    //   a víkendová, když je D sobota nebo neděle -- víkendová ale JEN u pobytu do
    //   `weekendSurchargeMaxNights` nocí; delší pobyt má víkend za běžnou cenu, svátek ne.
    //   Výjimka: pobyt v letní sezóně (`summerWeekOnly`) za svátky nepřiráží -- všechny
    //   letní týdny stojí stejně.
    //
    //   silvestrovský termín:  součet nocí × silvester
    //   vánoční termín:        součet nocí × christmas  (i když je zároveň silvestrovský)
    //   jinak:                 každá víkendová/sváteční noc × holiday, ostatní × 1
    //
    //   cena = (mezisoučet + cleaning) zaokrouhlený NAHORU na roundTo
    //
    // Násobitele jsou v PROCENTECH, ne 1,2 / 1,8 / 2: počítá se jen v celých číslech.
    // V plovoucí čárce by 7600 × 1,2 mohlo vyjít 9120,000000001 a zaokrouhlení nahoru by
    // z toho udělalo o 500 Kč víc.
    firstNights: { count: 2, price: 3800 },
    nextNight: 3700,
    cleaning: 1500,
    roundTo: 500,
    surchargePercent: { holiday: 120, christmas: 180, silvester: 200 },
    weekendSurchargeMaxNights: 5,

    // Vánoční termín: obsahuje noci NA všechny tyhle dny (tedy noci 23.→24. a 24.→25.).
    // Kratší pobyt než `minNights` se přes Vánoce neprodává.
    christmas: { nightsOnto: ["12-24", "12-25"], minNights: 3 },
    // Silvestrovský termín: obsahuje noc na 1. 1. (31.12.→1.1.).
    silvester: { nightsOnto: ["01-01"] },

    // Svátky jako "MM-DD", platí každý rok. Velký pátek a Velikonoční pondělí se pohybují,
    // ty dopočítává services/holidays.js. Další dny stačí dopsat sem.
    holidays: ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"],
    easterHolidays: true,
  },

  checkIn: "15:00",
  checkOut: "10:00",
};
