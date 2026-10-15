import { createVisualComponent, useEffect, useScreenSize, useState, useViewportVisibility } from "uu5g05";
import Config from "../config/config.js";
import { useRevealAll } from "../tools/lazy-reveal.js";

// Sekce home, která se vykreslí až u viewportu (docs/decisions.md, 2026-10-15).
//
// Home se dřív vykreslila celá najednou -- formulář, kalendář, galerie, recenze -- a hero
// (LCP) se ukázal až po téhle práci. Teď se při startu vykreslí jen to nahoře a ostatní
// sekce, až se k nim návštěvník přiblíží.
//
// `useViewportVisibility(LAZY_OFFSET)` z uu5g05 rozšíří sledovanou oblast o LAZY_OFFSET
// nahoru i dolů (`rootMargin`). Při scrollu dolů rozhoduje spodní okraj: sekce se začne
// vykreslovat, když je ještě LAZY_OFFSET pod viewportem, takže bývá hotová i se staženým
// chunkem (formulář, galerie) dřív, než na ni návštěvník dojede.
//
// Hook viditelnost nezamyká (po odscrollování vrátí false), zámek je `shown`. Dokud sekce
// není vykreslená, drží místo prázdný div se STEJNÝM `id`, takže kotvy (`#rezervace`)
// fungují; v DOM nejsou nikdy oba. `estimate` je výška sekce podle šířky (změřeno
// v prohlížeči 2026-10-15), ať po vykreslení obsah pod ní moc neposkočí -- přesná být nemusí,
// mění se mimo viewport.

const LAZY_OFFSET = 1000;

const SCREEN_ORDER = ["xs", "s", "m", "l", "xl"];

/** Hodnota pro aktuální šířku; chybějící velikost bere nejbližší menší (jako uu5 `{ xs, m }`). */
function pickEstimate(estimate, screenSize) {
  if (estimate == null || typeof estimate === "number") return estimate ?? 0;
  for (let i = SCREEN_ORDER.indexOf(screenSize); i >= 0; i--) {
    if (estimate[SCREEN_ORDER[i]] != null) return estimate[SCREEN_ORDER[i]];
  }
  return 0;
}

const LazySection = createVisualComponent({
  uu5Tag: Config.TAG + "LazySection",

  render({ id, estimate, children }) {
    const { visible, ref } = useViewportVisibility(LAZY_OFFSET);
    const revealedAll = useRevealAll();
    const [screenSize] = useScreenSize();

    const active = visible || revealedAll;
    const [shown, setShown] = useState(active);
    useEffect(() => {
      if (active) setShown(true);
    }, [active]);

    if (shown || active) return children;

    return <div id={id} ref={ref} className={Config.Css.css({ minBlockSize: pickEstimate(estimate, screenSize) })} />;
  },
});

export { pickEstimate };
export default LazySection;
