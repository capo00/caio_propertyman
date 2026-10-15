import { useEffect, useState } from "uu5g05";

// Přepínač „vykresli všechny líné sekce hned“ pro components/lazy-section.jsx.
//
// Líné sekce na home se vykreslují až u viewportu. To nestačí ve dvou případech:
//   - skok na kotvu (`#rezervace` z tlačítka v hero): sekce mezi hero a cílem musí být
//     vykreslené, jinak skok dojede na odhad výšky placeholderů, ne na skutečné místo;
//   - adresa s fragmentem (`/#rezervace`): skok odbavuje uu5g05 RouteProvider hned po
//     prvním renderu, takže všechno musí být vykreslené od začátku.
// Přepínač je jen jednosměrný a platí do konce návštěvy -- jakmile je stránka jednou celá,
// není důvod ji znovu dělit.

let revealedAll = typeof location !== "undefined" && location.hash.length > 1;
const listenerSet = new Set();

/** Vykreslí všechny líné sekce (volá components/button.jsx před skokem na kotvu). */
export function revealAll() {
  if (revealedAll) return;
  revealedAll = true;
  listenerSet.forEach((listener) => listener(true));
}

/** `true`, když se mají líné sekce vykreslit bez ohledu na viewport. */
export function useRevealAll() {
  const [value, setValue] = useState(revealedAll);
  useEffect(() => {
    // Mezi renderem a efektem se mohlo přepnout.
    if (revealedAll) {
      setValue(true);
      return;
    }
    listenerSet.add(setValue);
    return () => listenerSet.delete(setValue);
  }, []);
  return value;
}
