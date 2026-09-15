import { createVisualComponent, useRoute, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Button from "../layout/button.jsx";
import GalleryGrid from "../gallery-grid.jsx";
import galleryContent from "../../content/gallery.js";
import spaces from "../../content/spaces.js";
import { lsi } from "../../lsi/import-lsi.js";

// Galerie. Tatáž sekce slouží ve dvou rolích:
//
//   <Gallery limit={6} />   -- teaser na home, pod mřížkou tlačítko na celou galerii
//   <Gallery />             -- routa /galerie, všechny fotky + filtr podle prostoru
//
// Mřížku i lightbox dodává components/gallery-grid.jsx (sdílené s detailem prostoru).
//
// Filtr se drží v PARAMETRU ROUTY (`?prostor=kuchyne`), ne ve stavu komponenty: filtrovaný
// pohled má jít poslat odkazem a přežít Zpět. `setRoute(route, params)` je jediné místo,
// kde se parametr nastavuje; URL je tak zdroj pravdy a překreslení se řeší samo.

const ALL = "vse";

const Gallery = createVisualComponent({
  uu5Tag: Config.TAG + "Gallery",

  render({ limit }) {
    const [route, setRoute] = useRoute();
    const all = [...galleryContent].sort((a, b) => a.order - b.order);

    // Filtr je jen na vlastní stránce; teaser na home ho nemá (šest fotek se nefiltruje).
    const activeSpace = limit ? undefined : route?.params?.prostor;
    // Neznámý kód v URL se chová jako "vše" -- ručně upravená adresa nemá dát prázdnou stránku.
    const spaceList = [...spaces].sort((a, b) => a.order - b.order);
    const isKnownSpace = spaceList.some((space) => space.code === activeSpace);

    const filtered = isKnownSpace ? all.filter((item) => item.space === activeSpace) : all;
    const items = limit ? filtered.slice(0, limit) : filtered;
    // Tlačítko dává smysl jen tehdy, když se opravdu něco nevešlo.
    const hasMore = items.length < all.length && limit;

    function setFilter(code) {
      setRoute("galerie", code === ALL ? {} : { prostor: code });
    }

    return (
      <Section variant="cream" id="galerie">
        <Eyebrow lsi={lsi("sections", "gallery", "eyebrow")} />
        <Heading level={2} lsi={lsi("sections", "gallery", "heading")} />

        {!limit && (
          // Filtr je řada tlačítek -- filtrování je akce, ne štítek, a tlačítko to dává
          // najevo i klávesnicí a čtečce. Aktivní volba je `highlighted`, ostatní `subdued`.
          //
          // Obal je `flex`, ne `Grid`: položky se musí ZALAMOVAT podle šířky a `Grid`
          // z uu5 to neumí (stejný důvod jako u řádku tlačítek v hero.jsx).
          //
          // Prostory bez jediné fotky se nenabízejí -- prázdný výsledek filtru vypadá
          // jako chyba webu.
          <div
            className={Config.Css.css({
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBlockStart: 28,
            })}
          >
            <Uu5Elements.Button
              size="s"
              borderRadius="full"
              colorScheme="primary"
              significance={isKnownSpace ? "subdued" : "highlighted"}
              onClick={() => setFilter(ALL)}
            >
              <Lsi lsi={lsi("sections", "gallery", "filterAll")} />
            </Uu5Elements.Button>

            {spaceList
              .filter((space) => all.some((item) => item.space === space.code))
              .map((space) => (
                <Uu5Elements.Button
                  key={space.code}
                  size="s"
                  borderRadius="full"
                  colorScheme="primary"
                  significance={activeSpace === space.code ? "highlighted" : "subdued"}
                  onClick={() => setFilter(space.code)}
                >
                  <Lsi lsi={lsi("spaces", space.code, "title")} />
                </Uu5Elements.Button>
              ))}
          </div>
        )}

        <GalleryGrid items={items} className={Config.Css.css({ marginBlockStart: 28 })} />

        {hasMore && (
          <Button
            variant="outline"
            href="galerie"
            className={Config.Css.css({ marginBlockStart: 28 })}
            lsi={lsi("sections", "gallery", "allButton")}
          />
        )}
      </Section>
    );
  },
});

export default Gallery;
