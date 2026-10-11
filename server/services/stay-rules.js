import { Error as AppError } from "caio-server";
import config from "../config.js";
import { nightsBetween } from "./dates.js";
import { formParamMap } from "./dto.js";
import { nightDays, stayKind } from "./price.js";

// Omezení termínů pro VEŘEJNOU rezervaci (price/calculate a reservation/create). Vlastník
// v adminu je obchází -- ruční zápis je výjimka, kterou si domluvil s hostem.
//
// Noc patří dni, NA který připadá (ráno se odjíždí), stejně jako u ceny.

const CODE = "caio-propertyman/stay";

function stayError(code, message) {
  return new AppError.Failed(message, {
    status: 400,
    code: `${CODE}/${code}`,
    paramMap: formParamMap({ dateTo: true }, message, "invalidValueKeyMap"),
  });
}

/** Je den ("YYYY-MM-DD") v letní sezóně, kdy se pronajímá jen na týden? */
function isSummerWeekOnly(day) {
  const { from, to } = config.summerWeekOnly;
  const monthDay = day.slice(5);
  return monthDay >= from && monthDay <= to;
}

/** Hodí chybu, když termín porušuje některé z pravidel. */
export function assertStayRules(dateFrom, dateTo) {
  const nights = nightsBetween(dateFrom, dateTo);
  const days = nightDays(dateFrom, nights);

  const { christmas } = config.pricing;
  if (stayKind(days) === "christmas" && nights < christmas.minNights) {
    throw stayError("christmasMinNights", `Přes Vánoce je minimální délka pobytu ${christmas.minNights} noci.`);
  }

  // Stačí jedna noc v sezóně -- pobyt přes 1. 7. nebo přes konec srpna musí být taky týdenní.
  const summer = config.summerWeekOnly;
  if (days.some(isSummerWeekOnly) && nights !== summer.nights) {
    throw stayError("summerWeekOnly", `V červenci a srpnu se pronajímá jen na ${summer.nights} nocí.`);
  }
}
