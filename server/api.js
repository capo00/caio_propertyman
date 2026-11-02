import { Authentication } from "caio-server";
import reservationApi from "./reservation/api.js";
import calendarApi from "./calendar/api.js";
import reviewApi from "./review/api.js";
import icalFeedApi from "./ical-feed/api.js";
import invoiceApi from "./invoice/api.js";

export default {
  ...reservationApi,
  ...calendarApi,
  ...reviewApi,
  ...icalFeedApi,
  ...invoiceApi,

  // Identity a role (`identity/adminList`, `identity/update`, `member/set`, …). Knihovna
  // je schválně nemountuje sama -- appka rozhoduje, jestli je chce (caio-server README,
  // `Authentication.createApi()`). Správa identit v liště adminu je komponenta z caio-ui
  // (`displayIdentity` v `client/src/admin/top.jsx`) a volá právě tyhle use casy; bez
  // tohohle řádku odpoví server `identity/adminList does not exist`.
  ...Authentication.createApi(),
};
