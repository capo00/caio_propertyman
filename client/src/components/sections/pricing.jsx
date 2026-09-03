import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
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

        <Uu5Elements.Grid
          templateColumns="repeat(auto-fit, minmax(220px, 1fr))"
          rowGap={16}
          columnGap={16}
          className={Config.Css.css({ marginBlockStart: 28 })}
        >
          {pricing.nightTiers.map((tier) => (
            <Card
              key={tier.code}
              highlighted={tier.highlighted}
              // Práh nocí jde do hlavičky karty; odznak "nejvýhodnější" je Tag, ne ručně
              // stylovaný pill.
              header={
                <Uu5Elements.Grid rowGap={8} justifyItems="start">
                  {tier.highlighted && (
                    <Uu5Elements.Tag
                      colorScheme="primary"
                      significance="highlighted"
                      size="s"
                      borderRadius="full"
                    >
                      <Lsi lsi={lsi("sections", "pricing", "best")} />
                    </Uu5Elements.Tag>
                  )}
                  <Heading level={3} lsi={lsi("pricing", "nightTiers", tier.code)} />
                </Uu5Elements.Grid>
              }
            >
              <Uu5Elements.Grid rowGap={10}>
                {pricing.guestTiers.map((guestTier) => (
                  <div key={guestTier.code}>
                    {/* Cena je expresivní údaj, na který se v ceníku kouká první -- proto
                        `expose/broad`. Částku formátuje Uu5Elements.Number podle jazyka
                        aplikace: odpadá `toLocaleString("cs-CZ")` i natvrdo psané "Kč".
                        `maxDecimalDigits={0}` je povinné, jinak Intl u měny přidá haléře. */}
                    <Uu5Elements.Text category="expose" segment="default" type="broad">
                      <Uu5Elements.Number
                        value={pricing.rates[guestTier.code][tier.minNights]}
                        currency="CZK"
                        currencyFormat="symbol"
                        maxDecimalDigits={0}
                      />
                      <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="dim">
                        <span className={Config.Css.css({ marginInlineStart: 6 })}>
                          <Lsi lsi={lsi("sections", "pricing", "perNight")} />
                        </span>
                      </Uu5Elements.Text>
                    </Uu5Elements.Text>
                    <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="dim">
                      <div>
                        <Lsi lsi={lsi("pricing", "guestTiers", guestTier.code)} />
                      </div>
                    </Uu5Elements.Text>
                  </div>
                ))}
              </Uu5Elements.Grid>
            </Card>
          ))}
        </Uu5Elements.Grid>

        {/* Poznámky zůstávají <ul> kvůli sémantice; rozvržení dodá Grid přes `children`
            jako funkci -- ta vrátí spočítaný `style`, který si nasadíme na vlastní element. */}
        <Uu5Elements.Grid rowGap={6}>
          {({ style }) => (
            <ul
              className={Config.Css.css({
                ...style,
                ...theme.text.small,
                color: theme.color.mutedFg,
                marginBlockStart: 24,
                paddingInlineStart: 20,
              })}
            >
              {pricing.notes.map((code) => (
                <li key={code}>
                  <Lsi lsi={lsi("pricing", "notes", code)} />
                </li>
              ))}
            </ul>
          )}
        </Uu5Elements.Grid>

        {/*
          Pojistka proti nedopatření: dokud ceník není schválený, je to na stránce vidět.
          Server tytéž neschválené sazby v produkci vůbec nespočítá (503), takže bez
          tohohle by se web a API rozcházely potichu.
        */}
        {!pricing.approved && (
          <Uu5Elements.HighlightedBox
            colorScheme="warning"
            icon="uugds-alert"
            borderRadius="moderate"
            className={Config.Css.css({ marginBlockStart: 20 })}
          >
            <Lsi lsi={lsi("sections", "pricing", "draftWarning")} />
          </Uu5Elements.HighlightedBox>
        )}
      </Section>
    );
  },
});

export default Pricing;
