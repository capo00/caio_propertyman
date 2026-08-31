import { createVisualComponent, useScreenSize, Lsi, Utils } from "uu5g05";
import Config from "../../config/config.js";

const { theme } = Config;

// Nadpis ve Fraunces.
//
// Schválně NEPOUŽÍVÁ Uu5Elements.Text: ten renderuje uu5 typografii (Roboto, vlastní stupně)
// a přebít se nedá -- žádný token pro UI font neexistuje. Vzhled předlohy proto stojí na
// sémantickém HTML stylovaném přes Config.Css. Viz docs/decisions.md.
//
// `level` řídí vzhled, `as` značku -- aby šlo mít vizuálně velký nadpis, který je v osnově
// dokumentu správně zanořený (h2 vypadající jako h1 apod.).

const Heading = createVisualComponent({
  uu5Tag: Config.TAG + "Heading",

  render({ level = 2, as, children, lsi, onDark, className, ...restProps }) {
    const [screenSize] = useScreenSize();
    const isMobile = screenSize === "xs";

    const Tag = as || `h${level}`;
    const base = theme.text[`h${level}`] ?? theme.text.h2;
    const mobile = isMobile ? (theme.textMobile[`h${level}`] ?? {}) : {};

    return (
      <Tag
        {...restProps}
        className={Utils.Css.joinClassName(
          Config.Css.css({
            ...base,
            ...mobile,
            margin: 0,
            color: onDark ? theme.color.onDark : theme.color.fg,
            // Vyvažuje optický přeplněk, když nadpis přeteče na víc řádků.
            textWrap: "balance",
          }),
          className,
        )}
      >
        {lsi ? <Lsi lsi={lsi} /> : children}
      </Tag>
    );
  },
});

export default Heading;
