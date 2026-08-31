import { createVisualComponent, useState, useLsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Photo from "../photo.jsx";
import galleryContent from "../../content/gallery.js";
import importLsi, { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Galerie s lightboxem. Modal je jedno z mála míst, kde se vyplatí sáhnout po
// Uu5Elements -- dodává chování (zavření Escapem, focus trap, overlay), ne vzhled.

const Gallery = createVisualComponent({
  uu5Tag: Config.TAG + "Gallery",

  render() {
    const [openIndex, setOpenIndex] = useState(null);
    const items = [...galleryContent].sort((a, b) => a.order - b.order);
    const open = openIndex !== null ? items[openIndex] : null;
    // Hook musí běžet i se zavřeným lightboxem, proto ta prázdná cesta místo podmínky --
    // neexistující klíč vrátí undefined, což je pro hlavičku modalu v pořádku.
    const openCaption = useLsi(importLsi, ["gallery", open?.code ?? ""]);

    return (
      <Section variant="cream" id="galerie">
        <Eyebrow lsi={lsi("sections", "gallery", "eyebrow")} />
        <Heading level={2} lsi={lsi("sections", "gallery", "heading")} />

        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
            marginBlockStart: 28,
          })}
        >
          {items.map((item, index) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setOpenIndex(index)}
              className={Config.Css.css({
                padding: 0,
                border: "none",
                background: "none",
                cursor: "pointer",
                borderRadius: theme.radius,
                "&:hover": { opacity: 0.9 },
              })}
            >
              <Photo src={item.src} tone={item.tone} ratio="4 / 3" caption={lsi("gallery", item.code)} />
            </button>
          ))}
        </div>

        <Uu5Elements.Modal
          open={open !== null}
          onClose={() => setOpenIndex(null)}
          header={openCaption}
          width="l"
        >
          {open && <Photo src={open.src} tone={open.tone} ratio="3 / 2" caption={lsi("gallery", open.code)} />}
        </Uu5Elements.Modal>
      </Section>
    );
  },
});

export default Gallery;
