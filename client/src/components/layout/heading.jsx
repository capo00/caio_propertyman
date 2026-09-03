import { createVisualComponent, Lsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";

const { theme } = Config;

// Nadpis. Stupně sazby dává Uu5Elements.Text z GDS, značku a písmo si drží web.
//
// `children` jako funkce je pro tohle přímo určená cesta: Text spočítá typografii a předá
// ji jako `style`, ale renderování nechá na nás -- takže je z toho skutečné <hN>, ne <span>
// (`Text` sám vyrábí <hN> jen u `type="h1".."h5"`, a `expose/hero`, který má hero headline,
// by byl <span> bez osnovy dokumentu).
//
// PŘETÍŽENÍ (schváleno majitelem 2026-09-03): `fontFamily` na Fraunces. Font v GDS typografii
// není žádný token -- uu5 ho dědí z globálního `html { font-family }`, které main.jsx nastaví
// na Karlu. Bez téhle jedné deklarace by z webu display font zmizel úplně.
// `textWrap: balance` je na našem elementu, GDS pro něj nic nemá, a bez něj se dvouřádkový
// nadpis láme opticky nevyváženě.
//
// Stupně nastavuje `level`, značku `as` -- vizuálně velký nadpis tak může být v osnově
// správně zanořený. Mobilní zmenšení už neřešíme: GDS má vlastní `smallScreen` sadu a
// Typography.getValue si mezi nimi vybírá sama (proto zmizelo `theme.textMobile` u nadpisů).
//
// Barvu si nastavuje sekce (`Section` variant), nadpis ji dědí -- proto zmizel prop `onDark`.

const TYPOGRAPHY = {
  // Hero headline. `expose` je v GDS kategorie pro expresivní text, který má upoutat.
  1: { category: "expose", segment: "default", type: "hero" },
  // Nadpisy klasických sekcí.
  2: { category: "story", segment: "heading", type: "h2" },
  // Titulky karet a dlaždic.
  3: { category: "story", segment: "heading", type: "h5" },
};

const Heading = createVisualComponent({
  uu5Tag: Config.TAG + "Heading",

  render(props) {
    const { level = 2, as, children, lsi } = props;
    const Tag = as || `h${level}`;
    const typography = TYPOGRAPHY[level] ?? TYPOGRAPHY[2];

    return (
      <Uu5Elements.Text {...typography}>
        {({ style }) => {
          // getAttrs, ne {...restProps} -- viz komentář v eyebrow.jsx.
          const attrs = Utils.VisualComponent.getAttrs(
            props,
            Config.Css.css({
              ...style,
              margin: 0,
              fontFamily: theme.font.display,
              textWrap: "balance",
            }),
          );

          return <Tag {...attrs}>{lsi ? <Lsi lsi={lsi} /> : children}</Tag>;
        }}
      </Uu5Elements.Text>
    );
  },
});

export default Heading;
