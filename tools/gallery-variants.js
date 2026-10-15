/**
 * Ze zdrojových fotek galerie vyrobí menší varianty pro `srcset` a náhledy.
 *
 *   client/src/assets/gallery/03-chalupa.webp  ->  03-chalupa-480.webp, 03-chalupa-800.webp
 *
 * Zdroj je každá `*.webp` ve složce, která sama není varianta (`-480.webp`, `-800.webp`). Varianty
 * se přepisují, takže po výměně fotky stačí skript pustit znovu a výstupy commitnout.
 * Seznam fotek a jejich `srcSet` drží client/src/components/gallery/content.js -- šířky
 * tady a tam musí sedět (gallery/content.test.js hlídá, že všechny soubory ze `srcSet` existují).
 *
 * `sharp` v závislostech projektu NENÍ schválně: je to nativní balíček, Cloud Build by ho
 * při každém deployi stavěl kvůli skriptu, který běží jednou za čas, a výchozí registry
 * projektu (plus4u) ho nemusí mít. Instaluje se jednorázově mimo repo:
 *
 *   npm install --prefix "$TMP/sharp" --registry=https://registry.npmjs.org/ sharp
 *   SHARP_DIR="$TMP/sharp" node tools/gallery-variants.js
 */
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Šířky variant v px. 800 pokryje mobil i s hustým displejem (412 CSS px × 1,75 ≈ 720),
// 480 menší dlaždice a displeje s hustotou 1. Plnou šířku dává sám zdroj.
const VARIANT_WIDTHS = [480, 800];
// Kvalita WebP. Pod ~70 začne být na dřevě a trávě vidět rozmazání.
const QUALITY = 72;

const GALLERY_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client/src/assets/gallery");
// Jen přesné šířky variant: zdroje samy končí číslem (`04-spolecenska-mistnost-1.webp`).
const VARIANT_RE = new RegExp(`-(${VARIANT_WIDTHS.join("|")})\\.webp$`);

async function main() {
  const require = createRequire(import.meta.url);
  let sharp;
  try {
    sharp = require(require.resolve("sharp", { paths: [process.env.SHARP_DIR ?? process.cwd()] }));
  } catch {
    console.error("[gallery-variants] sharp nejde načíst -- viz návod v hlavičce skriptu (SHARP_DIR).");
    process.exit(1);
  }

  const sources = readdirSync(GALLERY_DIR).filter((name) => name.endsWith(".webp") && !VARIANT_RE.test(name));
  for (const name of sources) {
    const source = path.join(GALLERY_DIR, name);
    const { width } = await sharp(source).metadata();
    for (const variantWidth of VARIANT_WIDTHS) {
      // Zvětšovat nemá smysl -- varianta by byla jen větší soubor se stejnou kresbou.
      const targetWidth = Math.min(variantWidth, width);
      const target = path.join(GALLERY_DIR, name.replace(/\.webp$/, `-${variantWidth}.webp`));
      const info = await sharp(source).resize({ width: targetWidth }).webp({ quality: QUALITY, effort: 6 }).toFile(target);
      console.log(`${path.basename(target)}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} kB`);
    }
  }
}

main();
