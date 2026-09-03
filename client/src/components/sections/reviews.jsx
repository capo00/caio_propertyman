import { createVisualComponent, useLsi, Lsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import reviewsContent from "../../content/reviews.js";
import importLsi, { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

const Reviews = createVisualComponent({
  uu5Tag: Config.TAG + "Reviews",

  render() {
    const items = [...reviewsContent].sort((a, b) => a.order - b.order);
    // Šablona s ${rating}; hodnocení se do ní doplní u každé karty zvlášť.
    const ratingAriaLsi = useLsi(importLsi, ["sections", "reviews", "ratingAria"]);

    return (
      <Section id="recenze">
        <Eyebrow lsi={lsi("sections", "reviews", "eyebrow")} />
        <Heading level={2} lsi={lsi("sections", "reviews", "heading")} />

        <Uu5Elements.Grid
          templateColumns="repeat(auto-fit, minmax(300px, 1fr))"
          rowGap={16}
          columnGap={16}
          className={Config.Css.css({ marginBlockStart: 28 })}
        >
          {items.map((review) => (
            <Card key={review.code}>
              {/* Hvězdičky v barvě accent. aria-label nese hodnocení textem -- samotné
                  hvězdičky by čtečka přečetla jako pět hvězdiček bez významu. */}
              <div
                aria-label={Utils.String.format(ratingAriaLsi, { rating: review.rating })}
                className={Config.Css.css({ color: theme.color.accent, letterSpacing: 2, fontSize: 14 })}
              >
                {"★".repeat(review.rating)}
              </div>

              <p
                className={Config.Css.css({
                  ...theme.text.body,
                  color: theme.color.fg,
                  marginBlock: "12px 16px",
                })}
              >
                „<Lsi lsi={lsi("reviews", review.code, "text")} />“
              </p>

              <p className={Config.Css.css({ ...theme.text.small, margin: 0, color: theme.color.mutedFg })}>
                <strong className={Config.Css.css({ color: theme.color.fg, fontWeight: 700 })}>
                  <Lsi lsi={lsi("reviews", review.code, "author")} />
                </strong>
                {" · "}
                <Lsi lsi={lsi("reviews", review.code, "place")} />
              </p>
            </Card>
          ))}
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default Reviews;
