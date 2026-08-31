import { Error as AppError } from "caio-server";
import config from "../config.js";
import crud from "./crud.js";
import { getOccupied } from "../services/availability.js";
import { assertPricingApproved, calculatePrice } from "../services/price.js";
import { isIsoDate, nightsBetween, todayIso } from "../services/dates.js";
import { sendReservationEmails } from "../services/email.js";

const CODE = "caio-propertyman/reservation";

// Validace je schválně TADY, ve `fn`, a ne v poli `validator`.
//
// `validator` v caio-serveru má rozbitou chybovou cestu: když hodí výjimku, getDtoIn pošle
// 400 -- ale nezastaví se a `fn` se stejně zavolá s nevalidním dtoIn. U create by to znamenalo,
// že se rezervace i tak zapíše a následné res.json() spadne na ERR_HTTP_HEADERS_SENT.
// Pole `validator` se proto smí používat nanejvýš na přetypování, nikdy na odmítnutí.

/** Chyba, které rozumí uu5g05-forms: paramMap klíče se namapují na konkrétní inputy. */
function invalid(message, keyMap, kind = "invalidValueKeyMap") {
  return new AppError.Failed(message, {
    status: 400,
    code: `${CODE}/invalidDtoIn`,
    paramMap: { [kind]: keyMap },
  });
}

/**
 * dtoIn z GETu přijde celý jako řetězce -- query parametry se nepřetypovávají (jen hodnoty
 * začínající `{` nebo `[` se zkusí JSON.parse). Čísla a data je proto nutné převést ručně.
 */
function readDateRange(dtoIn) {
  const dateFrom = String(dtoIn?.dateFrom ?? "");
  const dateTo = String(dtoIn?.dateTo ?? "");

  const badMap = {};
  if (!isIsoDate(dateFrom)) badMap.dateFrom = true;
  if (!isIsoDate(dateTo)) badMap.dateTo = true;
  if (Object.keys(badMap).length) {
    throw invalid("Datum musí být ve tvaru RRRR-MM-DD.", badMap);
  }
  if (dateFrom >= dateTo) {
    throw invalid("Odjezd musí být po příjezdu.", { dateTo: true });
  }
  return { dateFrom, dateTo };
}

function validateStay(dateFrom, dateTo) {
  if (dateFrom < todayIso()) {
    throw invalid("Termín nemůže začínat v minulosti.", { dateFrom: true });
  }
  const nights = nightsBetween(dateFrom, dateTo);
  if (nights < config.minNights) {
    throw invalid(`Minimální délka pobytu je ${config.minNights} nocí.`, { dateTo: true });
  }
  if (nights > config.maxNights) {
    throw invalid(`Maximální délka pobytu je ${config.maxNights} nocí.`, { dateTo: true });
  }
  return nights;
}

function readGuestCount(dtoIn) {
  const guestCount = Number(dtoIn?.guestCount);
  const { min, max } = config.capacity;
  if (!Number.isInteger(guestCount) || guestCount < min || guestCount > max) {
    throw invalid(`Počet osob musí být mezi ${min} a ${max}.`, { guestCount: true });
  }
  return guestCount;
}

function readContact(dtoIn) {
  const contact = dtoIn?.contact ?? {};
  const name = String(contact.name ?? "").trim();
  const email = String(contact.email ?? "").trim();
  const phone = String(contact.phone ?? "").trim();

  const missing = {};
  if (!name) missing.name = true;
  if (!email) missing.email = true;
  if (!phone) missing.phone = true;
  if (Object.keys(missing).length) {
    throw invalid("Vyplňte prosím kontaktní údaje.", missing, "missingKeyMap");
  }

  const bad = {};
  if (name.length > 200) bad.name = true;
  // Záměrně shovívavé: přísnější regexy odmítají platné adresy. Skutečné ověření je,
  // že hostovi dorazí potvrzovací e-mail.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 320) bad.email = true;
  if (!/^\+?[\d\s()-]{9,20}$/.test(phone)) bad.phone = true;
  if (Object.keys(bad).length) {
    throw invalid("Zkontrolujte prosím e-mail a telefon.", bad);
  }

  return { name, email, phone };
}

/**
 * App.init nenastavuje `trust proxy`, takže req.ip je na App Enginu IP proxy, ne hosta.
 * Skutečnou adresu nese X-Forwarded-For, kde první položka je klient.
 */
function clientIpOf(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req?.socket?.remoteAddress ?? null;
}

export default {
  // Vrací JEN obsazené intervaly -- bez jmen, kontaktů a bez informace, odkud obsazenost je.
  "availability/get": {
    method: "get",
    fn: async ({ dtoIn }) => {
      const { dateFrom, dateTo } = readDateRange(dtoIn);
      return { occupiedList: await getOccupied(dateFrom, dateTo) };
    },
  },

  // Informativní přepočet pro formulář. Závazná je až cena spočtená v reservation/create.
  "price/calculate": {
    method: "get",
    fn: async ({ dtoIn }) => {
      const { dateFrom, dateTo } = readDateRange(dtoIn);
      validateStay(dateFrom, dateTo);
      // Počet osob teď cenu přímo ovlivňuje (do 5 / nad 5), takže je povinný.
      const guestCount = readGuestCount(dtoIn);
      return calculatePrice(dateFrom, dateTo, guestCount, "web");
    },
  },

  // Veřejný POST, který zapisuje do DB -- proto honeypot a rate limit (design-v1.md § 6).
  "reservation/create": {
    method: "post",
    fn: async ({ dtoIn, req }) => {
      // Úplně první krok, ještě před jakýmkoli dotazem do DB (rate limit se ptá do Monga).
      // Jinak by odpověď na neschválený ceník závisela na tom, jestli je dostupné Mongo.
      assertPricingApproved();

      // Honeypot: skryté pole, které člověk nevyplní. Tváříme se úspěšně a nic nezapisujeme --
      // bot se nedozví, že ho někdo odhalil, a nezkusí to jinak.
      if (String(dtoIn?.website ?? "").trim() !== "") {
        return { id: null, state: "pending", nights: 0, totalPrice: 0 };
      }

      const { dateFrom, dateTo } = readDateRange(dtoIn);
      validateStay(dateFrom, dateTo);
      const guestCount = readGuestCount(dtoIn);
      const contact = readContact(dtoIn);

      const note = String(dtoIn?.note ?? "").trim();
      if (note.length > config.maxNoteLength) {
        throw invalid(`Poznámka může mít nejvýš ${config.maxNoteLength} znaků.`, { note: true });
      }

      // Rate limit dotazem nad kolekcí, ne express-rate-limit v paměti: middleware přidaný
      // po App.init se k requestu nedostane, a stav v paměti by navíc nepřežil restart
      // instance na GAE ani se nesdílel mezi instancemi.
      const clientIp = clientIpOf(req);
      if ((await crud.countRecentFromIp(clientIp)) >= config.rateLimit.maxPerIpPerDay) {
        throw new AppError.Failed("Příliš mnoho rezervací z jedné adresy. Zkuste to zítra.", {
          status: 429,
          code: `${CODE}/rateLimitExceeded`,
        });
      }

      const result = await crud.createFromWeb({
        dateFrom, dateTo, guestCount, contact, note: note || null, clientIp,
      });

      // Selhání e-mailu NESMÍ shodit rezervaci -- ta je už zapsaná a je to ta cenná část.
      try {
        await sendReservationEmails({ ...result, dateFrom, dateTo, guestCount, contact, note });
      } catch (e) {
        console.error("[reservation/create] notifikace se nepodařilo odeslat:", e?.message ?? e);
      }

      return result;
    },
  },
};
