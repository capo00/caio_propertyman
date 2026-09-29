import { createVisualComponent } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";

const { theme } = Config;

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
//
// `href` (majitel, 2026-09-29): karta jako celek proklikává, žádný odkaz uvnitř. Dřív se
// tomu schválně vyhýbala (Tile by potřeboval role/tabIndex a odkaz uvnitř by se s ním pral
// o fokus, viz starý komentář v space-card.jsx) -- teď, když uvnitř žádný odkaz není,
// odpadá i důvod. `Uu5Elements.Link` obaluje celý Tile: `withRouteLink`, kterým je Link
// obalený, sám pozná interní routu (klientská navigace) od absolutní URL (necha ji
// prohlížeči, i s `target="_blank"`), takže funguje pro obojí beze změny.
// `display: block` a hover zvednutí jsou JEN layout/interakce téhle karty, ne přebití
// vzhledu Tilu -- barvy, rámeček i rádius pořád dává GDS.
//
// `blockSize: "100%"` na obojím (na `<a>` i na Tilu uvnitř) -- bez toho zůstal `<a>`
// natažený přes celou výšku řádku mřížky (grid item se defaultně `stretch`uje), ale Tile
// uvnitř měl jen svou přirozenou výšku. U nižší dlaždice ve stejném řádku jako vyšší tak
// zbyl pod kartou neviditelný kus `<a>`, který pořád spouštěl hover (nahlášeno 2026-09-29,
// majitel: "hoveruje se celý height řádku"). Tile teď vyplňuje `<a>` celou, hover zóna
// = viditelná karta.
const LINK_CSS = {
  display: "block",
  blockSize: "100%",
  color: "inherit",
  textDecoration: "none",
  borderRadius: theme.radius,
  transition: "transform 150ms ease, box-shadow 150ms ease",
  "& > *": {
    blockSize: "100%",
  },
  "&:hover, &:focus-visible": {
    transform: "translateY(-2px)",
    boxShadow: "0 6px 16px rgba(30, 39, 21, 0.12)",
  },
};

const Card = createVisualComponent({
  uu5Tag: Config.TAG + "Card",

  render(props) {
    const { highlighted, header, href, target, children, ...restProps } = props;

    const tile = (
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

    if (!href) return tile;

    return (
      <Uu5Elements.Link href={href} target={target} className={Config.Css.css(LINK_CSS)}>
        {tile}
      </Uu5Elements.Link>
    );
  },
});

export default Card;
