// Přesun údajů majitelky z kódu do Nastavení (`sys_settings.app.private`), 2026-11.
//
//   npm run migrate:settings                          # plán proti .env.development, nic nezapíše
//   npm run migrate:settings -- --commit              # zápis
//   npm run migrate:settings -- --env .env [--commit] # produkce -- JEN po Caiově „ano“ těsně předem
//
// Do v0.2.9 byly účet (e-maily s platbou, QR, faktura) a dodavatel na faktuře konstantami
// v server/config.js; od 2026-11 je server čte jen z Nastavení (server/app-settings/) a mění je
// majitelka v administraci (Správa -> Nastavení). Skript jednou zkopíruje tehdejší hodnoty, aby
// e-maily a faktury po vydání vypadaly stejně. Údaje k příjezdu byly prázdné, ty se nekopírují.
// E-mail majitelky (dřív OWNER_EMAIL v .env) přenáší `npm run settings-import` (docs/release.md § 2).
//
// - **Nikdy nepřepíše**: doplní jen pole, která v Nastavení prázdná jsou; vyplněné nechá být
//   (hodnota se pak mění v administraci). Pořadí vůči settings-import je proto jedno.
// - **Dry run nezapíše nic**: čte přes `caio-server/settings-read` jedním `find`, caio-server
//   (jehož Dao při importu zakládají indexy) nenačte. `--commit` ho načte -- cílová databáze pak
//   dostane kolekci `sys_settings` a indexy Dao caio-serveru (`sys_identity`, …); před během proti
//   produkci to říct.
// - Vypisuje jen jména polí, nikdy hodnoty.
import { runScript } from "caio-server/script"; // FIRST import -- it loads the env file
import { readStoredSettings } from "caio-server/settings-read";
import serverConfig from "../server/server.config.js";
import { normalizeAppPrivate } from "../server/app-settings/shape.js";

// Hodnoty ze server/config.js k v0.2.9 (`bankAccount`, `invoice.supplier`; majitel 2026-10-08 a 2026-10-11).
const VALUES_2026_11 = {
  payment: { accountNumber: "6338724003/0800", iban: "CZ9808000000006338724003", bic: "GIBACZPX" },
  invoiceSupplier: {
    name: "Ondřej Čapek",
    address: "Na Škvárách 117/3, 28401 Kutná Hora",
    ico: "10965114",
    registry: "Zapsán v živnostenském rejstříku vedeném v Kutné Hoře",
  },
};

/** `stored` doplněné o `VALUES_2026_11` jen tam, kde je prázdno; a jména doplněných polí. */
function fillEmpty(stored) {
  const merged = normalizeAppPrivate(stored);
  const filled = [];
  for (const [group, values] of Object.entries(VALUES_2026_11)) {
    for (const [key, value] of Object.entries(values)) {
      if (merged[group][key]) continue;
      merged[group][key] = value;
      filled.push(`${group}.${key}`);
    }
  }
  return { merged, filled };
}

await runScript({
  name: "migrate-settings",
  config: serverConfig,
  reportFile: "tmp/migrate-settings-report.json",
  async run({ commit, report, log, fail }) {
    if (!process.env.MONGODB_URI) fail("MONGODB_URI is not set.");

    const { storedParts, appPrivate } = await readStoredSettings();
    const { filled } = fillEmpty(appPrivate);
    report.storedParts = storedParts;
    report.fill = filled;
    log(`sys_settings: ${storedParts.join(", ") || "-"}; app.private fields to fill: ${filled.join(", ") || "none"}`);
    if (!filled.length) {
      log("nothing to do -- every field is filled in already (change it in the settings screen)");
      report.result = "skipped";
      return 0;
    }
    if (!commit) {
      log("plan only; the app's validator runs with --commit");
      report.result = "planned";
      return 0;
    }

    // Až teď: caio-server zakládá při importu indexy svých Dao.
    const { Settings } = await import("caio-server");
    const { validatePrivate } = await import("../server/app-settings/index.js");
    // Znovu přes Settings (ne settings-read): co se mezitím uložilo, se nepřepíše.
    const current = await Settings.getAdmin();
    const { merged, filled: written } = fillEmpty(current.app.private);
    if (!written.length) {
      log("filled in meanwhile -- nothing written");
      report.result = "skipped";
      return 0;
    }
    const value = validatePrivate(merged);
    if (storedParts.includes("app") || (await Settings.storedParts()).includes("app")) {
      await Settings.update({ app: { private: value } });
    } else if (!(await Settings.createIfAbsent("app", { public: {}, private: value }))) {
      fail("sys_settings.app appeared meanwhile -- run the script again");
    }
    report.written = written;
    report.result = "written";
    log(`app.private: filled ${written.join(", ")}`);
    return 0;
  },
});
