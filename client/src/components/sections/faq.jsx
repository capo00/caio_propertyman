import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Section from "../layout/section.jsx";
import Eyebrow from "../layout/eyebrow.jsx";
import Heading from "../layout/heading.jsx";
import faqContent from "../../content/faq.js";
import { lsi } from "../../lsi/import-lsi.js";

const { theme } = Config;

// Časté dotazy na Uu5Elements.Accordion. Ruční accordion (~30 řádků) i `useState(openCode)`
// tím zmizely a získalo se: animované rozbalení (CollapsibleBox), celé ARIA drátování
// (`aria-expanded`, `aria-controls`, `role="region"`, `aria-labelledby`), obsluha Enter/Space
// a rozbalení VŠECH panelů při tisku (`usePrint()` uvnitř Accordionu).
//
// `allowMultiple={false}` = původní "jedna otevřená", `initialOpen` na prvním = "první
// rozbalená".
//
// `itemSignificance="distinct"` je varianta s vlasovou linkou kolem panelu, tedy nejblíž
// bloku z předlohy. Pozor na nečekané mapování v `Panel`u: significance se na obal
// PŘEKLÁDÁ (`{distinct: "subdued"}`), takže `subdued` skončí jako průhledný panel bez linky
// a rámeček dá právě `distinct`. Oddělovače mezi otázkami jsou 4px mezery mezi samostatnými
// panely, ne linky v jednom bloku.
//
// Otázka jde dovnitř jako už nastylovaný node (`Heading`), protože hlavičku panelu sází
// Accordion GDS typografií. Zůstává tím i <h3> v osnově dokumentu -- byť uvnitř elementu
// s `role="button"`, což je kompromis, viz docs/component-tree.md § B.10.

const Faq = createVisualComponent({
  uu5Tag: Config.TAG + "Faq",

  render() {
    const items = [...faqContent].sort((a, b) => a.order - b.order);

    return (
      <Section id="faq">
        <div className={Config.Css.css({ maxWidth: 760, marginInline: "auto" })}>
          <Eyebrow lsi={lsi("sections", "faq", "eyebrow")} />
          <Heading level={2} lsi={lsi("sections", "faq", "heading")} />

          <Uu5Elements.Accordion
            allowMultiple={false}
            borderRadius="moderate"
            itemSignificance="distinct"
            className={Config.Css.css({ marginBlockStart: 28 })}
            itemList={items.map((item, index) => ({
              header: <Heading level={3} lsi={lsi("faq", item.code, "question")} />,
              initialOpen: index === 0,
              children: (
                <p
                  className={Config.Css.css({
                    ...theme.text.body,
                    color: theme.color.mutedFg,
                    margin: 0,
                  })}
                >
                  <Lsi lsi={lsi("faq", item.code, "answer")} />
                </p>
              ),
            }))}
          />
        </div>
      </Section>
    );
  },
});

export default Faq;
