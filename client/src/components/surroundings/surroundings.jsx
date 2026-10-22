import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../section.jsx";
import Eyebrow from "../eyebrow.jsx";
import Heading from "../heading.jsx";
import Card from "../card.jsx";
import Button from "../button.jsx";
import Photo from "../photo.jsx";
import attractions from "./content.js";
import { lsi } from "../../lsi/import-lsi.js";
import { pagePath } from "../../tools/page-language.js";

const { theme } = Config;

// Surroundings: perex + photo at the top, places in the area below. The same section in two roles:
//
//   <Surroundings limit={3} />  -- teaser on home, below the grid a button to the full surroundings
//   <Surroundings grouped />    -- the /okoli route, everything split by category
//
// Categories are listed here, not derived from the data: the order of groups on the page is an editorial
// decision (first nature around the house, then landmarks, finally tips), not alphabetical. An item
// with a category that is not here would drop off the page -- hence the safeguard below the grid,
// `OTHER_CATEGORY`, and nothing gets lost.
const CATEGORY_ORDER = ["nature", "culture", "games"];
const OTHER_CATEGORY = "other";

function AttractionCard({ item }) {
  return (
    <Card
      // The whole card links through to the place's official website, in a new window (owner, 2026-09-29).
      // `kingdomCome` is a tip, not a place on the map, and has no `url` -- it stays non-clickable.
      href={item.url}
      target={item.url ? "_blank" : undefined}
      // The card header is title + distance on one line -- the layout is done by
      // Uu5Elements.Grid (two columns, the second sized to its content), not a custom flex.
      header={
        <Uu5Elements.Grid templateColumns="1fr auto" columnGap={12} alignItems="baseline">
          <Heading level={3} lsi={lsi("attractions", item.code, "title")} />
          {/* The unit is typeset by Uu5Elements.Number (`unit="kilometer"`) according to the
              app language -- the data keeps a bare number so it can be sorted.
              Distance is optional: an item that is not a place on the map (a trip tip,
              a theme) does not have it and the column is simply not rendered for it. */}
          {typeof item.distanceKm === "number" && (
            <span
              className={Config.Css.css({
                ...theme.text.eyebrow,
                // The unit is "km", not "KM": the eyebrow's capitals are for words, not units.
                textTransform: "none",
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

    // Groups are computed only for the grouped variant; an empty group is not rendered.
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
            src="/assets/okoli/libosovice.jpeg"
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
            href={pagePath("surroundings")}
            className={Config.Css.css({ marginBlockStart: 28 })}
            lsi={lsi("sections", "surroundings", "allButton")}
          />
        )}
      </Section>
    );
  },
});

export default Surroundings;
