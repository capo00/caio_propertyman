import { createVisualComponent, useRoute, Lsi, Utils } from "uu5g05";
import Config from "../../config/config.js";

const { theme } = Config;

// Tlačítko předlohy: plné (forest podklad) nebo outline.
//
// Vlastní, ne Uu5Elements.Button -- ten má vlastní sazbu i tvar podle GDS a do vzhledu
// předlohy ho nedostaneme. Uu5Elements.Button se používá uvnitř formulářů, kde je jeho
// chování (pending stav, disabled při submitu) cennější než vzhled.
//
// `href` míří na routu ("gallery") nebo na kotvu ("#galerie"). Routa jde přes setRoute,
// aby se nepřenačítala celá SPA.

const VARIANT = {
  solid: {
    backgroundColor: theme.color.forest,
    color: theme.color.onDark,
    border: "1px solid transparent",
    "&:hover": { backgroundColor: theme.color.primary },
  },
  outline: {
    backgroundColor: "transparent",
    color: theme.color.fg,
    border: `1px solid ${theme.color.border}`,
    "&:hover": { backgroundColor: theme.color.muted },
  },
  // Na forest podkladu: světlý outline.
  outlineOnDark: {
    backgroundColor: "transparent",
    color: theme.color.onDark,
    border: `1px solid ${theme.color.onDark}66`,
    "&:hover": { backgroundColor: "#FBF9F01A" },
  },
  onDark: {
    backgroundColor: theme.color.onDark,
    color: theme.color.forest,
    border: "1px solid transparent",
    "&:hover": { backgroundColor: theme.color.cream },
  },
};

const Button = createVisualComponent({
  uu5Tag: Config.TAG + "Button",

  // `href` je buď kotva ("#rezervace"), nebo routa ("gallery").
  //
  // `anchor` + `route` zadané společně řeší sekce, které se renderují na dvou místech:
  // na home (kde jsou všechny sekce pod sebou a kotva funguje) i na vlastní stránce
  // (kde cílová sekce vůbec není a kotva by nikam nevedla).
  render({ variant = "solid", href, anchor, route: routeName, onClick, children, lsi, className, ...restProps }) {
    const [route, setRoute] = useRoute();

    const isHome = route?.uu5Route === "home" || route?.uu5Route === "";
    const target = anchor && routeName ? (isHome ? anchor : routeName) : href;

    const isAnchor = typeof target === "string" && target.startsWith("#");
    const isRoute = typeof target === "string" && !isAnchor;

    function handleClick(e) {
      if (isRoute) {
        e.preventDefault();
        setRoute(target);
      }
      onClick?.(e);
    }

    const Tag = target ? "a" : "button";

    return (
      <Tag
        {...restProps}
        href={target}
        type={target ? undefined : "button"}
        onClick={handleClick}
        className={Utils.Css.joinClassName(
          Config.Css.css({
            ...VARIANT[variant],
            ...theme.text.body,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingBlock: 14,
            paddingInline: 24,
            borderRadius: theme.radius,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
            transition: "background-color 120ms ease",
          }),
          className,
        )}
      >
        {lsi ? <Lsi lsi={lsi} /> : children}
      </Tag>
    );
  },
});

export default Button;
