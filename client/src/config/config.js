import { Utils } from "uu5g05";
import { UiApp } from "caio-ui";
import clientConfig from "../../client.config.js";
import theme from "./theme.js";

// Config.Css.css() je stylovací primitivum celého stacku (emotion pod kapotou) a řeší pořadí
// stylů mezi načtenými knihovnami. Vzor je převzatý z caio-ui, jen s vlastním TAGem.
//
// process.env.NAME / OUTPUT_NAME / VERSION dodává devkit přes `define:` z client/package.json.
// Bez nich to v prohlížeči spadne na "process is not defined" -- proto se vite.config.js
// nechává prázdný (createViteConfig() bez parametrů).
//
// Konfigurace je ve třech vrstvách (docs/decisions.md § Konfigurace): klíče prostředí, které smí do
// bundlu, jsou v `UiApp.PublicEnv` (env soubory v kořeni repa), údaje o roubence společné se
// serverem v `UiApp.AppConfig.app` (caio.config.js), klientské v client.config.js. Tady jsou pod
// jmény, kterými je čte kód.

const TAG = clientConfig.tag;

// Adresa, GPS, kapacita, časy příjezdu a odjezdu, nejkratší pobyt (`property`) a telefon, e-mail,
// odkaz na mapu a sítě (`contact`) -- caio.config.js `app`, tytéž hodnoty čtou e-maily serveru
// a JSON-LD. Odvozené podoby (`tel:`, WhatsApp, řádky adresy) dává shared/contact.js.
const { property, contact } = UiApp.AppConfig.app;

// Statické soubory z client/public/. Vite je kopíruje do build outputu 1:1, takže cesta je
// absolutní od rootu webu -- ne import, aby se obrázek nebalil do bundlu.
// Logo je tatáž ikona, kterou používá manifest.json a favicon (client/public/assets/meta/),
// aby se logo v hlavičce a ikona na ploše nemohly rozejít.
const asset = {
  logo: "/assets/meta/icon-192.png",
};

// Klíč pro Google Maps Embed API: `GOOGLE_MAPS_API_KEY` v env souboru v kořeni repa
// (`.env.development` lokálně, `.env` pro produkční build; do 2026-11 client/.env.development).
// Do bundlu ho dává caio-devkit, protože je v caio.config.js `env.client`; za běhu se nečte
// (klient je statický build).
//
// Embed API je bez poplatku a bez limitů, ale klíč je v URL iframu, tedy veřejný. Musí být
// proto v Google Cloud omezený na HTTP referrer (domény webu + localhost), jinak ho může
// použít kdokoli.
//
// Bez klíče se mapa nevykreslí a zůstane placeholder s odkazem do Google Maps -- ať se
// nedostane do produkce polovyplněná mapa.
const googleMapsApiKey = UiApp.PublicEnv.GOOGLE_MAPS_API_KEY;

// Site key reCAPTCHA v3 pro rezervační formulář: `GOOGLE_RECAPTCHA_SITE_KEY` v env souboru (do
// 2026-11 `GOOGLE_RECAPTCHA_API_KEY` v client/.env.development); veřejný klíč stacku, do bundlu ho
// dává caio-devkit. Párový secret je ve stejném env souboru jako `GOOGLE_RECAPTCHA_SECRET` -- musí
// být oba, nebo žádný: bez site key formulář token nepošle a server s nastaveným secretem pak
// odmítne (403); bez secretu server v produkci odmítne každé odeslání (503).
const recaptchaSiteKey = UiApp.PublicEnv.GOOGLE_RECAPTCHA_SITE_KEY;

// Adresa webu bez koncového lomítka (`https://roubenyraj.cz`) pro drobečkovou navigaci
// (tools/page-meta.js; canonical, `og:url` a `og:image` si z ní staví caio-ui sám). Je to
// `APP_URL` ze serverového `.env` v kořeni repa, do bundlu ji dává caio-devkit (`UiApp.PublicEnv`).
// Pevná adresa, ne `window.location.origin`: appspot.com i doména by jinak měly každá
// jiný canonical.
const appUrl = (UiApp.PublicEnv.APP_URL || "").replace(/\/+$/, "") || null;

const Config = {
  TAG,
  asset,
  googleMapsApiKey,
  recaptchaSiteKey,
  appUrl,
  property,
  contact,

  Css: Utils.Css.createCssModule(
    TAG.replace(/\.$/, "").toLowerCase().replace(/\./g, "-").replace(/[^a-z-]/g, ""),
    // Druhý argument je `owner` (atribut data-owner na <style>), drží sheets jedné knihovny
    // pohromadě a tím i jejich pořadí.
    process.env.NAME + "/" + process.env.OUTPUT_NAME + "@" + process.env.VERSION,
  ),

  theme,
};

export default Config;
