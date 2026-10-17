import Uu5Elements from "uu5g05-elements";
import { Lsi, useLanguage, useLsi, useMemo } from "uu5g05";
import nav from "../config/nav.js";
import importLsi, { lsi } from "../lsi/import-lsi.js";
import { LANGUAGES, pagePath } from "./page-language.js";
import { useAdminHint } from "./admin-hint.js";

// Položky horní lišty webu a jejich skládání (vytažené z app.jsx 2026-10-18, když k nim
// přibyl odkaz do adminu). Lišta samotná (logo, barvy, název) zůstává v app.jsx.

/**
 * Přepínač jazyka jako poslední položka menu (2026-10-14, Caio).
 *
 * `Uu5Elements.LanguageSelector` přes `component`: `CaioApp.Top` předává položky menu rovnou
 * do `ActionGroup` a ten vlastní komponentu v položce vykreslí i změří. Jazyk čte a nastavuje
 * sám přes `useLanguage()`, názvy jazyků v rozbalení jsou z `Intl.DisplayNames` v daném jazyce
 * (Čeština, Deutsch, Polski, …).
 *
 * Kód místo vlajky: angličtina žádnou jednu vlajku nemá a jazyk není stát.
 *
 * `collapsed: "never"` a výchozí `order` (0): sbalovací menu ActionGroupu se vykresluje za
 * položkami s `order` 0, takže na mobilu je přepínač vlevo od hamburgeru a nikdy v něm
 * (stejný mechanismus, jakým se identita v adminu staví ZA hamburger s `order: 1`).
 * Stejné `significance`/`colorScheme` jako ostatní položky menu (`toMenuItem`).
 */
const LANGUAGE_ITEM = {
  component: (
    <Uu5Elements.LanguageSelector
      languageList={LANGUAGES}
      labelType="code"
      itemType="name-code"
      significance="subdued"
      colorScheme="building"
      iconOpen={null}
      iconClosed={null}
    />
  ),
  collapsed: "never",
};

/**
 * Položka `config/nav.js` -> položka `ActionGroup`u v liště.
 *
 * `href` rozhoduje o chování a překládá si ho `CaioApp.Top` sám: kotva scrolluje po
 * aktuální stránce, cokoli jiného je routa a naviguje.
 *
 * Žádné `itemList`: menu je jednoúrovňové (viz config/nav.js). Stránky prostorů se
 * dostanou z rozcestníku `ubytovani`, ne z rozbaleného menu.
 *
 * Popisek se nebere z `header.nav.<code>` natvrdo -- položka si nese `label` jako cestu do
 * LSI, takže se název dá vzít ze stejného místa jako na cílové stránce.
 *
 * `currentCode` (2026-09-28, majitel): klik na položku stránky, na které host už je,
 * musí plynule odscrollovat na začátek, ne se netvářit (`setRoute` na nezměněnou routu
 * neudělá nic). Řeší se přepnutím `href` na kotvu bez cíle -- `withItemBehaviour`
 * v `caio-ui/src/caio-ui-app/top.jsx` pro kotvu bez odpovídajícího `id` v DOM sama spadne
 * na `animateScrollTo(0)`, tedy přesně na plynulý skok na začátek, stejným tempem jako
 * ostatní kotvy v appce.
 */
function toMenuItem(item, currentCode) {
  return {
    href: item.code === currentCode ? "#" : pagePath(item.code),
    children: <Lsi lsi={lsi(...item.label)} />,
    significance: "subdued",
    colorScheme: "building",
  };
}

/**
 * Odkaz do adminu. Admin je jiný dokument (/admin/, vlastní UVE), ale `CaioApp.Top` ho za
 * „mimo appku“ nepovažuje: app base webu je `/`, takže `/admin/` pod ni spadá a `href` by
 * skončil na `setRoute` (jen změna adresy, admin by se nenačetl). Proto místo `href` vlastní
 * `onClick`, který chování odkazu napodobí: ctrl/cmd-klik a klik kolečkem (Button ho posílá
 * do `onClick` s `button === 1`) otevřou nový panel, obyčejný klik přejde na admin.
 *
 * `label` je řetězec (z `useLsi`), ne `<Lsi>`: v ikonovém režimu `ActionGroup` bere tooltip
 * z `children` jen tehdy, když je to string.
 */
function toAdminItem(label) {
  return {
    icon: "uugds-account",
    children: label,
    onClick: (e) => {
      const newTab = e?.ctrlKey || e?.metaKey || e?.button === 1;
      window.open("/admin/", newTab ? "_blank" : "_self", "noopener");
    },
    significance: "subdued",
    colorScheme: "building",
  };
}

/** Název jazyka v něm samém, s velkým písmenem (Intl vrací „čeština“, „deutsch“). */
function languageName(code) {
  const name = new Intl.DisplayNames(code, { type: "language" }).of(code) ?? code;
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

/**
 * Jazyk jako položka sbaleného menu. `LanguageSelector` v něm použít nejde (je to `Dropdown`,
 * který `displayType: "menu-item"` neumí), proto podmenu s jazyky a `setLanguage` z
 * `useLanguage()`. Aktivní jazyk je zvýrazněný stejně jako v přepínači.
 */
function toLanguageMenuItem(language, setLanguage) {
  return {
    collapsed: "always",
    icon: "uugds-web",
    children: <Lsi lsi={lsi("header", "language")} />,
    itemList: LANGUAGES.map((code) => ({
      children: languageName(code),
      onClick: () => setLanguage(code),
      ...(code === language ? { significance: "distinct", colorScheme: "primary" } : null),
    })),
  };
}

/**
 * Menu horní lišty: navigace, CTA „Rezervovat“ a na konci buď přepínač jazyka, nebo -- když
 * se v tomhle prohlížeči někdo přihlásil do adminu (tools/admin-hint.js) -- odkaz do adminu
 * a jazyk schovaný v hamburgeru.
 *
 * Závisí na aktuální routě (viz `toMenuItem`), proto je to hook a ne konstanta.
 */
export function useWebMenu(currentCode) {
  const isAdmin = useAdminHint();
  const [language, setLanguage] = useLanguage();
  const adminLabel = useLsi(importLsi, ["header", "admin"]);

  return useMemo(
    () => ({
      itemList: [
        ...nav.map((item) => toMenuItem(item, currentCode)),
        {
          href: currentCode === "reservation" ? "#" : pagePath("reservation"),
          children: <Lsi lsi={lsi("header", "book")} />,
          significance: "highlighted",
          colorScheme: "building",
          // CTA se do hamburgeru sbalí až POSLEDNÍ, po všech položkách navigace: ActionGroup
          // sbaluje zprava a položky s `primary` až nakonec. Dřív mělo `collapsed: "never"`,
          // ale s přepínačem jazyka se na telefonu do lišty nevešlo (2026-10-14, Caio).
          primary: true,
        },
        ...(isAdmin ? [toAdminItem(adminLabel), toLanguageMenuItem(language, setLanguage)] : [LANGUAGE_ITEM]),
      ],
    }),
    [currentCode, isAdmin, adminLabel, language, setLanguage],
  );
}
