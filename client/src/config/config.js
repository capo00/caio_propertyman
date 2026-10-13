import { Utils } from "uu5g05";
import theme from "./theme.js";

// Config.Css.css() je stylovací primitivum celého stacku (emotion pod kapotou) a řeší pořadí
// stylů mezi načtenými knihovnami. Vzor je převzatý z caio-ui, jen s vlastním TAGem.
//
// process.env.NAME / OUTPUT_NAME / VERSION dodává devkit přes `define:` z client/package.json.
// Bez nich to v prohlížeči spadne na "process is not defined" -- proto se vite.config.js
// nechává prázdný (createViteConfig() bez parametrů).

const TAG = "PropertyMan.";

// Statické soubory z client/public/. Vite je kopíruje do build outputu 1:1, takže cesta je
// absolutní od rootu webu -- ne import, aby se obrázek nebalil do bundlu.
// Logo je tatáž ikona, kterou používá manifest.json a favicon (client/public/assets/meta/),
// aby se logo v hlavičce a ikona na ploše nemohly rozejít.
const asset = {
  logo: "/assets/meta/icon-192.png",
};

// Klíč pro Google Maps Embed API. ZADÁVÁ SE DO `client/.env.development` jako
// `GOOGLE_MAPS_API_KEY` (soubor je v .gitignore, takže klíč nekončí v gitu); pro produkci
// musí být stejná proměnná v prostředí, kde běží build. Cestu z `.env` do bundlu dělá
// `define` v `client/vite.config.js` -- `import.meta.env.VITE_*` v tomhle buildu nefunguje,
// viz komentář tam.
//
// Embed API je bez poplatku a bez limitů, ale klíč je v URL iframu, tedy veřejný. Musí být
// proto v Google Cloud omezený na HTTP referrer (domény webu + localhost), jinak ho může
// použít kdokoli.
//
// Bez klíče se mapa nevykreslí a zůstane placeholder s odkazem do Google Maps -- ať se
// nedostane do produkce polovyplněná mapa.
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || null;

// Site key reCAPTCHA v3 pro rezervační formulář. Zadává se do `client/.env.development` jako
// `GOOGLE_RECAPTCHA_API_KEY` (do bundlu ho dostane `define` ve `vite.config.js`, stejně jako Maps).
// Párový secret je v serverovém `.env` jako `GOOGLE_RECAPTCHA_SECRET` -- musí být oba, nebo žádný:
// bez site key formulář token nepošle a server s nastaveným secretem pak odmítne (403);
// bez secretu server v produkci odmítne každé odeslání (503).
const recaptchaSiteKey = process.env.GOOGLE_RECAPTCHA_API_KEY || null;

// Adresa webu bez koncového lomítka (`https://roubenyraj.cz`) pro canonical, `og:url`
// a `og:image` (tools/page-meta.js). Je to `APP_URL` ze serverového `.env` v kořeni repa,
// do bundlu ji dostane `define` ve `vite.config.js`. Bez ní se tyhle tři tagy nenastavují.
// Pevná adresa, ne `window.location.origin`: appspot.com i doména by jinak měly každá
// jiný canonical.
const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "") || null;

const Config = {
  TAG,
  asset,
  googleMapsApiKey,
  recaptchaSiteKey,
  appUrl,

  Css: Utils.Css.createCssModule(
    TAG.replace(/\.$/, "").toLowerCase().replace(/\./g, "-").replace(/[^a-z-]/g, ""),
    // Druhý argument je `owner` (atribut data-owner na <style>), drží sheets jedné knihovny
    // pohromadě a tím i jejich pořadí.
    process.env.NAME + "/" + process.env.OUTPUT_NAME + "@" + process.env.VERSION,
  ),

  theme,
};

export default Config;
