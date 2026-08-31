import { createVisualComponent, useScreenSize, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import Button from "../layout/button.jsx";
import Photo from "../photo.jsx";
import contact from "../../content/contact.js";

const { theme } = Config;

function Row({ label, children }) {
  return (
    <div>
      <div className={Config.Css.css({ ...theme.text.eyebrow, color: theme.color.mutedFg })}>
        <Lsi lsi={label} />
      </div>
      <div className={Config.Css.css({ ...theme.text.body, color: theme.color.fg, marginBlockStart: 4 })}>
        {children}
      </div>
    </div>
  );
}

const Contact = createVisualComponent({
  uu5Tag: Config.TAG + "Contact",

  render() {
    const [screenSize] = useScreenSize();
    const isNarrow = screenSize === "xs" || screenSize === "s";

    const linkCss = Config.Css.css({
      color: "inherit",
      textDecoration: "none",
      borderBlockEnd: `1px solid ${theme.color.border}`,
      "&:hover": { borderBlockEndColor: theme.color.accent },
    });

    return (
      <Section variant="cream" id="kontakt">
        <div
          className={Config.Css.css({
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
            gap: isNarrow ? 32 : 48,
            alignItems: "center",
          })}
        >
          <div>
            <Eyebrow lsi={{ cs: "Kontakt" }} />
            <Heading level={2} lsi={{ cs: "Ozvěte se nám" }} />

            <div className={Config.Css.css({ display: "grid", gap: 20, marginBlock: "28px 28px" })}>
              <Row label={{ cs: "Adresa" }}>{contact.addressLines.join(", ")}</Row>
              <Row label={{ cs: "Telefon" }}>
                <a href={`tel:${contact.phoneHref}`} className={linkCss}>
                  {contact.phone}
                </a>
              </Row>
              <Row label={{ cs: "E-mail" }}>
                <a href={`mailto:${contact.email}`} className={linkCss}>
                  {contact.email}
                </a>
              </Row>
            </div>

            <Button anchor="#rezervace" route="reservation">
              <Lsi lsi={{ cs: "Chci rezervovat termín" }} />
            </Button>
          </div>

          {/*
            Mapa je zatím placeholder plocha s odkazem ven. Vložený mapový iframe by znamenal
            request na cizí doménu (a tím cookies a souhlas), což pro placeholder nemá cenu
            řešit -- přijde s tím, až bude adresa skutečná.
          */}
          <a
            href={contact.mapUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={Config.Css.css({ display: "block", textDecoration: "none" })}
          >
            <Photo src={null} tone="sand" ratio="4 / 3" caption={{ cs: "Mapa — Libošovice, Český ráj" }} />
          </a>
        </div>
      </Section>
    );
  },
});

export default Contact;
