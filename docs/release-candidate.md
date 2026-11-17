# Release candidate

## Přidáno
- Nepřihlášenému návštěvníkovi nabízí tlačítko v liště webu přihlášení (ikona účtu); přihlášenému dál vede do administrace (caio-ui 0.4.11).
- E-mail „Děkujeme za návštěvu“ po ukončení pobytu prosí hosta o recenzi nebo zpětnou vazbu na kontaktní e-mail (ve všech jazycích webu).
- Nová rezervace v administraci ukáže cenu z ceníku jako nápovědu v poli Cena hned po zadání termínu, stejně jako web; počet osob ani jméno se k tomu zadávat nemusí. Blokace termínu cenu nemá.

## Opraveno
- Kalendář obsazenosti: poslední den rezervace, který patří do sousedního měsíce (např. 1. 1. v prosincovém kalendáři u pobytu 30. 12. – 2. 1.), zůstával šedý. Teď má barvu obsazenosti jako ostatní dny.
- Náhled e-mailu v administraci a interaktivní mapa v Kontaktu: `iframe` se vykresluje přes `Utils.Element.createUnsafe`, jinak ho uu5g05 nevykreslí nebo vyžádá potvrzení.
- Místní poplatek z pobytu je v textech webu 10 Kč za noc za osobu (dřív 20 Kč).

## Breaking
-
