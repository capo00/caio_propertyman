# Release candidate

## Přidáno
- Nastavení v administraci (Správa → Nastavení): pošta a na záložce Roubenka e-mail majitele, údaje
  k příjezdu (klíče, parkování, Wi-Fi), účet pro platby a dodavatel na faktuře. Majitel je mění sám,
  bez vydání; dřív byly v `.env` a v kódu. **Před nasazením jednorázový přenos do produkční
  databáze** (docs/release.md § 2.1).
- Konfigurace ve třech vrstvách (`.env.example`, `caio.config.js`, `server/server.config.js`,
  `client/client.config.js`), kontrola env souborů `npm run check-env`.
- Rezervace „V zastoupení hosta“ v adminu: založí rezervaci za hosta jako žádost z webu (stejná
  pravidla pobytu, cena podle ceníku, povinný kontakt) ve stavu Čeká na schválení, Schválená nebo
  Potvrzená, s e-mailem hostovi podle stavu.
- Formulář nové rezervace v adminu: příjezd a odjezd jedním polem, typ záznamu vedle, cena s
  nápovědou podle ceníku pro zadaný termín, jazyk e-mailů vždy (všech pět jazyků), náhled e-mailu
  u odeslání.
- Na webu u rezervace: doplatek nejpozději 14 dní před příjezdem a místní poplatek z pobytu
  20 Kč za noc za osobu starší 18 let (všech pět jazyků).

## Opraveno
- Pozadí nainstalované appky (manifest `background_color`) má barvu webu místo bílé.
- Výběr data v adminu na mobilu se otevíral v roce ~2130 (chyba svislého kalendáře uu5): pole
  data mají rozsah rok zpět až rok dopředu.
- Záloha a doplatek splatné ve stejný den nebo den po sobě (schválení 15–18 dní před příjezdem):
  místo dvou plateb a dvou QR kódů se chce celá částka najednou.

## Breaking
-
