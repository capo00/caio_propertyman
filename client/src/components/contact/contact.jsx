import { createVisualComponent, useLsi, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../section.jsx";
import Eyebrow from "../eyebrow.jsx";
import Heading from "../heading.jsx";
import Button from "../button.jsx";
import Map from "./map.jsx";
import contact from "./content.js";
import { lsi } from "../../lsi/import-lsi.js";
import roubenkaSrc from "../../assets/roubenka.svg";

// Kontaktní údaje stojí na Uu5Elements.InfoItem: `direction="vertical-reverse"` dá malý
// popisek NAD hodnotou (přesně to, co dělala zdejší lokální komponenta `Row`) a `icon`
// přidá piktogram, který dosud chyběl. Ikony jsou ze základní sady `uugds-*`, tedy lokální.
//
// Telefon a e-mail jsou `Uu5Elements.Link`.
//
// POZOR na `type="email"` / `type="phone"`: prefix `mailto:`/`tel:` sice Link doplní sám,
// ale `withRouteLink`, kterým je Link obalený, si holou hodnotu nejdřív přeloží proti
// `Environment.appBaseUri` (`new URL("info@…", base)`), takže z odkazu vyleze
// `mailto:http://localhost:8080/info@…` -- ověřeno v prohlížeči. Dokud je v aplikaci router,
// je `type` s holou hodnotou nepoužitelné a schéma musí být rovnou v `href`.
//
// Jedna komponenta, dvě podoby (docs/decisions.md, § Frontend, 2026-09-28):
// - `compact` (výchozí) -- patička KAŽDÉ veřejné stránky (app.jsx, `AppFrame`). Mapa by tam
//   dělala druhé volání Google Maps na stránce, kde o mapu nikdo nežádal, proto jen kresba
//   roubenky (černá, stejný soubor jako boot indikátor).
// - `compact={false}` -- vlastní routa `kontakt` (router.jsx). Plná mapa + kresba pod ní.
//
// Obě podoby sdílejí `id="kontakt"`, nikdy ale nejsou na stránce obě zároveň -- `AppFrame`
// patičkovou schovává právě na routě `kontakt`, jinak by byly na stránce dvě stejná id.

const Contact = createVisualComponent({
  uu5Tag: Config.TAG + "Contact",

  render(props) {
    const { compact = true } = props;
    const propertyName = useLsi(lsi("property", "name")) ?? "";

    return (
      <Section variant="cream" id="kontakt">
        <Uu5Elements.Grid
          templateColumns={{ xs: "1fr", m: "1fr 1fr" }}
          columnGap={8}
          rowGap={32}
          alignItems="center"
        >
          <div>
            <Eyebrow lsi={lsi("sections", "contact", "eyebrow")} />
            <Heading level={2} lsi={lsi("sections", "contact", "heading")} />

            <Uu5Elements.InfoGroup
              direction="vertical"
              itemDirection="vertical-reverse"
              className={Config.Css.css({ marginBlock: "28px 28px" })}
              itemList={[
                {
                  icon: "uugds-mapmarker",
                  subtitle: <Lsi lsi={lsi("sections", "contact", "addressLabel")} />,
                  title: (
                    <Uu5Elements.Link href={contact.mapUrl} colorScheme="primary" underline="onHover">
                      {contact.addressLines.join(", ")}
                    </Uu5Elements.Link>
                  ),
                },
                {
                  icon: "uugds-phone",
                  subtitle: <Lsi lsi={lsi("sections", "contact", "phoneLabel")} />,
                  title: (
                    <Uu5Elements.Link href={`tel:${contact.phoneHref}`} colorScheme="primary" underline="onHover">
                      {contact.phone}
                    </Uu5Elements.Link>
                  ),
                },
                {
                  icon: "uugds-email",
                  subtitle: <Lsi lsi={lsi("sections", "contact", "emailLabel")} />,
                  title: (
                    <Uu5Elements.Link href={`mailto:${contact.email}`} colorScheme="primary" underline="onHover">
                      {contact.email}
                    </Uu5Elements.Link>
                  ),
                },
              ]}
            />

            {/* Routa, ne kotva `#rezervace`: kontakt je poslední sekcí KAŽDÉ veřejné
                stránky (app.jsx), takže kotva by mimo home neměla cíl a tlačítko by bylo
                mrtvé. Na home to znamená navigaci na /rezervace místo scrollu -- záměr
                je stejný, cíl je stejná sekce.

                Vlastní `<div>` okolo schválně -- `Uu5Elements.Button` i `InfoGroup` render
                jako `inline-flex` a `InfoGroup` se navíc smrskne na šířku svého nejširšího
                řádku (`Adresa`), ne na celou šířku sloupce. Bez bloku kolem tlačítka mu
                po `InfoGroup` zbývalo místo na stejném řádku a přistálo vedle adresy, ne
                pod e-mailem (naměřeno na desktopu 2026-09-29). Obyčejný `<div>` je náš
                vlastní blok, ne přebití uu5 komponenty. */}
            <div>
              <Button href="rezervace">
                <Lsi lsi={lsi("sections", "contact", "button")} />
              </Button>
            </div>
          </div>

          {compact ? (
            // Patička: mapa ustupuje kresbě roubenky, viz komentář nahoře u `compact`.
            // Stejný soubor jako boot indikátor (index.html), tady černý: fill je v souboru
            // natvrdo #1E3E23 (viz komentář tam) a `img` currentColor nebere, proto filtr.
            <div
              className={Config.Css.css({ display: "grid", placeItems: "center", inlineSize: "100%" })}
            >
              <img
                src={roubenkaSrc}
                alt={propertyName}
                width={1402}
                height={1122}
                className={Config.Css.css({
                  inlineSize: "100%",
                  blockSize: "auto",
                  filter: "brightness(0)",
                })}
              />
            </div>
          ) : (
            // Mapa je dvoufázová -- iframe z Google Maps se načte teprve po kliknutí,
            // viz ./map.jsx.
            <Map />
          )}
        </Uu5Elements.Grid>

        {!compact && (
          <div
            className={Config.Css.css({ display: "grid", placeItems: "center", marginBlockStart: 48 })}
          >
            <img
              src={roubenkaSrc}
              alt={propertyName}
              width={1402}
              height={1122}
              className={Config.Css.css({
                inlineSize: "min(280px, 60%)",
                blockSize: "auto",
                filter: "brightness(0)",
              })}
            />
          </div>
        )}
      </Section>
    );
  },
});

export default Contact;
