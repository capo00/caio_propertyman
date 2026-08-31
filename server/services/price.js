import { Error as AppError } from "caio-server";
import config from "../config.js";
import { nightsBetween } from "./dates.js";

// Cena se počítá VŽDY na serveru -- hodnota z klienta se ignoruje. Stejnou funkci používá
// price/calculate i reservation/create, aby se nemohly rozejít (design-v1.md § 6).
//
// Sazba závisí na třech věcech (viz config.js):
//   kanál (web | booking) -> počet osob (do 5 / nad 5) -> délka pobytu (víc nocí = levněji)
//
// Sazba je jednotná pro celý pobyt, ne po nocích: je odvozená od CELKOVÉ délky, takže
// počítat ji pro každou noc zvlášť nedává smysl.

/** Do které skupiny podle počtu osob host spadá. */
function guestTierOf(guestCount) {
  const tier = config.pricing.guestTiers.find((t) => guestCount <= t.maxGuests);
  if (!tier) {
    // Nemělo by nastat -- kapacita se validuje dřív. Radši hlasitě než tiše špatně.
    throw new AppError.Failed(`Pro ${guestCount} osob není sazba.`, {
      status: 500,
      code: "caio-propertyman/price/noGuestTier",
    });
  }
  return tier;
}

/**
 * Sazba za noc: nejvyšší práh v tabulce, který je <= počtu nocí.
 * Tabulka { 1: …, 3: …, 5: …, 7: … } pro 4 noci vrátí sazbu z prahu 3.
 */
function nightlyRateFor(nights, guestTierCode, channel) {
  const byChannel = config.pricing.rates[channel];
  if (!byChannel) {
    throw new AppError.Failed(`Neznámý kanál "${channel}".`, {
      status: 500,
      code: "caio-propertyman/price/unknownChannel",
    });
  }

  const table = byChannel[guestTierCode];
  const threshold = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((min) => min <= nights)
    .pop();

  if (threshold === undefined) {
    throw new AppError.Failed(`Pro ${nights} nocí není sazba.`, {
      status: 500,
      code: "caio-propertyman/price/noNightTier",
    });
  }

  return { rate: table[threshold], threshold };
}

/**
 * Neschválený ceník se v produkci nesmí dostat k hostovi. Ve vývoji se počítá dál,
 * aby šlo stavět frontend -- viz rámeček v config.js.
 *
 * Volá se jako úplně první krok každého use casu, který se ceny dotýká -- dřív než dotazy
 * do DB. Jinak by se odpověď lišila podle toho, jestli je zrovna dostupné Mongo.
 */
export function assertPricingApproved() {
  if (!config.pricing.approved && process.env.NODE_ENV === "production") {
    throw new AppError.Failed("Ceník zatím není schválený, cenu nelze spočítat.", {
      status: 503,
      code: "caio-propertyman/price/notApproved",
    });
  }
}

/**
 * @param {string} dateFrom  ISO datum příjezdu
 * @param {string} dateTo    ISO datum odjezdu (exkluzivní)
 * @param {number} guestCount
 * @param {"web"|"booking"} channel
 * @returns {{ nights, guestCount, channel, pricePerNight, totalPrice, provisional, breakdown }}
 */
export function calculatePrice(dateFrom, dateTo, guestCount, channel = "web") {
  assertPricingApproved();

  const nights = nightsBetween(dateFrom, dateTo);
  const guestTier = guestTierOf(guestCount);
  const { rate, threshold } = nightlyRateFor(nights, guestTier.code, channel);
  const totalPrice = rate * nights;

  return {
    nights,
    guestCount,
    channel,
    pricePerNight: rate,
    totalPrice,
    // Dokud ceník není schválený, ať je to vidět i v odpovědi -- frontend si podle toho
    // může cenu označit jako orientační.
    provisional: !config.pricing.approved,
    breakdown: [
      {
        type: "stay",
        label: `${nights} nocí × ${rate.toLocaleString("cs-CZ")} Kč (${guestTier.label}, od ${threshold} nocí)`,
        count: nights,
        unitPrice: rate,
        price: totalPrice,
      },
    ],
  };
}
