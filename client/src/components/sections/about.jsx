import { createVisualComponent, useScreenSize, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import Photo from "../photo.jsx";
import property from "../../content/property.js";
import amenities from "../../content/amenities.js";
import gallery from "../../content/gallery.js";

const { theme } = Config;

// "O roubence": vlevo text + mřížka karet s vybavením, vpravo koláž tří fotek.
// Na úzkých displejích jde koláž pod text.

const About = createVisualComponent({
  uu5Tag: Config.TAG + "About",

  render() {
    const [screenSize] = useScreenSize();
    const isNarrow = screenSize === "xs" || screenSize === "s";

    // Koláž bere první tři fotky ze stejného zdroje jako galerie -- ať se to nerozejde.
    const collage = [...gallery].sort((a, b) => a.order - b.order).slice(0, 3);

    return (
      <Section id="o-roubence">
        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
            gap: isNarrow ? 32 : 48,
            alignItems: "start",
          })}
        >
          <div>
            <Eyebrow lsi={{ cs: "O roubence" }} />
            <Heading level={2} lsi={{ cs: "Dřevo, kamna a ticho za humny" }} />
            <p
              className={Config.Css.css({
                ...theme.text.body,
                color: theme.color.mutedFg,
                marginBlock: "16px 28px",
              })}
            >
              <Lsi lsi={property.about} />
            </p>

            <div
              className={Config.Css.css({
                display: "grid",
                gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
                gap: 12,
              })}
            >
              {[...amenities]
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <Card key={item.code} className={Config.Css.css({ padding: 16 })}>
                    <Heading level={3} className={Config.Css.css({ fontSize: 16 })} lsi={item.title} />
                    <p
                      className={Config.Css.css({
                        ...theme.text.small,
                        color: theme.color.mutedFg,
                        marginBlock: "6px 0",
                      })}
                    >
                      <Lsi lsi={item.description} />
                    </p>
                  </Card>
                ))}
            </div>
          </div>

          {/* Koláž: jedna široká nahoře, dvě menší pod ní */}
          <div className={Config.Css.css({ display: "grid", gap: 12 })}>
            <Photo {...collage[0]} ratio="16 / 10" />
            <div className={Config.Css.css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 })}>
              <Photo {...collage[1]} ratio="1 / 1" />
              <Photo {...collage[2]} ratio="1 / 1" />
            </div>
          </div>
        </div>
      </Section>
    );
  },
});

export default About;
