# Implementační plán: rezervační flow se zálohou

Podklad: [proposal-reservation-flow.md](./proposal-reservation-flow.md) (stavy, přechody,
struktura dokumentu, texty e-mailů). Tenhle soubor říká **jak a v jakém pořadí**.

- **Stav (2026-10-08):** plán, čeká na schválení.
- **Cron** (§ 4 návrhu) je mimo tenhle plán.
- **Struktura souborů:** podle konvence repa: server `server/<entita>/{dao,crud,api}.js` +
  `server/services/`, admin `client/src/admin/{screens,components}/`.

## 0. Etapy

| # | Etapa | Výsledek, který jde ověřit |
|---|---|---|
| E1 | Server: stavy, platby, historie, use casy | testy stavového automatu a výpočtu plateb; průchod celým flow přes API |
| E2 | E-maily: šablony, layout, QR, odesílání | náhled všech e-mailů v prohlížeči; QR načtený bankovní appkou; e-maily zapsané v `eventList` |
| E3a | `caio-ui`: akce řádku v `UiElements.Crud` s `key` a přetížitelnými výchozími hodnotami (§ 4.1) | ukázka v `caio-exampleapp`, README |
| E3b | Admin: seznam, modál změny stavu, úprava, detail | ruční průchod flow v prohlížeči (subagent `tester`) |
| E4 | Uklizení a dokumentace | `decisions.md`, `release.md` (nové env), `wip.md`; oponentní review |

- **Vývoj** bez commitu, commit až na pokyn.
- **Testy** přes vestavěný `node --test`. Propertyman dnes test runner nemá a kvůli tomuhle se nepřidává žádná závislost.

---

## 1. E-maily (E2): kde a v jaké formě jsou šablony

### Kde

```
server/email/
├── templates/                 # jeden soubor = jeden e-mail (13 souborů)
│   ├── request-received.js    # H1
│   ├── owner-new-request.js   # V1
│   ├── deposit-requested.js   # H2
│   ├── …
│   └── owner-deposit-overdue.js  # V2 (připravené pro cron, zatím se nevolá)
├── blocks.js                  # stavební kameny: p(), facts(), payment(), quote(), signature()
├── render.js                  # bloky → { text, html, attachments }
├── layout.js                  # HTML obálka + patička „neodpovídejte“ (jen e-maily hostovi)
├── qr-payment.js              # SPAYD řetězec + PNG
├── format.js                  # data, ceny, termín („7. 11. 2026 – 9. 11. 2026 (2 noci)“)
└── send.js                    # render + odeslání přes caio-server Mailer.send + záznam do eventList
```

Dnešní `server/services/email.js` zmizí, jeho tři e-maily se přepíšou do šablon.

### Jazyky (rozhodnutí majitele 2026-10-08)

- **Jazyky webu:** zatím `cs`, `en`, `de`, `sk`, přepínač jazyků je v appce. Od 2026-10-14 i `pl`
  (`docs/decisions.md` § Frontend).
- **Teď jen čeština:** všechny šablony vzniknou **jen česky**. Ostatní jazyky se doplní **na konci, až
  bude celé flow hotové**. Struktura šablon je na to připravená (jazyk = klíč v šabloně, viz
  příklad níž) a jazyk přibude bez zásahu jinam. **Doplněno 2026-10-14:** šablony hostovi jsou
  ve všech pěti jazycích (`docs/decisions.md` § Frontend, bod o jazycích).
- **Odkud se jazyk bere:**
  - z FE: formulář posílá `lang` z **`useLanguage()`** v `reservation/create`;
  - server ho ověří proti seznamu jazyků webu a uloží na rezervaci (`lang`).
- **Změna jazyka:** v **modálu změny stavu** jde jazyk změnit při posílání e-mailu (výběr „Jazyk
  e-mailu“, předvyplněný z rezervace). Totéž platí ve formuláři úpravy a nové rezervace. Změna se
  uloží do rezervace, takže v ní půjdou i další e-maily.
- **Chybějící překlad:** výběr nabízí jen jazyky, pro které existují šablony (zpočátku jen CZ).
  Když rezervace nese jazyk bez šablony (host psal anglicky dřív, než budou anglické e-maily),
  odejde **česky**. Do `eventList` se zapíše jazyk, který opravdu odešel.
- **Formátování podle jazyka** (`format.js`, přes `Intl`): datum, cena, počet nocí. Pro všechny jazyky webu se připraví hned, je to pár řádků.
- **E-maily vlastníkovi** jsou jen česky. **QR** je pro všechny jazyky stejný.

### V jaké formě: JS modul vracející bloky, ne HTML ani textový soubor

```js
// server/email/templates/deposit-requested.js  (H2)
import { p, facts, payment, quote, signature } from "../blocks.js";
// formátovač `f` (datum, cena, termín podle jazyka) předává renderer

export default {
  code: "depositRequested",
  recipient: "guest",

  // Jeden jazyk = jedna dvojice funkcí. `f` je formátovač pro daný jazyk (datum, cena, termín).
  cs: {
    subject: (r, f) => `Termín je pro vás volný — prosíme o zálohu do ${f.date(r.payment.deposit.dueDate)}`,
    body: (r, f) => [
      p("Dobrý den,"),
      p(`termín ${f.stay(r)} je pro vás volný a rádi vás u nás přivítáme.`),
      facts([
        ["Počet osob", r.guestCount],
        ["Celková cena", f.price(r.payment.totalPrice)],
        r.payment.balance && ["Záloha", `${f.price(r.payment.deposit.amount)}, splatná do ${f.date(r.payment.deposit.dueDate)}`],
        r.payment.balance && ["Doplatek", `${f.price(r.balanceAmount)}, splatný do ${f.date(r.payment.balance.dueDate)}`],
      ]),
      r.message && quote(r.message),        // „Zpráva hostovi“ z modálu
      payment("deposit", r),                // tabulka platebních údajů + QR (popisky podle jazyka)
      p(`Termín pro vás držíme do ${f.date(r.payment.deposit.dueDate)}. …`),
      signature(),
    ],
  },
  en: {
    subject: (r, f) => `Your dates are available — please pay the deposit by ${f.date(r.payment.deposit.dueDate)}`,
    body: (r, f) => [
      p("Hello,"),
      p(`your stay ${f.stay(r)} is available and we look forward to welcoming you.`),
      // … stejné bloky, anglicky
    ],
  },
};
```

**Proč takhle:**

- **Jeden zdroj pro text i HTML.** Každý e-mail se posílá ve dvou verzích (`text/plain` +
  `text/html`) a textová se ukládá do `eventList`. Z jedněch bloků se vyrobí obě, takže se
  nemůže stát, že majitel opraví větu v HTML a v textu zůstane stará.
- **Podmíněné řádky** (`[…]` v návrhu) jsou obyčejné `&&`. Prázdné bloky renderer vynechá.
  Šablonovací jazyk (Handlebars, Mustache) by na totéž potřeboval vlastní syntaxi a novou
  závislost. MJML/React-email by kvůli 13 jednoduchým e-mailům přinesly build krok.
- **Formátování na jednom místě** (`format.js`): data, ceny i „2 noci / 5 nocí“. Dnes ho
  každá funkce v `email.js` dělá trochu jinak.
- **Testovatelné:** šablona je čistá funkce `(rezervace) → bloky`. Test vyrenderuje všech
  13 e-mailů ve všech jazycích, které šablona má, se vzorovými daty. Kontroluje, že v nich není `undefined`,
  `NaN` ani prázdná zástupka a že **všechny jazykové verze mají stejné bloky** (stejný počet
  plateb a QR), aby překlad nezapomněl třeba na doplatek.
- **Jazykové verze v jednom souboru** vedle sebe. Při změně české věty jsou překlady o pár
  řádků níž a nezapomenou se. Slovník v jiném souboru (LSI) by se tu rozjížděl snáz.
- **Patička** („generovaný e-mail, neodpovídejte“) a popisky v bloku platby jsou v `layout.js` a `blocks.js`, pro každý jazyk zvlášť.

**Bloky** (`blocks.js`):

| Blok | Text | HTML |
|---|---|---|
| `p(text)` | odstavec | `<p>` |
| `facts([[popisek, hodnota], …])` | zarovnané dvojice | tabulka o dvou sloupcích |
| `payment({...})` | číslo účtu, částka, VS, splatnost | tabulka a **QR obrázek** pod ní (§ 2) |
| `quote(text)` | odsazený text | zvýrazněný blok (zpráva vlastníka) |
| `link(text, url)` | `text: url` | `<a>` |
| `signature()` | „Roubený ráj“ | totéž |

**Layout** (`layout.js`):
- **HTML:** obálka s inline styly. Žádné externí CSS, fonty ani obrázky, jediný obrázek je QR přes `cid`. Šířka 600 px, barvy z `client/src/config/theme.js` přepsané do konstant.
- **Patička:** u e-mailů hostovi (`recipient: "guest"`) layout přidá patičku „Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím. Kontakt: …“, takže ji šablona neopakuje.

**Odesílání** (`send.js`, transport je `caio-server` `Mailer.send` — TLS, timeouty a SMTP proměnné na jednom místě):
- **Bez Reply-To:** e-maily hostovi jdou z `MAIL_FROM` bez `Reply-To`. V1 má `Reply-To` na hosta.
- **Záznam do historie:** výsledek (`sent` / `failed` + chyba) vrací jako záznam pro `eventList`.
- **Chyba neshodí přechod:** selhání se nevyhazuje, stejně jako dnes.
- **Bez SMTP** vrací `status: "skipped"`.

### Jak si majitel e-maily zreviduje

- **`npm run email:preview`** vyrenderuje všech 13 e-mailů se vzorovou rezervací (ve všech
  jazycích, které šablony mají) do `tmp/email-preview/index.html`: HTML a textová verze vedle sebe, včetně QR. Přes stejný soubor
  si je majitel zreviduje („zreviduji potom“) i bez spuštěné appky.
- **V modálu změny stavu** se ukáže předmět a text e-mailu, který odejde. Vrací ho nový use case
  `reservation/emailPreview` stejnou šablonou, takže náhled je přesně to, co dorazí.

### E-maily ve vývoji

Majitel v `.env.development` zakomentoval SMTP (2026-10-08), takže ve vývoji se nic neodesílá.
- **Historie:** e-mail se do `eventList` zapíše se `status: "skipped"` a důvodem
  `smtpNotConfigured`. Historie v detailu ukazuje i to, co by se poslalo (předmět a text).
- **Obsah e-mailů** je vidět v náhledu (`npm run email:preview`) a v modálu změny stavu.
- **Skutečné doručení** (Gmail, Seznam, QR v poštovním klientovi) se ověří, až bude vybraný SMTP
  účet. Do té doby jde poslat zkušební e-mail jednorázově skriptem s ručně zadaným SMTP.

---

## 2. QR platba (E2)

### Řetězec (SPAYD, standard České bankovní asociace)

`server/email/qr-payment.js`, vlastní funkce bez závislosti:

```
SPD*1.0*ACC:CZ9808000000006338724003*AM:4500.00*CC:CZK*DT:20261011*X-VS:26110701*MSG:ROUBENY RAJ ZALOHA 7.11.2026
```

| Pole | Hodnota | Pravidlo |
|---|---|---|
| `ACC` | IBAN z configu | povinné |
| `AM` | částka | dvě desetinná místa, tečka |
| `CC` | `CZK` | |
| `DT` | splatnost `YYYYMMDD` | banka ji předvyplní jako datum splatnosti |
| `X-VS` | variabilní symbol | max. 10 číslic |
| `MSG` | zpráva pro příjemce | **bez diakritiky** (ne všechny appky ji čtou), max. 60 znaků, `*` se escapuje |

### Obrázek

- **Knihovna:** npm **`qrcode`** 1.5.4 (MIT, jediná nová runtime závislost). `QRCode.toBuffer(spayd, { type: "png", errorCorrectionLevel: "M", margin: 4, width: 300 })`.
- **Ukládání:** **neukládá se**. Vyrobí se při každém odeslání z `payment` v dokumentu, takže `eventList` drží jen text.

### Vložení do e-mailu: inline příloha (`cid`)

```js
attachments: [{ filename: "qr-platba.png", content: pngBuffer, contentType: "image/png", cid: "qr-platba" }]
// v HTML:
<img src="cid:qr-platba" width="200" height="200" alt="QR platba">
```

**Proč `cid` a ne jiný způsob:**

- **`data:` URI** v `<img>` Gmail odstraňuje, QR by se nezobrazil.
- **Odkaz na obrázek na našem serveru** by potřeboval veřejný endpoint s platebními údaji
  v URL. Řada klientů (Outlook, Seznam) navíc obrázky z internetu bez povolení nenačítá.
- **`cid`** je součást e-mailu, zobrazí se hned a nic se nestahuje.
  - **Vedlejší efekt:** některé klienty ho navíc ukážou jako přílohu „qr-platba.png“. Je to přijatelné a hostovi se hodí.

**Textová verze** QR nemá, platební údaje jsou v ní vypsané. Pod obrázkem v HTML je popisek
„QR Platba — naskenujte v bankovní aplikaci“.

### Ověření

- **Unit test:** tvar řetězce, zaokrouhlení částky, odstranění diakritiky, escapování, limit 60 znaků.
- **Ručně** (majitel nebo já s tebou):
  - naskenovat QR z náhledu aspoň dvěma bankovními appkami (Česká spořitelna George + jedna další);
  - zobrazit e-mail v Gmailu a v Seznam poště.

  Tohle je jediný krok, který neověří test.

---

## 3. Server (E1)

### Nové soubory

| Soubor | Obsah |
|---|---|
| `server/reservation/states.js` | `STATE_LIST`, `BLOCKING_STATE_LIST`, tabulka `TRANSITIONS` (akce → z jakých stavů, do jakého, jaký e-mail) |
| `server/reservation/payment.js` | `createPaymentPlan({ totalPrice, dateFrom, today })`: záloha 50 %, nebo celá částka při ≤ 14 dnech do příjezdu; splatnosti; `nextVariableSymbol(dateFrom)` |
| `server/reservation/history.js` | stavba událostí (`created`, `transition`, `update`) a diff změn (`[{ field, from, to }]`) |

### Změny

| Soubor | Změna |
|---|---|
| `server/config.js` | blok `reservation` (§ 7 návrhu): `bankAccount` a `contact` (telefon, e-mail do patičky; zrcadlí `client/src/components/contact/content.js`) |
| `server/reservation/dao.js` | blokace přes `state: { $in: BLOCKING_STATE_LIST }` (`findOverlapping`, `findForExport`); unikátní částečný index na `payment.variableSymbol`; `findByVariableSymbolPrefix` |
| `server/reservation/crud.js` | `createFromWeb` (stav `requested` + událost); `createManual` (`asConfirmed`); `transition`; `updateWithHistory`; `toAdminDto` dopočítá `nights` a `balanceAmount` a ve výpisu vynechá `eventList`; `syncFeed` přestane ukládat `nights` |
| `server/reservation/api.js` | use casy níž; `reservation/setState` zmizí |
| `server/services/email.js` | smazat (nahrazuje `server/email/`) |

### Use casy

| Use case | Kdo | dtoIn → co dělá |
|---|---|---|
| `reservation/create` | veřejný | jako dnes (captcha, DNS e-mailu, rate limit) → `requested`, událost `created`, H1 + V1 |
| `reservation/list` | admin | `state` = konkrétní stav nebo `"active"`; bez `eventList` |
| `reservation/get` | admin | celý dokument včetně `eventList` |
| `reservation/createManual` | admin | `…pobyt, kontakt, asConfirmed = true, sendEmail = true, message?` → `confirmed` (H5), nebo `awaitingDeposit` (H2) |
| `reservation/update` | admin | `id, …změny (termín, osob, cena, záloha, splatnosti, kontakt, note, desc), sendEmail = true, message?` → událost `update` s diffem; H9 jen u `awaitingDeposit`/`confirmed` a jen když se změnilo něco, co host vidí |
| `reservation/transition` | admin | `id, action, sendEmail = true, message?, paidDate?` → ověří přechod (jinak `409 invalidTransition`), provede, událost, e-mail |
| `reservation/emailPreview` | admin | `id, action` nebo `id, changes` → `{ template, to, subject, text }` bez odeslání |
| `reservation/delete` | admin | beze změny |

### Variabilní symbol

`YYMMDD` data příjezdu + dvoumístné pořadí:
- **Pořadí:** nejvyšší existující s tímhle prefixem + 1.
- **Souběh:** chrání ho unikátní index. Při kolizi (`E11000`) se zkusí další číslo, nejvýš 3×.
- **Kdy vzniká:** až při přijetí, ne u žádosti. Zamítnuté žádosti tak čísla nepálí.

### Časová zóna

„14 dní a méně“ i výchozí splatnosti se počítají z **dnešního data v Europe/Prague**, ne z UTC.
Kolem půlnoci by jinak vycházely o den jinak. Na to je test.

---

## 4. Admin (E3)

### Soubory

| Soubor | Obsah |
|---|---|
| `client/src/admin/screens/reservations.jsx` | seznam, přepsaný |
| `client/src/admin/screens/reservation-detail.jsx` | detail, routa `admin/reservation?id=` |
| `client/src/admin/components/reservation/summary.jsx` | bloky Pobyt / Kontakt / Platby / Poznámka; sdílí je modál i detail |
| `client/src/admin/components/reservation/transition-modal.jsx` | modál změny stavu |
| `client/src/admin/components/reservation/history.jsx` | časová osa z `eventList`, rozbalitelný text odeslaného e-mailu |
| `client/src/admin/components/reservation/fields.js` | `fieldCfg` pro `Crud.generate` / `generateInputs`: sloupce i pole úpravy a nové rezervace |
| `client/src/admin/components/reservation/actions.js` | zrcadlo `TRANSITIONS` pro UI (co nabídnout, co je „další krok“); autoritativní je server |
| `client/src/router.jsx` | `"admin/reservation"` |
| `client/src/admin/calls.js` | `getReservation`, `transition`, `emailPreview`, `createManual`, `updateReservation` |
| `client/src/lsi/cs.json` | stavy, akce, popisky |

### 4.1 Rozšíření `UiElements.Crud` v `caio-ui` (rozhodnutí majitele 2026-10-08)

**Dnes:** `Crud` dává akce aplikace (`getItemActionList`) jen **do menu „⋮“**
(`caio-ui/src/caio-ui-elements/crud.jsx`, `getActionList`). Viditelné jsou jen jeho vlastní
ikony Upravit a Smazat.

**Jak to funguje pod kapotou** (ověřeno v dist bundlech `uu5tilesg02-elements` 2.28.2 a
`uu5g05-elements` 1.52.1):
- **Kam akce jdou:** akce řádku tabulky jdou beze změny do `Uu5Elements.ActionGroup` (`itemList`).
- **`collapsed`:** `ActionGroup` u každé položky čte `"never"` (vždy v řádku), `"always"` (vždy
  v menu „⋮“), `"auto"` (výchozí: do menu, když není místo) a `"duplicated"` (v řádku i v menu);
  `true`/`false` převádí na `always`/`never`.
- **Menu „⋮“ kreslí `ActionGroup` sám.** `primary: true` řadí položku v menu nahoru.

**Návrh: vestavěné akce mají `key` a aplikace je může přetížit**

Každá akce, kterou `Crud` kreslí sám, dostane `key`. Akce z `getItemActionList` se stejným
`key` se do vestavěné **slije** (`{ ...výchozí, ...z aplikace }`), takže aplikace přepíše
cokoli: `collapsed`, `colorScheme`, `significance`, `icon`, `children`, `tooltip`,
`disabled` i `onClick`. Akce s jiným nebo žádným `key` jsou vlastní akce aplikace.

| `key` | Výchozí (nastaví `Crud`) |
|---|---|
| `update` | `icon: "uugds-pencil"`, `collapsed: "never"` (s `compact` `"always"`); jen když má `Crud` formulář (`children`) |
| `delete` | `icon: "uugds-delete"`, `colorScheme: "negative"`, `collapsed: "never"` (s `compact` `"always"`) |
| `displayData` | `collapsed: "always"` |
| `copyId` | `collapsed: "always"` |
| vlastní akce aplikace | `collapsed: "always"`, pokud ho aplikace neuvede (= do menu, jako dnes) |

```jsx
<UiElements.Crud
  getItemActionList={({ data }) => [
    // vlastní akce v řádku
    { collapsed: "never", children: "Přijmout", colorScheme: "primary", significance: "highlighted",
      onClick: () => openTransition(data.data, "approve") },
    // vlastní akce v menu (výchozí)
    { children: "Zamítnout", onClick: () => openTransition(data.data, "reject") },
    // přetížení vestavěné: smazat do menu
    { key: "delete", collapsed: "always" },
    // skrytí vestavěné
    { key: "copyId", hidden: true },
  ]}
>
```

**Implementace** (`caio-ui/src/caio-ui-elements/crud.jsx`, `getActionList`):

```js
const builtIn = {
  update: children && { key: "update", icon: "uugds-pencil", label: updateLsi, collapsed: compact ? "always" : "never",
                         disabled: data.state === "pending", onClick: () => setEditData({ … }) },
  delete: { key: "delete", icon: "uugds-delete", label: deleteLsi, colorScheme: "negative",
             collapsed: compact ? "always" : "never", disabled: data.state === "pending", onClick: () => setRemoveData({ … }) },
  displayData: { key: "displayData", icon: "uugdsstencil-it-json", label: displayDataLsi, collapsed: "always", onClick: … },
  copyId: { key: "copyId", icon: "uugds-copy", label: copyIdLsi, collapsed: "always", onClick: … },
};

const own = [];
for (const action of propsGetItemActionList?.({ data }) ?? []) {
  if (!action) continue;
  if (action.key && builtIn[action.key]) builtIn[action.key] = { ...builtIn[action.key], ...action };
  else own.push({ collapsed: "always", ...action });
}

return [...own, builtIn.update, builtIn.delete, builtIn.displayData, builtIn.copyId]
  .filter((action) => action && !action.hidden)
  .map(({ key, hidden, label, ...action }) => ({
    ...action,
    // Vestavěné akce v řádku jsou jen ikona s tooltipem, v menu potřebují text.
    children: action.children ?? (action.collapsed === "never" ? undefined : label),
    tooltip: action.tooltip ?? label,
  }));
```

- **`key`, `hidden` a `label` patří `Crud`**, do `ActionGroup` nejdou. Položky se tam rozkládají
  do props tlačítek a `key` by skončil jako React klíč.
- **Vlastní „⋮“ s `itemList` zmizí**, menu kreslí `ActionGroup`. Pro stávající appky se nic nemění:
  jejich akce bez `collapsed` dostanou `"always"` a skončí v menu jako dnes.
- **`readOnly`** se chová jako dnes (žádné akce řádku).
- **Ověření:**
  - tabulka i dlaždice (`tile`; dlaždice berou stejné `getActionList`) v `caio-exampleapp`;
  - stávající akce v menu v afkbratcice a caio-apps.
- **Dokumentace a verze:** `caio-ui` README (sekce Crud, „Akce řádku“, tabulka klíčů výš), `docs/release-candidate.md` → *Přidáno*. Patch (0.4.1 → 0.4.2).
- **Do propertyman** se to do vydání dostane přes `link-local --ui`.

### 4.2 Seznam (`admin/reservations`)

- **Tabulka:** `UiElements.Crud` s `fieldCfg` (`components/reservation/fields.js`).
- **„Další krok“:** akce s `collapsed: "never"` podle stavu (Přijmout / Záloha přijata / Doplatek přijat /
  Ukončit pobyt). Ostatní povolené akce jsou v menu. Každá otevře **modál změny stavu**.
- **Úprava a nová rezervace:** **vestavěný formulářový modál `Crud`** (`children` →
  `Crud.generateInputs`), stejně jako dnes. Pole jsou na hranici API plochá, stejně jako
  `contactName`:
  - `depositAmount`, `depositDueDate`, `depositPaidDate`, `balanceDueDate`, `balancePaidDate`, `desc`;
  - k nim `sendEmail`, `lang`, `message` a u nové rezervace `asConfirmed`.

  Server z nich skládá `payment`. Pole, která dávají smysl jen v některém stavu (splatnosti,
  „Poslat e-mail o změně“), se zobrazí podle `children({ type, data })`.
- **Mazání:** jak ho `Crud` nabízí dnes, se svým potvrzením.
- **Detail:** jméno hosta ve sloupci je odkaz na `admin/reservation?id=…` a v menu je akce „Detail“. Klik na celý řádek `Crud` neumí (uu5tiles ho nevystavuje), proto odkaz.

### 4.3 Modál změny stavu

- **Komponenta:** vlastní `Uu5Elements.Modal` (`transition-modal.jsx`), otevřený z akcí `Crud` a z detailu.
- **Tělo:** `summary` (všechny údaje) a pod ním:
  - zaškrtávátko „Poslat hostovi e-mail“ (výchozí zaškrtnuté);
  - výběr **„Jazyk e-mailu“** (uu5 input `Language`, jazyky, pro které jsou šablony; předvyplněný z rezervace);
  - pole „Zpráva hostovi“;
  - náhled (předmět a rozbalitelný text z `reservation/emailPreview` ve vybraném jazyce);
  - u „Záloha přijata“ / „Doplatek přijat“ pole „Zaplaceno dne“ (výchozí dnešek).
- **Patička:** „Zavřít“ a tlačítka všech povolených akcí. Ta, kterou se modál otevřel, je primární.
- **Po akci:** reload seznamu nebo detailu, alert s výsledkem. Když e-mail selhal, alert to řekne.

### 4.4 Detail (`admin/reservation?id=`)

- **Obsah:** `summary` a `history`.
- **Tlačítka:** **Upravit** (stejný formulářový modál jako `Crud`, sdílený `fieldCfg`) a akce stavu → modál změny stavu.
- **Importy:** jen pro čtení. **Blokace:** bez akcí stavu, úprava ano.

---

## 5. Ověření

| Co | Jak |
|---|---|
| Stavový automat | `node --test`: každá akce z každého stavu; povolené projdou, ostatní `invalidTransition` |
| Plán plateb | `node --test`: 50 % vs. celá částka (hranice 14 / 15 dní), zaokrouhlení, splatnosti, Europe/Prague kolem půlnoci |
| VS | `node --test` + skutečné Mongo: pořadí v den, kolize indexu |
| E-maily | `node --test`: všech 13 šablon se vzorovými daty; žádné `undefined`/`NaN`; patička jen u hostovských |
| SPAYD | `node --test`: formát, diakritika, escapování, délka |
| Celé flow přes API | skript nad běžícím serverem a lokálním Mongem (SMTP v dev vypnuté, e-maily `skipped`, obsah v `eventList`): žádost → přijmout → úprava splatnosti → záloha → doplatek → ukončit; a větve zamítnout / propadlo / obnovit / storno; kontrola `eventList` |
| QR | ruční sken náhledu dvěma bankovními appkami; zobrazení v Gmailu a Seznamu |
| Admin | subagent `tester` v prohlížeči: seznam, filtr Aktivní, další krok, modál, úprava, detail, historie |
| Celé | oponentní review (druhý agent, scénáře selhání) |

## 6. Rizika

- **Gmail ořízne HTML nad ~102 kB** („Zobrazit celou zprávu“). Naše e-maily mají jednotky kB
  plus QR jako přílohu, takže limit nehrozí. Hlídá ho test velikosti.
- **`cid` v Seznam poště:** neověřené, ověří se ručním testem. Kdyby QR nezobrazila, záložní
  plán je přiložit ho jako běžnou přílohu s odkazem v textu.
- **`MAIL_FROM` musí být „noreply“ adresa**, jinak odpovědi skončí v osobní schránce.
  Souvisí s výběrem SMTP účtu (`wip.md`).
- **Nová závislost `qrcode`** (a její `pngjs`) jde do `package.json` serveru, ne klienta.
