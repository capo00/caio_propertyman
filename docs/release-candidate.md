# Release candidate

## Přidáno
- Nastavení v administraci (Správa → Nastavení): pošta a na záložce Roubenka e-mail majitele, údaje
  k příjezdu (klíče, parkování, Wi-Fi), účet pro platby a dodavatel na faktuře. Majitel je mění sám,
  bez vydání; dřív byly v `.env` a v kódu. **Před nasazením jednorázový přenos do produkční
  databáze** (docs/release.md § 2.1).
- Konfigurace ve třech vrstvách (`.env.example`, `caio.config.js`, `server/server.config.js`,
  `client/client.config.js`), kontrola env souborů `npm run check-env`.

## Opraveno
- Pozadí nainstalované appky (manifest `background_color`) má barvu webu místo bílé.

## Breaking
-
