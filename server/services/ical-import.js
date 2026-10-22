import ICAL from "ical.js";
import crud from "../reservation/crud.js";
import icalFeedCrud from "../ical-feed/crud.js";

// Downloads foreign feeds and projects them into the `reservation` collection.
//
// ONLY the UID and the dates are taken from the VEVENT. SUMMARY/DESCRIPTION is discarded: e-chalupy
// has to be subscribed in the "with details" export variant (the one without details changes the UIDs
// of foreign reservations and matching by UID would stop working), but that variant carries the
// guest's personal data. We do not store it.
//
// Since v2 the feeds are in the `ical_feed` collection, not in `.env` (design-v2.md § 8) -- so the
// owner can create and change them alone, and it is visible when each was last downloaded successfully.

const FETCH_TIMEOUT_MS = 20000;

/** ICAL.Time -> "2026-09-04" without pulling in the time zone. */
function toIsoDate(time) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${time.year}-${pad(time.month)}-${pad(time.day)}`;
}

/** Extracts from the feed text only what we need: UID + dates. */
export function parseEvents(text) {
  const comp = new ICAL.Component(ICAL.parse(text));
  const events = [];

  for (const vevent of comp.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(vevent);
    if (!event.uid || !event.startDate) continue;

    const dateFrom = toIsoDate(event.startDate);
    // DTEND is optional. An all-day event without DTEND is one day, and because DTEND is
    // exclusive, it is the next day.
    const dateTo = event.endDate
      ? toIsoDate(event.endDate)
      : toIsoDate(event.startDate.clone().adjust(1, 0, 0, 0));

    // A degenerate feed with dateTo <= dateFrom would create a record that blocks nothing
    // and yet collides with all sorts of things. We would rather skip it.
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
 * Downloads and projects one feed and writes its result to `lastSync`.
 *
 * Never throws: the result is a value the caller shows in the UI and writes to the log. That
 * guarantees an error of one feed cannot bring down the import of another.
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
    console.error(`[ical-import] ${feed.name} failed: ${message}`);
    result = { code: feed.code, name: feed.name, state: "failed", message };
  }

  // The run state is the only thing the owner sees about the sync, so it is written on an error too.
  // But a write failure must not throw away an import that already happened -- hence its own try/catch.
  try {
    await icalFeedCrud.setLastSync(feed.code, {
      at: new Date().toISOString(),
      state: result.state,
      importedCount: result.total ?? 0,
      message: result.message ?? null,
    });
  } catch (e) {
    console.error(`[ical-import] ${feed.name}: failed to write lastSync:`, e?.message ?? e);
  }

  return result;
}

/**
 * Goes through the active feeds from the `ical_feed` collection and projects them into `reservation`.
 *
 * An error of one feed MUST NOT bring down the import of another -- each is processed separately and
 * the result is logged. An unavailable Booking must not mean the occupancy from e-chalupy is thrown away.
 */
export async function syncAll() {
  const feeds = await icalFeedCrud.listActive();

  if (feeds.length === 0) {
    console.warn("[ical-import] no active feed in the ical_feed collection -- nothing to sync");
    return { feedList: [], skipped: true };
  }

  const feedList = [];
  for (const feed of feeds) feedList.push(await syncFeed(feed));

  return { feedList, skipped: false };
}

/** Sync of one feed by code -- the button on a row in the admin. */
export async function syncOne(code) {
  const feed = await icalFeedCrud.getByCode(code);

  if (!feed) return { feedList: [], skipped: true };
  // A manual run also processes an inactive feed: the owner can verify the URL this way before
  // turning the feed on. The automation (syncAll) does not touch inactive ones.
  return { feedList: [await syncFeed(feed)], skipped: false };
}
