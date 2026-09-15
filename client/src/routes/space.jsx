import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import Section from "../components/layout/section.jsx";
import Eyebrow from "../components/layout/eyebrow.jsx";
import Heading from "../components/layout/heading.jsx";
import Button from "../components/layout/button.jsx";
import Photo from "../components/photo.jsx";
import GalleryGrid from "../components/gallery-grid.jsx";
import AmenityCard from "../components/amenity-card.jsx";
import NotFound from "./not-found.jsx";
import spaces from "../content/spaces.js";
import amenities from "../content/amenities.js";
import { getSpacePhotos } from "../space-photos.js";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Detail prostoru: /ubytovani/<code>. Jedna šablona pro všechny prostory -- kdyby byl každý
// skládaný ručně, rozjelo by se to při prvním přidání dalšího.
//
// Routy sem generuje router.jsx ze stejného seznamu, ze kterého se tu čte prostor, takže
// `code`, které neexistuje, sem nemá jak dorazit. Pojistka na 404 je proto pro případ,
// že by se prostor ze seznamu odstranil, ale odkaz na něj někde zůstal.
//
// Lightbox má vlastní skupinu na každý prostor (`space-<kód>`) -- se sdílenou skupinou
// "roubenka" by šipky v lightboxu vedly i na fotky, které na téhle stránce vůbec nejsou.

/** Sousedé v pořadí prostorů -- odkazy "předchozí/další" na konci stránky. */
function getNeighbours(list, index) {
  return { prev: list[index - 1] ?? null, next: list[index + 1] ?? null };
}

const Space = createVisualComponent({
  uu5Tag: Config.TAG + "Space",

  render({ code }) {
    const list = [...spaces].sort((a, b) => a.order - b.order);
    const index = list.findIndex((item) => item.code === code);
    const space = list[index];

    if (!space) return <NotFound />;

    const photos = getSpacePhotos(space);
    const spaceAmenities = [...amenities]
      .filter((item) => space.amenityCodes?.includes(item.code))
      .sort((a, b) => a.order - b.order);
    const units = [...(space.units ?? [])].sort((a, b) => a.order - b.order);
    const { prev, next } = getNeighbours(list, index);

    return (
      <>
        <Section id={`prostor-${space.code}`}>
          <Eyebrow lsi={lsi("pages", "space", "eyebrow")} />
          <Heading level={1} lsi={lsi("spaces", space.code, "title")} />
          <p
            className={Config.Css.css({
              ...theme.text.body,
              color: theme.color.mutedFg,
              marginBlock: "16px 28px",
              maxWidth: 680,
              whiteSpace: "pre-line",
            })}
          >
            <Lsi lsi={lsi("spaces", space.code, "perex")} />
          </p>

          {photos.length > 0 ? (
            <GalleryGrid items={photos} lightbox={`space-${space.code}`} minColumnSize={280} />
          ) : (
            // Dokud prostor fotky nemá, drží kompozici tónovaná plocha -- ať je vidět,
            // že tady fotky teprve budou, místo prázdného místa. Šířka je omezená na šířku
            // textového sloupce: přes celou stránku je z placeholderu pruh, který přebije
            // i nadpis, a to je na nehotový obsah moc.
            <div className={Config.Css.css({ maxWidth: 680 })}>
              <Photo
                src={null}
                tone={space.placeholderTone}
                ratio="16 / 9"
                caption={lsi("spaces", space.code, "title")}
              />
            </div>
          )}

          <p
            className={Config.Css.css({
              ...theme.text.body,
              color: theme.color.fg,
              marginBlock: "32px 0",
              maxWidth: 680,
              whiteSpace: "pre-line",
            })}
          >
            <Lsi lsi={lsi("spaces", space.code, "description")} />
          </p>
        </Section>

        {units.length > 0 && (
          <Section variant="cream">
            <Heading level={2} lsi={lsi("pages", "space", "unitsHeading")} />

            <Uu5Elements.Grid
              templateColumns="repeat(auto-fit, minmax(260px, 1fr))"
              rowGap={16}
              columnGap={16}
              className={Config.Css.css({ marginBlockStart: 28 })}
            >
              {units.map((unit) => (
                <Uu5Elements.Tile
                  key={unit.code}
                  colorScheme="building"
                  significance="subdued"
                  borderRadius="moderate"
                  header={
                    <Uu5Elements.Grid templateColumns="1fr auto" columnGap={12} alignItems="baseline">
                      <Heading level={3} lsi={lsi("spaces", space.code, "units", unit.code, "title")} />
                      {/* Počet lůžek jako ŠTÍTEK s číslem, ne věta: čeština by u "2 lůžka"
                          a "5 lůžek" potřebovala skloňování a LSI v uu5g05 plurály neumí
                          (ověřeno v uu5g05 1.50.8). Popisek proto zůstává v základním tvaru
                          a číslo je vedle něj, stejně jako ve sloupcích adminu. */}
                      <span
                        className={Config.Css.css({
                          ...theme.text.eyebrow,
                          color: theme.color.accent,
                          whiteSpace: "nowrap",
                        })}
                      >
                        <Lsi lsi={lsi("pages", "space", "bedsLabel")} />{" "}
                        <Uu5Elements.Number value={unit.beds} />
                      </span>
                    </Uu5Elements.Grid>
                  }
                >
                  <p
                    className={Config.Css.css({
                      ...theme.text.small,
                      color: theme.color.mutedFg,
                      margin: 0,
                      whiteSpace: "pre-line",
                    })}
                  >
                    <Lsi lsi={lsi("spaces", space.code, "units", unit.code, "description")} />
                  </p>
                </Uu5Elements.Tile>
              ))}
            </Uu5Elements.Grid>
          </Section>
        )}

        {spaceAmenities.length > 0 && (
          <Section>
            <Heading level={2} lsi={lsi("pages", "space", "amenitiesHeading")} />

            <Uu5Elements.Grid
              templateColumns="repeat(auto-fit, minmax(260px, 1fr))"
              rowGap={16}
              columnGap={16}
              className={Config.Css.css({ marginBlockStart: 28 })}
            >
              {spaceAmenities.map((amenity) => (
                <AmenityCard key={amenity.code} amenity={amenity} />
              ))}
            </Uu5Elements.Grid>
          </Section>
        )}

        <Section variant="cream">
          <Uu5Elements.Grid
            templateColumns={{ xs: "1fr", m: "1fr auto 1fr" }}
            columnGap={16}
            rowGap={12}
            alignItems="center"
          >
            {/* Prázdné buňky nechávají prostřední tlačítko uprostřed i u krajních prostorů. */}
            <div>
              {prev && (
                <Uu5Elements.Link href={`ubytovani/${prev.code}`} colorScheme="primary" underline="onHover">
                  ← <Lsi lsi={lsi("spaces", prev.code, "title")} />
                </Uu5Elements.Link>
              )}
            </div>

            <Button variant="outline" href="ubytovani" lsi={lsi("pages", "space", "backButton")} />

            <div className={Config.Css.css({ textAlign: "right" })}>
              {next && (
                <Uu5Elements.Link href={`ubytovani/${next.code}`} colorScheme="primary" underline="onHover">
                  <Lsi lsi={lsi("spaces", next.code, "title")} /> →
                </Uu5Elements.Link>
              )}
            </div>
          </Uu5Elements.Grid>
        </Section>
      </>
    );
  },
});

export default Space;
