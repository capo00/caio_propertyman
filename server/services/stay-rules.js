import { Error as AppError } from "caio-server";
import config from "../config.js";
import { nightsBetween } from "./dates.js";
import { formParamMap } from "./dto.js";
import { nightDays, stayKind } from "./price.js";
import { isSummerStay } from "./season.js";

// Date restrictions for the PUBLIC booking (price/calculate and reservation/create). The owner
// bypasses them in the admin -- a manual entry is an exception agreed with the guest.
//
// A night belongs to the day it falls ON (guests leave in the morning), same as for the price.

const CODE = "caio-propertyman/stay";

// The error code is also the field code: the booking form reacts to the code (price preview)
// and translates the field message by it (lsi `errors`).
function stayError(reason, message) {
  const code = `${CODE}/${reason}`;
  return new AppError.Failed(message, {
    status: 400,
    code,
    paramMap: formParamMap({ dateTo: true }, message, "invalidValueKeyMap", code),
  });
}

/** Throws when the stay breaks one of the rules. */
export function assertStayRules(dateFrom, dateTo) {
  const nights = nightsBetween(dateFrom, dateTo);
  const days = nightDays(dateFrom, nights);

  const { christmas } = config.pricing;
  if (stayKind(days) === "christmas" && nights < christmas.minNights) {
    throw stayError("christmasMinNights", `Over Christmas the minimum stay is ${christmas.minNights} nights.`);
  }

  // One night in the season is enough -- a stay across 1 July or across the end of August must be a week too.
  const summer = config.summerWeekOnly;
  if (isSummerStay(days) && nights !== summer.nights) {
    throw stayError("summerWeekOnly", `In July and August the cottage is only let for ${summer.nights} nights.`);
  }
}
