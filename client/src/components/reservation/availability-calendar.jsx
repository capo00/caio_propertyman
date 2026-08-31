import { createVisualComponent, useState, useEffect, useMemo, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Calendar from "uu5calendarg01";
import Config from "../../config/config.js";
import Calls from "../../calls.js";

const { theme } = Config;

// Kalendář obsazenosti nad availability/get.
//
// Stojí na Uu5Calendar.SimpleCalendar -- ta umí měsíční pohled, přepínání měsíců a hlavně
// `renderDayIndicator`, kterým se pod číslo dne vykreslí tečka. Ručně kreslená mřížka by
// znamenala řešit přestupné roky, začátek týdne a lokalizaci znovu.
//
// renderDayIndicator dostane Utils.Event({ date: Date }).

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
    const [date, setDate] = useState(() => toIsoDate(new Date()));
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

    if (error) {
      return (
        <Uu5Elements.PlaceholderBox
          code="error"
          header={<Lsi lsi={{ cs: "Obsazenost se nepodařilo načíst" }} />}
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

    // SimpleCalendar sama žádné přepínání měsíců nenabízí -- bez vlastní hlavičky by host
    // viděl jen aktuální měsíc a nemohl se podívat na příští sezónu.
    const shift = (months) => {
      const d = new Date(`${date}T00:00:00`);
      d.setDate(1);
      d.setMonth(d.getMonth() + months);
      setDate(toIsoDate(d));
    };

    const monthLabel = new Date(`${date}T00:00:00`).toLocaleDateString("cs-CZ", {
      month: "long",
      year: "numeric",
    });

    return (
      <div>
        <div
          className={Config.Css.css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBlockEnd: 8,
          })}
        >
          <Uu5Elements.Button
            icon="uugds-chevron-left"
            significance="subdued"
            onClick={() => shift(-1)}
            tooltip="Předchozí měsíc"
          />
          <span className={Config.Css.css({ ...theme.text.h3, fontSize: 16, textTransform: "capitalize" })}>
            {monthLabel}
          </span>
          <Uu5Elements.Button
            icon="uugds-chevron-right"
            significance="subdued"
            onClick={() => shift(1)}
            tooltip="Další měsíc"
          />
        </div>

        <Uu5Calendar.SimpleCalendar
          date={date}
          view="month"
          onDateChange={(e) => setDate(e.data.value ?? e.data.date ?? date)}
          // Weekend na začátku týdne by českému návštěvníkovi nesedl -- 1 = pondělí.
          weekStartDay={1}
          renderDayIndicator={(e) => {
            const iso = toIsoDate(e.data.date);
            if (!occupiedDays.has(iso)) return null;
            return (
              <span
                className={Config.Css.css({
                  display: "block",
                  inlineSize: 6,
                  blockSize: 6,
                  borderRadius: "50%",
                  backgroundColor: theme.color.accent,
                })}
              />
            );
          }}
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
          <Lsi lsi={{ cs: "Obsazený termín. Den odjezdu je zároveň možný den příjezdu." }} />
        </p>
      </div>
    );
  },
});

export { expandOccupied, toIsoDate };
export default AvailabilityCalendar;
