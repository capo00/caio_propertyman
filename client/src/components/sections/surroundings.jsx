import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import Button from "../layout/button.jsx";
import Photo from "../photo.jsx";
import attractions from "../../content/attractions.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Okolí: perex + fotka nahoře, pod tím místa v okolí. Tatáž sekce ve dvou rolích:
//
//   <Surroundings limit={3} />  -- teaser na home, pod mřížkou tlačítko na celé okolí
//   <Surroundings grouped />    -- routa /okoli, všechno rozdělené podle kategorie
//
// Kategorie jsou vyjmenované tady, ne odvozené z dat: pořadí skupin na stránce je redakční
// rozhodnutí (nejdřív příroda kolem domu, pak památky, nakonec tipy), ne abeceda. Položka
// s kategorií, která tu není, by ze stránky vypadla -- proto je pod mřížkou pojistka
// `OTHER_CATEGORY` a nic se neztratí.
const CATEGORY_ORDER = ["nature", "culture", "games"];
const OTHER_CATEGORY = "other";

function AttractionCard({ item }) {
  return (
    <Card
      // Hlavička karty je titulek + vzdálenost na jednom řádku -- rozvržení dělá
      // Uu5Elements.Grid (dva sloupce, druhý na šířku obsahu), ne vlastní flex.
      header={
        <Uu5Elements.Grid templateColumns="1fr auto" columnGap={12} alignItems="baseline">
          <Heading level={3} lsi={lsi("attractions", item.code, "title")} />
          {/* Jednotku sází Uu5Elements.Number (`unit="kilometer"`) podle jazyka
              aplikace -- v datech zůstává holé číslo, ať se dá řadit.
              Vzdálenost je nepovinná: položka, která není místo na mapě (tip na výlet,
              téma), ji nemá a sloupec se pro ni prostě nevykreslí. */}
          {typeof item.distanceKm === "number" && (
            <span
              className={Config.Css.css({
                ...theme.text.eyebrow,
                color: theme.color.accent,
                whiteSpace: "nowrap",
              })}
            >
              <Uu5Elements.Number value={item.distanceKm} unit="kilometer" unitFormat="short" />
            </span>
          )}
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
  );
}

function AttractionGrid({ items, className }) {
  return (
    <Uu5Elements.Grid
      templateColumns="repeat(auto-fit, minmax(260px, 1fr))"
      rowGap={16}
      columnGap={16}
      className={className}
    >
      {items.map((item) => (
        <AttractionCard key={item.code} item={item} />
      ))}
    </Uu5Elements.Grid>
  );
}

const Surroundings = createVisualComponent({
  uu5Tag: Config.TAG + "Surroundings",

  render({ limit, grouped }) {
    const all = [...attractions].sort((a, b) => a.order - b.order);
    const items = limit ? all.slice(0, limit) : all;
    const hasMore = items.length < all.length;

    // Skupiny se počítají jen pro grouped variantu; prázdná skupina se nevykreslí.
    const groups = grouped
      ? [...CATEGORY_ORDER, OTHER_CATEGORY]
          .map((category) => ({
            category,
            items: all.filter((item) =>
              category === OTHER_CATEGORY ? !CATEGORY_ORDER.includes(item.category) : item.category === category,
            ),
          }))
          .filter((group) => group.items.length > 0)
      : null;

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

        {groups ? (
          groups.map((group) => (
            <div key={group.category} className={Config.Css.css({ marginBlockStart: 32 })}>
              <Heading level={3} lsi={lsi("sections", "surroundings", "categories", group.category)} />
              <AttractionGrid items={group.items} className={Config.Css.css({ marginBlockStart: 16 })} />
            </div>
          ))
        ) : (
          <AttractionGrid items={items} className={Config.Css.css({ marginBlockStart: 32 })} />
        )}

        {hasMore && (
          <Button
            variant="outline"
            href="okoli"
            className={Config.Css.css({ marginBlockStart: 28 })}
            lsi={lsi("sections", "surroundings", "allButton")}
          />
        )}
      </Section>
    );
  },
});

export default Surroundings;
