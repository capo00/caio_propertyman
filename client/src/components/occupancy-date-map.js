import { useState, useEffect, useMemo, useBackground } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Calls from "../calls.js";
import { occupiedDays, dayRule } from "../tools/occupancy.js";

// `dateMap` obsazenosti pro Uu5Elements.Calendar (availability-calendar.jsx) i
// Uu5Forms.FormDateRange (reservation-form.jsx) -- oboje ukazuje totéž a oboje podle něj
// pouští výběr. Jak se den dělí na půlky, je v tools/occupancy.js.

/** Date -> "2027-06-10" v LOKÁLNÍM čase. toISOString() by u půlnoci posunul den. */
export function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Obsazenost z availability/get: `{ occupiedList, error }`, `occupiedList` je `null`, dokud se
 * načítá. Načítá se s rezervou měsíc zpátky a rok dopředu, ať listování mezi měsíci nevyvolává
 * další requesty -- obsazenost je pár desítek záznamů. `enabled: false` nenačítá nic (komponenta,
 * které obsazenost podal rodič).
 */
export function useOccupiedList(refreshKey, enabled = true) {
  const [occupiedList, setOccupiedList] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
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
  }, [refreshKey, enabled]);

  return { occupiedList, error };
}

// Obsazeno (aspoň částečně zaplacená rezervace, blokace, import) negative, rezervováno
// (žádost, čeká se na platbu) warning (majitel 2026-10-10). `common`, ne `highlighted`: bílé
// číslo na plné červené mělo kontrast 3,68:1 a na oranžové 2,7:1 (WCAG chce 4,5:1, majitel
// 2026-10-15).
const COLOR_SCHEME = { confirmed: "negative", tentative: "warning" };

/**
 * Pozadí a text tlačítka dne v daném colorScheme a stavu GDS (Calendar kreslí dny tvarem
 * "interactiveElement"): `default`, `accent` = hover a focus, `marked` = stisk.
 */
function dayStyle(mode, colorScheme, state = "default") {
  const states = Uu5Elements.UuGds.getValue(["Shape", "interactiveElement", mode, colorScheme, "common"]);
  const { backgroundColor, color } = Uu5Elements.UuGds.Shape.getStateStyles(states[state], true);
  return { backgroundColor, color };
}

/**
 * Den rozdělený úhlopříčkou: levá horní půlka dopoledne, pravá dolní odpoledne (podle ukázky
 * uu5g05 1.54). "transparent" nechá volnou půlku na pozadí tlačítka pod ní (`base`).
 *
 * Jen na nevybraném dni: vybraný den kreslí Calendar sám barvou výběru (`background-color`),
 * kterou by úhlopříčka (`background-image`) překryla.
 */
function diagonalClassName(morning, afternoon, base) {
  return Config.Css.css({
    '&&:not([aria-selected="true"])': {
      ...base,
      backgroundImage: `linear-gradient(to bottom right, ${morning} calc(50% - 0.5px), ${afternoon} calc(50% + 0.5px))`,
    },
  });
}

/**
 * Pod úhlopříčkou půlky dne: volný den. Půlka dne totiž nemá vlastní colorScheme -- Calendar
 * podle něj barví i výběr a s "neutral" z ukázky uu5g05 by vybraná půlka byla šedá. Bez
 * colorScheme ji vybere uu5 nativně zeleně jako každý jiný den, jen nevybraná by dostala
 * `primary` kalendáře, proto jí tady vracíme `neutral` volného dne i s hoverem a stiskem
 * (majitel 2026-11-06).
 */
function freeDayBase(mode) {
  return {
    ...dayStyle(mode, "neutral"),
    "&:hover, &:focus-visible": dayStyle(mode, "neutral", "accent"),
    "&:active": dayStyle(mode, "neutral", "marked"),
  };
}

// Den výměny má barevné obě půlky. Barvy GDS jsou ve světlém režimu poloprůhledné, takže vlastní
// pozadí tlačítka se pod nimi musí vypnout, jinak by prosvítalo.
const CHANGEOVER_BASE = { backgroundColor: "transparent" };

// Celý obsazený den je `disabled` a uu5 ho ztlumí globálním `[disabled] { opacity: .4 }`. Půlky
// dne (`except*`) disabled nejsou, takže by jeden obsazený úsek měl dva odstíny -- celé dny proto
// ztlumené nejsou (majitel 2026-11-06). Kurzor `not-allowed` jim zůstává. `&&` přebije atributový
// selektor bez `!important`.
const NOT_DIMMED = Config.Css.css({ "&&": { opacity: 1 } });

/**
 * `dateMap` obsazenosti. Dokud se obsazenost načítá (`occupiedList` null), vrací `undefined`.
 *
 * Vybraný termín v něm není: kreslí ho Calendar sám, zeleně (`primary`) a i rozpracovaný po
 * prvním kliku. Vnitřek termínu obsazený být nemůže a jeho krajní půlky dne nemají colorScheme,
 * takže výběru nic nepřebarví. Dřív tu termín dostával `SELECTED_STYLE` z `value` -- ten ale
 * zná jen celý termín, a tak nový výběr nechával starý termín zelený až do druhého kliku
 * (majitel 2026-11-06).
 */
export function useOccupancyDateMap(occupiedList) {
  const background = useBackground();
  // Kalendář i pole stojí na kartě s podkladem aplikace (reservation.jsx `ForestCard`).
  const mode = background === "dark" ? "dark" : "light";
  const days = useMemo(() => occupiedDays(occupiedList), [occupiedList]);

  return useMemo(() => {
    if (!occupiedList) return undefined;
    const color = (kind) => (kind ? dayStyle(mode, COLOR_SCHEME[kind]).backgroundColor : "transparent");
    const halfDayBase = freeDayBase(mode);
    const map = {};
    for (const [iso, halves] of days) {
      const { disabled, kind, split } = dayRule(halves);
      const diagonal = split && diagonalClassName(color(split[0]), color(split[1]), kind ? CHANGEOVER_BASE : halfDayBase);
      // Den výměny je úhlopříčka a zároveň celý obsazený, potřebuje obě třídy.
      const className = [diagonal, disabled === true && NOT_DIMMED].filter(Boolean).join(" ");
      map[iso] = {
        disabled,
        ...(kind ? { colorScheme: COLOR_SCHEME[kind], significance: "common" } : null),
        ...(className ? { className } : null),
      };
    }
    return map;
  }, [occupiedList, days, mode]);
}
