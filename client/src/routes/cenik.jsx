import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Section from "../components/layout/section.jsx";
import Eyebrow from "../components/layout/eyebrow.jsx";
import Heading from "../components/layout/heading.jsx";
import Button from "../components/layout/button.jsx";
import Pricing from "../components/sections/pricing.jsx";
import AvailabilityCalendar from "../components/reservation/availability-calendar.jsx";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Stránka ceníku: celá tabulka sazeb (sekce Pricing) a pod ní kalendář obsazenosti.
//
// Kalendář je tu záměrně DRUHÝ a jen na koukání -- host, který si prohlíží ceny, obvykle
// hned potřebuje vědět, jestli je termín volný. Zadává se pořád na /rezervace, kam odsud
// vede tlačítko; druhý formulář by znamenal dvě místa, kde se poptávka odesílá.
//
// Kotva `#kalendar` drží odkazy zvenčí (předloha ji má taky). Menu na ni nemíří: položka
// menu neumí routu a kotvu zároveň -- `setRoute` by "cenik#kalendar" vzal jako celou routu
// (viz content/nav.js).

const Cenik = createVisualComponent({
  uu5Tag: Config.TAG + "Cenik",

  render() {
    return (
      <>
        <Pricing />

        <Section variant="cream" id="kalendar">
          <Eyebrow lsi={lsi("pages", "cenik", "calendarEyebrow")} />
          <Heading level={2} lsi={lsi("pages", "cenik", "calendarHeading")} />

          <Uu5Elements.Grid
            templateColumns={{ xs: "1fr", m: "auto 1fr" }}
            columnGap={48}
            rowGap={24}
            alignItems="start"
            className={Config.Css.css({ marginBlockStart: 28 })}
          >
            <div
              className={Config.Css.css({
                backgroundColor: theme.color.card,
                borderRadius: theme.radius,
                border: `1px solid ${theme.color.border}`,
                padding: 16,
              })}
            >
              <AvailabilityCalendar />
            </div>

            <div>
              <p
                className={Config.Css.css({
                  ...theme.text.body,
                  color: theme.color.mutedFg,
                  marginBlock: "0 24px",
                  maxWidth: 460,
                })}
              >
                <Lsi lsi={lsi("pages", "cenik", "calendarPerex")} />
              </p>

              <Button href="rezervace" lsi={lsi("pages", "cenik", "reservationButton")} />
            </div>
          </Uu5Elements.Grid>
        </Section>
      </>
    );
  },
});

export default Cenik;
