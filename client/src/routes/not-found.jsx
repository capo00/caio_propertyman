import { createVisualComponent, useRoute, Lsi } from "uu5g05";
import Config from "../config/config.js";
import Section from "../components/layout/section.jsx";
import Heading from "../components/layout/heading.jsx";
import Button from "../components/layout/button.jsx";
import { lsi } from "../lsi/import-lsi.js";

const { theme } = Config;

// Rám stránky (lišta + patička) dodává UiApp.Spa, tady je jen obsah.

const NotFound = createVisualComponent({
  uu5Tag: Config.TAG + "NotFound",

  render() {
    const [, setRoute] = useRoute();

    return (
      <Section>
        <div className={Config.Css.css({ textAlign: "center", paddingBlock: 48 })}>
          <Heading level={1} lsi={lsi("notFound", "heading")} />
          <p className={Config.Css.css({ ...theme.text.body, color: theme.color.mutedFg, marginBlock: 16 })}>
            <Lsi lsi={lsi("notFound", "info")} />
          </p>
          <Button onClick={() => setRoute("home")}>
            <Lsi lsi={lsi("notFound", "back")} />
          </Button>
        </div>
      </Section>
    );
  },
});

export default NotFound;
