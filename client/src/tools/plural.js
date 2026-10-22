// Form of a counted word for a number; the lsi has the forms `one` / `few` / `many`
// (`form.nights`, `pages.space.beds`). Shared by the booking form, the prices and the space detail.
//
// The category comes from `Intl.PluralRules` for the language, not from fixed limits: Polish has
// "few" also for 22–24 (noce), Czech and Slovak have "other" there (nocí). `other` and `many` both
// fall to `many`, so English and German need only two different texts (`few` = `many`).
export function pluralForm(n, language = "cs") {
  const category = new Intl.PluralRules(language).select(n);
  return category === "one" || category === "few" ? category : "many";
}
