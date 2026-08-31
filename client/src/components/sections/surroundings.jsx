import { createVisualComponent, useScreenSize, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import Photo from "../photo.jsx";
import attractions from "../../content/attractions.js";

const { theme } = Config;

// Okolí: perex + fotka nahoře, pod tím mřížka míst s vzdáleností vpravo.

const Surroundings = createVisualComponent({
  uu5Tag: Config.TAG + "Surroundings",

  render() {
    const [screenSize] = useScreenSize();
    const isNarrow = screenSize === "xs" || screenSize === "s";
    const items = [...attractions].sort((a, b) => a.order - b.order);

    return (
      <Section variant="cream" id="okoli">
        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
            gap: isNarrow ? 24 : 48,
            alignItems: "center",
          })}
        >
          <div>
            <Eyebrow lsi={{ cs: "Zajímavosti v okolí" }} />
            <Heading level={2} lsi={{ cs: "Český ráj začíná za brankou" }} />
            <p
              className={Config.Css.css({
                ...theme.text.body,
                color: theme.color.mutedFg,
                marginBlock: "16px 0",
              })}
            >
              <Lsi
                lsi={{
                  cs: "Od chalupy vyrazíte pěšky romantickým údolím Plakánek až k hradu Kost. Autem jste za pár minut u skalních měst i rozhleden.",
                }}
              />
            </p>
          </div>

          <Photo
            src={null}
            tone="forest"
            ratio="16 / 10"
            caption={{ cs: "Skalní město nad údolím" }}
          />
        </div>

        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginBlockStart: 32,
          })}
        >
          {items.map((item) => (
            <Card key={item.order} className={Config.Css.css({ padding: 18 })}>
              <div
                className={Config.Css.css({
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                })}
              >
                <Heading level={3} className={Config.Css.css({ fontSize: 18 })} lsi={item.title} />
                {/* Jednotku doplňujeme tady -- v datech je distanceKm číslo, ať se dá řadit. */}
                <span
                  className={Config.Css.css({
                    ...theme.text.eyebrow,
                    color: theme.color.accent,
                    whiteSpace: "nowrap",
                  })}
                >
                  {item.distanceKm} km
                </span>
              </div>
              <p
                className={Config.Css.css({
                  ...theme.text.small,
                  color: theme.color.mutedFg,
                  marginBlock: "8px 0",
                })}
              >
                <Lsi lsi={item.description} />
              </p>
            </Card>
          ))}
        </div>
      </Section>
    );
  },
});

export default Surroundings;
