import { createVisualComponent, Lsi, Utils } from "uu5g05";
import Config from "../../config/config.js";

const { theme } = Config;

// Prostrkaný uppercase štítek nad nadpisem sekce: GALERIE, CENÍK, REZERVACE, KONTAKT...
// Drobnost, ale drží rytmus celé stránky -- v předloze je nad každou sekcí.
//
// `onDark` na forest podkladu ztlumí barvu opacitou místo jiného odstínu, aby to zůstalo
// jedna paleta.

const Eyebrow = createVisualComponent({
  uu5Tag: Config.TAG + "Eyebrow",

  render({ children, lsi, onDark, className, ...restProps }) {
    return (
      <p
        {...restProps}
        className={Utils.Css.joinClassName(
          Config.Css.css({
            ...theme.text.eyebrow,
            margin: 0,
            marginBlockEnd: 12,
            color: onDark ? theme.color.onDark : theme.color.mutedFg,
            opacity: onDark ? 0.7 : 1,
          }),
          className,
        )}
      >
        {lsi ? <Lsi lsi={lsi} /> : children}
      </p>
    );
  },
});

export default Eyebrow;
