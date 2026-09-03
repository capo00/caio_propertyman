import { createVisualComponent } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";

// Karta webu = Uu5Elements.Tile nastavený propsy. Žádné přebíjení.
//
// `significance="subdued"` je z GDS jediná varianta, která dává PLOCHU S LINKOU A BEZ STÍNU
// (bílý podklad + 1px rámeček). `common` by přidalo `elevationGround`, tedy stín, který
// předloha nikde nemá; `distinct` je plocha bez rámečku.
//
// `highlighted` (zvýrazněná karta v ceníku) NENÍ `significance="highlighted"` -- to je v GDS
// plná tmavá plocha se světlým textem. Zvýraznění dělá barevné schéma: `primary` + `distinct`
// je světle zelený podklad, tedy odlišení barvou plochy místo silnějšího rámečku.
//
// `borderRadius="moderate"` = 8 px, což je přesně `theme.radius`.
// Padding dává `SpacingProvider type="loose"` z app.jsx (16 px), ne className.
//
// `header` je slot Tilu: titulek se sází v samostatné části karty s vlastním paddingem.
// Předává se jako už nastylovaný node (`Heading`), protože Tile hlavičku sází GDS typografií.

const Card = createVisualComponent({
  uu5Tag: Config.TAG + "Card",

  render(props) {
    const { highlighted, header, children, ...restProps } = props;

    return (
      <Uu5Elements.Tile
        {...restProps}
        header={header}
        colorScheme={highlighted ? "primary" : "building"}
        significance={highlighted ? "distinct" : "subdued"}
        borderRadius="moderate"
      >
        {children}
      </Uu5Elements.Tile>
    );
  },
});

export default Card;
