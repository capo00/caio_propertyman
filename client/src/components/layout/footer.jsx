import { createVisualComponent, useScreenSize, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import { lsi } from "../../lsi/import-lsi.js";
import Config from "../../config/config.js";

const { theme } = Config;

// Patička: forest pruh, název vlevo, copyright vpravo. Na mobilu pod sebou.

const Footer = createVisualComponent({
  uu5Tag: Config.TAG + "Footer",

  render() {
    const [screenSize] = useScreenSize();
    const isMobile = screenSize === "xs";

    return (
      <footer
        className={Config.Css.css({
          backgroundColor: theme.color.forest,
          color: theme.color.onDark,
          paddingBlock: 28,
        })}
      >
        {/* Kontejner patičky je jeden element: rozvržení spočítá Grid a přes `children`
            jako funkci ho vrátí jako `style`, k němu se přidá šířka a gutter webu. */}
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
                ...style,
                maxWidth: theme.maxWidth,
                marginInline: "auto",
                paddingInline: isMobile ? theme.gutter.xs : theme.gutter.m,
              })}
            >
              <span className={Config.Css.css({ ...theme.text.h3, color: "inherit" })}>
                <Lsi lsi={lsi("footer", "name")} />
              </span>
              <span className={Config.Css.css({ ...theme.text.small, opacity: 0.7 })}>
                {/* Rok se dopočítá, ať nezůstane viset zastaralý v patičce. */}
                © {new Date().getFullYear()} <Lsi lsi={lsi("footer", "rights")} />
              </span>
            </div>
          )}
        </Uu5Elements.Grid>
      </footer>
    );
  },
});

export default Footer;
