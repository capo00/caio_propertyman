import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Button from "../layout/button.jsx";
import Map from "../map.jsx";
import contact from "../../content/contact.js";
import { lsi } from "../../lsi/import-lsi.js";

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

const Contact = createVisualComponent({
  uu5Tag: Config.TAG + "Contact",

  render() {
    return (
      <Section variant="cream" id="kontakt">
        <Uu5Elements.Grid
          templateColumns={{ xs: "1fr", m: "1fr 1fr" }}
          columnGap={48}
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
                  title: contact.addressLines.join(", "),
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

            <Button href="#rezervace">
              <Lsi lsi={lsi("sections", "contact", "button")} />
            </Button>
          </div>

          {/* Mapa je dvoufázová -- iframe z Google Maps se načte teprve po kliknutí,
              viz components/map.jsx. */}
          <Map />
        </Uu5Elements.Grid>
      </Section>
    );
  },
});

export default Contact;
