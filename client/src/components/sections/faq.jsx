import { createVisualComponent, useState, Lsi } from "uu5g05";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import faqContent from "../../content/faq.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Accordion je psaný ručně, ne přes uu5 komponentu -- je to ~30 řádků, plně pod kontrolou
// a hlavně sedí na sazbu předlohy (Fraunces v otázce, +/- vpravo, tenké oddělovače).
//
// Přístupnost: otázka je <button> uvnitř <h3>, takže do ní jde tabovat i ji přečíst čtečkou,
// a aria-expanded říká, jestli je odpověď rozbalená.

const Faq = createVisualComponent({
  uu5Tag: Config.TAG + "Faq",

  render() {
    const items = [...faqContent].sort((a, b) => a.order - b.order);
    // První otázka je rozbalená, stejně jako v předloze.
    const [openCode, setOpenCode] = useState(items[0]?.code ?? null);

    return (
      <Section id="faq">
        <div className={Config.Css.css({ maxWidth: 760, marginInline: "auto" })}>
          <Eyebrow lsi={lsi("sections", "faq", "eyebrow")} />
          <Heading level={2} lsi={lsi("sections", "faq", "heading")} />

          <div
            className={Config.Css.css({
              marginBlockStart: 28,
              border: `1px solid ${theme.color.border}`,
              borderRadius: theme.radius,
              backgroundColor: theme.color.card,
              overflow: "hidden",
            })}
          >
            {items.map((item, index) => {
              const isOpen = openCode === item.code;
              return (
                <div
                  key={item.code}
                  className={Config.Css.css({
                    borderBlockStart: index === 0 ? "none" : `1px solid ${theme.color.border}`,
                  })}
                >
                  <h3 className={Config.Css.css({ margin: 0 })}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenCode(isOpen ? null : item.code)}
                      className={Config.Css.css({
                        ...theme.text.h3,
                        fontSize: 17,
                        inlineSize: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        textAlign: "start",
                        padding: 20,
                        border: "none",
                        background: "none",
                        color: theme.color.fg,
                        cursor: "pointer",
                      })}
                    >
                      <Lsi lsi={lsi("faq", item.code, "question")} />
                      <span
                        aria-hidden="true"
                        className={Config.Css.css({
                          ...theme.text.body,
                          fontSize: 20,
                          color: theme.color.mutedFg,
                          lineHeight: 1,
                        })}
                      >
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                  </h3>

                  {isOpen && (
                    <p
                      className={Config.Css.css({
                        ...theme.text.body,
                        color: theme.color.mutedFg,
                        margin: 0,
                        padding: "0 20px 20px",
                      })}
                    >
                      <Lsi lsi={lsi("faq", item.code, "answer")} />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    );
  },
});

export default Faq;
