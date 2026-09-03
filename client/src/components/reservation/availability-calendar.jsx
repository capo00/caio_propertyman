import { createVisualComponent, useState, useEffect, useMemo, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Calls from "../../calls.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Kalendář obsazenosti nad availability/get.
//
// Stojí na Uu5Elements.Calendar -- `displayNavigation` dává přepínání měsíců zadarmo
// (žádná vlastní hlavička, `shift()`, `monthLabel`) a `dateMap` obarví obsazené dny přímo,
// bez `renderDayIndicator` a ruční tečky. Jen na zobrazení, nic se tu nevybírá -- termín
// pobytu se zadává ve `FormDateRange` v `reservation-form.jsx`.

const MS_PER_DAY = 86400000;

/** Date -> "2027-06-10" v LOKÁLNÍM čase. toISOString() by u půlnoci posunul den. */
function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Rozbalí intervaly na množinu obsazených dnů.
 * `dateTo` je EXKLUZIVNÍ (den odjezdu je zase volný), proto `<`, ne `<=`.
 */
function expandOccupied(occupiedList) {
  const days = new Set();
  for (const { dateFrom, dateTo } of occupiedList ?? []) {
    for (let t = Date.parse(dateFrom); t < Date.parse(dateTo); t += MS_PER_DAY) {
      days.add(new Date(t).toISOString().slice(0, 10));
    }
  }
  return days;
}

const AvailabilityCalendar = createVisualComponent({
  uu5Tag: Config.TAG + "AvailabilityCalendar",

  render({ refreshKey }) {
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
      () =>
        Object.fromEntries(
          [...occupiedDays].map((iso) => [iso, { colorScheme: "secondary", significance: "highlighted" }]),
        ),
      [occupiedDays],
    );

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
          displayNavigation
          // Weekend na začátku týdne by českému návštěvníkovi nesedl -- 1 = pondělí.
          weekStartDay={1}
        />

        <p
          className={Config.Css.css({
            ...theme.text.small,
            color: theme.color.mutedFg,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBlockStart: 12,
          })}
        >
          <span
            className={Config.Css.css({
              inlineSize: 6,
              blockSize: 6,
              borderRadius: "50%",
              backgroundColor: theme.color.accent,
              flex: "none",
            })}
          />
          <Lsi lsi={lsi("calendar", "legend")} />
        </p>
      </div>
    );
  },
});

export { expandOccupied, toIsoDate };
export default AvailabilityCalendar;
