import { createVisualComponent, Lsi, Utils } from "uu5g05";
import Config from "../../config/config.js";

const { theme } = Config;

// Prostrkaný uppercase štítek nad nadpisem sekce: GALERIE, CENÍK, REZERVACE, KONTAKT...
// Drobnost, ale drží rytmus celé stránky -- v předloze je nad každou sekcí.
//
// `onDark` na forest podkladu ztlumí barvu opacitou místo jiného odstínu, aby to zůstalo
// jedna paleta.
//
// Atributy pro DOM se skládají přes Utils.VisualComponent.getAttrs, ne rozbalením restProps.
// createVisualComponent totiž komponentě dosype vlastní props (nestingLevel, testId,
// fullTextSearchPriority, noPrint, elementAttrs...) a ty na <p> nepatří -- React na nich
// hlásí "React does not recognize the ... prop on a DOM element". getAttrs vrátí jen to,
// co do DOM smí, a rovnou zaplete className volajícího za náš.

const Eyebrow = createVisualComponent({
  uu5Tag: Config.TAG + "Eyebrow",

  render(props) {
    const { children, lsi, onDark } = props;

    const attrs = Utils.VisualComponent.getAttrs(
      props,
      Config.Css.css({
        ...theme.text.eyebrow,
        margin: 0,
        marginBlockEnd: 12,
        color: onDark ? theme.color.onDark : theme.color.mutedFg,
        opacity: onDark ? 0.7 : 1,
      }),
    );

    return <p {...attrs}>{lsi ? <Lsi lsi={lsi} /> : children}</p>;
  },
});

export default Eyebrow;
