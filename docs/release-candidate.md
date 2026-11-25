# Release candidate

## Přidáno
- Záloha / doplatek přijat: když majitelka zadá jinou přijatou částku, pod polem hned vidí, jak se změní cena nebo doplatek (dřív až po potvrzení).

## Opraveno
- Historie rezervace s celou platbou najednou psala „Platba přijata“ u každé akce (přijetí žádosti, storno, propadnutí, ukončení pobytu). Teď má každá akce svůj název, „Platba přijata“ jen přijetí platby.
- Připomínka zálohy, která žádá celou částku (záloha po splatnosti a je na řadě i doplatek): místo polí Záloha a Splatnost modál ukáže částku a splatnost, kterou žádá e-mail. Pole měnila jen zálohu, ne částku v e-mailu. Cenu nebo splatnost majitelka změní přes Upravit.
- Ceník a kalendář obsazenosti drží od začátku načítání svůj tvar, kontakt pod recenzemi neposkočí: na `/cenik` a `/recenze` se při načítání nic neposouvá (CLS 0, dřív 0,025 a 0,026).
- Galerie a fotky prostorů se začnou stahovat hned, ne až po knihovně lightboxu (LCP `/galerie` na pomalém mobilu o ~5 s dřív); lightbox se načte v klidu po vykreslení stránky.
- Logo v liště má přístupný název bez bubliny, na webu i v administraci; loga sítí v kontaktu jsou z caio-ui.
- Opakovaná návštěva nestahuje znovu knihovny a sestavené soubory (caio-server 0.8.2, dlouhá cache).

## Breaking
-
