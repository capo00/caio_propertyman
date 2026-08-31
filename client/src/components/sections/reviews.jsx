import { createVisualComponent, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import reviewsContent from "../../content/reviews.js";

const { theme } = Config;

const Reviews = createVisualComponent({
  uu5Tag: Config.TAG + "Reviews",

  render() {
    const items = [...reviewsContent].sort((a, b) => a.order - b.order);

    return (
      <Section id="recenze">
        <Eyebrow lsi={{ cs: "Recenze" }} />
        <Heading level={2} lsi={{ cs: "Co říkají hosté" }} />

        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
            marginBlockStart: 28,
          })}
        >
          {items.map((review) => (
            <Card key={review.order}>
              {/* Hvězdičky v barvě accent. aria-label nese hodnocení textem -- samotné
                  hvězdičky by čtečka přečetla jako pět hvězdiček bez významu. */}
              <div
                aria-label={`Hodnocení ${review.rating} z 5`}
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
                „<Lsi lsi={review.text} />“
              </p>

              <p className={Config.Css.css({ ...theme.text.small, margin: 0, color: theme.color.mutedFg })}>
                <strong className={Config.Css.css({ color: theme.color.fg, fontWeight: 700 })}>
                  <Lsi lsi={review.author} />
                </strong>
                {" · "}
                <Lsi lsi={review.place} />
              </p>
            </Card>
          ))}
        </div>
      </Section>
    );
  },
});

export default Reviews;
