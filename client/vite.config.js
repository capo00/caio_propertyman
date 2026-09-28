import { loadEnv } from "vite";
import { createViteConfig } from "caio-devkit/vite";

// Klíč pro Google Maps musí být v bundlu, ne v runtime prostředí (klient je statický build).
//
// `import.meta.env.VITE_*` -- standardní cesta Vite -- v tomhle buildu NEFUNGUJE: výstup je
// SystemJS a hodnota se do bundlu vůbec nedostane (ověřeno -- `VITE_…` ani property, do které
// se přiřazovala, v `public/index.js` nejsou). Funkční mechanismus v tomhle stacku je
// `define`, kterým už devkit dosazuje NAME/VERSION/OUTPUT_NAME, takže env proměnné klienta
// jdou stejnou cestou.
//
// Prefix `VITE_` proto nemá smysl a proměnná se jmenuje `GOOGLE_MAPS_API_KEY`.
//
// `loadEnv(configEnv.mode, …)` čte podle Vite konvence jen `.env` a `.env.<mode>` -- při
// produkčním buildu (`mode: "production"`) to `.env.development` NIKDY nezahrne, i když
// prázdný prefix jinak pokrývá "cokoli", protože výběr SOUBORU je na módu, ne na prefixu.
// Proto se `.env.development` čte navíc explicitně a bere se jako fallback (2026-09-28,
// majitel -- deploy si nemá žádat proměnnou v prostředí pro každé spuštění zvlášť). Je to
// bezpečné: klíč je Maps Embed API, veřejný v URL iframu i tak, chráněný jen HTTP referrer
// restrikcí v Google Cloud (tam musí být localhost i produkční doména zároveň).
//
// Proměnná v prostředí buildu (`GOOGLE_MAPS_API_KEY=… npm run build/deploy`) má pořád
// přednost -- pro případ, že by produkce někdy chtěla jiný klíč než lokální dev.
export default (configEnv) => {
  const env = loadEnv(configEnv.mode, process.cwd(), "");
  const devEnv = loadEnv("development", process.cwd(), "");
  const googleMapsApiKey = env.GOOGLE_MAPS_API_KEY || devEnv.GOOGLE_MAPS_API_KEY || "";

  return createViteConfig({
    define: {
      "process.env.GOOGLE_MAPS_API_KEY": JSON.stringify(googleMapsApiKey),
    },
  })(configEnv);
};
