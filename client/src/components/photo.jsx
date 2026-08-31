import { createVisualComponent, useLsi } from "uu5g05";
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

  render({ src, caption, tone = "muted", ratio = "4 / 3", className, ...restProps }) {
    // useLsi musí běžet za všech okolností, ne až ve větvi -- hooky nesmí být podmíněné.
    const captionText = useLsi(caption ?? { cs: "" });

    if (src) {
      return (
        <img
          {...restProps}
          src={src}
          alt={captionText}
          loading="lazy"
          className={Config.Css.css({
            display: "block",
            inlineSize: "100%",
            aspectRatio: ratio,
            objectFit: "cover",
            borderRadius: theme.radius,
          })}
        />
      );
    }

    const palette = TONE[tone] ?? TONE.muted;

    return (
      <div
        {...restProps}
        role="img"
        aria-label={captionText}
        className={Config.Css.css({
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
        })}
      >
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
