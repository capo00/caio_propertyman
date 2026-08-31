// Konstanty v1. Ve v1 není kolekce `pricing` ani `property` -- ceník a kapacita jsou natvrdo
// (design-v1.md § 4). Ve v2 se to nahradí daty z DB a tenhle soubor zmizí.

export default {
  propertyId: "roubenka",

  // TODO placeholder -- ověřit skutečnou kapacitu
  capacity: { min: 1, max: 8 },

  // TODO placeholder -- ověřit skutečný minimální počet nocí
  minNights: 2,

  // Strop na délku pobytu. Není v zadání, ale bez něj by šlo jedním requestem zablokovat
  // roubenku na deset let.
  maxNights: 60,

  maxNoteLength: 2000,

  // Anti-spam pro veřejný reservation/create (design-v1.md § 6).
  rateLimit: { maxPerIpPerDay: 5 },

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
