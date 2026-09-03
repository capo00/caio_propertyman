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
