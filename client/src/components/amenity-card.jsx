import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Card from "./layout/card.jsx";
import Heading from "./layout/heading.jsx";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Dlaždice vybavení: ikona + titulek v hlavičce, popis v těle. Dřív žila uvnitř
// sections/about.jsx; od rozpadu webu do rout ji potřebuje rozcestník /ubytovani
// i detail každého prostoru, tak je z ní vlastní komponenta.
//
// Titulek jde do slotu `header` Tilu, ne do obsahu; velikost mu dává GDS (story/heading/h5)
// a padding karty SpacingProvider z app.jsx.

const AmenityCard = createVisualComponent({
  uu5Tag: Config.TAG + "AmenityCard",

  render({ amenity }) {
    return (
      <Card
        header={
          <Uu5Elements.Grid templateColumns="auto 1fr" columnGap={12} alignItems="center">
            {/* Ikona je stencil z uu_gds_svgg01 (lokální); u položek, pro které
                v sadě nic není, se sloupec prostě nevykreslí. */}
            {amenity.icon && <Uu5Elements.Icon icon={amenity.icon} colorScheme="primary" />}
            <Heading level={3} lsi={lsi("amenities", amenity.code, "title")} />
          </Uu5Elements.Grid>
        }
      >
        <p
          className={Config.Css.css({
            ...theme.text.small,
            color: theme.color.mutedFg,
            margin: 0,
            whiteSpace: "pre-line",
          })}
        >
          <Lsi lsi={lsi("amenities", amenity.code, "description")} />
        </p>
      </Card>
    );
  },
});

export default AmenityCard;
