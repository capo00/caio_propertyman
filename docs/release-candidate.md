# Release candidate

## Přidáno
- Modaly akcí rezervace v administraci (přijetí a zamítnutí žádosti, přijaté platby, propadnutí, storno, ukončení pobytu, připomínky plateb, informace k příjezdu) jsou přestavěné podle schváleného návrhu: nahoře jméno, termín, noci, osoby a cena, uprostřed poznámka hosta nebo platby, dole e-mail hostovi (Komu, Předmět, zpráva, náhled). Na telefonu jsou kratší, na desktopu užší a jméno s termínem jsou na jednom řádku.
- Při přijetí žádosti jde rovnou změnit cenu; z ní se spočítá záloha a změna se zapíše do historie.
- „Záloha / Platba / Doplatek přijat(a)“ berou skutečně přijatou částku a datum zaplacení. Jiná záloha přepočítá doplatek, jiná platba celé částky nebo jiný doplatek upraví cenu (doplatek tak jde snížit nebo odpustit); změna je v historii.
- Připomínka platby umí změnit částku a posunout splatnost. S odškrtnutým e-mailem se jen uloží změna („Uložit“).
- Po přijetí doplatku jde hostovi poslat e-mail „Doplatek jsme přijali“ (nová šablona H11 ve všech pěti jazycích, jde vypnout).

## Opraveno
- Odškrtnutý e-mail v modalu nechá pole e-mailu vidět, jen je zašedí a zruší jejich povinnost. Informace k příjezdu se posílají vždy (bez e-mailu by modal nic neudělal), server pokus bez e-mailu odmítne.
- Výběr jazyka e-mailu má popisek pro čtečku obrazovky na samotném ovládacím prvku.

## Breaking
-
