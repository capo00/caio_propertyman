import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Button from "../layout/button.jsx";
import Photo from "../photo.jsx";
import SpaceCard from "../space-card.jsx";
import spaces from "../../content/spaces.js";
import gallery from "../../content/gallery.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// "O roubence" na home: vlevo text + karty PROSTORŮ, vpravo koláž tří fotek.
// Na úzkých displejích jde koláž pod text.
//
// Karty vedou na detailní routy `/ubytovani/<code>`; mřížka vybavení, která tu byla dřív,
// se přestěhovala na rozcestník /ubytovani a do detailů prostorů (docs/proposal-routes.md).
// Tahle sekce je od té doby TEASER -- ukazuje, z čeho se roubenka skládá, ne co všechno má.
//
// Rozvržení dělá Uu5Elements.Grid. Zápis `{ xs: …, m: … }` znamená "od téhle šířky výš",
// protože getSizeValue padá na nejbližší menší definovanou hodnotu.
//
// Pozor na `sizePolicy="content"` (default): "podle šířky kontejneru" platí jen UVNITŘ
// `ContentSizeProvider`u, a ten v uu5g05-elements zakládá jenom tělo Modalu/Dialogu.
// Na téhle stránce žádný není, takže `Grid` měří VIEWPORT -- stejně jako `useScreenSize()`,
// který tu zmizel. Přínos je deklarativní zápis a méně kódu, ne jiné breakpointy.
// Změřeno, viz docs/component-tree.md § B.4.

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
    const spaceList = [...spaces].sort((a, b) => a.order - b.order);

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
                // Viz hero.jsx -- LSI texty jsou zalomené po větách, `\n` musí přežít.
                whiteSpace: "pre-line",
              })}
            >
              <Lsi lsi={lsi("property", "about")} />
            </p>

            {/* Bez fotek: vedle je koláž a dvě sady náhledů vedle sebe by se tloukly. */}
            <Uu5Elements.Grid templateColumns={{ xs: "1fr", m: "1fr 1fr" }} rowGap={12} columnGap={12}>
              {spaceList.map((space) => (
                <SpaceCard key={space.code} space={space} withPhoto={false} />
              ))}
            </Uu5Elements.Grid>

            <Button
              variant="outline"
              href="ubytovani"
              className={Config.Css.css({ marginBlockStart: 28 })}
              lsi={lsi("sections", "about", "allButton")}
            />
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
