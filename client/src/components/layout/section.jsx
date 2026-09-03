import { createVisualComponent, useScreenSize, BackgroundProvider, Utils } from "uu5g05";
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

  // `padTop` přebíjí spočítaný horní padding. Dnes ho nikdo nepoužívá (lišta je sticky,
  // takže zůstává v toku a odsazovat se pod ni nemusí), ale zůstává jako výjimka pro sekci,
  // která by potřebovala jiný horní odstup než ostatní.
  render(props) {
    const { variant = "bg", padTop, children } = props;
    const [screenSize] = useScreenSize();
    const isMobile = screenSize === "xs";
    const isNarrow = screenSize === "xs" || screenSize === "s";

    const pad = isMobile
      ? theme.sectionPad.xs
      : isNarrow
        ? theme.sectionPad.m
        : theme.sectionPad.l;

    // getAttrs, ne {...restProps} -- viz komentář v eyebrow.jsx. `id` si getAttrs vezme
    // z props sám, takže se nepředává zvlášť.
    const attrs = Utils.VisualComponent.getAttrs(
      props,
      Config.Css.css({
        ...VARIANT[variant],
        paddingBlockStart: padTop ?? pad,
        paddingBlockEnd: pad,
        // scrollMarginBlockStart: 200,
      }),
    );

    // Podklad sekce se hlásí do kontextu, ne jen do CSS: uu5 komponenty uvnitř (tlačítka,
    // ikony, texty) si podle něj samy volí světlou/tmavou variantu z GDS. Bez toho by na
    // forest sekci renderovaly tak, jako by stály na bílé.
    const background = variant === "forest" ? "dark" : "light";

    return (
      <BackgroundProvider background={background}>
        <section {...attrs}>
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
      </BackgroundProvider>
    );
  },
});

export default Section;
