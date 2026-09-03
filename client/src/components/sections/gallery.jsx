import { createVisualComponent, useLsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Imaging from "uu5imagingg01";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Photo from "../photo.jsx";
import galleryContent from "../../content/gallery.js";
import { lsi } from "../../lsi/import-lsi.js";

// Galerie s lightboxem. Uu5Imaging.Image je z výroby obalený withLightboxButton -- všechny
// dlaždice se stejným stringem v `lightbox` tvoří jednu skupinu s průchodem (předchozí/další,
// fullscreen), takže odpadá vlastní `openIndex` state i Modal.
//
// Dokud fotka nemá `src` (viz content/gallery.js, TODO FOTKY), kreslí se dál naše `Photo`
// placeholder plocha -- ta se nemění a zmizí sama, až se doplní skutečné soubory.

function GalleryItem({ item }) {
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
      lightbox="roubenka"
      lightboxTrigger="image"
    />
  );
}

const Gallery = createVisualComponent({
  uu5Tag: Config.TAG + "Gallery",

  render() {
    const items = [...galleryContent].sort((a, b) => a.order - b.order);

    return (
      <Section variant="cream" id="galerie">
        <Eyebrow lsi={lsi("sections", "gallery", "eyebrow")} />
        <Heading level={2} lsi={lsi("sections", "gallery", "heading")} />

        <Uu5Elements.Grid
          templateColumns="repeat(auto-fill, minmax(240px, 1fr))"
          rowGap={12}
          columnGap={12}
          className={Config.Css.css({ marginBlockStart: 28 })}
        >
          {items.map((item) => (
            <GalleryItem key={item.code} item={item} />
          ))}
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default Gallery;
