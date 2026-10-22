import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Section from "./section.jsx";
import property from "../config/property.js";
import attractions from "./surroundings/content.js";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Strip with four numbers below the hero. A large number in Fraunces, a letter-spaced label below it.
// On narrow displays it wraps into two columns, not one -- four rows stacked on top of each other
// would break the page rhythm.

/** Distance of a place from the surroundings page, formatted like on its card. */
function Distance({ code }) {
  const km = attractions.find((item) => item.code === code)?.distanceKm;
  return <Uu5Elements.Number value={km} unit="kilometer" unitFormat="short" />;
}

const Stats = createVisualComponent({
  uu5Tag: Config.TAG + "Stats",

  render() {
    return (
      <Section
        variant="cream"
        className={Config.Css.css({ paddingBlock: 32, borderBlockEnd: `1px solid ${theme.color.border}` })}
      >
        {/* <dl> stays for semantics (number = term, label = definition); the layout
            is supplied by Grid via `children` as a function that returns the computed `style`. */}
        <Uu5Elements.Grid templateColumns="repeat(auto-fit, minmax(140px, 1fr))" rowGap={24} columnGap={24}>
          {({ style }) => (
            <dl
              className={Config.Css.css({
                ...style,
                margin: 0,
                textAlign: "center",
              })}
            >
              {property.stats.map((stat) => (
                <div key={stat.code}>
                  {/* The numbers are meant to catch the eye, not introduce a section -- hence `expose/lead` (34/40),
                      the typesetting is applied to <dt> via `children` as a function. Fraunces is
                      supplied the same way as for headings. */}
                  <Uu5Elements.Text category="expose" segment="default" type="lead">
                    {({ style }) => (
                      <dt className={Config.Css.css({ ...style, fontFamily: theme.font.display })}>
                        {stat.attraction ? <Distance code={stat.attraction} /> : stat.value}
                      </dt>
                    )}
                  </Uu5Elements.Text>
                  <dd
                    className={Config.Css.css({
                      ...theme.text.eyebrow,
                      margin: 0,
                      marginBlockStart: 6,
                      color: theme.color.mutedFg,
                    })}
                  >
                    {stat.label ? stat.label : <Lsi lsi={lsi("stats", stat.code)} />}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default Stats;
