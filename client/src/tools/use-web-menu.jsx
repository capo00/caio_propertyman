import { Lsi, useLsi, useMemo } from "uu5g05";
import nav from "../config/nav.js";
import importLsi, { lsi } from "../lsi/import-lsi.js";
import { pagePath } from "./page-language.js";
import { useAdminHint } from "./admin-hint.js";
import LanguageSelector from "../components/language-selector.jsx";

// Položky horní lišty webu a jejich skládání (vytažené z app.jsx 2026-10-18, když k nim
// přibyl odkaz do adminu). Lišta samotná (logo, barvy, název) zůstává v app.jsx.

/**
 * Přepínač jazyka jako poslední položka menu (2026-10-14, Caio), vlastní `LanguageSelector`
 * (components/language-selector.jsx): v liště uu5 přepínač s kódem, ve sbaleném menu položka
 * „Jazyk“ s podmenu.
 *
 * Bez odkazu do adminu `collapsed: "never"` a výchozí `order` (0): sbalovací menu ActionGroupu
 * se vykresluje za položkami s `order` 0, takže na mobilu je přepínač vlevo od hamburgeru
 * a nikdy v něm (stejný mechanismus, jakým se identita v adminu staví ZA hamburger s `order: 1`).
 *
 * S odkazem do adminu (2026-10-18, Caio) sbalování řídí ActionGroup: na desktopu zůstane
 * v liště, na mobilu se sbalí do hamburgeru a v liště zbude ikona správy a menu.
 */
const LANGUAGE_ITEM = { component: <LanguageSelector />, collapsed: "never" };
const LANGUAGE_ITEM_COLLAPSIBLE = { component: <LanguageSelector /> };

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
 * Jen ikona, všude a nikdy v hamburgeru (2026-10-18, Caio): na telefonu zůstane v liště ikona
 * správy a menu. Bez `children` si ActionGroup tooltip sám nevezme, proto `tooltip` -- řetězec
 * z `useLsi`, který je zároveň přístupným názvem tlačítka.
 */
function toAdminItem(label) {
  return {
    icon: "uugds-account",
    tooltip: label,
    collapsed: "never",
    onClick: (e) => {
      const newTab = e?.ctrlKey || e?.metaKey || e?.button === 1;
      window.open("/admin/", newTab ? "_blank" : "_self", "noopener");
    },
    significance: "subdued",
    colorScheme: "building",
  };
}

/**
 * Menu horní lišty: navigace, CTA „Rezervovat“ a na konci buď přepínač jazyka, nebo -- když
 * se v tomhle prohlížeči někdo přihlásil do adminu (tools/admin-hint.js) -- ikona adminu
 * a za ní přepínač jazyka, který se na úzké liště sbalí do hamburgeru.
 *
 * Závisí na aktuální routě (viz `toMenuItem`), proto je to hook a ne konstanta.
 */
export function useWebMenu(currentCode) {
  const isAdmin = useAdminHint();
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
        ...(isAdmin ? [toAdminItem(adminLabel), LANGUAGE_ITEM_COLLAPSIBLE] : [LANGUAGE_ITEM]),
      ],
    }),
    [currentCode, isAdmin, adminLabel],
  );
}
