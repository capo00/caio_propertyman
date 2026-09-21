/**
 * Přidělí (nebo vypíše) role jedné identitě podle e-mailu.
 *
 *   npm run grant-role -- ty@example.com                 # co ten člověk má
 *   npm run grant-role -- ty@example.com authorities     # nastaví přesně tyhle role
 *   npm run grant-role -- ty@example.com --clear         # odebere všechny
 *
 * Proč skript a ne administrace: role se přidělují use casem `member/set`, který sám
 * vyžaduje `authorities` -- tak dokola. První authority tedy musí vzniknout mimo appku
 * (caio-server docs/auth.md, 10). Dřív to byl zásah přímo do `sys_identity`; teď jsou
 * role v `sys_member` pod kódem identity, a ten nikdo nezná zpaměti, takže si ho skript
 * najde podle e-mailu sám.
 *
 * Nastavuje se **celý** seznam, ne přírůstek: co není na příkazové řádce, ten člověk mít
 * nebude. Vypsat, co má dnes, jde bez rolí v argumentech.
 */

// Env se musí načíst dřív, než se naimportuje caio-server: jeho Dao čte MONGODB_URI při
// importu modulu, ne při prvním dotazu.
const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.development";
try {
  process.loadEnvFile(envFile);
} catch (e) {
  console.error(`[grant-role] ${envFile} nejde přečíst (${e.code ?? e.message}).`);
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error(`[grant-role] MONGODB_URI není v ${envFile} vyplněné.`);
  process.exit(1);
}

const { Authentication } = await import("caio-server");

const [email, ...rest] = process.argv.slice(2);
const clear = rest.includes("--clear");
const roleList = rest.filter((arg) => arg !== "--clear");

if (!email) {
  console.error("[grant-role] Použití: npm run grant-role -- <e-mail> [role...] [--clear]");
  process.exit(1);
}

const identity = await Authentication.Identity.findByEmail(email);

if (!identity) {
  console.error(`[grant-role] Identita s e-mailem ${email} neexistuje. Ať se ten člověk nejdřív přihlásí.`);
  process.exit(1);
}

if (!roleList.length && !clear) {
  const current = await Authentication.Member.getProfileList(identity.identity);
  console.log(`[grant-role] ${email} (${identity.identity}): ${current.length ? current.join(", ") : "žádné role"}`);
  process.exit(0);
}

await Authentication.Member.set(identity.identity, roleList, { note: "grant-role" });

console.log(
  `[grant-role] ${email} (${identity.identity}): ${roleList.length ? roleList.join(", ") : "žádné role"}.` +
    " Role se čtou z databáze při každém requestu, takže to platí hned -- bez odhlášení.",
);

process.exit(0);
