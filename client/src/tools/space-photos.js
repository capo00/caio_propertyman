// Fotky prostoru. Prostor si je drží jako seznam kódů (components/accommodation/content.js),
// samotné fotky žijí v components/gallery/content.js -- tohle je to jediné místo, kde se
// ty dva soubory spojují.
//
// Pořadí určuje PROSTOR (`galleryCodes`), ne `order` v galerii: na detailu chceme vést
// návštěvníka od celku k detailu, v galerii je pořadí jiné.
//
// Neznámý kód se tiše přeskočí -- rozbitá vazba nemá shodit stránku, jen z ní zmizí fotka.
// Prázdný výsledek je běžný stav (prostor, ke kterému zatím žádná fotka není).

import gallery from "../components/gallery/content.js";

export function getSpacePhotos(space) {
  return (space.galleryCodes ?? []).map((code) => gallery.find((item) => item.code === code)).filter(Boolean);
}

/** První fotka prostoru, nebo `null` -- náhled na kartě a v koláži na home. */
export function getSpaceCover(space) {
  return getSpacePhotos(space)[0] ?? null;
}
