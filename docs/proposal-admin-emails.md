# Návrh: ruční odeslání e-mailů z administrace

- **Stav (2026-11-19):** **implementováno** podle tohoto návrhu (server, šablony, admin, testy).
  Odchylky od textu níž:
  - uu5 nemá colorScheme `success`, jeho uuGDS obdobou je `positive`. Kde návrh píše `success`,
    server posílá a admin kreslí `positive`;
  - kód ke schránce je v dokumentu rezervace jako `keyCode` (ne `arrival.keyCode`);
  - náhled vrací i `wifiMissing`, podle něj modál upozorní na chybějící Wi-Fi.
- **Podklad:** priorita ve [wip.md](./wip.md) (informace k příjezdu posílá majitelka z administrace)
  a rozbor šablon: 4 ze 13 e-mailů dnes nejde odeslat vůbec, protože je neposílá žádný přechod
  ani akce a cron `reservation/tick` je odložený.

## 1. Rozhodnutí majitelky (2026-11-19)

1. **Připomínka platby** se ve chvíli, kdy je potřeba, ukáže přímo v řádku seznamu i v hlavičce
   detailu jako tlačítko `warning` / `highlighted`. Tlačítko „… přijata“ je pak jen ikona
   s tooltipem (`success` / `highlighted`). Připomínka jde poslat i **po splatnosti zálohy**.
   Když je záloha po splatnosti a už nastal čas celé platby, e-mail rovnou žádá **celou částku**.
2. **Informace k příjezdu** jdou poslat i před zaplacením doplatku, modál na to upozorní.
   **3 dny před příjezdem** je akce v řádku a v detailu na prvním místě jako `building` /
   `highlighted`. **2 dny před příjezdem** a později jako `success` / `highlighted`. **Po odeslání**
   se už takhle nezobrazuje. Když doplatek není zaplacený, ukáže se navíc připomínka podle bodu 1.
3. **Kód ke schránce na klíče** jde u rezervace nastavit kdykoli. Při odesílání informací
   k příjezdu se předvyplní.
4. **Jazyk zvolený v modálu** se stane jazykem rezervace, stejně jako u změny stavu.
5. **Informace k příjezdu v řádku seznamu:** ano, podle bodu 2.
6. **Připomínka platby zůstává výrazná, dokud se nezaplatí**, i po odeslání.
7. **Čas celé platby** nastává 3 dny před splatností doplatku.
8. **Celá částka** se platí do splatnosti doplatku, a když už uplynula, co nejdříve.
9. **Změna kódu ke schránce** po odeslání informací k příjezdu nic nezvýrazní. Majitelka je
   případně pošle znovu z menu.
10. **Informace k příjezdu dřív než 3 dny před příjezdem** jsou jen v menu a jen když je
    všechno zaplaceno.

## 2. Které e-maily

| Šablona | Komu | Dostupná (v menu), když |
| --- | --- | --- |
| `depositReminder` (H4) | host | stav `awaitingDeposit` (před splatností i po ní) |
| `balanceReminder` (H10) | host | stav `confirmed`, doplatek existuje, není zaplacený a je větší než 0 (stejná podmínka jako u „Doplatek přijat“) |
| `arrivalInfo` (H7) | host | stav `confirmed`, pobyt neskončil (`dateTo` > dnes) a buď je všechno zaplaceno, nebo do příjezdu zbývají 3 dny a méně |
| `ownerDepositOverdue` (V2) | majitelka | **nenabízí se**, zůstává pro cron |

Všechny tři akce platí jen pro rezervaci hosta (ne pro import ani blokaci) a jen když host má
e-mail. Bez e-mailu se akce nezobrazí vůbec, stejně jako se nezobrazí v jiném stavu.

**Dostupná** znamená, že akce je vždy v menu „⋮“ (seznam) nebo v „Poslat e-mail ▾“ (detail)
a jde poslat i opakovaně. **Výrazná** (§ 3) znamená, že je navíc vidět přímo v řádku a v hlavičce
detailu. Kdy je výrazná, rozhoduje server.

## 3. Kdy je akce výrazná

Okna navazují na původně plánovaný cron: připomínka zálohy 24 h před splatností, připomínka
doplatku 3 dny před splatností.

| Akce | Výrazná | Vzhled | Přestane být výrazná |
| --- | --- | --- | --- |
| Připomenout zálohu / platbu | od 1 dne před splatností zálohy | `warning` / `highlighted` | až přijetím zálohy, propadnutím nebo zrušením. Odeslání nic nemění. |
| Připomenout doplatek | od 3 dnů před splatností doplatku | `warning` / `highlighted` | až přijetím doplatku nebo zrušením. Odeslání nic nemění. |
| Poslat informace k příjezdu | 3 dny před příjezdem | `building` / `highlighted` | po odeslání |
| Poslat informace k příjezdu | 2 dny před příjezdem až do dne příjezdu | `success` / `highlighted` | po odeslání |

Připomínka tedy nepřestane být výrazná odesláním. Majitelka vidí, že platba pořád chybí, a modál
ukáže, kdy připomínka naposledy odešla. Prodloužení splatnosti úpravou připomínku posune: okno
se počítá od nové splatnosti.

Po odeslání informací k příjezdu je akce dál v menu (poslat znovu, třeba po změně kódu ke
schránce). Výrazná už ale není, ani po změně kódu.

Dřív než 3 dny před příjezdem jsou informace k příjezdu jen v menu a jen u plně zaplacené
rezervace. Dokud něco chybí, nabídnou se až 3 dny před příjezdem.

### Pořadí a vzhled tlačítek v řádku a v hlavičce detailu

Zleva:

1. **Poslat informace k příjezdu**, když je výrazná.
2. **Připomenout …**, když je výrazná.
3. **Další krok** (`nextAction`). Když je u něj výrazná připomínka, je „Záloha přijata“ /
   „Platba přijata“ / „Doplatek přijat“ **jen ikona s tooltipem**, `success` / `highlighted`.
   Bez připomínky zůstává jako dnes (text, `primary`).
4. Ostatní: v seznamu v menu „⋮“, v detailu další akce stavu, „Upravit“ a „Poslat e-mail ▾“.

Příklady (seznam, viditelná část řádku):

| Situace | Viditelná tlačítka |
| --- | --- |
| čeká na zálohu, splatnost zítra | [⚠ Připomenout zálohu] [✓] |
| čeká na zálohu, splatnost za 5 dní | [Záloha přijata] |
| potvrzeno, zaplaceno, příjezd za 3 dny | [Poslat informace k příjezdu] (`building`) |
| potvrzeno, doplatek po splatnosti, příjezd za 2 dny, nic neodesláno | [Poslat informace k příjezdu] (`success`) [⚠ Připomenout doplatek] [✓] |
| potvrzeno, doplatek po splatnosti, příjezd za 2 dny, informace odeslané, připomínka odeslaná | [⚠ Připomenout doplatek] [✓] |
| potvrzeno, zaplaceno, informace odeslané | nic navíc (další krok „Ukončit pobyt“ až po odjezdu) |

Detail:

```
Jana Nováková  20. 12. – 27. 12. 2026  [Potvrzeno]
  [Poslat informace k příjezdu] [⚠ Připomenout doplatek] [✓] [Ukončit pobyt] [Zrušit] [Upravit] [✉ Poslat e-mail ▾]
                                                                                              ├ Připomenout doplatek
                                                                                              └ Poslat informace k příjezdu
```

„Poslat e-mail ▾“ obsahuje vždy všechny dostupné e-maily, i ty, které jsou zrovna výrazné.
Když žádný e-mail není dostupný, tlačítko chybí.

Server do DTO přidá `emailActionList` (dostupné) a `emailHighlight` (výrazné:
`{ email, colorScheme }` v pořadí podle tohoto oddílu). Klient pravidla nepočítá, stejně jako
u `actionList` a `nextAction`.

## 4. Obsah připomínek podle fáze

**Připomínka zálohy (`depositReminder`):**

| Fáze | Kdy | Obsah |
| --- | --- | --- |
| před splatností | dnes ≤ splatnost zálohy | jako dnes: částka, splatnost, QR, „pokud nebude uhrazena do …, rezervaci zrušíme“ |
| po splatnosti | splatnost zálohy uplynula, čas celé platby ještě nenastal | **nový text:** záloha byla splatná do …, zatím ji neevidujeme, prosíme o úhradu co nejdříve, jinak rezervaci zrušíme. QR na zálohu. |
| čas celé platby | splatnost zálohy uplynula a do splatnosti doplatku zbývají 3 dny a méně (nebo už uplynula) | **nový text:** záloha je po splatnosti a blíží se i doplatek, proto prosíme o **celou částku** (záloha + doplatek) do splatnosti doplatku, a když už uplynula, co nejdříve. Jeden QR na celou částku se stejným variabilním symbolem. |

U platby celé částky (bez doplatku, „Připomenout platbu“) je fáze „čas celé platby“ zbytečná:
platba je celá už od začátku. Platí jen první dvě fáze.

**Připomínka doplatku (`balanceReminder`):**

| Fáze | Obsah |
| --- | --- |
| před splatností | jako dnes |
| po splatnosti | **nový text:** doplatek byl splatný do …, zatím ho neevidujeme, prosíme o úhradu co nejdříve. QR na doplatek. |

Všechny nové texty se píšou ve všech 5 jazycích webu. Fázi určuje šablona sama ze splatností
a dnešního data, modál jen ukáže náhled.

## 5. Kód ke schránce na klíče

- Nové pole rezervace `keyCode`, jen číslice, 3 až 10 znaků.
- **Nastavení kdykoli:** pole „Kód ke schránce na klíče“ ve formuláři úpravy rezervace hosta
  (ne u importu a blokace) a ve formuláři ruční rezervace. Patří do sledovaných polí historie
  (`TRACKED_FIELDS`), ne do polí, která host vidí: změna kódu sama e-mail o změně rezervace
  nepošle.
- **Detail:** kód je vidět ve shrnutí rezervace.
- **Modál informací k příjezdu:** pole je předvyplněné kódem z rezervace. Když ho majitelka
  v modálu změní, po úspěšném odeslání se nový kód uloží do rezervace.

## 6. Modál

Jeden modál `EmailModal` pro všechny tři e-maily. Otevře se s vybraným e-mailem a chová se jako
modál změny stavu (načte čerstvá data, náhled se znovu načítá při změně parametrů), jen nemá
akce stavu. Odeslání je jediné, co dělá, takže chybí zaškrtávátko „Poslat hostovi e-mail“.

```
┌ Poslat informace k příjezdu ─────────────────────────────────────── ✕ ┐
│ [shrnutí rezervace: host, kontakt, pobyt, osoby, cena, záloha, doplatek, kód]│
│                                                                       │
│ ⓘ Naposledy odesláno 15. 11. 2026 v 10:20.            (jen po odeslání)│
│ ⚠ Doplatek 7 500 Kč ještě není zaplacený. E-mail obsahuje i výzvu       │
│   k doplatku s QR kódem.                        (jen arrivalInfo + dluh) │
│                                                                       │
│ Kód ke schránce na klíče *  [ 4711      ]       (jen arrivalInfo)      │
│ Jazyk e-mailu               [ Čeština ▾ ]                              │
│ Zpráva hostovi              [                                       ]  │
│   Objeví se v e-mailu jako zvýrazněná zpráva od vás.                    │
│                                                                       │
│ E-mail: Informace k příjezdu — 20. 12. 2026                            │
│ Komu: jana@example.com                                                 │
│ Zobrazit náhled                                                        │
├───────────────────────────────────────────────────────────────────────┤
│                                                           [➤ Odeslat] │
└───────────────────────────────────────────────────────────────────────┘
```

**Obsah shora dolů:**

1. **Shrnutí rezervace** (`ReservationSummary`, stejné jako v modálu změny stavu, nově i s kódem
   ke schránce). Majitelka vidí, komu a k jakému pobytu píše, včetně částek a splatností.
2. **Upozornění** (jen když platí):
   - *Naposledy odesláno …*: z `reminder.<e-mail>SentAt`. Informativní, odeslání neblokuje.
   - *Fáze připomínky* (připomínky): „Záloha je po splatnosti. E-mail žádá úhradu co nejdříve.“
     nebo „Záloha je po splatnosti a blíží se doplatek. E-mail žádá celou částku 15 000 Kč.“
   - *Doplatek není zaplacený* (`arrivalInfo`): e-mail sám přidá výzvu k doplatku.
   - *V Nastavení chybí Wi-Fi* (`arrivalInfo`): e-mail půjde bez sekce Wi-Fi. Upozornění má odkaz
     do Nastavení.
3. **Kód ke schránce na klíče** (jen `arrivalInfo`): povinný, předvyplněný z rezervace (§ 5),
   numerická klávesnice na telefonu. Bez kódu se náhled nenačte a odeslat nejde.
4. **Jazyk e-mailu**: výchozí je jazyk rezervace, nabídka `emailLanguageList`. Po odeslání se
   stane jazykem rezervace.
5. **Zpráva hostovi**: volitelná, nejvýš 2000 znaků, stejné pole jako u přechodů. V e-mailu se
   objeví jako zvýrazněná citace pod úvodním odstavcem. Zapíše se i do historie.
6. **E-mail**: předmět, adresát a odkaz **Zobrazit náhled**. Otevře se stávající
   `EmailPreviewModal` (HTML s QR kódy, tak jak ho uvidí host).

**Patička:** jediné tlačítko **Odeslat**, u opakovaného odeslání **Odeslat znovu**. Zavírá se
křížkem v hlavičce, stejně jako modál změny stavu.

Odeslat jde, až když je načtený náhled **přesně pro aktuální** e-mail, jazyk, zprávu a kód.
Odešle se tedy jen to, co náhled ukázal (stejné pravidlo E3 jako u přechodů). Při psaní zprávy
nebo kódu se náhled načte s krátkou prodlevou a tlačítko je do té doby neaktivní.

**Po odeslání:** alert „E-mail odeslán“. Když SMTP selže nebo není nastavené, varovný alert se
stejnými texty jako u přechodů (`emailFailed` / `emailSkipped`). Pak se načte znovu seznam nebo
detail (výrazná tlačítka se přepočítají) a modál se zavře. Když se mezitím změnil stav a e-mail
už nedává smysl (server vrátí 409), modál to oznámí a tlačítko zmizí.

## 7. Server

- **`states.js`**:
  - tabulka `EMAIL_ACTIONS` vedle `TRANSITIONS`: e-mail → stavy, ve kterých smí, a `guard`
    (doplatek, konec pobytu);
  - `allowedEmails(item, ctx)`: dostupné e-maily pro rezervaci hosta s e-mailem;
  - `reminderPhase(item, ctx)`: fáze připomínky (§ 4);
  - `emailHighlight(item, ctx)`: výrazné akce a jejich `colorScheme` (§ 3).
- **DTO** (`toAdminDto`): nová pole `emailActionList`, `emailHighlight` a `keyCode`. `reminder`
  (časy odeslání) už v DTO je.
- **`reservation/sendEmail`** (POST, admin), dtoIn `{ id, email, lang?, message?, keyCode? }`:
  1. Ověří, že `email` je v `allowedEmails`. Jinak vrátí 409 s aktuálním stavem a seznamem.
  2. `keyCode` je povinný pro `arrivalInfo` (`/^\d{3,10}$/`). U ostatních e-mailů se nebere.
  3. Odešle e-mail a zapíše do historie událost `{ type: "email", email, phase?, message, emailList: [záznam] }`.
  4. Při stavu `sent` nastaví `reminder.<e-mail>SentAt` a změní jazyk rezervace. U `arrivalInfo`
     uloží i `keyCode`, pokud se liší. Zápis používá `updateIfCurrent` jako ostatní zápisy.
- **`reservation/sendEmailPreview`** (GET, admin): stejný dtoIn bez zápisu, vrací
  `{ email: { subject, to, text, html }, phase? }`. Pojmenování navazuje na `createEmailPreview` / `updateEmailPreview`.
- **`reservation/update` a `createManual`**: nové pole `keyCode` (§ 5).
- **Šablony**:
  - `depositReminder`, `balanceReminder` a `arrivalInfo` dostanou ve všech 5 jazycích
    `quote(c.message)` pod úvodní odstavec, jako mají šablony přechodů;
  - `depositReminder` dostane fáze „po splatnosti“ a „čas celé platby“ (§ 4), včetně bloku platby
    na celou částku (nový v `_shared.js` vedle `depositPayment` / `balancePayment`);
  - `balanceReminder` dostane fázi „po splatnosti“;
  - `arrivalInfo` vezme kód z rezervace, když ho volající nepředá.
- **Cron**, až přijde: hodnoty `reminder.*SentAt` z ručního odeslání se počítají, takže cron
  nepošle připomínku podruhé ve stejné fázi.

## 8. Klient

- `components/reservation/email-modal.jsx` (nový). Logika náhledu a odeslání se sdílí
  s `transition-modal.jsx`, kde to jde (načtení dat, klíč náhledu, alert podle výsledku e-mailu).
- `fields.jsx`:
  - `EMAIL_ACTION_META` (ikona, popisek, u `depositReminder` varianta „Připomenout platbu“ jako
    `actionLabelCode`);
  - pole `keyCode` ve formuláři úpravy a ruční rezervace.
  Ikony se při implementaci ověří přes uugds-icons.
- `reservations.jsx` a `reservation-detail.jsx`: pořadí a vzhled tlačítek podle § 3, sestavení
  ve sdílené funkci, ať se seznam a detail neliší.
- `summary.jsx`: kód ke schránce ve shrnutí.
- `history.jsx`: událost `email` s názvem e-mailu („E-mail: Připomínka zálohy“, u fáze např.
  „po splatnosti“), zprávou a záznamem odeslání (stávající `EmailRecord`).
- `calls.js`: `sendReservationEmail`, `previewReservationSendEmail`.
- LSI ve všech 5 jazycích: `admin.emailAction.*`, texty modálu, upozornění a pole kódu.

## 9. Testy

- Server:
  - dostupnost každého e-mailu podle stavu (včetně importu, blokace a hosta bez e-mailu)
    a u informací k příjezdu podle zaplacení a počtu dní do příjezdu;
  - `emailHighlight` na hranách oken (1 a 3 dny před splatností, 3 a 2 dny před příjezdem, den
    příjezdu), po odeslání připomínky (zůstává) a informací (mizí);
  - fáze připomínek a jejich texty ve všech jazycích, částka a QR u celé platby;
  - validace a uložení `keyCode`, událost v historii, `reminder.*SentAt` jen při `sent`,
    409 po změně stavu, zpráva v šablonách.
- Klient (tester): modál ve všech variantách, pořadí a vzhled tlačítek v seznamu i detailu,
  blokace odeslání bez náhledu nebo kódu, telefon, tmavý režim.

## Mimo rozsah

- Host zaplatí celou částku najednou po připomínce s celou částkou: dnes se to zapíše dvěma
  akcemi („Záloha přijata“ a hned „Doplatek přijat“). Jedna akce „Zaplaceno celé“ je samostatná
  změna stavového automatu.
- Automatické odesílání cronem (`reservation/tick`) zůstává odložené.
