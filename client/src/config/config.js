import { Utils } from "uu5g05";
import theme from "./theme.js";

// Config.Css.css() je stylovací primitivum celého stacku (emotion pod kapotou) a řeší pořadí
// stylů mezi načtenými knihovnami. Vzor je převzatý z caio-ui, jen s vlastním TAGem.
//
// process.env.NAME / OUTPUT_NAME / VERSION dodává devkit přes `define:` z client/package.json.
// Bez nich to v prohlížeči spadne na "process is not defined" -- proto se vite.config.js
// nechává prázdný (createViteConfig() bez parametrů).

const TAG = "PropertyMan.";

const Config = {
  TAG,

  Css: Utils.Css.createCssModule(
    TAG.replace(/\.$/, "").toLowerCase().replace(/\./g, "-").replace(/[^a-z-]/g, ""),
    // Druhý argument je `owner` (atribut data-owner na <style>), drží sheets jedné knihovny
    // pohromadě a tím i jejich pořadí.
    process.env.NAME + "/" + process.env.OUTPUT_NAME + "@" + process.env.VERSION,
  ),

  theme,
};

export default Config;
