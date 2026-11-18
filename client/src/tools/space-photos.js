// Fotky prostoru. Prostor si je drží jako seznam kódů (components/accommodation/content.js),
// samotné fotky žijí v components/gallery/content.js -- tohle je to jediné místo, kde se
// ty dva soubory spojují.
//
// Pořadí určuje PROSTOR (`galleryCodes`), ne `order` v galerii: na detailu chceme vést
// návštěvníka od celku k detailu, v galerii je pořadí jiné.
//
// Prostor s místnostmi (`units`, např. ložnice) má fotky u jednotek: detail je vykreslí v sekci
// každé místnosti a fotky prostoru jsou jejich součet v pořadí jednotek (první je náhled na kartě).
//
// Neznámý kód se tiše přeskočí -- rozbitá vazba nemá shodit stránku, jen z ní zmizí fotka.
// Prázdný výsledek je běžný stav (prostor, ke kterému zatím žádná fotka není).

import gallery from "../components/gallery/content.js";

const toPhotos = (codes) => (codes ?? []).map((code) => gallery.find((item) => item.code === code)).filter(Boolean);

/** Jednotky prostoru seřazené podle `order`. */
export function getSpaceUnits(space) {
  return [...(space.units ?? [])].sort((a, b) => a.order - b.order);
}

/** Fotky jedné jednotky (místnosti) prostoru. */
export function getUnitPhotos(unit) {
  return toPhotos(unit.galleryCodes);
}

export function getSpacePhotos(space) {
  return [...toPhotos(space.galleryCodes), ...getSpaceUnits(space).flatMap(getUnitPhotos)];
}

/** První fotka prostoru, nebo `null` -- náhled na kartě a v koláži na home. */
export function getSpaceCover(space) {
  return getSpacePhotos(space)[0] ?? null;
}
