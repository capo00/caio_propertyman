import { createVisualComponent, useScreenSize, useLsi, Lsi } from "uu5g05";
import Config from "../config/config.js";
import Section from "./section.jsx";
import Eyebrow from "./eyebrow.jsx";
import Heading from "./heading.jsx";
import Button from "./button.jsx";
import gallery from "./gallery/content.js";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Hero: fotka chalupy, na každé šířce jinak (majitel, 2026-10-11):
//
//   desktop -- fullbleed fotka v pozadí celé sekce se zeleným překryvem (jako v předloze)
//   mobil   -- fotka přes celou šířku NAD zelenou sekcí s textem; na úzkém displeji by
//              pod překryvem z chalupy zbyl jen kousek střechy za třemi odstavci textu

const HERO_PHOTO = gallery.find((item) => item.code === "facade");

const Hero = createVisualComponent({
  uu5Tag: Config.TAG + "Hero",

  render() {
    const [screenSize] = useScreenSize();
    const isMobile = screenSize === "xs";
    // Alt fotky je popisek z galerie; na desktopu je fotka jen pozadí a alt nemá.
    const photoAlt = useLsi(lsi("gallery", HERO_PHOTO.code)) ?? "";

    const text = (
      <div className={Config.Css.css({ maxWidth: 720, paddingBlock: isMobile ? 16 : 40 })}>
        <Eyebrow onDark lsi={lsi("property", "tagline")} />
        <Heading level={1} lsi={lsi("property", "headline")} />
        <p
          className={Config.Css.css({
            ...theme.text.body,
            fontSize: isMobile ? 16 : 18,
            color: theme.color.onDark,
            opacity: 0.85,
            marginBlock: "16px 0",
            maxWidth: 560,
            // Texty v LSI jsou psané po větách na samostatné řádky; bez pre-line by se
            // `\n` slilo do jedné mezery a odstavec by byl jeden blok.
            whiteSpace: "pre-line",
          })}
        >
          <Lsi lsi={lsi("property", "perex")} />
        </p>

        <div className={Config.Css.css({ display: "flex", gap: 12, flexWrap: "wrap", marginBlockStart: 28 })}>
          {/* Bez varianty "onDark": tlačítko si tmavý podklad přečte z kontextu sekce. */}
          <Button href="#rezervace">
            <Lsi lsi={lsi("sections", "hero", "availabilityButton")} />
          </Button>
          <Button variant="outline" href="#galerie">
            <Lsi lsi={lsi("sections", "hero", "galleryButton")} />
          </Button>
        </div>
      </div>
    );

    return (
      <>
        {isMobile && (
          // Obyčejný <img>, ne Photo: fotka jde od kraje ke kraji bez zaoblení a je nad
          // ohybem stránky, takže se nesmí načítat líně (Photo má loading="lazy").
          <img
            src={HERO_PHOTO.src}
            alt={photoAlt}
            className={Config.Css.css({
              display: "block",
              inlineSize: "100%",
              aspectRatio: "4 / 3",
              objectFit: "cover",
            })}
          />
        )}
        <Section
          variant="forest"
          id="hero"
          // Lišta je sticky, takže zůstává v toku a obsah odsazovat nemusí -- stačí normální
          // padding sekce. Lišta je zelená stejně jako hero, takže na sebe navazují.
          className={Config.Css.css({
            minBlockSize: isMobile ? "auto" : "72vh",
            display: "flex",
            alignItems: "center",
            // Překryv je druhá vrstva backgroundImage nad fotkou -- bez dalšího elementu
            // v DOM. Bez něj by světlý text na pestré fotce nebyl čitelný.
            ...(!isMobile && {
              backgroundImage: `linear-gradient(${theme.color.forestOverlay}, ${theme.color.forestOverlay}), url(${HERO_PHOTO.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }),
          })}
        >
          {text}
        </Section>
      </>
    );
  },
});

export default Hero;
