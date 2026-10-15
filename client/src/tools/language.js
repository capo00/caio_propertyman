// Jazyky webu a zapamatování volby z přepínače v liště (app.jsx).
//
// uu5g05 `LanguageProvider` (zakládá ho caio-ui `SpaProvider`) bere výchozí jazyk
// z `Utils.Language.getLanguage()`, tedy z `navigator.language`, a omezí ho na `LANGUAGE_LIST`.
// Jazyk prohlížeče, který web nemá, spadne na uu5 `defaultLanguage` (`en-gb`) -- host
// z Nizozemska tak dostane angličtinu, ne češtinu.
//
// Volbu nikam neukládá a `SpaProvider` nepropouští `language`/`onChange`, takže by se po
// reloadu vrátil jazyk prohlížeče. Proto si ji appka drží v localStorage sama: při načtení
// modulu (tedy před prvním renderem) ji vrátí přes `Utils.Language.setLanguage` a hook
// `useLanguageSync` ji při každé změně uloží.
//
// Jazyk NENÍ v URL -- jazykové adresy, hreflang a sitemap jsou samostatný návrh (docs/wip.md).
import { Utils, useEffect, useLanguage } from "uu5g05";

// Pořadí = pořadí v přepínači. Server má vlastní seznam (`server/config.js`, `languages`),
// musí s tímhle sedět, jinak zahodí `lang` z rezervace.
export const LANGUAGE_LIST = ["cs", "en", "de", "pl", "sk"];

const STORAGE_KEY = process.env.NAME + ".language";

// localStorage může v soukromém okně nebo se zablokovanými daty vyhodit -- pak se jen nic
// nepamatuje a jazyk jde z prohlížeče.
function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function save(language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // viz readSaved
  }
}

const saved = readSaved();
if (LANGUAGE_LIST.includes(saved)) Utils.Language.setLanguage(saved);

/**
 * Jazyk, ve kterém se web poprvé vykreslí -- stejný výpočet, jaký dělá uu5g05
 * `LanguageProvider` (`limitByLanguageList` bez explicitního jazyka a bez
 * `UserPreferencesProvider`u, ten caio-ui nezakládá): první z [`Utils.Language.getLanguage()`,
 * ...`navigator.languages`], který je v `LANGUAGE_LIST`, jinak uu5 `defaultLanguage` (en).
 * Volá se po načtení tohohle modulu, takže už zahrnuje zapamatovanou volbu.
 *
 * Slouží jen k přednačtení LSI před prvním renderem (main.jsx). Kdyby se výsledek s uu5
 * někdy rozešel, nic se nerozbije -- jen se jazyk dotáhne až po prvním renderu jako dřív.
 */
export function getInitialLanguage() {
  const languageMap = Object.fromEntries(LANGUAGE_LIST.map((language) => [language, language]));
  const browserList = (navigator.languages?.length ? navigator.languages : [navigator.language]).map((language) =>
    language.toLowerCase(),
  );
  return Utils.Language.getItem(languageMap, [Utils.Language.getLanguage(), ...browserList].join(","));
}

// Jazyk z minulého běhu efektu. Na úrovni modulu, ne `useRef`, ať to přežije i přemountování
// komponenty, která hook volá.
let lastLanguage;

/**
 * Ukládá jazyk po změně v přepínači a drží `<html lang>` podle aktuálního jazyka (čtečky,
 * dělení slov, překladač prohlížeče). Statický `index.html` má `lang="cs"`.
 *
 * Jazyk z prvního renderu se neukládá: odvozený z prohlížeče není volba hosta a uložený by
 * přebil pozdější změnu jazyka prohlížeče.
 */
export function useLanguageSync() {
  const [language] = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    if (lastLanguage !== undefined && language !== lastLanguage) save(language);
    lastLanguage = language;
  }, [language]);
}
