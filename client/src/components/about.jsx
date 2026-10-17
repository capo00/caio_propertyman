import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Section from "./section.jsx";
import Eyebrow from "./eyebrow.jsx";
import Heading from "./heading.jsx";
import Button from "./button.jsx";
import Photo from "./photo.jsx";
import SpaceCard from "./accommodation/space-card.jsx";
import spaces from "./accommodation/content.js";
import gallery from "./gallery/content.js";
import { lsi } from "../lsi/import-lsi.js";
import { pagePath } from "../tools/page-language.js";

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
function CollagePhoto({ item, ratio, sizes }) {
  return (
    <Photo
      src={item.src}
      srcSet={item.srcSet}
      sizes={sizes}
      tone={item.tone}
      ratio={ratio}
      caption={lsi("gallery", item.code)}
    />
  );
}

// Šířka fotek koláže pro `sizes`: do `m` (768 px) je koláž pod textem přes celou šířku,
// pak pravý sloupec gridu -- polovina obsahu, nejvýš (1140 − 48) / 2 = 546 px.
const COLLAGE_WIDE_SIZES = "(max-width: 768px) 100vw, min(50vw, 546px)";
const COLLAGE_HALF_SIZES = "(max-width: 768px) 50vw, min(25vw, 273px)";

const About = createVisualComponent({
  uu5Tag: Config.TAG + "About",

  render() {
    // Koláž bere první tři fotky ze stejného zdroje jako galerie -- ať se to nerozejde.
    const collage = gallery.filter((item) => ["exterior", "diningArea", "atticBedroom"].includes(item.code));
    const spaceList = [...spaces].sort((a, b) => a.order - b.order).slice(0, 4);

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
              href={pagePath("accommodation")}
              className={Config.Css.css({ marginBlockStart: 28 })}
              lsi={lsi("sections", "about", "allButton")}
            />
          </div>

          {/* Koláž: jedna široká nahoře, dvě menší pod ní */}
          <Uu5Elements.Grid rowGap={12}>
            <CollagePhoto item={collage[0]} ratio="16 / 10" sizes={COLLAGE_WIDE_SIZES} />
            <Uu5Elements.Grid templateColumns="1fr 1fr" columnGap={12}>
              <CollagePhoto item={collage[1]} ratio="1 / 1" sizes={COLLAGE_HALF_SIZES} />
              <CollagePhoto item={collage[2]} ratio="1 / 1" sizes={COLLAGE_HALF_SIZES} />
            </Uu5Elements.Grid>
          </Uu5Elements.Grid>
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default About;
