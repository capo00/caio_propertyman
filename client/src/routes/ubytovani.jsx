import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Section from "../components/layout/section.jsx";
import Eyebrow from "../components/layout/eyebrow.jsx";
import Heading from "../components/layout/heading.jsx";
import Button from "../components/layout/button.jsx";
import SpaceCard from "../components/space-card.jsx";
import AmenityCard from "../components/amenity-card.jsx";
import spaces from "../content/spaces.js";
import amenities from "../content/amenities.js";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Rozcestník ubytování: karta na každý prostor + to, co platí pro celý pobyt.
//
// Hloubka jde jen tam, kde je co ukázat -- stejně jako v předloze. Parkování, vytápění
// ani mazlíčci vlastní stránku nemají a nemají ani vlastní text: ptá se na ně sekce
// častých dotazů, takže se odsud jen odkazuje. Duplikovat je do druhého znění by znamenalo
// dvě verze téže informace, které se dřív nebo později rozejdou.

const Ubytovani = createVisualComponent({
  uu5Tag: Config.TAG + "Ubytovani",

  render() {
    const spaceList = [...spaces].sort((a, b) => a.order - b.order);
    // `space: null` = vybavení, které nepatří k jednomu prostoru, ale k celému pobytu
    // (Wi-Fi, samostatný check-in, obchod v obci). Viz content/amenities.js.
    const general = [...amenities].filter((item) => !item.space).sort((a, b) => a.order - b.order);

    return (
      <>
        <Section id="ubytovani">
          <Eyebrow lsi={lsi("pages", "ubytovani", "eyebrow")} />
          <Heading level={1} lsi={lsi("pages", "ubytovani", "heading")} />
          <p
            className={Config.Css.css({
              ...theme.text.body,
              color: theme.color.mutedFg,
              marginBlock: "16px 32px",
              maxWidth: 680,
              whiteSpace: "pre-line",
            })}
          >
            <Lsi lsi={lsi("pages", "ubytovani", "perex")} />
          </p>

          <Uu5Elements.Grid
            templateColumns={{ xs: "1fr", m: "1fr 1fr", l: "1fr 1fr 1fr" }}
            rowGap={16}
            columnGap={16}
          >
            {spaceList.map((space) => (
              <SpaceCard key={space.code} space={space} />
            ))}
          </Uu5Elements.Grid>
        </Section>

        <Section variant="cream" id="doplnujici-informace">
          <Eyebrow lsi={lsi("pages", "ubytovani", "generalEyebrow")} />
          <Heading level={2} lsi={lsi("pages", "ubytovani", "generalHeading")} />

          <Uu5Elements.Grid
            templateColumns="repeat(auto-fit, minmax(260px, 1fr))"
            rowGap={16}
            columnGap={16}
            className={Config.Css.css({ marginBlockStart: 28 })}
          >
            {general.map((amenity) => (
              <AmenityCard key={amenity.code} amenity={amenity} />
            ))}
          </Uu5Elements.Grid>

          <Button
            variant="outline"
            href="faq"
            className={Config.Css.css({ marginBlockStart: 28 })}
            lsi={lsi("pages", "ubytovani", "faqButton")}
          />
        </Section>
      </>
    );
  },
});

export default Ubytovani;
