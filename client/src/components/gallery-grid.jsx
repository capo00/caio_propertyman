import { createVisualComponent, useEffect, useLsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Photo from "./photo.jsx";
import { lsi } from "../lsi/import-lsi.js";
import { useDarkMode } from "../tools/color-mode.js";

const { theme } = Config;

// Mřížka fotek s lightboxem. Používá ji sekce galerie i detail prostoru, proto je to
// vlastní komponenta a ne kus uvnitř gallery.jsx.
//
// Dlaždice s lightboxem (gallery-image.jsx, Uu5Imaging.Image) se načítá LÍNĚ: uu5imagingg01
// tak není mezi závislostmi index.js a nebrzdí první vykreslení webu (docs/decisions.md,
// 2026-10-15). Než chunk dorazí, kreslí se dlaždice jako obyčejný `<img>` se stejnou fotkou
// (`thumbnailSrc`), stejným tvarem a zaoblením -- fotky se tak začnou stahovat hned, ne až po
// řetězu chunk → uu5imagingg01 → uu5g05-forms (na mobilu o ~2,8 s později,
// docs/proposal-loading-performance.md P2). Chunk se stáhne v klidu po vykreslení stránky
// (`requestIdleCallback`, Caio 2026-11-25: lightbox má být hned připravený); dlaždice se pak
// vymění za `Uu5Imaging.Image` se stejnou fotkou z cache, bez posunu. Klik před dotažením
// načtení urychlí a lightbox se otevře, jakmile je chunk tady.
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

// Načtení dlaždice s lightboxem: jednou pro celou stránku, výsledek se pamatuje (další mřížka
// nebo návrat na routu ho má hned).
let galleryImagePromise;
let GalleryImageLoaded = null;
function loadGalleryImage() {
  galleryImagePromise ??= import("./gallery-image.jsx").then((mod) => (GalleryImageLoaded = mod.default));
  return galleryImagePromise;
}

const whenIdle = (fn) =>
  typeof requestIdleCallback === "function" ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500);

/** `[GalleryImage | null, loadNow]` -- komponenta s lightboxem, jakmile je načtená. */
function useGalleryImage() {
  const [Comp, setComp] = useState(() => GalleryImageLoaded);
  useEffect(() => {
    if (Comp) return;
    let alive = true;
    whenIdle(() => loadGalleryImage().then((C) => alive && setComp(() => C)));
    return () => {
      alive = false;
    };
  }, [Comp]);
  const loadNow = () => loadGalleryImage().then((C) => setComp(() => C));
  return [Comp, loadNow];
}

// Dlaždice před načtením lightboxu: stejná fotka, poměr 4:3 a zaoblení 8 px jako
// `Uu5Imaging.Image` (`borderRadius="moderate"`), obal `display: grid` jako v gallery-image.jsx
// (bez mezery pod `<img>` na účaří).
const tileImgCss = Config.Css.css({
  display: "block",
  inlineSize: "100%",
  aspectRatio: "4 / 3",
  objectFit: "cover",
  borderRadius: 8,
  cursor: "pointer",
});

function PlainTile({ item, onOpen }) {
  const caption = useLsi(lsi("gallery", item.code)) ?? "";
  const dark = useDarkMode();
  return (
    <div className={Config.Css.css({ display: "grid", filter: dark ? theme.surface.photoDarkFilter : undefined })}>
      <img src={item.thumbnailSrc} alt={caption} loading="lazy" className={tileImgCss} onClick={onOpen} />
    </div>
  );
}

function GalleryItem({ item, lightbox, GalleryImage, openCode, onOpen }) {
  if (!item.src) {
    return <Photo src={null} tone={item.tone} ratio="4 / 3" caption={lsi("gallery", item.code)} />;
  }
  if (GalleryImage) return <GalleryImage item={item} lightbox={lightbox} autoOpen={openCode === item.code} />;
  return <PlainTile item={item} onOpen={() => onOpen(item.code)} />;
}

const GalleryGrid = createVisualComponent({
  uu5Tag: Config.TAG + "GalleryGrid",

  render({ items, lightbox = "roubenka", minColumnSize = 240, className }) {
    const [GalleryImage, loadNow] = useGalleryImage();
    // Klik na dlaždici před načtením lightboxu: zapamatovat fotku a načíst hned. Dlaždice
    // s lightboxem ji po připojení otevře (`autoOpen`); pak se zapomene, ať se lightbox
    // neotevře znovu při dalším připojení (filtr galerie).
    const [openCode, setOpenCode] = useState(null);
    const open = (code) => {
      setOpenCode(code);
      loadNow();
    };
    useEffect(() => {
      if (GalleryImage && openCode) setOpenCode(null);
    }, [GalleryImage, openCode]);

    if (!items?.length) return null;

    return (
      <Uu5Elements.Grid
        templateColumns={`repeat(auto-fill, minmax(${minColumnSize}px, 1fr))`}
        rowGap={12}
        columnGap={12}
        className={className}
      >
        {items.map((item) => (
          <GalleryItem
            key={item.code}
            item={item}
            lightbox={lightbox}
            GalleryImage={GalleryImage}
            openCode={openCode}
            onOpen={open}
          />
        ))}
      </Uu5Elements.Grid>
    );
  },
});

export default GalleryGrid;
