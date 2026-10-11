import { createVisualComponent, useDataObject, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Calls from "../../calls.js";
import Section from "../section.jsx";
import Eyebrow from "../eyebrow.jsx";
import Heading from "../heading.jsx";
import Card from "../card.jsx";
import Button from "../button.jsx";
import { notes } from "./content.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Ceník: dvě karty, víkend a týden, nic víc (majitel, 2026-10-12). V kartě je výsledná cena
// za CELÝ pobyt; host nevidí, jak se skládá. Cenu jiného termínu spočítá formulář rezervace.
//
// Částky nejsou v klientovi: bere je z `price/list`, který je počítá stejnou funkcí jako
// cenu rezervace -- web a potvrzení se tak nemůžou rozejít.
//
// `teaser` je varianta pro home: tytéž dvě karty a odkaz na celý ceník, bez poznámek
// a kalendáře (docs/proposal-routes.md § 4).

const KIND_LIST = ["weekend", "week"];

// Částky sází Uu5Elements.Number podle jazyka aplikace. `maxDecimalDigits={0}` je povinné,
// jinak Intl u měny přidá haléře.
function Price({ value }) {
  return <Uu5Elements.Number value={value} currency="CZK" currencyFormat="symbol" maxDecimalDigits={0} />;
}

function PriceCard({ kind, row }) {
  return (
    <Card
      header={
        <Uu5Elements.Grid rowGap={4} justifyItems="start">
          <Heading level={3} lsi={lsi("pricing", "kinds", kind, "title")} />
          <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="dim">
            <Lsi lsi={lsi("pricing", "kinds", kind, "info")} />
          </Uu5Elements.Text>
        </Uu5Elements.Grid>
      }
    >
      {/* Cena je údaj, na který se v ceníku kouká první -- proto `expose/broad`. */}
      <Uu5Elements.Text category="expose" segment="default" type="broad">
        <Price value={row.totalPrice} />
      </Uu5Elements.Text>
    </Card>
  );
}

function PriceCards({ data, className }) {
  return (
    <Uu5Elements.Grid
      templateColumns="repeat(auto-fit, minmax(220px, 280px))"
      rowGap={16}
      columnGap={16}
      className={className}
    >
      {KIND_LIST.map((kind) => (
        <PriceCard key={kind} kind={kind} row={data[kind]} />
      ))}
    </Uu5Elements.Grid>
  );
}

const Pricing = createVisualComponent({
  uu5Tag: Config.TAG + "Pricing",

  render({ teaser }) {
    const { state, data } = useDataObject({ handlerMap: { load: () => Calls.listPrices() } });
    const isPending = state === "pending" || state === "pendingNoData";

    if (teaser) {
      return (
        <Section id="cenik">
          <Eyebrow lsi={lsi("sections", "pricing", "eyebrow")} />
          <Heading level={2} lsi={lsi("sections", "pricing", "heading")} />

          <Uu5Elements.Grid rowGap={16} justifyItems="start" className={Config.Css.css({ marginBlockStart: 16 })}>
            {/* Bez dat (načítání, server nedostupný) se karty vynechají -- radši žádná
                částka než nula. Odkaz na celý ceník zůstává. */}
            {/* `justifySelf: stretch` -- okolní Grid má `justifyItems="start"`, ve kterém by se
                mřížka karet smrskla na šířku jedné karty a karty by šly pod sebe. */}
            {data && <PriceCards data={data} className={Config.Css.css({ justifySelf: "stretch" })} />}

            <p
              className={Config.Css.css({
                ...theme.text.body,
                color: theme.color.mutedFg,
                margin: 0,
                maxWidth: 620,
              })}
            >
              <Lsi lsi={lsi("sections", "pricing", "perex")} />
            </p>

            <Button variant="outline" href="cenik" lsi={lsi("sections", "pricing", "allButton")} />
          </Uu5Elements.Grid>
        </Section>
      );
    }

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

        {isPending ? (
          <div className={Config.Css.css({ display: "grid", placeItems: "center", minBlockSize: 200 })}>
            <Uu5Elements.Pending size="l" />
          </div>
        ) : data ? (
          <PriceCards data={data} className={Config.Css.css({ marginBlockStart: 28 })} />
        ) : (
          <Uu5Elements.HighlightedBox
            colorScheme="warning"
            icon="uugds-alert"
            borderRadius="moderate"
            className={Config.Css.css({ marginBlockStart: 28 })}
          >
            <Lsi lsi={lsi("sections", "pricing", "loadError")} />
          </Uu5Elements.HighlightedBox>
        )}

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
              {notes.map((code) => (
                <li key={code}>
                  <Lsi lsi={lsi("pricing", "notes", code)} />
                </li>
              ))}
            </ul>
          )}
        </Uu5Elements.Grid>

        {/*
          Pojistka proti nedopatření: dokud ceník není schválený (config.pricing.approved
          na serveru), je to na stránce vidět.
        */}
        {data?.provisional && (
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
