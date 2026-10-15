import { useLsi } from "uu5g05";
import Uu5Imaging from "uu5imagingg01";
import { lsi } from "../lsi/import-lsi.js";

// Jedna dlaždice galerie s lightboxem. Je ve vlastním souboru, protože ji gallery-grid.jsx
// načítá líně (`withLazy`) -- uu5imagingg01 tak není v index.js a stahuje se až s první
// galerií (docs/decisions.md, 2026-10-15). Staticky ji importovat nesmí nikdo
// (hlídá lazy-libs.test.js).
//
// Uu5Imaging.Image je z výroby obalený withLightboxButton -- všechny dlaždice se stejným
// stringem v `lightbox` tvoří JEDNU skupinu s průchodem (předchozí/další, fullscreen).

export default function GalleryImage({ item, lightbox }) {
  // useLsi tady -- Image bere `alt` jako obyčejný string, ne Lsi objekt.
  const caption = useLsi(lsi("gallery", item.code)) ?? "";

  return (
    <Uu5Imaging.Image
      src={item.src}
      thumbnailSrc={item.thumbnailSrc}
      alt={caption}
      aspectRatio="4/3"
      // Bez šířky má <img> do načtení fotky nulovou výšku (aspect-ratio z ničeho) a mřížka
      // po načtení poskočí; s `width` drží poměr 4:3 od začátku jako fallback v gallery-grid.
      width="100%"
      fit="cover"
      borderRadius="moderate"
      lightbox={lightbox}
      lightboxTrigger="image"
      // Image nemá prop `loading`, ale `elementAttrs` propustí až na <img> (přes
      // withLightboxButton a getAttrs v ImageView, ověřeno v dist uu5imagingg01 2.14.1).
      // Galerie je na home hluboko pod ohybem -- ať nesoupeří s fotkou hero.
      elementAttrs={{ loading: "lazy" }}
    />
  );
}
