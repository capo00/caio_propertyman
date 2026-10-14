// Tvar slova „noc“ pro počet; klíč v LSI `form.nights` (`one` / `few` / `many`).
// Sdílí ho rezervační formulář i ceník.
//
// Kategorie dává `Intl.PluralRules` podle jazyka, ne pevné hranice: polština má „few“ i pro
// 22–24 (noce), čeština a slovenština tam mají „other“ (nocí). `other` i `many` padají na
// `many`, takže angličtině a němčině stačí dva různé texty (`few` = `many`).
export function nightsForm(n, language = "cs") {
  const category = new Intl.PluralRules(language).select(n);
  return category === "one" || category === "few" ? category : "many";
}
