import { createVisualComponent, Lsi } from "uu5g05";
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
        <dl
          className={Config.Css.css({
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 24,
            textAlign: "center",
          })}
        >
          {property.stats.map((stat) => (
            <div key={stat.code}>
              <dt
                className={Config.Css.css({
                  ...theme.text.h2,
                  fontSize: 34,
                  lineHeight: "40px",
                  color: theme.color.fg,
                })}
              >
                {stat.value}
              </dt>
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
      </Section>
    );
  },
});

export default Stats;
