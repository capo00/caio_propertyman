import { createVisualComponent, withLazy } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Photo from "./photo.jsx";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Mřížka fotek s lightboxem. Používá ji sekce galerie i detail prostoru, proto je to
// vlastní komponenta a ne kus uvnitř gallery.jsx.
//
// Dlaždice s lightboxem (gallery-image.jsx, Uu5Imaging.Image) se načítá LÍNĚ: uu5imagingg01
// tak není mezi závislostmi index.js a nebrzdí první vykreslení webu (docs/decisions.md,
// 2026-10-15). Než chunk dorazí, drží místo prázdná plocha ve stejném poměru 4:3.
//
// Všechny dlaždice se stejným stringem v `lightbox` tvoří JEDNU skupinu s průchodem
// (předchozí/další, fullscreen), takže odpadá vlastní `openIndex` state i Modal.
//
// `lightbox` je proto prop: na stránce galerie je skupina jedna přes všechny fotky
// ("roubenka"), na detailu prostoru je vlastní ("space-<kód>") -- jinak by šipky v lightboxu
// vedly i na fotky, které na té stránce vůbec nejsou.
//
// Dokud fotka nemá `src` (viz components/gallery/content.js), kreslí se dál naše `Photo` placeholder
// plocha -- ta se nemění a zmizí sama, až se doplní skutečné soubory.

const TileFallback = () => (
  <div
    className={Config.Css.css({
      aspectRatio: "4 / 3",
      backgroundColor: theme.color.muted,
      borderRadius: theme.radius,
    })}
  />
);

const GalleryImage = withLazy(() => import("./gallery-image.jsx"), <TileFallback />);

function GalleryItem({ item, lightbox }) {
  if (!item.src) {
    return <Photo src={null} tone={item.tone} ratio="4 / 3" caption={lsi("gallery", item.code)} />;
  }
  return <GalleryImage item={item} lightbox={lightbox} />;
}

const GalleryGrid = createVisualComponent({
  uu5Tag: Config.TAG + "GalleryGrid",

  render({ items, lightbox = "roubenka", minColumnSize = 240, className }) {
    if (!items?.length) return null;

    return (
      <Uu5Elements.Grid
        templateColumns={`repeat(auto-fill, minmax(${minColumnSize}px, 1fr))`}
        rowGap={12}
        columnGap={12}
        className={className}
      >
        {items.map((item) => (
          <GalleryItem key={item.code} item={item} lightbox={lightbox} />
        ))}
      </Uu5Elements.Grid>
    );
  },
});

export default GalleryGrid;
