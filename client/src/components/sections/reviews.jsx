import { createVisualComponent, useDataObject, useLsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Calls from "../../calls.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import importLsi, { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Recenze jsou od v2 z databáze (`review/list`), ne z konstanty v content/. Texty tím
// opustily LSI: nejsou to překlady rozhraní, ale obsah od hostů -- stejná úvaha, jaká
// nechala adresu a telefon v content/contact.js (docs/decisions.md, design-v2.md § 7).
//
// Server bez přihlášení vrací jen schválené recenze, takže se tu nic nefiltruje.

const Reviews = createVisualComponent({
  uu5Tag: Config.TAG + "Reviews",

  render() {
    const { state, data } = useDataObject({ handlerMap: { load: () => Calls.listReviews() } });
    // Šablona s ${rating}; hodnocení se do ní doplní u každé karty zvlášť.
    const ratingAriaLsi = useLsi(importLsi, ["sections", "reviews", "ratingAria"]);

    const items = data?.itemList ?? [];

    // Dokud se načítá, nebo když recenze nejsou (a když je server nevrátí), zůstane ze sekce
    // jen kotva. Prázdný blok „Recenze“ vypadá hůř než jeho nepřítomnost, ale položka
    // „Recenze“ v menu míří na `#recenze` a je statická (content/nav.js) -- bez cíle by byl
    // odkaz v liště mrtvý.
    if (state === "pending" || state === "pendingNoData" || items.length === 0) {
      return <section id="recenze" />;
    }

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
            <Card key={review.id}>
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
                „{review.text}“
              </p>

              <p className={Config.Css.css({ ...theme.text.small, margin: 0, color: theme.color.mutedFg })}>
                <strong className={Config.Css.css({ color: theme.color.fg, fontWeight: 700 })}>{review.author}</strong>
                {review.place ? ` · ${review.place}` : null}
              </p>

              {review.response ? (
                <p
                  className={Config.Css.css({
                    ...theme.text.small,
                    margin: "12px 0 0",
                    paddingInlineStart: 12,
                    borderInlineStart: `2px solid ${theme.color.accent}`,
                    color: theme.color.mutedFg,
                  })}
                >
                  {review.response}
                </p>
              ) : null}
            </Card>
          ))}
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default Reviews;
