import { createVisualComponent, useLsi, Utils } from "uu5g05";
import Config from "../config/config.js";

const { theme } = Config;

// Fotka, nebo -- dokud žádná není -- placeholder plocha.
//
// `src: null` v content/gallery.js znamená "skutečná fotka ještě není". Místo prázdného
// místa se vykreslí tónovaná plocha s popiskem, takže je vidět kompozice stránky
// a zároveň je na první pohled jasné, že tohle není hotový obsah.
//
// Až fotky budou, stačí doplnit `src` v content/gallery.js -- tahle komponenta se nemění.

const TONE = {
  forest: { backgroundColor: theme.color.forest, color: theme.color.onDark },
  sand: { backgroundColor: theme.color.sand, color: theme.color.sandFg },
  muted: { backgroundColor: theme.color.muted, color: theme.color.mutedFg },
};

const Photo = createVisualComponent({
  uu5Tag: Config.TAG + "Photo",

  render(props) {
    const { src, caption, tone = "muted", ratio = "4 / 3" } = props;
    // useLsi musí běžet za všech okolností, ne až ve větvi -- hooky nesmí být podmíněné.
    // `caption` sem chodí jako { import, path } z lsi(); prázdný objekt je jen pojistka,
    // kdyby popisek nebyl předaný vůbec. Výsledek se sráží na "" schválně -- prázdný alt
    // říká čtečce "dekorativní obrázek", zatímco chybějící alt je pro ni chyba.
    const captionText = useLsi(caption ?? {}) ?? "";

    // getAttrs, ne {...restProps} -- viz komentář v layout/eyebrow.jsx.
    if (src) {
      const imgAttrs = Utils.VisualComponent.getAttrs(
        props,
        Config.Css.css({
          display: "block",
          inlineSize: "100%",
          aspectRatio: ratio,
          objectFit: "cover",
          borderRadius: theme.radius,
        }),
      );

      return <img {...imgAttrs} src={src} alt={captionText} loading="lazy" />;
    }

    const palette = TONE[tone] ?? TONE.muted;
    const boxAttrs = Utils.VisualComponent.getAttrs(
      props,
      Config.Css.css({
        ...palette,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 16,
        inlineSize: "100%",
        aspectRatio: ratio,
        borderRadius: theme.radius,
        // Jemné diagonální proužky -- odliší placeholder od plné barevné plochy,
        // aniž by to křičelo.
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 10px, transparent 10px 20px)",
      }),
    );

    return (
      <div {...boxAttrs} role="img" aria-label={captionText}>
        <span
          className={Config.Css.css({
            ...theme.text.eyebrow,
            fontSize: 10,
            opacity: 0.75,
            maxInlineSize: "22ch",
          })}
        >
          {captionText}
        </span>
      </div>
    );
  },
});

export default Photo;
