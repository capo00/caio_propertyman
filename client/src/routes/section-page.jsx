import { createVisualComponent, useRoute, Lsi } from "uu5g05";
import Config from "../config/config.js";
import Page from "../components/layout/page.jsx";
import Section from "../components/layout/section.jsx";
import Button from "../components/layout/button.jsx";

const { theme } = Config;

// Obal pro samostatnou routu jedné sekce.
//
// Sekce jsou napsané tak, aby nezávisely na tom, co je nad nimi, takže je stačí vyrenderovat
// samotné. Přidáváme jen odkaz zpět na celou stránku -- bez něj by návštěvník, který přijde
// z Googlu rovnou na /gallery, neměl jak pokračovat na zbytek webu.

const SectionPage = createVisualComponent({
  uu5Tag: Config.TAG + "SectionPage",

  render({ children }) {
    const [, setRoute] = useRoute();

    return (
      <Page>
        {children}
        <Section>
          <Button variant="outline" onClick={() => setRoute("home")}>
            <Lsi lsi={{ cs: "Zpět na úvodní stránku" }} />
          </Button>
        </Section>
      </Page>
    );
  },
});

export default SectionPage;
