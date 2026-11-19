# Návrh: dlaždice rezervace v seznamu na telefonu

- **Stav (2026-11-19):** schváleno majitelem a implementováno (`client/src/admin/components/reservation/tile.jsx`).
  Rozhodnutí k otevřeným otázkám jsou v § 9; kde se od nich liší zbytek návrhu, platí § 9.
- **Mockup:** [mockups/reservation-tile.html](./mockups/reservation-tile.html) (samostatné UU5 HTML z CDN,
  `?mode=dark` otevře tmavý režim). Telefon 390 px se všemi variantami, vedle 320 px (nejužší)
  a 600 px (nejširší dlaždice).
- **Podklad:** zadání majitele: na `xs`/`s` se místo tabulky kreslí obecná `Grid.DefaultTile`, která
  jen vypíše sloupce pod sebe. Majitel chce vlastní dlaždici.
- **Navazuje na:** [proposal-admin-emails.md § 3](./proposal-admin-emails.md) (pořadí a vzhled akcí),
  `client/src/admin/components/reservation/summary.jsx` (souhrn rezervace), `fields.jsx` (`fieldCfg`,
  `StateTag`, `dueOf`), caio-ui `Crud` prop `tile` (README „Dlaždice“, `list-block.jsx` `TileSlot`).

Mechanismus je hotový a ověřený: `Crud` dostane `tile={<ReservationTile />}` a `TileSlot` dlaždici
naklonuje s props `data` (záznam v `data.data`), `actionList` (hotové položky pro
`Uu5Elements.ActionGroup`) a `onClick` (klik na dlaždici otevře detail, kliky na odkaz, tlačítka
a menu caio-ui odfiltruje, viz `isRowClick`). Návrh řeší jen to, co je uvnitř dlaždice.

---

## 1. Hierarchie: co je vidět na první pohled

Majitelka v seznamu na telefonu hledá odpověď na čtyři otázky. Dlaždice je dává v tomhle pořadí
shora dolů:

| # | Otázka | Co je v dlaždici | Váha |
|---|---|---|---|
| 1 | **Kdo** a v jakém je to stavu | jméno hosta (odkaz na detail) + štítek stavu vpravo | Title micro + barevný štítek |
| 2 | **Kdy** a za kolik | `20. 12. 2026 – 27. 12. 2026` vlevo, cena vpravo | Content medium |
| 3 | Podrobnosti | `7 nocí · 4 osoby · Web` | Content small |
| 4 | **Co je potřeba zaplatit** | jen když něco je na řadě: `⊘ Záloha 3 150 Kč je 2 dny po splatnosti` | Content medium tučně, barevná ikona |
| 5 | **Co je potřeba udělat** | akce pod čarou, vpředu jen to, co je na řadě | tlačítka podle `action-list.js` |

Proč takhle:

- Jméno nahoře, protože tak majitelka rezervaci pojmenovává („Nováková v prosinci“) a protože je to
  zároveň odkaz na detail (přístupná cesta, § 6). Stav vedle jména, protože barva štítku je
  nejrychlejší signál při rolování.
- Termín hned pod jménem, ve větším písmu než podrobnosti. Cena vpravo na stejném řádku, ať se
  zarovná pod sebe napříč dlaždicemi.
- Řádek o platbě je **jediný podmíněný prvek obsahu**. Když nic nehoří, neruší. Když hoří, je
  tučný a s ikonou, takže při rolování vyskočí.
- Akce jsou dole, kam dosáhne palec, a vždy na stejném místě. Pořadí a zvýraznění se nemění
  (rozhodnutí majitele 2026-11-19, `action-list.js`).

---

## 2. Rozložení

```
┌──────────────────────────────────────────────┐
│ Jana Nováková                [Čeká na zálohu] │  1  Grid "minmax(0,1fr) auto"
│ 18. 12. 2026 – 21. 12. 2026         10 500 Kč │  2  Grid "minmax(0,1fr) auto"
│ 3 noci · 4 osoby · Web                        │  3
│ ⊘ Záloha 3 150 Kč je 2 dny po splatnosti     │  4  jen když hoří / je na řadě
├──────────────────────────────────────────────┤  Tile footerSeparator
│        [🔔 Připomenout zálohu] [💳] [✎] [⋮] │  Tile footer = ActionGroup
└──────────────────────────────────────────────┘
```

- Obsah je `Uu5Elements.Grid` s `rowGap` SP `b` (4 px). Řádky 1 a 2 mají dva sloupce
  `minmax(0, 1fr) auto` s `columnGap` SP `c` (8 px): dlouhé jméno se zalomí, štítek a cena
  zůstanou vpravo (ověřeno v mockupu na 320 px).
- Akce jsou v `footer` dlaždice s `footerSeparator`. `ActionGroup` je zarovnaný vpravo (výchozí)
  a na úzké dlaždici sám zkrátí tlačítka na ikonu s tooltipem. Footer je vždy, když je
  `actionList` neprázdný, i když v něm je jen ✎ a ⋮ (blokace, archiv): akce jsou pak vždy na
  stejném místě.
- Import z portálu nemá žádné akce, footer tedy nemá.
- Mezery mezi dlaždicemi řídí `Crud` (`verticalGap`), dlaždice sama vnější okraj nemá.

---

## 3. Prvky a props

| Prvek | Komponenta | Typografie | colorScheme × significance | Poznámka |
|---|---|---|---|---|
| Dlaždice | `Uu5Elements.Tile` | – | `building` × `common` (výchozí) | `borderRadius="moderate"` (jako souhrn), `onClick` z props, `footer`, `footerSeparator` |
| Jméno / titulek | `Uu5Elements.Text` › `Uu5Elements.Link` | `interface` / `title` / `micro` | Link výchozí (modrá) | `href={`reservation?id=${id}`}` jako dnes ve `fieldCfg.contactName` |
| Stav hosta | `StateTag` (`fields.jsx`) | Tag `size="s"` | `STATE_COLOR[state]` × `highlighted` | beze změny, stejný jako v tabulce a detailu |
| Blokace / import | `Uu5Elements.Tag` | `size="s"` | `building` × `distinct` | `icon="uugds-calendar"`, text `reservation.blockTag` / `importTag` (jako souhrn) |
| Termín | `Uu5Elements.Text` + 2× `DateValue` | `interface` / `content` / `medium` | `building` × `common` | každé datum `nowrap`, mezi nimi `–` |
| Cena | `Uu5Elements.Text` + `Price` | `content` / `medium` | `building` × `common` | jen host s cenou |
| Podrobnosti | `Uu5Elements.Text` | `content` / `small` | `building` × `common` | `nights · guestCount · zdroj · V zastoupení hosta` |
| Platba hoří | `Uu5Elements.Text` `bold` + `Uu5Elements.Icon` | `content` / `medium` | text `building` × `common`, ikona `negative` (po splatnosti) / `warning` (dnes, zítra) | `uugds-alert-circle` / `uugds-clock` (jako souhrn) |
| Platba na řadě, nehoří | `Uu5Elements.Text` | `content` / `small` | `building` × `common` | `Doplatek 8 400 Kč, splatnost 16. 12. 2026`, bez ikony |
| Akce | `Uu5Elements.ActionGroup` | – | z `actionList` beze změny | tlačítka 36 px vysoká (změřeno v mockupu) |

**Titulek podle typu záznamu**

| Záznam | Titulek | Štítek vpravo | Řádek 3 | Cena, platba |
|---|---|---|---|---|
| host | `contactName` | `StateTag` | noci · osoby · zdroj (· V zastoupení hosta) | ano |
| blokace | `reason` (`Údržba`, `Vlastní pobyt`), bez důvodu `Blokace termínu` | `Blokace termínu` | noci | ne |
| import | název feedu (`Booking.com`), bez něj kód feedu | `Import z portálu` | noci | ne |

Název feedu dlaždice dostane v propu `feedNameMap` (`{ kód: název }`). `reservations.jsx` seznam
feedů už načítá kvůli filtru, `TileSlot` props dlaždice při klonování zachová.

**Ikony** (ověřené `find_icon.py` a proti `uu_gds_svgg01` 1.39.0 `stencil-map.json`):
`uugds-alert-circle`, `uugds-clock`, `uugds-calendar`. Ikony akcí se nemění (`fields.jsx`
`ACTION_META`, `EMAIL_ACTION_META`, caio-ui `uugds-pencil`). Žádná nová ikona.

---

## 4. Varianty

„Dnes“ je v mockupu 19. 11. 2026.

| # | Situace | Štítek | Řádek platby | Viditelné akce (zleva) |
|---|---|---|---|---|
| 1 | Poptávka z webu | `Nová žádost` (`warning`) | – (plán ještě není) | [✓ Přijmout] (`primary`) [✎] [⋮] |
| 2 | Čeká na zálohu, 2 dny po splatnosti | `Čeká na zálohu` (`primary`) | ⊘ **Záloha 3 150 Kč je 2 dny po splatnosti** | [🔔 Připomenout zálohu] (`warning`) [💳] (`positive`, jen ikona) [✎] [⋮] |
| 2b | Platba celé částky, splatná zítra | `Čeká na platbu` | 🕓 **Platba 7 000 Kč je splatná zítra** | [🔔 Připomenout platbu] [✓○] [✎] [⋮] |
| 3 | Potvrzeno, zaplaceno, příjezd za 2 dny | `Potvrzeno` (`positive`) | – | [🏠 Poslat informace k příjezdu] (`positive`) [✎] [⋮] |
| 3b | Nejplnější řádek: příjezd za 2 dny + doplatek po splatnosti | `Potvrzeno` | ⊘ **Doplatek 15 680 Kč je 5 dní po splatnosti** | [🏠] [🔔] [✓○] [✎] [⋮], na 390 px jen ikony |
| 3c | Potvrzeno, doplatek za 4 týdny | `Potvrzeno` | Doplatek 8 400 Kč, splatnost 16. 12. 2026 | [✓○ Doplatek přijat] (`primary`) [✎] [⋮] |
| 4 | Blokace (vlastní pobyt) | `Blokace termínu` (`building` distinct) | – | [✎] [⋮] |
| 4b | Import z Bookingu | `Import z portálu` | – | žádné, bez footeru |
| 5 | Archiv: po pobytu | `Po pobytu` (`building`) | – (`dueOf` u konečných stavů nic nevrací) | [✎] [⋮] |
| 5b | Archiv: zrušeno | `Zrušeno` (`negative`) | – | [✎] [⋮] |

Řádek platby bere data z `dueOf` (záloha do zaplacení, pak nezaplacený doplatek u potvrzené).
Texty jsou stejné jako v upozornění souhrnu (`admin.payment.kind`, `alertOverdue`, `alertToday`,
`alertTomorrow`, `dueOn`), jen bez data v závorce. „Hoří“ = po splatnosti, dnes nebo zítra, stejně
jako sloupec Splatnost v tabulce.

---

## 5. Tmavý režim a kontrast

Mockup přepíná režim jako aplikace: `AppBackgroundProvider` + `UuGds.setMeaningColor("primary", …)`
s hodnotami z `caio.config.js` (`#315833` / `#56995A`). Podklad tmavé stránky je v mockupu GDS
`building.dark.main`, ne paleta „Teplá noc“ aplikace (`#16150F`); dlaždice (`Tile common`) má
v obou případech vlastní tmavý podklad, takže čísla níž platí i v aplikaci, ale **v aplikaci je
to potřeba potvrdit**.

Kontrast změřený v mockupu (vypočtená barva textu proti podkladu dlaždice, světlý / tmavý):

| Prvek | Světlý | Tmavý |
|---|---|---|
| Jméno (Link) | 4,60 : 1 | 4,70 : 1 |
| Termín, cena, podrobnosti | 16,1 : 1 | 12,45 : 1 |
| Řádek platby (text) | 16,1 : 1 | 12,45 : 1 |
| Ikona po splatnosti (`negative`, netextový prvek, min. 3 : 1) | 4,23 : 1 | 3,57 : 1 |
| Ikona splatné dnes / zítra (`warning`) | 3,08 : 1 | 5,25 : 1 |

Dvě rozhodnutí kvůli kontrastu:

- **Řádek platby je text v `building`, barvu nese jen ikona.** Červený text (`negative`) by měl
  4,23 : 1 a ve tmavém 3,57 : 1, oranžový (`warning`) 3,08 : 1. To je pod 4,5 : 1 pro běžný text.
  Význam nesou slova („po splatnosti“, „splatná zítra“), tučné písmo a tvar ikony; barva je navíc.
- **Podrobnosti nejsou `subdued`.** Content small (12 px) v `subdued` má ve světlém režimu
  4,30 : 1. Odlišení od termínu dělá velikost (12 vs. 14 px) a pořadí.

Mimo rozsah tohohle návrhu, jen pro úplnost: bílý text na štítcích a tlačítkách `warning`
a `positive` má 2,70 až 4,12 : 1 (GDS výchozí barvy, stejné v tabulce a detailu). Dlaždice je
přebírá beze změny, protože vzhled stavů a akcí je rozhodnutý jinde.

---

## 6. Přístupnost

- **Klik na dlaždici** je zkratka pro prst a myš. Dlaždice sama **není fokusovatelná a nemá
  `role="button"`**: uvnitř jsou odkaz a tlačítka a interaktivní prvek v interaktivním prvku je
  chyba. Klávesnice a čtečka jdou na detail přes **jméno (odkaz)**, první fokusovatelný prvek
  dlaždice.
- **Pořadí fokusu** odpovídá čtení: jméno → akce zleva doprava → ⋮.
- **Tlačítka jen s ikonou** („Záloha přijata“ vedle připomínky, ✎, zkrácená tlačítka na úzké
  dlaždici) mají `tooltip` a u „… přijata“ i `aria-label` už dnes (`action-list.js`, `Crud`).
- **Barva nikdy sama:** stav má text ve štítku, platba text a ikonu, blokace a import text
  a ikonu kalendáře.
- **Dotykové cíle:** tlačítka 36 × 36 px (min. GDS 32 px). Mezi tlačítky nechává mezeru
  `ActionGroup`.
- **Čtečka** přečte dlaždici jako souvislý text: „Jana Nováková, odkaz. Čeká na zálohu.
  18. 12. 2026 – 21. 12. 2026. 10 500 Kč. 3 noci · 4 osoby · Web. Záloha 3 150 Kč je 2 dny po
  splatnosti. Připomenout zálohu, tlačítko …“. Ikona v řádku platby je dekorace, význam je v textu.

---

## 7. Implementace (náčrt)

Soubory:

| Soubor | Změna |
|---|---|
| `client/src/admin/components/reservation/tile.jsx` | **nový**: `ReservationTile` |
| `client/src/admin/components/reservation/fields.jsx` | nové exporty `dueStatus` a `countLabel`; `daysLabel` a `daysBetween` přesunout sem ze `summary.jsx` (a importovat `Utils` z `uu5g05`) |
| `client/src/admin/components/reservation/summary.jsx` | `DueAlert` přes `dueStatus` (stejný výpočet jako dlaždice) |
| `client/src/admin/screens/reservations.jsx` | `tile={<ReservationTile feedNameMap={feedNameMap} />}` |
| `client/src/lsi/{cs,en,de,pl,sk}.json` | `admin.reservation.nightsCount`, `admin.reservation.guestCountLabel` (tvary podle `Intl.PluralRules`) |

### 7.1 `fields.jsx` (nové exporty)

```js
/**
 * Platba, která je na řadě, a jak hoří. Sdílí ji upozornění v souhrnu (`DueAlert`) a dlaždice.
 * @returns {{ kind: "deposit" | "balance" | "full", amount: number, date: string,
 *             code: "overdue" | "dueToday" | "dueTomorrow" | "upcoming" } | null}
 */
export function dueStatus(item, today = todayIso()) {
  const due = dueOf(item);
  if (!due) return null;
  const kind = due.kind === "deposit" ? (isFullPayment(item) ? "full" : "deposit") : "balance";
  const amount = due.kind === "deposit" ? item.depositAmount : item.balanceAmount;
  const code =
    due.date < today ? "overdue" : due.date === today ? "dueToday" : due.date === tomorrowIso(today) ? "dueTomorrow" : "upcoming";
  return { kind, amount, date: due.date, code };
}

/**
 * „1 noc / 3 noci / 7 nocí“: tvar z LSI podle `Intl.PluralRules` (`one`, `few`, `many`, `other`),
 * v textu `${n}`. Chybějící tvar spadne na `other`.
 */
export function countLabel(forms, n, language) {
  const rule = new Intl.PluralRules(language).select(n);
  return Utils.String.format(forms?.[rule] ?? forms?.other ?? "${n}", { n });
}
```

LSI (cs; ostatní jazyky stejné klíče, tvary podle jejich pravidel):

```json
"nightsCount": { "one": "${n} noc", "few": "${n} noci", "many": "${n} noci", "other": "${n} nocí" },
"guestCountLabel": { "one": "${n} osoba", "few": "${n} osoby", "many": "${n} osoby", "other": "${n} osob" }
```

### 7.2 `tile.jsx`

```jsx
import { createVisualComponent, Lsi, useLanguage, useLsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../../config/config.js";
import importLsi, { lsi } from "../../../lsi/import-lsi.js";
import { DateValue, Price, StateTag, SOURCE_LIST, countLabel, daysBetween, daysLabel, dueStatus, todayIso } from "./fields.jsx";

// Dlaždice rezervace v seznamu na telefonu (docs/proposal-admin-reservation-tile.md).
// Props dává caio-ui Crud (`TileSlot`): `data` (záznam v `data.data`), `actionList`, `onClick`.

const SP = Uu5Elements.UuGds.SpacingPalette;
const ROW_GAP = SP.getValue(["fixed", "b"]);
const COLUMN_GAP = SP.getValue(["fixed", "c"]);

/** Platba na řadě. Hoří (po splatnosti, dnes, zítra) = tučně s ikonou, jinak tichý řádek. */
function DueLine({ item, paymentLsi }) {
  const [language] = useLanguage();
  const today = todayIso();
  const due = dueStatus(item, today);
  if (!due) return null;

  if (due.code === "upcoming") {
    return (
      <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building">
        {paymentLsi.kind?.[due.kind]} <Price value={due.amount} />, {paymentLsi.dueOn} <DateValue value={due.date} />
      </Uu5Elements.Text>
    );
  }

  const overdue = due.code === "overdue";
  const when = overdue
    ? Utils.String.format(paymentLsi.alertOverdue, { days: daysLabel(daysBetween(due.date, today), language) })
    : paymentLsi[due.code === "dueToday" ? "alertToday" : "alertTomorrow"]?.[due.kind];
  // Text v building, barvu nese jen ikona: negative/warning text by měl kontrast pod 4,5 : 1 (§ 5).
  return (
    <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building" bold>
      <Uu5Elements.Icon icon={overdue ? "uugds-alert-circle" : "uugds-clock"} colorScheme={overdue ? "negative" : "warning"} />{" "}
      {paymentLsi.kind?.[due.kind]} <Price value={due.amount} /> {when}
    </Uu5Elements.Text>
  );
}

const ReservationTile = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationTile",

  /** @param feedNameMap  `{ [kód feedu]: název }` pro titulek importu */
  render({ data, actionList, onClick, feedNameMap }) {
    const [language] = useLanguage();
    const reservationLsi = useLsi(importLsi, ["admin", "reservation"]) ?? {};
    const paymentLsi = useLsi(importLsi, ["admin", "payment"]) ?? {};
    const item = data?.data;
    if (!item) return null; // načítání řeší caio-ui (placeholder), tohle je jen pojistka

    const imported = item.icalFeedCode != null;
    const isGuest = !imported && Boolean(item.contactName || item.contactEmail || item.contactPhone);

    const title = isGuest ? (
      item.contactName
    ) : imported ? (
      feedNameMap?.[item.source] ?? item.source
    ) : item.reason ? (
      <Lsi lsi={lsi("admin", "reason", item.reason)} />
    ) : (
      <Lsi lsi={lsi("admin", "reservation", "blockTag")} />
    );

    const meta = [
      countLabel(reservationLsi.nightsCount, item.nights, language),
      isGuest && item.guestCount != null && countLabel(reservationLsi.guestCountLabel, item.guestCount, language),
      isGuest && (SOURCE_LIST.includes(item.source) ? <Lsi key="source" lsi={lsi("admin", "source", item.source)} /> : item.source),
      // Rezervace hosta s typem záznamu = založená v zastoupení hosta (jako v souhrnu).
      isGuest && item.reason && <Lsi key="reason" lsi={lsi("admin", "reason", item.reason)} />,
    ]
      .filter(Boolean)
      .flatMap((part, i) => (i ? [" · ", part] : [part]));

    return (
      <Uu5Elements.Tile
        borderRadius="moderate"
        onClick={onClick}
        footer={actionList?.length ? <Uu5Elements.ActionGroup itemList={actionList} /> : undefined}
        footerSeparator
      >
        <Uu5Elements.Grid rowGap={ROW_GAP}>
          {/* 1. kdo + stav */}
          <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" columnGap={COLUMN_GAP} alignItems="start">
            <Uu5Elements.Text category="interface" segment="title" type="micro">
              <Uu5Elements.Link href={`reservation?id=${item.id}`}>{title}</Uu5Elements.Link>
            </Uu5Elements.Text>
            {isGuest ? (
              <StateTag state={item.state} item={item} />
            ) : (
              <Uu5Elements.Tag colorScheme="building" significance="distinct" icon="uugds-calendar" size="s">
                <Lsi lsi={lsi("admin", "reservation", imported ? "importTag" : "blockTag")} />
              </Uu5Elements.Tag>
            )}
          </Uu5Elements.Grid>

          {/* 2. kdy + za kolik */}
          <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" columnGap={COLUMN_GAP} alignItems="baseline">
            <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building">
              <DateValue value={item.dateFrom} /> – <DateValue value={item.dateTo} />
            </Uu5Elements.Text>
            {isGuest && item.totalPrice != null && (
              <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building">
                <Price value={item.totalPrice} />
              </Uu5Elements.Text>
            )}
          </Uu5Elements.Grid>

          {/* 3. podrobnosti */}
          <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building">
            {meta}
          </Uu5Elements.Text>

          {/* 4. co je potřeba zaplatit */}
          {isGuest && <DueLine item={item} paymentLsi={paymentLsi} />}
        </Uu5Elements.Grid>
      </Uu5Elements.Tile>
    );
  },
});

export default ReservationTile;
```

### 7.3 `reservations.jsx`

```jsx
import ReservationTile from "../components/reservation/tile.jsx";
// v ReservationList:
const feedNameMap = useMemo(() => Object.fromEntries(feedList.map(({ code, name }) => [code, name || code])), [feedList]);
// …
<UiElements.Crud
  // …
  tile={<ReservationTile feedNameMap={feedNameMap} />}
>
```

### 7.4 Co ověřit při implementaci

- **Výška placeholderu.** caio-ui kreslí při načítání `DefaultTile` se skeletonem
  (`CLICKABLE_TILE_PENDING`). Jeho výška se řídí počtem sloupců, ne naší dlaždicí. Pokud seznam
  po načtení poskočí, je to věc caio-ui (placeholder podle `tile`), ne dlaždice.
- **Proměnná výška** dlaždic (řádek platby, footer, zalomené jméno) ve virtualizovaném seznamu:
  ověřit rolování na telefonu.
- `Link` uvnitř `Text` `title micro` převezme písmo titulku (v mockupu 16 px, váha 500); ověřit
  ve verzi uu5 aplikace (1.54).
- Tester: všechny varianty z § 4 na 320, 390 a 600 px, světlý i tmavý režim, klávesnice
  (Tab na jméno, Enter otevře detail), klik na dlaždici vs. na tlačítko a položku menu.

---

## 8. Co jsem zvažoval a proč ne

| Varianta | Proč ne |
|---|---|
| Řádek platby jako `HighlightedBox` (jako `DueAlert` v souhrnu) | nejlepší kontrast, ale v dlaždici je to největší prvek (vlastní odsazení a 15 px písmo) a přebije jméno i termín. V mockupu vyzkoušeno. |
| Řádek platby jako `Tag` `distinct` (jako stav platby v souhrnu) | text v barvě: 4,23 : 1 (`negative`), 3,08 : 1 (`warning`) |
| Řádek platby červeným textem (jako sloupec Splatnost v tabulce) | 4,23 : 1 světlý, 3,57 : 1 tmavý |
| Akce v hlavičce dlaždice (`Tile` `actionList`, jako `DefaultTile`) | sdílí řádek se jménem a stavem; se dvěma tlačítky by na 390 px nezbylo místo pro jméno |
| Bez footeru, když jsou vidět jen ✎ a ⋮ (blokace, archiv) | dlaždice o řádek nižší, ale akce by skákaly; stálé místo je pro palec důležitější |
| `ActionGroup` `size="l"` (40 px, doporučení GDS pro dotyk) | na 390 px by se zkracovala na ikony už varianta 2 („Připomenout zálohu“ + 3 ikony); 36 px splňuje minimum 32 px. **Provizorní**, majitelka může rozhodnout jinak. |

---

## 9. Rozhodnutí majitele (2026-11-19)

1. **Vizuál** schválen podle mockupu.
2. **Footer:** akční tlačítka (výrazná, `collapsed: "never"`) **vlevo**, ostatní ActionGroup (✎ a ⋮)
   **vpravo**. Když se akční tlačítka s textem a ✎ nevejdou vedle sebe, jde ✎ do menu ⋮; teprve
   potom se akční tlačítka zkracují na ikony. Jeden `ActionGroup` to neumí (kontejner tlačítek má
   šířku obsahu), proto jsou dva a o tužce rozhoduje porovnání jejich plných šířek (`onMeasure`)
   se šířkou footeru (`TileFooter` v `tile.jsx`).
3. **Poznámka hosta** v dlaždici ne.
4. **„Příjezd za N dní“** ano: první údaj řádku podrobností („Příjezd za 4 dny“, „Příjezd zítra“,
   „Příjezd dnes“, „Pobyt probíhá“). U hosta i importu, ne u blokace a ne v konečném stavu
   (`arrivalStatus` ve `fields.jsx`).
5. **Zrušená rezervace** ukazuje, kolik vrátit hostovi („Vrátit hostovi 3 500 Kč“), když host něco
   zaplatil (`cancellation.paid`).

---

## 10. Pravidla a odchylky

- **Pravidla:** uuGDS core (styling, colorScheme × significance), content (typografický žebřík,
  Typography defaults, Link, Badge/Tag, casing), convention-layouts (nesting, responsive grid),
  convention-interaction (Button hierarchy), convention-ux-patterns (Accessibility, Contrast,
  Pointer vs touch, Accessible naming), uu5-mockup-design, skill uugds-icons.
- **Odchylky:**
  - **Stav jako `Tag`, ne `Badge` se state paletou** (GDS: stav = Badge `active`/`final`/…).
    Dlaždice používá stávající `StateTag`, aby stav vypadal stejně v tabulce, detailu, souhrnu
    a dlaždici. Případný přechod na Badge je samostatná změna všech míst.
  - **`highlighted` víckrát na obrazovce** (štítky stavu, další krok v každé dlaždici): převzato
    z tabulky a rozhodnutí o akcích, dlaždice nic nového nepřidává.
  - **Termín a cena v Content medium**, ne Content small / Title micro, jak uvádí žebřík pro
    hodnoty: Content small je 12 px a na telefonu je termín hlavní údaj, Title micro by se rovnal
    jménu. Medium je pod titulkem, žebřík se neporuší.
  - **`Link` v `Text` `title micro`**: GDS zakazuje přepisovat velikost odkazů v obsahu, ale
    titulek dlaždice je strukturní nadpis (Title micro pro nadpis dlaždice). Odkaz je tu jen
    nositel navigace.
  - **Podrobnosti `common`, ne `subdued`** a **řádek platby bez barevného textu**: kontrast (§ 5).
- **Provizorní:** velikost tlačítek (§ 8), LSI klíče `nightsCount` / `guestCountLabel` a jejich
  tvary v ostatních jazycích, tmavý režim změřený proti GDS tmavému podkladu, ne proti paletě
  aplikace.
