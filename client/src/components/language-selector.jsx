import { createVisualComponent, useLanguage, useLsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import importLsi from "../lsi/import-lsi.js";
import { LANGUAGES } from "../tools/page-language.js";

// Přepínač jazyka pro horní lištu (2026-10-18, Caio). Do `ActionGroup`u se dává přes `component`
// a ten mu podle místa předá `displayType` -- stejně jako uu5 `ContextCenterButton` nebo
// `SpeechButton`:
//   - "button" / "button-compact" (v liště): uu5 `LanguageSelector` s kódem jazyka,
//   - "menu-item" (ve sbaleném menu): `MenuItem` „Jazyk“ s kódem vybraného jazyka vpravo
//     a podmenu jazyků. `LanguageSelector` je `Dropdown` a jako položka menu se vykreslit neumí.
//
// Kód místo vlajky: angličtina žádnou jednu vlajku nemá a jazyk není stát.

/** Název jazyka v něm samém, s velkým písmenem (Intl vrací „čeština“, „deutsch“). */
function languageName(code) {
  const name = new Intl.DisplayNames(code, { type: "language" }).of(code) ?? code;
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

const LanguageSelector = createVisualComponent({
  uu5Tag: Config.TAG + "LanguageSelector",

  render({ displayType, ...props }) {
    const [language, setLanguage] = useLanguage();
    const label = useLsi(importLsi, ["header", "language"]);

    if (displayType === "menu-item") {
      return (
        <Uu5Elements.MenuItem
          {...props}
          contentRight={language.toUpperCase()}
          itemList={LANGUAGES.map((code) => ({
            children: languageName(code),
            onClick: () => setLanguage(code),
            ...(code === language ? { icon: "uugds-check", colorScheme: "primary" } : null),
          }))}
        >
          {label}
        </Uu5Elements.MenuItem>
      );
    }

    // Stejné `significance`/`colorScheme` jako ostatní položky menu lišty (tools/use-web-menu.jsx).
    return (
      <Uu5Elements.LanguageSelector
        {...props}
        languageList={LANGUAGES}
        labelType="code"
        itemType="name-code"
        significance="subdued"
        colorScheme="building"
        iconOpen={null}
        iconClosed={null}
      />
    );
  },
});

export default LanguageSelector;
