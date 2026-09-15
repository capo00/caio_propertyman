import { createVisualComponent, useLsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Imaging from "uu5imagingg01";
import Config from "../config/config.js";
import Photo from "./photo.jsx";
import { lsi } from "../lsi/import-lsi.js";

// Mřížka fotek s lightboxem. Používá ji sekce galerie i detail prostoru, proto je to
// vlastní komponenta a ne kus uvnitř gallery.jsx.
//
// Uu5Imaging.Image je z výroby obalený withLightboxButton -- všechny dlaždice se stejným
// stringem v `lightbox` tvoří JEDNU skupinu s průchodem (předchozí/další, fullscreen),
// takže odpadá vlastní `openIndex` state i Modal.
//
// `lightbox` je proto prop: na stránce galerie je skupina jedna přes všechny fotky
// ("roubenka"), na detailu prostoru je vlastní ("space-<kód>") -- jinak by šipky v lightboxu
// vedly i na fotky, které na té stránce vůbec nejsou.
//
// Dokud fotka nemá `src` (viz content/gallery.js), kreslí se dál naše `Photo` placeholder
// plocha -- ta se nemění a zmizí sama, až se doplní skutečné soubory.

function GalleryItem({ item, lightbox }) {
  // useLsi tady, ne v Photo -- Image bere `alt` jako obyčejný string, ne Lsi objekt.
  const caption = useLsi(lsi("gallery", item.code)) ?? "";

  if (!item.src) {
    return <Photo src={null} tone={item.tone} ratio="4 / 3" caption={lsi("gallery", item.code)} />;
  }

  return (
    <Uu5Imaging.Image
      src={item.src}
      thumbnailSrc={item.thumbnailSrc}
      alt={caption}
      aspectRatio="4/3"
      fit="cover"
      borderRadius="moderate"
      lightbox={lightbox}
      lightboxTrigger="image"
    />
  );
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
