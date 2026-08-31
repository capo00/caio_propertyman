import { createVisualComponent, useScreenSize, Lsi } from "uu5g05";
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
        <div
          className={Config.Css.css({
            maxWidth: theme.maxWidth,
            marginInline: "auto",
            paddingInline: isMobile ? theme.gutter.xs : theme.gutter.m,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: 12,
          })}
        >
          <span className={Config.Css.css({ ...theme.text.h3, color: "inherit" })}>
            <Lsi lsi={{ cs: "Roubenka Libošovice · Český ráj" }} />
          </span>
          <span className={Config.Css.css({ ...theme.text.small, opacity: 0.7 })}>
            {/* Rok se dopočítá, ať nezůstane viset zastaralý v patičce. */}
            © {new Date().getFullYear()} <Lsi lsi={{ cs: "Všechna práva vyhrazena." }} />
          </span>
        </div>
      </footer>
    );
  },
});

export default Footer;
