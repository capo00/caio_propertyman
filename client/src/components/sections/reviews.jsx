import { createVisualComponent, useDataObject, useLsi, Lsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Calls from "../../calls.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import Button from "../layout/button.jsx";
import importLsi, { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Recenze jsou od v2 z databáze (`review/list`), ne z konstanty v content/. Texty tím
// opustily LSI: nejsou to překlady rozhraní, ale obsah od hostů -- stejná úvaha, jaká
// nechala adresu a telefon v content/contact.js (docs/decisions.md, design-v2.md § 7).
//
// Server bez přihlášení vrací jen schválené recenze, takže se tu nic nefiltruje.

const Reviews = createVisualComponent({
  uu5Tag: Config.TAG + "Reviews",

  render({ limit }) {
    const { state, data } = useDataObject({ handlerMap: { load: () => Calls.listReviews() } });
    // Šablona s ${rating}; hodnocení se do ní doplní u každé karty zvlášť.
    const ratingAriaLsi = useLsi(importLsi, ["sections", "reviews", "ratingAria"]);

    const all = data?.itemList ?? [];
    const items = limit ? all.slice(0, limit) : all;
    const hasMore = items.length < all.length;
    const isPending = state === "pending" || state === "pendingNoData";

    // Dokud se načítá, nebo když recenze nejsou (a když je server nevrátí), zůstane ze sekce
    // na home jen kotva -- prázdný blok „Recenze“ vypadá hůř než jeho nepřítomnost.
    // Na vlastní routě `/recenze` by ale prázdná kotva byla prázdná STRÁNKA, takže tam
    // se místo toho vykreslí placeholder. Teaser od stránky se pozná podle `limit`.
    if (isPending || items.length === 0) {
      if (limit) return <section id="recenze" />;

      return (
        <Section id="recenze">
          <Eyebrow lsi={lsi("sections", "reviews", "eyebrow")} />
          <Heading level={2} lsi={lsi("sections", "reviews", "heading")} />
          {isPending ? (
            <div className={Config.Css.css({ display: "grid", placeItems: "center", minBlockSize: 200 })}>
              <Uu5Elements.Pending size="l" />
            </div>
          ) : (
            // `empty` mezi kódy PlaceholderBoxu není; `message` je ze sady nejblíž --
            // recenze je zpráva od hosta. Soupis kódů je v CODE_MAP v placeholder-box.js.
            <Uu5Elements.PlaceholderBox
              code="message"
              header={<Lsi lsi={lsi("sections", "reviews", "emptyHeader")} />}
              info={<Lsi lsi={lsi("sections", "reviews", "emptyInfo")} />}
              className={Config.Css.css({ marginBlockStart: 28 })}
            />
          )}
        </Section>
      );
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

        {hasMore && (
          <Button
            variant="outline"
            href="recenze"
            className={Config.Css.css({ marginBlockStart: 28 })}
            lsi={lsi("sections", "reviews", "allButton")}
          />
        )}
      </Section>
    );
  },
});

export default Reviews;
