import { createVisualComponent, useScreenSize, Utils } from "uu5g05";
import Config from "../../config/config.js";

const { theme } = Config;

// Obal sekce: podklad, vertikální rytmus a vycentrovaný kontejner.
//
// Sekce se na stránce STŘÍDAJÍ bg -> cream -> bg a jednou to přeruší forest blok
// (Rezervace) -- ten dělá vizuální těžiště. Viz docs/ux-design-system.md § 4.

const VARIANT = {
  bg: { backgroundColor: theme.color.bg, color: theme.color.fg },
  cream: { backgroundColor: theme.color.cream, color: theme.color.fg },
  forest: { backgroundColor: theme.color.forest, color: theme.color.onDark },
};

const Section = createVisualComponent({
  uu5Tag: Config.TAG + "Section",

  // `padTop` přebíjí spočítaný horní padding. Používá to hero, které sahá pod fixní lištu
  // a musí si o její výšku odsadit obsah samo.
  render({ variant = "bg", id, padTop, children, className, ...restProps }) {
    const [screenSize] = useScreenSize();
    const isMobile = screenSize === "xs";
    const isNarrow = screenSize === "xs" || screenSize === "s";

    const pad = isMobile
      ? theme.sectionPad.xs
      : isNarrow
        ? theme.sectionPad.m
        : theme.sectionPad.l;

    return (
      <section
        id={id}
        {...restProps}
        className={Utils.Css.joinClassName(
          Config.Css.css({
            ...VARIANT[variant],
            paddingBlockStart: padTop ?? pad,
            paddingBlockEnd: pad,
            // Kotva nesmí skončit pod sticky hlavičkou.
            scrollMarginBlockStart: 80,
          }),
          className,
        )}
      >
        <div
          className={Config.Css.css({
            // inlineSize: 100% je povinné. Když si sekce nastaví display:flex (hero kvůli
            // svislému vycentrování), stane se z kontejneru flex položka a bez tohohle
            // by se smrskla na šířku obsahu -- obsah by se vycentroval místo zarovnání vlevo.
            inlineSize: "100%",
            maxWidth: theme.maxWidth,
            marginInline: "auto",
            paddingInline: isMobile ? theme.gutter.xs : theme.gutter.m,
          })}
        >
          {children}
        </div>
      </section>
    );
  },
});

export default Section;
