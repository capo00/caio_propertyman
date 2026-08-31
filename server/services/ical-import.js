import ICAL from "ical.js";
import crud from "../reservation/crud.js";

// Stahuje a promítá cizí feedy do kolekce `reservation`.
//
// Z VEVENTu se bere JEN UID a termín. SUMMARY/DESCRIPTION se zahazuje: e-chalupy je nutné
// odebírat ve variantě exportu "s detaily" (ta bez detailů mění UID cizích rezervací a párování
// na UID by přestalo fungovat), jenže ta varianta nese osobní údaje hosta. Neukládáme je.

const FEEDS = [
  { code: "booking", envVar: "ICAL_FEED_BOOKING", name: "Booking.com" },
  { code: "echalupy", envVar: "ICAL_FEED_ECHALUPY", name: "e-chalupy" },
];

const FETCH_TIMEOUT_MS = 20000;

/** ICAL.Time -> "2026-09-04" bez zatažení časové zóny. */
function toIsoDate(time) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${time.year}-${pad(time.month)}-${pad(time.day)}`;
}

/** Vytáhne z textu feedu jen to, co potřebujeme: UID + termín. */
export function parseEvents(text) {
  const comp = new ICAL.Component(ICAL.parse(text));
  const events = [];

  for (const vevent of comp.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(vevent);
    if (!event.uid || !event.startDate) continue;

    const dateFrom = toIsoDate(event.startDate);
    // DTEND je nepovinné. U celodenní události bez DTEND jde o jeden den, a protože je DTEND
    // exkluzivní, je to příští den.
    const dateTo = event.endDate
      ? toIsoDate(event.endDate)
      : toIsoDate(event.startDate.clone().adjust(1, 0, 0, 0));

    // Zvrhlý feed s dateTo <= dateFrom by v kolekci udělal záznam, který nic neblokuje
    // a přitom by kolidoval s kdečím. Radši ho přeskočíme.
    if (dateTo <= dateFrom) continue;

    events.push({ uid: event.uid, dateFrom, dateTo });
  }

  return events;
}

async function fetchFeed(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: "text/calendar, text/plain, */*" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  return response.text();
}

/**
 * Projde nakonfigurované feedy a promítne je do kolekce.
 *
 * Chyba jednoho feedu NESMÍ shodit import druhého -- každý se zpracuje samostatně a výsledek
 * se zaloguje. Nedostupný Booking nesmí znamenat, že se zahodí obsazenost z e-chalup.
 */
export async function syncAll() {
  const configured = FEEDS.filter((feed) => !!process.env[feed.envVar]);

  if (configured.length === 0) {
    console.warn("[ical-import] žádný feed není nastavený (ICAL_FEED_BOOKING, ICAL_FEED_ECHALUPY)");
    return { feedList: [], skipped: true };
  }

  const feedList = [];

  for (const feed of configured) {
    try {
      const text = await fetchFeed(process.env[feed.envVar]);
      const events = parseEvents(text);
      const result = await crud.syncFeed(feed.code, events);
      console.log(`[ical-import] ${feed.name}: ${JSON.stringify(result)}`);
      feedList.push({ code: feed.code, state: "ok", ...result });
    } catch (e) {
      const message = e?.message ?? String(e);
      console.error(`[ical-import] ${feed.name} selhal: ${message}`);
      feedList.push({ code: feed.code, state: "failed", message });
    }
  }

  return { feedList, skipped: false };
}
