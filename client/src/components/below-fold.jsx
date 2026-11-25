import { createVisualComponent } from "uu5g05";
import { UiElements } from "caio-ui";
import Config from "../config/config.js";
import { useRevealAll } from "../tools/lazy-reveal.js";

// Obsah routy pod první obrazovkou, vykreslený až po prvním snímku (caio-ui `Deferred`): první
// render routy pak není jeden dlouhý blok přes celou stránku a návštěvník vidí první obrazovku
// dřív (TBT, docs/proposal-loading-performance.md P5, profil 2026-11-25).
//
// Do té doby drží místo plocha na výšku okna: kontakt a patička pod ní jsou mimo viewport a po
// vykreslení odloženého obsahu se posunou jen tam, kde je nikdo nevidí (CLS 0). Přesná výška
// tu být nemusí -- ta platí pro `LazySection` na home, kde se placeholder čte při scrollu.
//
// S fragmentem v adrese (`/ubytovani#doplnujici-informace`) nebo po skoku na kotvu se vykreslí
// hned: skok na kotvu potřebuje cíl v DOM od prvního renderu (tools/lazy-reveal.js).
const BelowFold = createVisualComponent({
  uu5Tag: Config.TAG + "BelowFold",

  render({ children }) {
    const revealedAll = useRevealAll();
    if (revealedAll) return children;
    return (
      <UiElements.Deferred fallback={<div className={Config.Css.css({ minBlockSize: "100vh" })} />}>
        {children}
      </UiElements.Deferred>
    );
  },
});

export default BelowFold;
