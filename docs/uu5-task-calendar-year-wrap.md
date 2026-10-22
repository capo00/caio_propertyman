# Úkol pro uu5: rok ve sloupci měsíců kalendáře se nesmí zalomit

Zadání pro AI agenta, který pracuje v repozitáři `uu_uu5g05` (balíček `uu5g05-elements`).
Oprav chybu níž, přidej k ní test a výsledek ukaž. Nic jiného v kalendáři neměň.

## Chyba

V kalendáři s postranní navigací po měsících (sloupec vpravo vedle mřížky dnů: „Říj, Lis,
Pro, **2027**, Led, Úno…“) se letopočet zalamuje na dva řádky: **„202“ / „8“**.

- Viděno v `Uu5Forms.FormDateRange` (rozbalený výběr termínu), `uu5g05-elements` a
  `uu5g05-forms` **1.52.2**, Chrome na Windows, šířka okna kolem 730 px.
- Stejně v češtině i slovenštině, takže nejde o jazyk. „2027“ se do sloupce ještě vejde,
  „2028“ už ne: číslice 8 je v použitém písmu širší. Zalomení tedy závisí na šířce glyfů,
  ne na počtu znaků. Jiný rok nebo jiné písmo zalomí jinak.
- Aplikace, kde se to projevilo, má vlastní písmo celé stránky (bezpatkové, tučné u nadpisů).
  S výchozím písmem uu5 to ověřené není. Oprava ale musí platit **pro jakékoli písmo**, ne
  spoléhat na šířku konkrétního fontu.

## Kde je příčina (čteno z `dist/uu5g05-elements.js` 1.52.2, ve zdrojích dohledej sám)

- `_internal/_calendar/calendar-navigation.js` (`CalendarNavigation`) skládá položky sloupce.
  Rok vkládá jako nadpis (`heading: false`) s `Text category="interface" segment="interactive"
  type="medium"`. Je tedy větší než měsíce (`segment="content" type="small"`).
- Položky kreslí `virtualized-list-picker.js` (`VirtualizedListPicker`):
  - `CLASS_NAMES.container` má jen `minWidth: SizingPalette.spot.basic.xl.h`, šířka sloupce
    se nepřizpůsobí nejširší položce,
  - `CLASS_NAMES.title` (nadpis roku) je `display: flex` bez `white-space: nowrap`.
- Výsledek: když je rok širší než sloupec, prohlížeč ho zalomí uvnitř slova.

## Co má platit po opravě

1. Letopočet ve sloupci navigace je **vždy na jednom řádku**, pro všechny roky (1–9999)
   a všechny jazyky.
2. Rok se **neořízne** a nepřeteče přes okraj sloupce ani přes mřížku dnů. Sloupec je
   alespoň tak široký jako nejširší položka (rok nebo zkratka měsíce). Když je potřeba,
   rozšíří se sloupec, ne že se zúží text.
3. Vzhled sloupce, kde se všechno vejde, se **nezmění**: stejná minimální šířka, stejné
   odsazení, stejná velikost písma, stejné chování posuvu a výběru měsíce.
4. Platí pro všechna místa, která `CalendarNavigation` / `VirtualizedListPicker` používají:
   `Uu5Elements.Calendar` ve svislém režimu, `DateRange`, `Uu5Forms.FormDate` a
   `Uu5Forms.FormDateRange`, na desktopu i v mobilním zobrazení. Ověř, že ostatní použití
   `VirtualizedListPicker` (třeba výběr času) se nerozbijí.
5. Žádný nový prop a žádná změna veřejného API. Je to oprava rozložení, ne funkce.

Navržený směr (rozhodni podle zdrojů): v `VirtualizedListPicker` dát nadpisům (`title`)
a položkám `white-space: nowrap` a kontejneru šířku podle obsahu (`width: max-content`
spolu se stávajícím `minWidth`), případně totéž jen pro navigaci kalendáře přes
`className` z `CalendarNavigation`. Hodnoty ber z GDS palet, ne pevné pixely.

## Test

- Regresní test, který vykreslí navigaci s rokem, kde se dnes zalomí, a ověří, že styl
  nadpisu roku nedovolí zalomení (`white-space: nowrap`) a kontejner nemá pevnou šířku menší
  než obsah. JSDOM layout nepočítá, takže testuj vygenerovaná CSS pravidla (jako ostatní
  stylové testy v repu), ne naměřené rozměry.
- Ruční ověření v prohlížeči (demo nebo test app uu5): rozbalit `FormDateRange`, posunout
  sloupec měsíců na rok 2028 a 2088, zkusit cs, en, sk a širší písmo (např. přes
  `font-family` na stránce). Screenshot před a po.

## Výstup

Krátký souhrn: soubory a co se změnilo, výsledek testů, screenshoty před a po. Pokud se
oprava nedá udělat bez změny vzhledu v bodě 3 nebo bez nového API, zastav se a napiš proč,
místo abys to obcházel.
