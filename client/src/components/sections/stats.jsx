import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import property from "../../content/property.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Pruh se čtyřmi čísly pod hero. Velké číslo ve Fraunces, pod ním prostrkaný popisek.
// Na úzkých displejích se láme na dva sloupce, ne na jeden -- čtyři řádky pod sebou
// by rozbily rytmus stránky.

const Stats = createVisualComponent({
  uu5Tag: Config.TAG + "Stats",

  render() {
    return (
      <Section
        variant="cream"
        className={Config.Css.css({ paddingBlock: 32, borderBlockEnd: `1px solid ${theme.color.border}` })}
      >
        {/* <dl> zůstává kvůli sémantice (číslo = termín, popisek = definice); rozvržení
            dodá Grid přes `children` jako funkci, která vrátí spočítaný `style`. */}
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
                  {/* Čísla mají upoutat, ne uvádět sekci -- proto `expose/lead` (34/40),
                      sazba se přes `children` jako funkci nasadí na <dt>. Fraunces se
                      dodává stejně jako u nadpisů. */}
                  <Uu5Elements.Text category="expose" segment="default" type="lead">
                    {({ style }) => (
                      <dt className={Config.Css.css({ ...style, fontFamily: theme.font.display })}>
                        {stat.value}
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
                    <Lsi lsi={lsi("stats", stat.code)} />
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
