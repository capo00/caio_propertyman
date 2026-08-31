import { createVisualComponent, useState, useScreenSize, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import AvailabilityCalendar from "../reservation/availability-calendar.jsx";
import ReservationForm from "../reservation/reservation-form.jsx";
import property from "../../content/property.js";

const { theme } = Config;

// Rezervační sekce -- tmavý forest blok, vizuální těžiště stránky.
// Vlevo podmínky + kalendář obsazenosti, vpravo formulář v bílé kartě.

const Reservation = createVisualComponent({
  uu5Tag: Config.TAG + "Reservation",

  render() {
    const [screenSize] = useScreenSize();
    const isNarrow = screenSize === "xs" || screenSize === "s";
    // Po vytvoření rezervace (i po kolizi) překreslíme kalendář, ať sedí obsazenost.
    const [refreshKey, setRefreshKey] = useState(0);

    return (
      <Section variant="forest" id="rezervace">
        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
            gap: isNarrow ? 32 : 48,
            alignItems: "start",
          })}
        >
          <div>
            <Eyebrow onDark lsi={{ cs: "Rezervace" }} />
            <Heading level={2} onDark lsi={{ cs: "Nezávazná poptávka termínu" }} />
            <p
              className={Config.Css.css({
                ...theme.text.body,
                color: theme.color.onDark,
                opacity: 0.85,
                marginBlock: "16px 28px",
                maxWidth: 460,
              })}
            >
              <Lsi
                lsi={{
                  cs: "Napište nám termín a počet osob. Ozveme se do 24 hodin s potvrzením dostupnosti a přesnou cenou.",
                }}
              />
            </p>

            <ul
              className={Config.Css.css({
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gap: 10,
              })}
            >
              {property.reservationTerms.map((term, i) => (
                <li
                  key={i}
                  className={Config.Css.css({
                    ...theme.text.body,
                    fontSize: 15,
                    color: theme.color.onDark,
                    opacity: 0.8,
                  })}
                >
                  <Lsi lsi={term} />
                </li>
              ))}
            </ul>

            {/* Kalendář je na světlé kartě -- uu5 komponenta si nese vlastní barvy
                a na forest podkladu by byla nečitelná. */}
            <div
              className={Config.Css.css({
                backgroundColor: theme.color.card,
                // Sekce je forest a dědí světlý text. Bílá karta si barvu MUSÍ přepsat,
                // jinak je na ní všechno, co si barvu neurčí samo, krémové na bílé.
                color: theme.color.fg,
                borderRadius: theme.radius,
                padding: 16,
                marginBlockStart: 28,
              })}
            >
              <AvailabilityCalendar refreshKey={refreshKey} />
            </div>
          </div>

          <div
            className={Config.Css.css({
              backgroundColor: theme.color.card,
              color: theme.color.fg,
              borderRadius: theme.radius,
              padding: 24,
            })}
          >
            <ReservationForm onCreated={() => setRefreshKey((k) => k + 1)} />
          </div>
        </div>
      </Section>
    );
  },
});

export default Reservation;
