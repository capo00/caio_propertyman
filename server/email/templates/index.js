// Všechny šablony podle kódu (`template` v eventList). Kódy H1–H10, V1–V2 viz
// docs/proposal-reservation-flow.md § 5.
import requestReceived from "./request-received.js";
import ownerNewRequest from "./owner-new-request.js";
import depositRequested from "./deposit-requested.js";
import requestRejected from "./request-rejected.js";
import depositReminder from "./deposit-reminder.js";
import reservationConfirmed from "./reservation-confirmed.js";
import reservationExpired from "./reservation-expired.js";
import reservationCancelled from "./reservation-cancelled.js";
import arrivalInfo from "./arrival-info.js";
import thankYou from "./thank-you.js";
import reservationChanged from "./reservation-changed.js";
import balanceReminder from "./balance-reminder.js";
import ownerDepositOverdue from "./owner-deposit-overdue.js";

const TEMPLATE_LIST = [
  requestReceived, ownerNewRequest, depositRequested, requestRejected, depositReminder,
  reservationConfirmed, reservationExpired, reservationCancelled, arrivalInfo, thankYou,
  reservationChanged, balanceReminder, ownerDepositOverdue,
];

export const TEMPLATES = Object.fromEntries(TEMPLATE_LIST.map((template) => [template.code, template]));
