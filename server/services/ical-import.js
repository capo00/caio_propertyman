import ICAL from "ical.js";
import crud from "../reservation/crud.js";
import icalFeedCrud from "../ical-feed/crud.js";

// Stahuje a promítá cizí feedy do kolekce `reservation`.
//
// Z VEVENTu se bere JEN UID a termín. SUMMARY/DESCRIPTION se zahazuje: e-chalupy je nutné
// odebírat ve variantě exportu "s detaily" (ta bez detailů mění UID cizích rezervací a párování
// na UID by přestalo fungovat), jenže ta varianta nese osobní údaje hosta. Neukládáme je.
//
// Od v2 jsou feedy v kolekci `ical_feed`, ne v `.env` (design-v2.md § 8) -- díky tomu je
// vlastník může zakládat a měnit sám a je vidět, kdy se co naposledy povedlo stáhnout.

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
 * Stáhne a promítne jeden feed a zapíše mu výsledek do `lastSync`.
 *
 * Nikdy nehází: výsledek je hodnota, kterou volající ukáže v UI i zapíše do logu. Tím je
 * zaručené, že chyba jednoho feedu nemůže shodit import druhého.
 */
async function syncFeed(feed) {
  let result;

  try {
    const text = await fetchFeed(feed.url);
    const events = parseEvents(text);
    const counts = await crud.syncFeed(feed.code, events);
    console.log(`[ical-import] ${feed.name}: ${JSON.stringify(counts)}`);
    result = { code: feed.code, name: feed.name, state: "ok", ...counts };
  } catch (e) {
    const message = e?.message ?? String(e);
    console.error(`[ical-import] ${feed.name} selhal: ${message}`);
    result = { code: feed.code, name: feed.name, state: "failed", message };
  }

  // Stav běhu je to jediné, co o synchronizaci vlastník uvidí, takže se zapisuje i u chyby.
  // Selhání zápisu ale nesmí zahodit už provedený import -- proto vlastní try/catch.
  try {
    await icalFeedCrud.setLastSync(feed.code, {
      at: new Date().toISOString(),
      state: result.state,
      importedCount: result.total ?? 0,
      message: result.message ?? null,
    });
  } catch (e) {
    console.error(`[ical-import] ${feed.name}: lastSync se nepodařilo zapsat:`, e?.message ?? e);
  }

  return result;
}

/**
 * Projde aktivní feedy z kolekce `ical_feed` a promítne je do kolekce `reservation`.
 *
 * Chyba jednoho feedu NESMÍ shodit import druhého -- každý se zpracuje samostatně a výsledek
 * se zaloguje. Nedostupný Booking nesmí znamenat, že se zahodí obsazenost z e-chalup.
 */
export async function syncAll() {
  const feeds = await icalFeedCrud.listActive();

  if (feeds.length === 0) {
    console.warn("[ical-import] žádný aktivní feed v kolekci ical_feed -- není co synchronizovat");
    return { feedList: [], skipped: true };
  }

  const feedList = [];
  for (const feed of feeds) feedList.push(await syncFeed(feed));

  return { feedList, skipped: false };
}

/** Synchronizace jednoho feedu podle kódu -- tlačítko u řádku v adminu. */
export async function syncOne(code) {
  const feed = await icalFeedCrud.getByCode(code);

  if (!feed) return { feedList: [], skipped: true };
  // Ruční spuštění projede i neaktivní feed: vlastník si tím může ověřit URL dřív,
  // než feed zapne. Automatika (syncAll) se neaktivních nedotkne.
  return { feedList: [await syncFeed(feed)], skipped: false };
}
