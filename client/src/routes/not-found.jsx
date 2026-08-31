import { createVisualComponent, useRoute } from "uu5g05";
import Config from "../config/config.js";
import Page from "../components/layout/page.jsx";
import Section from "../components/layout/section.jsx";
import Heading from "../components/layout/heading.jsx";
import Button from "../components/layout/button.jsx";

const { theme } = Config;

const NotFound = createVisualComponent({
  uu5Tag: Config.TAG + "NotFound",

  render() {
    const [, setRoute] = useRoute();

    return (
      <Page>
        <Section>
          <div className={Config.Css.css({ textAlign: "center", paddingBlock: 48 })}>
            <Heading level={1}>Stránka nenalezena</Heading>
            <p className={Config.Css.css({ ...theme.text.body, color: theme.color.mutedFg, marginBlock: 16 })}>
              Odkaz, na který jste klikli, nikam nevede.
            </p>
            <Button onClick={() => setRoute("home")}>Zpět na úvod</Button>
          </div>
        </Section>
      </Page>
    );
  },
});

export default NotFound;
