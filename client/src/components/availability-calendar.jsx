import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import { lsi } from "../lsi/import-lsi.js";
import { useOccupiedList, useOccupancyDateMap, toIsoDate } from "./occupancy-date-map.js";

const { theme } = Config;

// Kalendář obsazenosti nad availability/get.
//
// S `onSelect` je to zároveň výběr termínu (`selectionMode="range"`): první klik je příjezd,
// druhý odjezd, a vybraný termín se propíše do pole formuláře (reservation.jsx drží stav).
// Minulost hlídá `min`, obsazenost `disabled` v `dateMap` (od uu5g05 1.54). Den příjezdu
// a odjezdu cizí rezervace je půlka dne: rozdělený úhlopříčkou a vybrat jde jen jako konec,
// resp. začátek termínu (components/occupancy-date-map.js, tools/occupancy.js).
//
// Stojí na Uu5Elements.Calendar -- `displayNavigation` dává přepínání měsíců zadarmo
// (žádná vlastní hlavička, `shift()`, `monthLabel`) a `dateMap` obarví obsazené dny přímo,
// bez `renderDayIndicator` a ruční tečky. Termín jde vybrat tady i ve `FormDateRange`
// v `reservation-form.jsx` -- oboje ukazuje totéž.

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
   * @param occupancy `{ occupiedList, error }` z `useOccupiedList` -- rezervační sekce ji načítá
   *                  jednou pro kalendář i formulář; bez ní (ceník) si ji kalendář načte sám
   * @param value     vybraný termín [od, do] (řízený zvenku)
   * @param onSelect  ([od, do]) => … -- se zapnutým výběrem termínu; bez něj jen zobrazení
   */
  render({ occupancy, refreshKey, value, onSelect }) {
    const own = useOccupiedList(refreshKey, !occupancy);
    const { occupiedList, error } = occupancy ?? own;
    const dateMap = useOccupancyDateMap(occupiedList);
    const hasTentative = (occupiedList ?? []).some((item) => item.tentative);

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

export { toIsoDate };
export default AvailabilityCalendar;
