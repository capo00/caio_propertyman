import { useEffect, useLsi, useRef } from "uu5g05";
import Uu5Imaging from "uu5imagingg01";
import Config from "../config/config.js";
import { lsi } from "../lsi/import-lsi.js";
import { useDarkMode } from "../tools/color-mode.js";

const { theme } = Config;

// Jedna dlaždice galerie s lightboxem. Je ve vlastním souboru, protože ji gallery-grid.jsx
// načítá líně (`withLazy`) -- uu5imagingg01 tak není v index.js a stahuje se až s první
// galerií (docs/decisions.md, 2026-10-15). Staticky ji importovat nesmí nikdo
// (hlídá lazy-libs.test.js).
//
// V tmavém režimu je dlaždice ztlumená (theme.surface.photoDarkFilter) přes NÁŠ obal, ne
// přes className na uu5 komponentě (uu5 se ladí propsy, docs/decisions.md). Lightbox se
// otvírá mimo obal, takže fotka v něm má plný jas.
//
// Uu5Imaging.Image je z výroby obalený withLightboxButton -- všechny dlaždice se stejným
// stringem v `lightbox` tvoří JEDNU skupinu s průchodem (předchozí/další, fullscreen).

// `autoOpen`: na dlaždici se kliklo dřív, než se tahle komponenta načetla (gallery-grid.jsx
// `PlainTile`) -- lightbox se otevře hned po připojení stejným klikem na fotku.
export default function GalleryImage({ item, lightbox, autoOpen }) {
  const ref = useRef();
  useEffect(() => {
    if (autoOpen) ref.current?.querySelector("img")?.click();
    // Jen při připojení.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // useLsi tady -- Image bere `alt` jako obyčejný string, ne Lsi objekt.
  const caption = useLsi(lsi("gallery", item.code)) ?? "";
  const dark = useDarkMode();

  const image = (
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

  // `display: grid`: `<img>` je jinak inline a pod ním zůstane mezera na účaří (7,6 px), takže by
  // dlaždice byla vyšší než dočasná v gallery-grid.jsx a po výměně by se mřížka posunula.
  return (
    <div ref={ref} className={Config.Css.css({ display: "grid", filter: dark ? theme.surface.photoDarkFilter : undefined })}>
      {image}
    </div>
  );
}
