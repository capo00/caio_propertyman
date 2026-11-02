import {
  createVisualComponent,
  useState,
  useScreenSize,
  useAppBackground,
  withLazy,
  BackgroundProvider,
  Lsi,
} from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../section.jsx";
import Eyebrow from "../eyebrow.jsx";
import Heading from "../heading.jsx";
import AvailabilityCalendar from "../availability-calendar.jsx";
import { ForestProvider } from "../forest-context.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Podmínky vypsané u formuláře; texty jsou v LSI pod "reservationTerms.<code>".
const RESERVATION_TERMS = ["checkInOut", "deposit", "cancellation"];

// Formulář se načítá LÍNĚ: uu5g05-forms a uu5extrasg01 (reCAPTCHA) tak nejsou mezi
// závislostmi index.js a nebrzdí první vykreslení webu (docs/decisions.md, 2026-10-15).
// Staticky reservation-form.jsx importovat nesmí nikdo (hlídá lazy-libs.test.js).
//
// Než chunk dorazí, drží v kartě místo prázdná plocha s výškou formuláře (změřeno
// 2026-10-15: xs 767, s 725, od m 556 px obsahu karty), ať karta po načtení neposkočí.
const FORM_HEIGHT = { xs: 767, s: 725, m: 556 };

function FormFallback() {
  const [screenSize] = useScreenSize();
  const minBlockSize = FORM_HEIGHT[screenSize] ?? FORM_HEIGHT.m;
  return (
    <div className={Config.Css.css({ minBlockSize, display: "grid", placeItems: "center" })}>
      <Uu5Elements.Pending size="l" />
    </div>
  );
}

const ReservationForm = withLazy(() => import("./reservation-form.jsx"), <FormFallback />);

// Rezervační sekce -- tmavý forest blok, vizuální těžiště stránky.
// Vlevo podmínky + kalendář obsazenosti, vpravo formulář v kartě.

/**
 * Karta na forest bloku (kalendář, formulář). Má podklad stránky v daném režimu (`card`),
 * takže ruší tmavý kontext sekce: uu5 komponenty uvnitř musí vědět, že stojí na podkladu
 * aplikace (světlý režim `light`, tmavý `dark`), jinak by kreslily světlé barvy na kartu
 * ve světlém režimu. A není to forest -- tlačítka v ní zůstávají zelená (button.jsx).
 */
function ForestCard({ padding, marginBlockStart, children }) {
  const { background } = useAppBackground();
  return (
    <ForestProvider value={false}>
      <BackgroundProvider background={background}>
        <div
          className={Config.Css.css({
            backgroundColor: theme.color.card,
            // Sekce je forest a dědí světlý text. Karta si barvu MUSÍ přepsat, jinak je na
            // ní ve světlém režimu všechno, co si barvu neurčí samo, krémové na bílé.
            color: theme.color.fg,
            borderRadius: theme.radius,
            padding,
            marginBlockStart,
          })}
        >
          {children}
        </div>
      </BackgroundProvider>
    </ForestProvider>
  );
}

const Reservation = createVisualComponent({
  uu5Tag: Config.TAG + "Reservation",

  render() {
    // Po vytvoření rezervace (i po kolizi) překreslíme kalendář, ať sedí obsazenost.
    const [refreshKey, setRefreshKey] = useState(0);
    // Termín sdílený kalendářem obsazenosti a formulářem: výběr v kalendáři vyplní pole
    // formuláře a naopak (majitel 2026-10-10).
    const [stay, setStay] = useState(null);

    return (
      <Section variant="forest" id="rezervace">
        <Uu5Elements.Grid
          templateColumns={{ xs: "1fr", m: "1fr 1fr" }}
          columnGap={48}
          rowGap={32}
          alignItems="start"
        >
          <div>
            <Eyebrow onDark lsi={lsi("sections", "reservation", "eyebrow")} />
            <Heading level={2} lsi={lsi("sections", "reservation", "heading")} />
            <p
              className={Config.Css.css({
                ...theme.text.body,
                color: theme.color.onDark,
                opacity: 0.85,
                marginBlock: "16px 28px",
                maxWidth: 460,
              })}
            >
              <Lsi lsi={lsi("sections", "reservation", "perex")} />
            </p>

            {/* <ul> zůstává kvůli sémantice, rozvržení dodá Grid přes `children` jako funkci. */}
            <Uu5Elements.Grid rowGap={10}>
              {({ style }) => (
                <ul
                  className={Config.Css.css({
                    ...style,
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                  })}
                >
                  {RESERVATION_TERMS.map((code) => (
                    <li
                      key={code}
                      className={Config.Css.css({
                        ...theme.text.body,
                        fontSize: 15,
                        color: theme.color.onDark,
                        opacity: 0.8,
                      })}
                    >
                      <Lsi lsi={lsi("reservationTerms", code)} />
                    </li>
                  ))}
                </ul>
              )}
            </Uu5Elements.Grid>

            {/* Kalendář je na kartě -- uu5 komponenta si nese vlastní barvy a na forest
                podkladu by byla nečitelná. */}
            <ForestCard padding={16} marginBlockStart={28}>
              <AvailabilityCalendar refreshKey={refreshKey} value={stay} onSelect={setStay} />
            </ForestCard>
          </div>

          <ForestCard padding={24}>
            <ReservationForm
              stay={stay}
              onStayChange={setStay}
              onCreated={() => {
                setRefreshKey((k) => k + 1);
                setStay(null);
              }}
            />
          </ForestCard>
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default Reservation;
