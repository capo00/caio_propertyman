import { createVisualComponent, useState, useEffect, useMemo, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Calls from "../calls.js";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Kalendář obsazenosti nad availability/get.
//
// S `onSelect` je to zároveň výběr termínu (`selectionMode="range"`): první klik je příjezd,
// druhý odjezd, a vybraný termín se propíše do pole formuláře (reservation.jsx drží stav).
// Obsazené dny a minulost nejdou vybrat: minulost hlídá `min`, obsazené dny `disabled`
// v `dateMap` -- ten uu5g05 1.52.1 ještě ignoruje (čte jen colorScheme a significance), začne
// platit s vydáním, které ho podporuje. Do té doby termín přes obsazenost odmítne validace
// formuláře / server.
//
// Stojí na Uu5Elements.Calendar -- `displayNavigation` dává přepínání měsíců zadarmo
// (žádná vlastní hlavička, `shift()`, `monthLabel`) a `dateMap` obarví obsazené dny přímo,
// bez `renderDayIndicator` a ruční tečky. Termín jde vybrat tady i ve `FormDateRange`
// v `reservation-form.jsx` -- oboje ukazuje totéž.

const MS_PER_DAY = 86400000;

/** Date -> "2027-06-10" v LOKÁLNÍM čase. toISOString() by u půlnoci posunul den. */
function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Rozbalí intervaly na mapu den → "confirmed" | "tentative".
 * `dateTo` je EXKLUZIVNÍ (den odjezdu je zase volný), proto `<`, ne `<=`.
 * Potvrzená obsazenost má přednost: den, kde se kryje s předběžnou, je prostě obsazený.
 */
function expandOccupied(occupiedList) {
  const days = new Map();
  for (const { dateFrom, dateTo, tentative } of occupiedList ?? []) {
    for (let t = Date.parse(dateFrom); t < Date.parse(dateTo); t += MS_PER_DAY) {
      const iso = new Date(t).toISOString().slice(0, 10);
      if (!tentative || !days.has(iso)) days.set(iso, tentative ? "tentative" : "confirmed");
    }
  }
  return days;
}

// Obsazeno (aspoň částečně zaplacená rezervace, blokace, import) negative, rezervováno
// (žádost, čeká se na platbu) warning; obojí `disabled` (majitel 2026-10-10).
const DAY_STYLE = {
  confirmed: { colorScheme: "negative", significance: "highlighted", disabled: true },
  tentative: { colorScheme: "warning", significance: "highlighted", disabled: true },
};

function LegendItem({ colorScheme, children }) {
  return (
    <p
      className={Config.Css.css({
        ...theme.text.small,
        color: theme.color.mutedFg,
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBlockStart: 12,
        marginBlockEnd: 0,
      })}
    >
      {/* Tečka ve stejném colorScheme jako dny v kalendáři. */}
      <Uu5Elements.Text colorScheme={colorScheme} significance="common">
        <Uu5Elements.Icon icon="uugds-circle-solid" />
      </Uu5Elements.Text>
      {children}
    </p>
  );
}

const AvailabilityCalendar = createVisualComponent({
  uu5Tag: Config.TAG + "AvailabilityCalendar",

  /**
   * @param value     vybraný termín [od, do] (řízený zvenku)
   * @param onSelect  ([od, do]) => … -- se zapnutým výběrem termínu; bez něj jen zobrazení
   */
  render({ refreshKey, value, onSelect }) {
    const [occupiedList, setOccupiedList] = useState(null);
    const [error, setError] = useState(null);

    // Načítáme s rezervou rok dopředu i měsíc zpátky, ať listování mezi měsíci nevyvolává
    // další requesty. Obsazenost je pár desítek záznamů, takže je to levnější než dotaz
    // na každý překlik.
    useEffect(() => {
      let cancelled = false;
      const today = new Date();
      const from = toIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const to = toIsoDate(new Date(today.getFullYear() + 1, today.getMonth() + 1, 0));

      setError(null);
      Calls.getAvailability(from, to)
        .then((dtoOut) => {
          if (!cancelled) setOccupiedList(dtoOut.occupiedList ?? []);
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message ?? String(e));
        });

      return () => {
        cancelled = true;
      };
    }, [refreshKey]);

    const occupiedDays = useMemo(() => expandOccupied(occupiedList), [occupiedList]);

    // Klíč je UuDate ISO string ("2027-06-10"), stejný formát jako toIsoDate() vrací --
    // Calendar ho čte přes displayDate.toIsoString() (viz dist zdroj uu5g05-elements).
    const dateMap = useMemo(
      () => Object.fromEntries([...occupiedDays].map(([iso, kind]) => [iso, DAY_STYLE[kind]])),
      [occupiedDays],
    );
    const hasTentative = useMemo(() => [...occupiedDays.values()].includes("tentative"), [occupiedDays]);

    if (error) {
      return (
        <Uu5Elements.PlaceholderBox
          code="error"
          header={<Lsi lsi={lsi("calendar", "loadFailed")} />}
          info={error}
        />
      );
    }

    if (occupiedList === null) {
      return (
        <div className={Config.Css.css({ display: "grid", placeItems: "center", minBlockSize: 260 })}>
          <Uu5Elements.Pending size="l" />
        </div>
      );
    }

    return (
      <div>
        <Uu5Elements.Calendar
          dateMap={dateMap}
          {...(onSelect
            ? {
              selectionMode: "range",
              // Kalendář si první klik drží sám a ozve se až s celým rozsahem.
              value: value?.[0] && value?.[1] ? value : undefined,
              onSelect: (e) => {
                const range = e.data.value;
                if (Array.isArray(range) && range[0] && range[1]) onSelect(range);
              },
              min: toIsoDate(new Date()),
            }
            : null)}
          displayNavigation
          // Weekend na začátku týdne by českému návštěvníkovi nesedl -- 1 = pondělí.
          weekStartDay={1}
        />

        <LegendItem colorScheme="negative">
          <Lsi lsi={lsi("calendar", "legend")} />
        </LegendItem>
        {hasTentative && (
          <LegendItem colorScheme="warning">
            <Lsi lsi={lsi("calendar", "legendTentative")} />
          </LegendItem>
        )}
      </div>
    );
  },
});

export { expandOccupied, toIsoDate };
export default AvailabilityCalendar;
