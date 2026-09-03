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
// Prefix `VITE_` proto nemá smysl a proměnná se jmenuje `GOOGLE_MAPS_API_KEY`. Bere se
// z `client/.env.development` (v .gitignore) i z prostředí, kde build běží -- prázdný prefix
// v `loadEnv` pokrývá obojí.
export default (configEnv) => {
  const env = loadEnv(configEnv.mode, process.cwd(), "");

  return createViteConfig({
    define: {
      "process.env.GOOGLE_MAPS_API_KEY": JSON.stringify(env.GOOGLE_MAPS_API_KEY ?? ""),
    },
  })(configEnv);
};
