# Návrh pro uu5 tým: zakázatelné dny v `Calendar` / `DateRange`

Zadání pro tým, který spravuje `uu5g05-elements` a `uu5g05-forms` — appka `caio_propertyman`
si to sama opravit nemůže (`uu5g05*` je platforma, ne stack v `caio-architecture`). Tenhle
dokument je jen návrh, žádná implementace k němu nevznikla.

---

## 1. Proč je to potřeba

`caio_propertyman` má kalendář obsazenosti nemovitosti postavený na `Uu5Elements.Calendar`
a formulář rezervace na `Uu5Forms.FormDateRange`. Obě komponenty vycházejí ze stejného
`dateMap` a stejné logiky výběru (`_internal/_calendar/*` v `uu5g05-elements`).

Dneska to appka řeší tak, že se obsazené dny jen **obarví** (`dateMap` s `colorScheme`) a
zákaz vybrat obsazený termín se zjistí:

- v `onValidate` formuláře — ale to je zpětná vazba **až po výběru**, ne při něm,
- a definitivně až na serveru (`reservation/create` vrátí 409), což je správná poslední
  pojistka, ale ne UX.

Host tak dnes může v kalendáři beze zábran vybrat rozsah, který se s obsazeností kryje, a
zjistí to až z chybové hlášky. Totéž bude potřebovat i admin (v3, plánovaný kalendářový
pohled na rezervace — `design.md § 11`) a bude to potřebovat každá appka na tomhle stacku,
která má nějakou formu obsazenosti/kapacity vázanou na kalendářní dny (směny, rezervace
zdrojů, sloty).

**Co v `Calendar`/`DateRange` dnes chybí:** způsob, jak kalendáři říct „tenhle den nejde
vybrat" a zároveň ho vizuálně odlišit — v jednom místě, jedním zápisem.

### Co API dnes nabízí a proč to nestačí

| Prop | Co dělá | Proč to na tohle nestačí |
|---|---|---|
| `min` / `max` | jeden souvislý interval od–do | obsazenost nejsou dva krajní body, ale libovolná množina intervalů uprostřed rozsahu |
| `step` | periodický vzorec (`daysDiff % step === 0`) | obsazenost nemá periodu |
| `dateMap` | barví den (`colorScheme`, `significance`) | `disabled` na dni se v `day-grid.js` počítá výhradně z `outOfLimit` (mimo `min`/`max`/`step`); `dateMap` do toho nijak nevstupuje |
| `onValidate` | validuje hodnotu **po** výběru | pozdě — nezabrání kliknutí, jen ho reklamuje |

Ověřeno čtením zdrojů (`uu5g05-elements` 1.50.8, `uu5g05-forms` 1.50.8): žádný
`disabledDate`/`excludedDate`/`isDateDisabled` prop nikde v řetězci `DateRange` →
`DateRangePickerView` → `DatePickerViewContent` → `Calendar` → `CalendarGrid` → `DayGrid`
neexistuje.

---

## 2. Návrh: rozšířit `dateMap`, ne přidávat nový prop

`dateMap` je jediná věc v celém řetězci, která se dnes propaguje sama až do `Calendar`
(`DatePickerViewContent` dělá `jsx(Calendar, { ...otherProps })`), takže rozšíření jeho
tvaru je nejmenší zásah, který zůstane jedním zdrojem pravdy pro barvu i zákaz.

Zvažovaná alternativa — nový prop typu `onDateAvailable(date) => boolean` — by znamenala
protáhnout **druhý** prop stejným řetězcem souborů jako `dateMap`, a appka by musela
barvu (`dateMap`) a zákaz (`onDateAvailable`) držet synchronně ve dvou strukturách.
Nedává to nic navíc, co by `dateMap` neuměl sám.

### 2.1 Tvar položky

```ts
type CalendarDateMapEntry = {
  colorScheme?: ColorScheme;
  significance?: Significance;
  disabled?: true | "start" | "end";
  tooltip?: string | LsiObject;
};

dateMap?: Record<IsoDate, CalendarDateMapEntry> | ((date: IsoDate) => CalendarDateMapEntry | undefined);
```

Funkce vedle objektu proto, aby appka s dlouhým/neomezeným rozsahem (appka `caio_propertyman`
načítá měsíc dopředu s rezervou, ale obecně to nemusí platit) nemusela predpočítávat mapu
pro každý den, který se kdy může vykreslit.

### 2.2 Sémantika `disabled: true | "start" | "end"`

Vychází přímo z toho, jak appka (a typicky každá appka s noc-orientovanou obsazeností) už
dnes modeluje interval — `dateTo` **exkluzivní** (den odjezdu je zároveň volný den příjezdu
dalšího hosta, `docs/decisions.md`, `server/reservation/dao.js`). Z jednoho obsazeného
intervalu `[from, to)` se tenhle tvar dá odvodit mechanicky, bez ručního rozhodování appky
den po dni:

| Den `d` vůči intervalu `[from, to)` | Noc `d→d+1` volná? | Noc `d-1→d` volná? | `disabled` |
|---|---|---|---|
| `from < d < to` (uvnitř) | ne | ne | `true` |
| `d === from` | ne | ano | `"start"` — nejde vybrat jako **příjezd**, ale jde jako **odjezd** dřívějšího pobytu |
| `d === to` | ano | ne | `"end"` — nejde vybrat jako **odjezd**, ale jde jako **příjezd** dalšího pobytu |
| jinde | ano | ano | (bez `disabled`) |

To je přesně chování, které dnes appka počítá ručně v `services/availability.js`
(`findOverlapping`, ostré nerovnosti) — návrh jen říká, že výstup týž tvar dá **přímo
kalendáři**, místo aby appka dopočítávala vlastní blokování v `onValidate`.

**Plain `true`** blokuje den ve všech třech rolích: nejde vybrat jako začátek, konec ani
prostředek rozsahu — a rozsah, který by ho měl **přeskočit** (start před ním, konec za
ním), je taky neplatný, i když se na `true` den samotný neklikne.

### 2.3 Příklad

```jsx
<Uu5Forms.FormDateRange
  name="stay"
  min={today}
  dateMap={Object.fromEntries(
    occupiedList.flatMap(({ dateFrom, dateTo }) => [
      ...datesBetween(dateFrom, dateTo).map((d) => [d, { disabled: true, colorScheme: "negative" }]),
    ].concat([
      [dateFrom, { disabled: "start", colorScheme: "negative", tooltip: "Obsazeno od" }],
      [dateTo,   { disabled: "end",   colorScheme: "negative", tooltip: "Volné od tohoto dne" }],
    ])
  )}
/>
```

(Ilustrační — přesný tvar pomocné funkce je na appce, ne na uu5.)

---

## 3. Implementace

### 3.1 `uu5g05-elements/_internal/_calendar/day-grid.js` — jádro chování

Dnes:

```js
let outOfLimit = dateFrom && compare(displayDate, dateFrom) < 0
               || dateTo   && compare(displayDate, dateTo)   > 0;
```

Navrhované:

```js
const entry = typeof dateMap === "function" ? dateMap(iso) : dateMap?.[iso];
const disabledAsStart = entry?.disabled === true || entry?.disabled === "start";
const disabledAsEnd   = entry?.disabled === true || entry?.disabled === "end";

// Který z obou záleží na roli, ve které se den zrovna vykresluje/vybírá:
// - výběr PRVNÍHO data rozsahu       -> disabledAsStart
// - výběr DRUHÉHO data rozsahu       -> disabledAsEnd
// - jednodenní výběr (Calendar bez rozsahu) -> entry?.disabled === true
// - den je STŘED už vybraného rozsahu (midSelected) -> entry?.disabled === true
//   (uprostřed rozsahu se nerozhoduje mezi start/end, jde jen o průchodnost)
let outOfLimit = /* min/max/step beze změny */ || relevantDisabled;
```

`disabled` z položky se **OR**-uje s `outOfLimit` z `min`/`max`/`step`, nikdy ho nepřebíjí
opačným směrem — zakázaný den nesmí jít vybrat ani kdyby byl `dateMap` v rozporu s `min`/`max`.

`visualProps` (kde se dnes čte `colorScheme`/`significance`) se rozšíří o `tooltip`.

### 3.2 Zákaz „přeskočení" zakázaného dne

Samotný `disabled` na jednotlivých dnech nestačí pro případ, kdy uživatel klikne na den
**před** blokací a pak na den **za** ní — v `day-grid.js` se to vykreslí jako `midSelected`
bez ohledu na to, co je mezi nimi. K tomu patří kontrola v `handleSelect`
(`date-range-picker-view.js` / `date-range-context.js`): po výběru druhého data projet
`dateMap` v intervalu a pokud narazí na `disabled: true` (nebo `"start"`/`"end"` v roli,
která by tím pádem ležela uvnitř rozsahu, ne na jeho kraji), výběr odmítnout — stejnou cestou,
jakou dnes prochází `onValidate` (feedback, ne tichý no-op).

### 3.3 Propagace typů (bez chování)

`CalendarGrid`, `VerticalCalendar`/`HorizontalCalendar`, `Calendar` (`calendar.js`) přebírají
`dateMap` beze změny už dnes — potřebují jen `propTypes` na nový tvar položky, žádnou
vlastní logiku.

### 3.4 `uu5g05-forms` — `dateMap` chybí v allow-listu pickeru

**Tohle je blokující díra, bez které je celý návrh v `FormDateRange`/`DateRange` mrtvý.**
`inputs/date-range-input.js` staví `pickerProps` jako explicitní seznam:

```js
pickerProps: {
  presetList, displayPresets, displayNavigation, displayWeekNumbers,
  weekStartDay, timeZone, min, max, step, colorScheme, elementAttrs,
}
```

`dateMap` v něm není, takže `<FormDateRange dateMap={…}>` dnes skončí v `inputProps`
(spreadne se na textový input), ne v kalendáři. Stejná díra je zřejmě i v `date-input.js`
(jednodenní `FormDate`) — ověřit při implementaci. Oprava je přidat `dateMap` do obou
seznamů.

### 3.5 Validace ručně psaného data

Do `DateRange`/`Date` psaní z klávesnice picker neobejde `disabled`, protože nejde přes
`onClick` v `day-grid.js`. Vedle stávajících pravidel ve validation mapě (`badValue`,
`min`, `max`, `step`, viz `date-range.js`) přibude `unavailableDate` — validuje se proti
témuž `dateMap`, aby platilo totéž pravidlo bez ohledu na to, jak datum vzniklo.

### 3.6 Přístupnost

`DateItem` je dnes `Uu5Elements.Button` s `disabled: outOfLimit` — nativně `disabled`
tlačítko je nefokusovatelné, takže se přes zakázané dny při ovládání klávesnicí tiše
přeskočí bez vysvětlení. Navrhuju `aria-disabled` (den zůstává ve fokus pořadí, `onClick`
je no-op) + `tooltip` z položky mapy jako `aria-label`/`title`, aby čtečka i klávesnicový
uživatel věděli proč.

**Otevřená otázka pro GDS, ne pro `Calendar`:** `disabled` v GDS přebíjí `colorScheme`
(šedivé tlačítko). „Vizuálně červené, ale nevybíratelné" tedy potřebuje buď nový vizuální
stav v GDS (mimo rozsah tohohle návrhu), nebo se v `day-grid.js` použije `aria-disabled`
misto vizuálního `disabled`, aby `colorScheme: "negative"` z `dateMap` zůstal vidět.

---

## 4. Rozsah zásahu

| Balíček | Soubor | Změna |
|---|---|---|
| `uu5g05-elements` | `_internal/_calendar/day-grid.js` | jádro: čtení `disabled` z `dateMap`, OR s `outOfLimit`, `tooltip` |
| `uu5g05-elements` | `_internal/_calendar/date-item.js` | `aria-disabled` místo nativního `disabled`, `tooltip`/`title` |
| `uu5g05-elements` | `_internal/_calendar/vertical-calendar.js`, `calendar-grid.js`, `calendar.js` | jen `propTypes` nového tvaru položky, chování beze změny |
| `uu5g05-elements` | `_internal/_calendar/date-range-picker.js` / kontext výběru | kontrola „rozsah nesmí přeskočit zakázaný den" po výběru druhého data |
| `uu5g05-forms` | `inputs/date-range-input.js` | `dateMap` doplnit do `pickerProps` (dnes chybí — blokující) |
| `uu5g05-forms` | `inputs/date-input.js` | totéž pro jednodenní `FormDate`, ověřit stejnou díru |
| `uu5g05-forms` | `date-range.js`, `date.js` | validační pravidlo `unavailableDate` do `_withValidationMap` |
| `uu5g05-forms` | `lsi/*.json` | text hlášky `Validation.unavailableDate` |

Chování se mění na jednom místě (`day-grid.js` + kontrola přeskočení), zbytek je
průchodnost typů a texty.

---

## 5. Co zůstává na appce

I po tomhle rozšíření appka pořád potřebuje:

- server jako poslední pojistku (409 při kolizi) — `dateMap` je UX, ne bezpečnostní hranice,
  přesně jako `min`/`max` dnes,
- vlastní výpočet `dateMap` z `availability/get` (appka zná doménu, kalendář ne),
- `onValidate` pro pravidla, která s obsazeností nesouvisí (`MIN_NIGHTS` a podobně) — ta
  tenhle návrh neřeší a neměla by.
