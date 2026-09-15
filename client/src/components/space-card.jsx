import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Card from "./layout/card.jsx";
import Heading from "./layout/heading.jsx";
import Photo from "./photo.jsx";
import { getSpaceCover } from "../space-photos.js";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Teaser prostoru: náhled, název s ikonou, perex a odkaz na detail.
// Je to jedna komponenta pro home i pro rozcestník /ubytovani -- liší se jen `withPhoto`,
// protože na home je vedle karet ještě fotokoláž a druhá sada fotek by se s ní tloukla.
//
// Odkaz je Uu5Elements.Link s routou v `href`. Tím zůstane v DOM skutečné <a> (SEO,
// otevření v novém panelu) a navigaci odbaví withRouteLink klientsky, bez reloadu.
// Celá karta klikací není schválně: Tile by musel dostat role/tabIndex a odkaz uvnitř
// by se s ním pral o fokus.

const SpaceCard = createVisualComponent({
  uu5Tag: Config.TAG + "SpaceCard",

  render({ space, withPhoto = true }) {
    const cover = getSpaceCover(space);
    const route = `ubytovani/${space.code}`;

    return (
      <Card
        header={
          <Uu5Elements.Grid templateColumns="auto 1fr" columnGap={12} alignItems="center">
            {space.icon && <Uu5Elements.Icon icon={space.icon} colorScheme="primary" />}
            <Heading level={3} lsi={lsi("spaces", space.code, "title")} />
          </Uu5Elements.Grid>
        }
      >
        <Uu5Elements.Grid rowGap={12}>
          {withPhoto && (
            // Dokud prostor fotku nemá, drží kompozici tónovaná plocha -- stejně jako
            // v galerii, viz components/photo.jsx.
            <Photo
              src={cover?.src ?? null}
              tone={cover?.tone ?? space.placeholderTone}
              ratio="4 / 3"
              caption={cover ? lsi("gallery", cover.code) : lsi("spaces", space.code, "title")}
            />
          )}

          <p
            className={Config.Css.css({
              ...theme.text.small,
              color: theme.color.mutedFg,
              margin: 0,
              whiteSpace: "pre-line",
            })}
          >
            <Lsi lsi={lsi("spaces", space.code, "perex")} />
          </p>

          <Uu5Elements.Link href={route} colorScheme="primary" underline="onHover">
            <Lsi lsi={lsi("common", "spaceDetail")} />
          </Uu5Elements.Link>
        </Uu5Elements.Grid>
      </Card>
    );
  },
});

export default SpaceCard;
