// Nastavení majitelky (`app.private`, server/app-settings/) pro náhledy e-mailů a faktury: z databáze
// v env souboru (bez NODE_ENV .env.development, tedy lokální), aby náhled ukazoval totéž, co by
// appka poslala. Čte přes `caio-server/settings-read` jedním `find` -- žádné Dao, žádná kolekce ani
// index se nezaloží, náhled do databáze nic nezapíše.
//
// Když databáze neodpovídá nebo část `app` ještě uložená není (lokálně ji založí
// `npm run migrate:settings -- --commit`), náhled jede s ukázkovými hodnotami ze
// server/email/samples.js a řekne to.
import "caio-server/env"; // FIRST -- loads the env file into process.env
import { readStoredSettings } from "caio-server/settings-read";
import { normalizeAppPrivate } from "../server/app-settings/shape.js";
import { SAMPLE_SETTINGS } from "../server/email/samples.js";

/** `{ settings, source }`: source "Nastavení (<host>/<db>)" nebo "ukázkové hodnoty (…důvod)". */
export async function readPreviewSettings() {
  const fallback = (reason) => {
    console.warn(`[preview] ${reason} -- náhled s ukázkovými hodnotami (server/email/samples.js)`);
    return { settings: SAMPLE_SETTINGS, source: `ukázkové hodnoty (${reason})` };
  };
  if (!process.env.MONGODB_URI) return fallback("MONGODB_URI není nastavené");
  try {
    const { storedParts, appPrivate } = await readStoredSettings();
    if (!storedParts.includes("app")) return fallback("Nastavení nemá část app (npm run migrate:settings)");
    return { settings: normalizeAppPrivate(appPrivate), source: "Nastavení z databáze" };
  } catch (e) {
    return fallback(`Nastavení nejde přečíst: ${e?.message ?? e}`);
  }
}
