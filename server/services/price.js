import { Error as AppError } from "caio-server";
import config from "../config.js";
import { addDays, nightsBetween } from "./dates.js";
import { isHoliday, isWeekend } from "./holidays.js";
import { isSummerStay } from "./season.js";

// Cena se počítá VŽDY na serveru -- hodnota z klienta se ignoruje. Stejnou funkci používá
// price/calculate i reservation/create, aby se nemohly rozejít (design-v1.md § 6).
//
// Pravidla a čísla jsou v config.pricing (tam je i vzorec). Host dostane jen výslednou
// cenu za pobyt; rozpad na noci a úklid se schválně nevrací.

const CODE = "caio-propertyman/price";

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
      code: `${CODE}/notApproved`,
    });
  }
}

/** Základ i-té noci pobytu (od 0): první noci za `firstNights.price`, další za `nextNight`. */
function basePrice(index) {
  const { firstNights, nextNight } = config.pricing;
  return index < firstNights.count ? firstNights.price : nextNight;
}

/**
 * Výsledná cena z procentního násobitele každé noci. Všechno v celých číslech: součet je
 * v haléřích ze 100 % (Kč × procenta), dělí se až při zaokrouhlení.
 */
function totalFromPercents(percents) {
  const { cleaning, roundTo } = config.pricing;
  const subtotal = percents.reduce((sum, percent, index) => sum + basePrice(index) * percent, 0);
  return Math.ceil((subtotal + cleaning * 100) / (roundTo * 100)) * roundTo;
}

/** Dny, NA které připadají noci pobytu: noc z D-1 na D patří dni D (ráno se odjíždí). */
export function nightDays(dateFrom, nights) {
  return Array.from({ length: nights }, (_, i) => addDays(dateFrom, i + 1));
}

/** Obsahuje pobyt noci na všechny dny ze seznamu "MM-DD"? Pobyt může přesahovat přes Nový rok. */
function containsNightsOnto(days, monthDays) {
  const onto = days.map((day) => day.slice(5));
  return monthDays.every((monthDay) => onto.includes(monthDay));
}

/** Druh termínu: vánoční má přednost i před silvestrovským (jedni hosté, žádný meziúklid). */
export function stayKind(days) {
  const { christmas, silvester } = config.pricing;
  if (containsNightsOnto(days, christmas.nightsOnto)) return "christmas";
  if (containsNightsOnto(days, silvester.nightsOnto)) return "silvester";
  return "standard";
}

/**
 * @param {string} dateFrom  ISO datum příjezdu
 * @param {string} dateTo    ISO datum odjezdu (exkluzivní)
 * @returns {{ nights, kind, totalPrice, provisional }}
 *   `kind` je "standard" | "christmas" | "silvester" -- pro admin a testy, hostovi se neukazuje.
 */
export function calculatePrice(dateFrom, dateTo) {
  assertPricingApproved();

  const { surchargePercent, weekendSurchargeMaxNights } = config.pricing;
  const nights = nightsBetween(dateFrom, dateTo);
  const days = nightDays(dateFrom, nights);
  const kind = stayKind(days);

  // Omezení termínů (Vánoce nejméně na 3 noci, léto jen na týden) hlídá stay-rules.js
  // u veřejné rezervace. Tady se počítá cena čehokoli -- i termínu, který zadá vlastník ručně.

  // Delší pobyt má víkend za běžnou cenu. Svátek je s přirážkou -- kromě letní sezóny, kde
  // mají být všechny týdny stejně drahé (5. a 6. 7. by jinak zdražily červencové týdny).
  const weekendSurcharged = nights <= weekendSurchargeMaxNights;
  const holidaySurcharged = !isSummerStay(days);
  const isSurcharged = (day) => (holidaySurcharged && isHoliday(day)) || (weekendSurcharged && isWeekend(day));

  const percents =
    kind === "standard"
      ? days.map((day) => (isSurcharged(day) ? surchargePercent.holiday : 100))
      : days.map(() => surchargePercent[kind]);

  return {
    nights,
    kind,
    totalPrice: totalFromPercents(percents),
    // Dokud ceník není schválený, ať je to vidět i v odpovědi -- frontend si podle toho
    // může cenu označit jako orientační.
    provisional: !config.pricing.approved,
  };
}

/**
 * Ceny pro stránku Ceník: víkend a týden, nic víc (majitel, 2026-10-12). Počítá se stejnou
 * funkcí jako rezervace, takže se web a potvrzení nemůžou rozejít. Svátek v termínu cenu
 * zvedne -- přesnou částku pro konkrétní dny ukáže formulář.
 */
export function listPrices() {
  assertPricingApproved();

  const { surchargePercent } = config.pricing;
  const row = (nights, percent) => ({ nights, totalPrice: totalFromPercents(Array(nights).fill(percent)) });

  return {
    // pá–ne: obě noci víkendové
    weekend: row(config.minNights, surchargePercent.holiday),
    // 7 nocí má víkend za běžnou cenu (weekendSurchargeMaxNights)
    week: row(7, 100),
    provisional: !config.pricing.approved,
  };
}
