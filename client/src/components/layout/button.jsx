import { createVisualComponent, useBackground, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import { scrollToAnchor } from "../../scroll.js";

// Tlačítko webu. Je to Uu5Elements.Button nastavený PROPSY -- vzhled (výška, rádius,
// padding, tučnost, zalamování) se nepřebíjí, bere se z GDS tak, jak je.
// Zbývají dvě věci, které tahle komponenta přidává:
//
// 1. Volba `colorScheme` podle podkladu. Na světlé sekci je plné tlačítko zelené
//    (`primary`), na forest sekci by zelená na zelené zmizela -- tam GDS pro `building`
//    dává bílou výplň s tmavým textem a světlý rámeček u `distinct`, což je přesně
//    předloha. Podklad se nepředává propem: `useBackground()` ho čte z kontextu, který
//    dává `Section variant="forest"` (BackgroundProvider). Dřívější varianty
//    `onDark`/`outlineOnDark` tím zmizely -- volající neřeší, na čem tlačítko stojí.
//
// 2. Kotva na sekci. Web je jedna stránka, takže `href="#rezervace"` zůstává v DOM
//    (SEO, otevření v novém panelu), ale skok si odbavíme sami přes `scrollToAnchor`
//    (plynule za 1 s, viz scroll.js) -- nativní skok kotvy animaci ignoruje.
//    Uu5Elements.Button s `href` renderuje <a role="button"> a `onClick` si nechá.
//
// `size="xl"` je nejvyšší stupeň GDS (48 px) -- nejblíž tomu, co má předloha.

const SIGNIFICANCE = {
  solid: "highlighted",
  outline: "distinct",
};

const Button = createVisualComponent({
  uu5Tag: Config.TAG + "Button",

  render(props) {
    const { variant = "solid", size = "xl", href, onClick, children, lsi, ...restProps } = props;
    const background = useBackground();
    const isAnchor = href?.startsWith("#");

    return (
      <Uu5Elements.Button
        {...restProps}
        href={href}
        size={size}
        colorScheme={background === "dark" ? "building" : "primary"}
        significance={SIGNIFICANCE[variant]}
        onClick={
          isAnchor
            ? (e) => {
              e.preventDefault();
              scrollToAnchor(href);
              onClick?.(e);
            }
            : onClick
        }
      >
        {lsi ? <Lsi lsi={lsi} /> : children}
      </Uu5Elements.Button>
    );
  },
});

export default Button;
