import { createVisualComponent, Utils } from "uu5g05";
import Config from "../../config/config.js";

const { theme } = Config;

// Karta předlohy: 1px rámeček, světlejší podklad, BEZ STÍNU.
// Plochy odděluje barva a linka, ne elevace -- stín by vzhled okamžitě rozbil.
//
// `highlighted` je varianta pro zvýrazněnou kartu v ceníku (ta s odznakem NEJŽÁDANĚJŠÍ).

const Card = createVisualComponent({
  uu5Tag: Config.TAG + "Card",

  render({ highlighted, children, className, ...restProps }) {
    return (
      <div
        {...restProps}
        className={Utils.Css.joinClassName(
          Config.Css.css({
            backgroundColor: theme.color.card,
            border: `1px solid ${highlighted ? theme.color.forest : theme.color.border}`,
            borderWidth: highlighted ? 2 : 1,
            borderRadius: theme.radius,
            padding: 24,
          }),
          className,
        )}
      >
        {children}
      </div>
    );
  },
});

export default Card;
