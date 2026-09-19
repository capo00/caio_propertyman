import { createVisualComponent, useScreenSize, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import { lsi } from "../../lsi/import-lsi.js";
import Config from "../../config/config.js";

const { theme } = Config;

// Patička: název vlevo, copyright vpravo. Na mobilu pod sebou.
//
// Podklad je KRÉMOVÝ, stejný jako poslední sekce každé veřejné stránky (kontakt, viz
// app.jsx). Patička tak není samostatný pruh pod stránkou, ale konec té sekce -- hranice
// mezi nimi není vidět a odděluje je jen vlas linky uvnitř kontejneru obsahu.
//
// Proto tu taky NENÍ horní padding: odstup nad linkou dodává spodní padding kontaktní
// sekce (Section, theme.sectionPad), ať se rytmus stránky nesčítá dvakrát.

const Footer = createVisualComponent({
  uu5Tag: Config.TAG + "Footer",

  render() {
    const [screenSize] = useScreenSize();
    const isMobile = screenSize === "xs";

    return (
      <footer
        className={Config.Css.css({
          backgroundColor: theme.color.cream,
          color: theme.color.fg,
        })}
      >
        {/* Kontejner patičky je jeden element: rozvržení spočítá Grid a přes `children`
            jako funkci ho vrátí jako `style`, k němu se přidá šířka a gutter webu. Linka
            je uvnitř kontejneru, ne přes celou šířku okna -- zarovnává se s obsahem sekce. */}
        <Uu5Elements.Grid
          templateColumns={{ xs: "1fr", m: "auto auto" }}
          justifyContent="space-between"
          alignItems={{ xs: "start", m: "center" }}
          rowGap={12}
          columnGap={12}
        >
          {({ style }) => (
            <div
              className={Config.Css.css({
                maxWidth: theme.maxWidth,
                marginInline: "auto",
                paddingInline: isMobile ? theme.gutter.xs : theme.gutter.m,
              })}
            >
              {/* Linka a mřížka jsou AŽ uvnitř kontejneru: kdyby seděly na něm, natáhla by
                  se linka i přes jeho gutter a nelícovala by s obsahem sekce nad ní. */}
              <div
                className={Config.Css.css({
                  ...style,
                  borderBlockStart: `1px solid ${theme.color.border}`,
                  paddingBlock: "20px 28px",
                })}
              >
                <span className={Config.Css.css({ ...theme.text.h3, color: "inherit" })}>
                  <Lsi lsi={lsi("property", "name")} /> · <Lsi lsi={lsi("property", "region")} />
                </span>
                <span className={Config.Css.css({ ...theme.text.small, color: theme.color.mutedFg })}>
                  {/* Rok se dopočítá, ať nezůstane viset zastaralý v patičce. */}
                  © {new Date().getFullYear()} <Lsi lsi={lsi("footer", "rights")} />
                </span>
              </div>
            </div>
          )}
        </Uu5Elements.Grid>
      </footer>
    );
  },
});

export default Footer;
