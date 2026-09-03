import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Card from "../layout/card.jsx";
import Photo from "../photo.jsx";
import amenities from "../../content/amenities.js";
import gallery from "../../content/gallery.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// "O roubence": vlevo text + mřížka karet s vybavením, vpravo koláž tří fotek.
// Na úzkých displejích jde koláž pod text.
//
// Rozvržení dělá Uu5Elements.Grid. Zápis `{ xs: …, m: … }` znamená "od téhle šířky výš",
// protože getSizeValue padá na nejbližší menší definovanou hodnotu. Rozhoduje se podle
// ŠÍŘKY KONTEJNERU (`sizePolicy="content"` je default), ne podle viewportu -- proto tady
// zmizel `useScreenSize()`.

// Rozepsané props místo {...item}: v položce galerie je i `code` a `order`, které do DOM
// nepatří, a popisek se skládá z kódu až tady.
function CollagePhoto({ item, ratio }) {
  return <Photo src={item.src} tone={item.tone} ratio={ratio} caption={lsi("gallery", item.code)} />;
}

const About = createVisualComponent({
  uu5Tag: Config.TAG + "About",

  render() {
    // Koláž bere první tři fotky ze stejného zdroje jako galerie -- ať se to nerozejde.
    const collage = [...gallery].sort((a, b) => a.order - b.order).slice(0, 3);

    return (
      <Section id="o-roubence">
        <Uu5Elements.Grid
          templateColumns={{ xs: "1fr", m: "1fr 1fr" }}
          columnGap={48}
          rowGap={32}
          alignItems="start"
        >
          <div>
            <Eyebrow lsi={lsi("sections", "about", "eyebrow")} />
            <Heading level={2} lsi={lsi("sections", "about", "heading")} />
            <p
              className={Config.Css.css({
                ...theme.text.body,
                color: theme.color.mutedFg,
                marginBlock: "16px 28px",
              })}
            >
              <Lsi lsi={lsi("property", "about")} />
            </p>

            <Uu5Elements.Grid templateColumns={{ xs: "1fr", m: "1fr 1fr" }} rowGap={12} columnGap={12}>
              {/* Titulek dlaždice jde do slotu `header` Tilu, ne do obsahu; velikost mu dává
                  GDS (story/heading/h5) a padding karty SpacingProvider. */}
              {[...amenities]
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <Card
                    key={item.code}
                    header={
                      <Uu5Elements.Grid templateColumns="auto 1fr" columnGap={12} alignItems="center">
                        {/* Ikona je stencil z uu_gds_svgg01 (lokální); u položek, pro které
                            v sadě nic není, se sloupec prostě nevykreslí. */}
                        {item.icon && <Uu5Elements.Icon icon={item.icon} colorScheme="primary" />}
                        <Heading level={3} lsi={lsi("amenities", item.code, "title")} />
                      </Uu5Elements.Grid>
                    }
                  >
                    <p
                      className={Config.Css.css({
                        ...theme.text.small,
                        color: theme.color.mutedFg,
                        margin: 0,
                      })}
                    >
                      <Lsi lsi={lsi("amenities", item.code, "description")} />
                    </p>
                  </Card>
                ))}
            </Uu5Elements.Grid>
          </div>

          {/* Koláž: jedna široká nahoře, dvě menší pod ní */}
          <Uu5Elements.Grid rowGap={12}>
            <CollagePhoto item={collage[0]} ratio="16 / 10" />
            <Uu5Elements.Grid templateColumns="1fr 1fr" columnGap={12}>
              <CollagePhoto item={collage[1]} ratio="1 / 1" />
              <CollagePhoto item={collage[2]} ratio="1 / 1" />
            </Uu5Elements.Grid>
          </Uu5Elements.Grid>
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default About;
