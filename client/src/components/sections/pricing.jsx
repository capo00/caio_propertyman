import { createVisualComponent, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import pricing from "../../content/pricing.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Ceník: jedna karta na každý práh délky pobytu, uvnitř cena pro obě skupiny osob.
// Předloha měla tři karty se sezónami; model se mezitím změnil na "čím víc nocí, tím
// levněji" + dělení podle počtu osob, takže karty odpovídají prahům délky.

function formatPrice(value) {
  return `${value.toLocaleString("cs-CZ")} Kč`;
}

const Pricing = createVisualComponent({
  uu5Tag: Config.TAG + "Pricing",

  render() {
    return (
      <Section id="cenik">
        <Eyebrow lsi={lsi("sections", "pricing", "eyebrow")} />
        <Heading level={2} lsi={lsi("sections", "pricing", "heading")} />
        <p
          className={Config.Css.css({
            ...theme.text.body,
            color: theme.color.mutedFg,
            marginBlock: "16px 0",
            maxWidth: 620,
          })}
        >
          <Lsi lsi={lsi("sections", "pricing", "perex")} />
        </p>

        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBlockStart: 28,
          })}
        >
          {pricing.nightTiers.map((tier) => (
            <Card key={tier.code} highlighted={tier.highlighted}>
              {tier.highlighted && (
                <span
                  className={Config.Css.css({
                    ...theme.text.eyebrow,
                    display: "inline-block",
                    backgroundColor: theme.color.forest,
                    color: theme.color.onDark,
                    borderRadius: 999,
                    paddingBlock: 5,
                    paddingInline: 12,
                    marginBlockEnd: 12,
                  })}
                >
                  <Lsi lsi={lsi("sections", "pricing", "best")} />
                </span>
              )}

              <Heading level={3} lsi={lsi("pricing", "nightTiers", tier.code)} />

              <div className={Config.Css.css({ marginBlockStart: 16, display: "grid", gap: 10 })}>
                {pricing.guestTiers.map((guestTier) => (
                  <div key={guestTier.code}>
                    <div
                      className={Config.Css.css({
                        ...theme.text.h3,
                        fontSize: 26,
                        color: theme.color.fg,
                      })}
                    >
                      {formatPrice(pricing.rates[guestTier.code][tier.minNights])}
                      <span
                        className={Config.Css.css({
                          ...theme.text.small,
                          color: theme.color.mutedFg,
                          marginInlineStart: 6,
                          fontFamily: theme.font.body,
                        })}
                      >
                        <Lsi lsi={lsi("sections", "pricing", "perNight")} />
                      </span>
                    </div>
                    <div className={Config.Css.css({ ...theme.text.small, color: theme.color.mutedFg })}>
                      <Lsi lsi={lsi("pricing", "guestTiers", guestTier.code)} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <ul
          className={Config.Css.css({
            ...theme.text.small,
            color: theme.color.mutedFg,
            marginBlockStart: 24,
            paddingInlineStart: 20,
            display: "grid",
            gap: 6,
          })}
        >
          {pricing.notes.map((code) => (
            <li key={code}>
              <Lsi lsi={lsi("pricing", "notes", code)} />
            </li>
          ))}
        </ul>

        {/*
          Pojistka proti nedopatření: dokud ceník není schválený, je to na stránce vidět.
          Server tytéž neschválené sazby v produkci vůbec nespočítá (503), takže bez
          tohohle by se web a API rozcházely potichu.
        */}
        {!pricing.approved && (
          <p
            className={Config.Css.css({
              ...theme.text.small,
              marginBlockStart: 20,
              padding: 12,
              borderRadius: theme.radius,
              border: `1px dashed ${theme.color.accent}`,
              color: theme.color.accent,
            })}
          >
            <Lsi lsi={lsi("sections", "pricing", "draftWarning")} />
          </p>
        )}
      </Section>
    );
  },
});

export default Pricing;
