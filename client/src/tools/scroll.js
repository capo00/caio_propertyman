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

export function smoothScrollTo(el, duration = DURATION) {
  if (!el) return;

  const scrollMarginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const targetY = el.getBoundingClientRect().top + window.scrollY - scrollMarginTop;

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, targetY);
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutQuad(t));
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/** Skok na kotvu podle `href` ("#sekce"). No-op, když prvek neexistuje. */
export function scrollToAnchor(href, duration) {
  const el = document.getElementById(href.slice(1));
  smoothScrollTo(el, duration);
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
