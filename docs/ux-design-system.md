# UX design system — vytěženo z předlohy

Zdroj: Lovable prototyp „Roubenka Libošovice“
(`id-preview--dcc41b07-91db-4b48-a35a-d7650d4767c9.lovable.app`), screenshoty v [`../ux/`](../ux/).
Hodnoty níže jsou **odečtené z běžící stránky** (computed style), ne odhad z obrázku.

Předloha je Tailwind/shadcn appka. My ji **nepřebíráme jako kód** — přepisujeme ji do `uu5g05`
komponent. Tenhle dokument je překladový klíč: co má nová appka vizuálně splnit.

---

## 1. Barvy

Předloha má barvy v `oklch`. Ukládám obojí — `oklch` je zdroj pravdy (širší gamut),
hex je bezpečný fallback pro místa, kde `uu5g05` nebo starší prohlížeč `oklch` nezvládne.

| Token | oklch | hex | Kde se používá |
|---|---|---|---|
| `background` | `oklch(98.2% .012 95)` | `#FBF9F0` | základní podklad stránky (teplá krémová) |
| `cream` | — | `#F9F5E8` | **alternující** sekce (galerie, okolí) — o odstín tmavší než `background` |
| `forest` | — | `#1E3E23` | tmavě zelené bloky: sekce Rezervace, footer, logo dlaždice |
| `primary` | `oklch(42% .075 145)` | `#315833` | primární tlačítka, aktivní stavy, `ring` |
| `primary-foreground` | `oklch(98% .012 95)` | `#FBF9F0` | text na `primary`/`forest` |
| `foreground` | `oklch(26% .035 130)` | `#1E2715` | základní text (velmi tmavá zelenošedá, ne černá) |
| `secondary` | `oklch(93% .024 95)` | `#EDE8D6` | písková plocha |
| `secondary-foreground` | `oklch(30% .045 60)` | `#3E2815` | text na pískové ploše |
| `muted` | `oklch(94.5% .018 95)` | `#F0EDE0` | jemné podklady |
| `muted-foreground` | `oklch(50% .028 110)` | `#646553` | sekundární text, popisky, „4 KM“ |
| `accent` | `oklch(62% .09 60)` | `#AE794C` | terakota — hvězdičky u recenzí, akcenty |
| `accent-foreground` | `oklch(99% .01 95)` | `#FEFCF4` | text na akcentu |
| `border` | `oklch(89% .022 95)` | `#DFDBCB` | rámečky karet, oddělovače |
| `card` | `oklch(99.5% .006 95)` | `#FFFDF9` | podklad karet (o chlup světlejší než `background`) |

**Pravidlo, které drží celý vzhled:** nikde není čistá bílá ani čistá černá. Všechno je posunuté
do teplé (hue ~95 = žlutozelená) nebo do zelené (hue 130–148). Když se v implementaci objeví
`#FFFFFF` nebo `#000000`, je to chyba.

Sekce se **střídají** `background` → `cream` → `background`, a jednou za stránku to přeruší
`forest` blok (Rezervace) — ten dělá vizuální těžiště.

---

## 2. Typografie

Dvojice z Google Fonts:

| Role | Font | Fallback |
|---|---|---|
| Display (nadpisy) | **Fraunces** | `Georgia, serif` |
| Body / UI | **Karla** | `system-ui, sans-serif` |

Fraunces je variabilní „soft serif“ s výraznou kresbou — na ní stojí charakter předlohy.
Karla je grotesk s vyšší x-height, drží text klidný.

### Škála (odečteno, desktop)

| Prvek | Font | Velikost / řádkování | Váha | Prostrkání |
|---|---|---|---|---|
| `h1` (hero) | Fraunces | 60 px / 63 px | 600 | −0.9 px (−1.5 %) |
| `h2` (nadpis sekce) | Fraunces | 36 px / 40 px | 600 | −0.54 px (−1.5 %) |
| `h3` (nadpis karty) | Fraunces | 16–20 px / 24 px | 600 | −0.24 px |
| body | Karla | 16 px / 1.6 | 400 | normální |
| **eyebrow** | Karla | 11 px / 16.5 px | 700 | **+3.08 px**, `uppercase` |

**Eyebrow** je ten malý prostrkaný štítek nad každým nadpisem sekce — `GALERIE`, `CENÍK`,
`REZERVACE`, `ZAJÍMAVOSTI V OKOLÍ`, `ČASTÉ DOTAZY`, `KONTAKT`. Barva `muted-foreground`
na světlém, `primary-foreground` s nižší opacitou na `forest`. Je to nejlevnější a nejvýraznější
prvek rytmu celé stránky — nevynechávat.

Nadpisy mají **záporné prostrkání** (−1.5 %). Bez něj Fraunces v 60 px vypadá rozsypaně.

---

## 3. Rozměry a rytmus

| Věc | Hodnota |
|---|---|
| `--radius` | `0.5rem` (8 px); karty vypadají na 8–12 px |
| Vertikální padding sekce | 72 px (base) — na širokém desktopu předloha jde na ~96–112 px |
| Šířka obsahu | max ~1140 px, vycentrováno, boční padding 24 px |
| Mřížka karet | 2 sloupce (výhody, recenze), 3 sloupce (ceník, okolí) |
| Rámeček karty | 1 px `border`, podklad `card`, bez stínu |

Stíny se prakticky nepoužívají — plochy odděluje barva a 1px rámeček, ne elevace.

---

## 4. Sekce stránky (pořadí podle předlohy)

Mapa na screenshoty v `ux/` a na kotvy sekcí z
[design-v1.md § 5](../design-v1.md#5-veřejný-web--obsah-natvrdo).

| # | Sekce | Screenshot | Co obsahuje |
|---|---|---|---|
| 1 | **Header** | všechny | **předloha:** sticky, průhledný nad hero → krémový po odscrollování; logo dlaždice `forest` s „R“ + dvouřádkový název ve Fraunces; menu; tlačítko *Rezervovat*.<br>**implementace (2026-09-01):** `UiApp.Spa` prop `top` (`CaioApp.Top` z caio-ui) — sticky s výškou 56 px, **zelený `forest` i po odscrollování** (po dosednutí přidá GDS stín), logo je obrázek `assets/meta/icon-192.png`, dvouřádkový název je `Uu5Elements.Header`, tedy **Karla 16/700, ne Fraunces**; menu je `Uu5Elements.ActionGroup` (na mobilu a tabletu se samo sbalí do hamburgeru), *Rezervovat* má `collapsed: "never"`. Rozdíly a jak se dají vrátit: [component-tree.md § A.1](./component-tree.md) |
| 2 | **Hero** | `01-hero` | fullbleed foto, zelený overlay, eyebrow, `h1` na dva řádky, perex, dvě tlačítka (plné + outline) |
| 3 | **Statistiky** | `01-hero` | 4 sloupce: velké číslo (Fraunces) + `uppercase` popisek — `8 LŮŽEK`, `4 LOŽNICE`, `1 200 m² ZAHRADA`, `4 km NA HRAD KOST` |
| 4 | **O roubence** | `02` | vlevo text + mřížka 6 karet s výhodami, vpravo koláž 3 fotek |
| 5 | **Galerie** | `02`, `03` | mřížka fotek, `cream` podklad |
| 6 | **Ceník** | `03` | 3 karty; prostřední zvýrazněná odznakem `NEJŽÁDANĚJŠÍ` (pilulka `forest`) + silnějším rámečkem; cena velkým Fraunces + jednotka malým `muted` |
| 7 | **Rezervace** | `04` | **`forest` blok**; vlevo nadpis + provozní podmínky, vpravo formulářová karta na `card` podkladu |
| 8 | **Recenze** | `05` | 2 sloupce karet: hvězdičky (`accent`), citace v uvozovkách, podpis `jméno · město` |
| 9 | **Okolí** | `05`, `06` | perex + foto, pod tím 6 karet: název vlevo, **vzdálenost vpravo** malým prostrkaným `accent`/`muted` |
| 10 | **FAQ** | `07` | accordion, úzký sloupec, `+` / `−`, první položka otevřená |
| 11 | **Kontakt** | `08` | vlevo adresa/telefon/e-mail se štítky, tlačítko *Chci rezervovat termín*; vpravo mapa v zaobleném rámu |
| 12 | **Footer** | `08` | `forest`, název vlevo, copyright vpravo |

---

## 5. Co z toho jde do v1

Sekce 1–12 jsou všechny ve v1 — obsah je natvrdo v `client/src/content/*`
([design-v1.md § 5](../design-v1.md#5-veřejný-web--obsah-natvrdo)). Jediná sekce s živými daty
je **Rezervace** (kalendář obsazenosti + formulář) a **Galerie** (statické soubory).

Předloha je **one-page** se scroll kotvami (`#galerie`, `#cenik`, …), zatímco v1 má
**routy** (`home`, `gallery`, `pricing`, …). Rozhodnutí, jak to sladit, je v
[impl-plan-v1.md](./impl-plan-v1.md) — vizuál se tím nemění, mění se jen navigace.

---

## 6. Pasti při přepisu do uu5

- **`oklch` v `uu5g05` stylech.** Chrome 111+ to umí, ale jestli se barvy protahují přes
  nějakou uu5 utilitu, která je parsuje, spadne to na neznámém formátu. Proto je v tabulce
  hex fallback — začít s hexy, `oklch` až když se ověří, že projde.
- **Fonty se musí načíst.** Fraunces ani Karla nejsou systémové. Buď `<link>` na Google Fonts
  v `client/index.html`, nebo (lepší pro GAE a offline) `.woff2` do `client/public/assets/fonts/`
  a `@font-face`. Bez toho spadne sazba na Georgia/system-ui a vzhled se rozpadne.
- **Fraunces je variabilní font s osou `SOFT` a `WONK`.** Statická instance stačí; jen je
  potřeba vzít váhu 600, ne 400 — v 400 nadpisy zeslábnou.
- **Negativní `letter-spacing` na nadpisech** se snadno zapomene, protože v uu5 se nadpisy
  často berou přes hotovou komponentu s vlastní sazbou. Zkontrolovat.
