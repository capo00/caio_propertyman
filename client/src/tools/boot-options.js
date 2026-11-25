// Volby boot screenu pro caio-ui `keepBootScreen`/`renderApp` (web main.jsx, admin admin/index.jsx):
// písma, která první obrazovka sází (config/theme.js: Fraunces 600 nadpisy, Karla 400/700 text).
// Vzorek s „ř“ a „ě“, ať se stáhne i podmnožina latin-ext (fonts.css dělí soubory podle
// `unicode-range`) -- jinak by „Roubený ráj“ mělo pár písmen náhradním písmem.
export const BOOT_OPTIONS = {
  fontList: ['600 1em "Fraunces"', '400 1em "Karla"', '700 1em "Karla"'],
  fontSample: "Roubený ráj Řř Ěě Žž Čč",
};
