import { useEffect, useRef, useRoute } from "uu5g05";

// Plynulý skok na kotvu za přesně `DURATION` ms.
//
// Nativní `scrollIntoView({ behavior: "smooth" })` dobu neumí zadat -- jede prohlížečovou
// neznámou rychlostí. Vlastní rAF smyčka místo toho respektuje `scroll-margin-block-start`
// cíle, pokud ho má nastavený (dnes žádná sekce nemá, ale funkce na to nesází), i
// `prefers-reduced-motion` -- s ním skočí rovnou, bez animace.

const DURATION = 1000;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// Při `prefers-reduced-motion` se skočí rovnou, ale cíl se ještě chvíli dorovnává (viz níž).
const REDUCED_MOTION_DURATION = 300;

/**
 * `target` je prvek, nebo funkce, která ho vrátí. Funkce kvůli líným sekcím na home
 * (components/lazy-section.jsx): kotva `#rezervace` je nejdřív placeholder a za chvíli
 * skutečná sekce -- jiný prvek se stejným `id`. Cílová pozice se proto počítá v KAŽDÉM
 * kroku znovu: když se během skoku vykreslí sekce nad cílem a změní výšku, skok pořád
 * dojede na správné místo.
 */
export function smoothScrollTo(target, duration = DURATION) {
  const getEl = typeof target === "function" ? target : () => target;
  if (!getEl()) return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const totalDuration = reducedMotion ? REDUCED_MOTION_DURATION : duration;

  function getTargetY() {
    const el = getEl();
    if (!el) return null;
    const scrollMarginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return el.getBoundingClientRect().top + window.scrollY - scrollMarginTop;
  }

  const startY = window.scrollY;
  const startTime = performance.now();

  function step(now) {
    const targetY = getTargetY();
    if (targetY == null) return;
    const t = Math.min((now - startTime) / totalDuration, 1);
    // S reduced motion bez animace: rovnou na cíl, jen dorovnávaný po dobu výpočtu layoutu.
    const progress = reducedMotion ? 1 : easeInOutQuad(t);
    window.scrollTo(0, startY + (targetY - startY) * progress);
    if (t < 1) requestAnimationFrame(step);
  }

  if (reducedMotion) window.scrollTo(0, getTargetY());
  requestAnimationFrame(step);
}

/** Skok na kotvu podle `href` ("#sekce"). No-op, když prvek neexistuje. */
export function scrollToAnchor(href, duration) {
  const id = href.slice(1);
  smoothScrollTo(() => document.getElementById(id), duration);
}

/**
 * Po přechodu na jinou routu začít na začátku stránky.
 *
 * Proč to tu vůbec je: `RouteProvider` z uu5g05 řeší jen DVĚ situace -- skok na fragment
 * (`/cenik#kalendar`) a návrat na zapamatovanou pozici při Zpět/Vpřed. Obyčejný přechod
 * na jinou routu scroll nechává být, takže po kliknutí na „Galerie" na konci dlouhé
 * stránky začala galerie někde uprostřed (naměřeno v prohlížeči 2026-09-15). Dokud byl
 * web jednostránkový, tenhle případ neexistoval.
 *
 * Obě situace, které uu5g05 řeší samo, se tu proto obcházejí:
 *   - fragment -> nedělá se nic, skok si odbaví RouteProvider,
 *   - Zpět/Vpřed -> `popstate` nastaví příznak a nejbližší přechod se přeskočí. Jinak by
 *     tenhle `useEffect` přepsal obnovenou pozici, kterou RouteProvider nastavuje
 *     v `useLayoutEffect`, tedy DŘÍV.
 */
export function useScrollTopOnRouteChange() {
  const [route] = useRoute();
  const uu5Route = route?.uu5Route;
  const fragment = route?.fragment;

  const prevRouteRef = useRef(uu5Route);
  const skipNextRef = useRef(false);

  useEffect(() => {
    const onPopState = () => (skipNextRef.current = true);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (prevRouteRef.current === uu5Route) return;
    prevRouteRef.current = uu5Route;

    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (fragment) return;

    window.scrollTo(0, 0);
  }, [uu5Route, fragment]);
}
