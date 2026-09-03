import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import Photo from "../photo.jsx";
import attractions from "../../content/attractions.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Okolí: perex + fotka nahoře, pod tím mřížka míst s vzdáleností vpravo.

const Surroundings = createVisualComponent({
  uu5Tag: Config.TAG + "Surroundings",

  render() {
    const items = [...attractions].sort((a, b) => a.order - b.order);

    return (
      <Section variant="cream" id="okoli">
        <Uu5Elements.Grid
          templateColumns={{ xs: "1fr", m: "1fr 1fr" }}
          columnGap={48}
          rowGap={24}
          alignItems="center"
        >
          <div>
            <Eyebrow lsi={lsi("sections", "surroundings", "eyebrow")} />
            <Heading level={2} lsi={lsi("sections", "surroundings", "heading")} />
            <p
              className={Config.Css.css({
                ...theme.text.body,
                color: theme.color.mutedFg,
                marginBlock: "16px 0",
              })}
            >
              <Lsi lsi={lsi("sections", "surroundings", "perex")} />
            </p>
          </div>

          <Photo
            src={null}
            tone="forest"
            ratio="16 / 10"
            caption={lsi("sections", "surroundings", "photoCaption")}
          />
        </Uu5Elements.Grid>

        <Uu5Elements.Grid
          templateColumns="repeat(auto-fit, minmax(260px, 1fr))"
          rowGap={16}
          columnGap={16}
          className={Config.Css.css({ marginBlockStart: 32 })}
        >
          {/* Hlavička karty je titulek + vzdálenost na jednom řádku -- rozvržení dělá
              Uu5Elements.Grid (dva sloupce, druhý na šířku obsahu), ne vlastní flex. */}
          {items.map((item) => (
            <Card
              key={item.code}
              header={
                <Uu5Elements.Grid templateColumns="1fr auto" columnGap={12} alignItems="baseline">
                  <Heading level={3} lsi={lsi("attractions", item.code, "title")} />
                  {/* Jednotku sází Uu5Elements.Number (`unit="kilometer"`) podle jazyka
                      aplikace -- v datech zůstává holé číslo, ať se dá řadit. */}
                  <span
                    className={Config.Css.css({
                      ...theme.text.eyebrow,
                      color: theme.color.accent,
                      whiteSpace: "nowrap",
                    })}
                  >
                    <Uu5Elements.Number value={item.distanceKm} unit="kilometer" unitFormat="short" />
                  </span>
                </Uu5Elements.Grid>
              }
            >
              <p
                className={Config.Css.css({
                  ...theme.text.small,
                  color: theme.color.mutedFg,
                  margin: 0,
                })}
              >
                <Lsi lsi={lsi("attractions", item.code, "description")} />
              </p>
            </Card>
          ))}
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default Surroundings;
