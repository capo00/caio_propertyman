# Úkol pro uu5: `dateMap` neobarví dny sousedního měsíce v kalendáři

Zadání pro AI agenta, který pracuje v repozitáři `uu_uu5g05` (balíček `uu5g05-elements`).
Oprav chybu níž, přidej k ní test a výsledek ukaž. Nic jiného v kalendáři neměň.

## Chyba

`Uu5Elements.Calendar` (a `FormDate` / `FormDateRange`, které na něm stojí) vykreslí vždy
mřížku 6 týdnů, takže v ní jsou i dny **sousedního měsíce** (v prosinci 2026 poslední řádek
„1., 2., 3. … ledna“). Položka `dateMap` pro takový den **neobarví**: `colorScheme` z `dateMap` se
zahodí a den zůstane šedý (neutral), i když je ve stejném `dateMap` stejný den v aktuálním
měsíci barevný. Ostatní vlastnosti z `dateMap` (`significance`, `disabled`, `className`,
`tooltip`) fungují.

- Viděno v `uu5g05-elements` **1.54.0-alpha-react19.2** (Chrome, Windows).
- Příklad z aplikace (obsazenost chaty): rezervace od 30. 12. do 2. 1., `dateMap` obsahuje pro
  `2026-12-30` … `2027-01-02` položky s `colorScheme: "warning"`. V zobrazení **prosinec 2026**
  jsou 30. a 31. 12. oranžové, ale **1. 1. je šedé** (stejně jako kdyby nebylo obsazené).
  V zobrazení **leden 2027** je 1. 1. oranžové. Jeden a tentýž den vypadá podle toho, který
  měsíc je zrovna otevřený, jinak.
- Úhlopříčné dělení dne (`className` s `background-image`) na dni sousedního měsíce funguje,
  takže chybu nejde přehlédnout jen u půlených dní: celé obarvené dny jsou chybné, půlené správné.

## Minimální příklad

```jsx
<Uu5Elements.Calendar
  displayDate="2026-12-01"
  dateMap={{
    "2026-12-31": { colorScheme: "warning", significance: "common", disabled: true },
    "2027-01-01": { colorScheme: "warning", significance: "common", disabled: true },
  }}
/>
```

Očekáváno: 31. 12. i 1. 1. mají stejnou (oranžovou) barvu. Skutečnost: 31. 12. je oranžové,
1. 1. šedé.

## Kde je příčina (čteno z `dist/uu5g05-elements.js` 1.54.0-alpha, ve zdrojích dohledej sám)

- `_internal/_calendar/day-grid.js` (`DayGrid`): pro každý den si vezme položku z `dateMap`
  a složí `visualProps` (`colorScheme`, `significance`, `tooltip`, `className`). Den sousedního
  měsíce (`differentMonthFlag`) předá do `DateItem` s `type: "different"` a těmito `visualProps`.
- `_internal/_calendar/date-item.js` (`DateItem`): ve `switch (type)` větev `"different"`
  nastaví natvrdo `buttonProps.colorScheme = "neutral"` a `buttonProps.significance = "subdued"`.
  `colorScheme` z `props` se destrukturuje stranou a do `Button` nejde nikdy, takže vyhraje
  „neutral“. `significance` z `dateMap` leží v `otherProps`, které se do `Button` předají
  **za** `buttonProps`, a přebije „subdued“. Výsledek: den sousedního měsíce má barvu
  „neutral“ s `significance` z `dateMap`, tedy šedou. Ostatní typy (`selected`, `midSelected`,
  `current`, výchozí) `colorScheme` z `dateMap` berou.
- Text uvnitř (`DayGrid`) má u typu `"different"` navíc `disabled: true`, tedy ztlumenou barvu.

## Co má platit po opravě

1. Den sousedního měsíce se s položkou `dateMap` obarví stejně jako týž den v aktuálním
   měsíci. `colorScheme` z `dateMap` má přednost před výchozím „neutral“ typu `"different"`
   (`significance` z `dateMap` ho už dnes přebíjí).
2. Den sousedního měsíce **bez** `colorScheme` v `dateMap` vypadá jako dnes (neutral, subdued,
   ztlumený text). Nic se nezmění tam, kde `dateMap` nic neobarvuje.
3. Ztlumení textu: rozhodni podle zdrojů, jestli má barevný den sousedního měsíce zůstat
   čitelný (kontrast textu na obarvené ploše, WCAG 4,5:1), nebo se ztlumí jako dnes. Barevný
   den s ztlumeným textem je špatně čitelný, preferuj čitelný.
4. Platí pro `Uu5Elements.Calendar`, `Uu5Forms.FormDate` a `Uu5Forms.FormDateRange` (výběr
   rozsahu, jednoho dne i `selectionMode="range"`), světlý i tmavý režim.
5. Žádný nový prop a žádná změna veřejného API.

Navržený směr (rozhodni podle zdrojů): v `DateItem` u typu `"different"` použít
`colorScheme ?? "neutral"` (a `significance` ponechat `subdued`, dokud ho `dateMap` nezadá);
bez `colorScheme` v `dateMap` zachovat současné `neutral` / `subdued`.

## Test

- Regresní test, který vykreslí kalendář s `displayDate` v měsíci, jehož mřížka obsahuje den
  následujícího měsíce, dá tomu dni `colorScheme` v `dateMap` a ověří, že tlačítko dne má
  `colorScheme` z `dateMap`, ne `neutral`. Druhý test: den sousedního měsíce bez položky
  v `dateMap` zůstane `neutral` / `subdued`.
- Ruční ověření v prohlížeči: příklad výše, zobrazení prosinec 2026 i leden 2027, světlý i tmavý
  režim, `FormDateRange` s rezervací přes přelom roku. Screenshot před a po.

## Obejití v aplikaci (propertyman)

Do opravy kalendář obsazenosti obarvuje celé obsazené dny i přes `className` (`background-color`
a `color` z GDS), protože `className` na dni sousedního měsíce projde. Je to ve
`client/src/components/occupancy-date-map.js` (`fullDayClassName`). Po opravě v uu5 ho jde
smazat; `colorScheme` v `dateMap` tam zůstává.

## Výstup

Krátký souhrn: soubory a co se změnilo, výsledek testů, screenshoty před a po. Pokud se
oprava nedá udělat bez změny vzhledu v bodě 2 nebo bez nového API, zastav se a napiš proč,
místo abys to obcházel.
