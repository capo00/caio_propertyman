// Tvar slova „noc“ pro počet (cs: 1 noc / 2–4 noci / 5+ nocí); klíč v LSI `form.nights`.
// Sdílí ho rezervační formulář i ceník.
export function nightsForm(n) {
  return n === 1 ? "one" : n >= 2 && n <= 4 ? "few" : "many";
}
