import { createVisualComponent, useScreenSize, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Button from "../layout/button.jsx";
import { HEADER_HEIGHT } from "../layout/header.jsx";
import property from "../../content/property.js";

const { theme } = Config;

// Hero: v předloze fullbleed fotka se zeleným překryvem. Dokud fotka není, je to plný
// forest blok -- kompozice i chování průhledné lišty zůstávají stejné, takže výměna
// za fotku bude jen doplnění backgroundImage.

const Hero = createVisualComponent({
  uu5Tag: Config.TAG + "Hero",

  render() {
    const [screenSize] = useScreenSize();
    const isMobile = screenSize === "xs";

    return (
      <Section
        variant="forest"
        id="hero"
        // Hero sahá pod fixní lištu, takže si o její výšku odsazuje obsah samo.
        padTop={HEADER_HEIGHT + (isMobile ? 32 : 72)}
        className={Config.Css.css({ minBlockSize: isMobile ? "auto" : "72vh", display: "flex", alignItems: "center" })}
      >
        <div className={Config.Css.css({ maxWidth: 720, paddingBlock: isMobile ? 16 : 40 })}>
          <Eyebrow onDark lsi={property.tagline} />
          <Heading level={1} onDark lsi={property.headline} />
          <p
            className={Config.Css.css({
              ...theme.text.body,
              fontSize: isMobile ? 16 : 18,
              color: theme.color.onDark,
              opacity: 0.85,
              marginBlock: "16px 0",
              maxWidth: 560,
            })}
          >
            <Lsi lsi={property.perex} />
          </p>

          <div className={Config.Css.css({ display: "flex", gap: 12, flexWrap: "wrap", marginBlockStart: 28 })}>
            <Button variant="onDark" anchor="#rezervace" route="reservation">
              <Lsi lsi={{ cs: "Zjistit volné termíny" }} />
            </Button>
            <Button variant="outlineOnDark" anchor="#galerie" route="gallery">
              <Lsi lsi={{ cs: "Prohlédnout galerii" }} />
            </Button>
          </div>
        </div>
      </Section>
    );
  },
});

export default Hero;
