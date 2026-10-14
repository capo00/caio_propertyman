# Návrh: rezervační flow se zálohou

- **Podklad:** dokument vlastníka „Rezervační flow – Roubenka U Vrabcu“.
- **Rozsah:** návrh mapuje podklad na to, co appka dnes umí, a říká, co se změní v datech, na serveru, v e-mailech a v adminu.
- **Stav (2026-10-08):** zapracovaná rozhodnutí majitele, **nic není implementované**. Texty e-mailů (§ 5) majitel zreviduje po implementaci.

## Rozhodnutí majitele (2026-10-08)

- **Stavy mění jen člověk.** Žádný stav se nemění automaticky, ani propadnutí zálohy.
  Automaticky chodí jen připomínky a informační e-maily (§ 4).
- **Změna stavu** se dělá v **modálu** se všemi údaji o rezervaci a tlačítky akcí v patičce.
- **E-mail u každé akce** se dá vypnout zaškrtávátkem „Poslat hostovi e-mail“. Ve výchozím stavu je zaškrtnuté.
- **Úprava rezervace** mění i termíny: pobyt, splatnost zálohy a splatnost doplatku.
  Prodloužení splatnosti je obyčejná úprava, ne zvláštní akce.
- **Název** v e-mailech: **Roubený ráj**.
- **Účet:** **6338724003/0800**. Kontrolní součet sedí, IBAN pro QR je CZ98 0800 0000 0063 3872 4003.
  V e-mailech s platbou musí být **QR kód**.
- **Doplatek** je splatný **14 dní před příjezdem**.
- **Informace k příjezdu** chodí **2 dny před příjezdem**. Je to konstanta v kódu.
- **Později** (zapsané ve `wip.md`): storno podmínky, odkaz na hodnocení a obsah informací k příjezdu.
- **Krátce před příjezdem:** když je při přijetí do příjezdu **14 dní a méně**, platí se **celá částka najednou**, bez doplatku (2026-10-08).
- **Připomínka doplatku:** ano, automaticky jako u zálohy.
- **Ruční rezervace z adminu:** zaškrtávátko „Vytvořit jako potvrzenou“, ve výchozím stavu zaškrtnuté.
  Nezaškrtnuté = vznikne `awaitingDeposit` a hostovi jde H2.
- **IBAN** majitel ověřil, sedí.
- **Bez migrace:** na produkci rezervace nejsou, lokální kolekce `reservation` byla 2026-10-08 smazaná (4 testovací záznamy).
- **Cron (§ 4) až později:** majitel zatím neví, jak se nastavuje. Do té doby žádné automatické e-maily.
- **Strukturu dokumentu (§ 2.1)** majitel schvaluje před implementací. V dokumentu se drží
  i komunikace s hostem: e-maily a zprávy u změn stavu.

## 1. Co je dnes a co se mění

| | Dnes | Nově |
|---|---|---|
| Stavy | `pending` → `confirmed` / `cancelled`, `completed` | 7 stavů se zálohou (§ 2) |
| Blokace termínu | blokuje všechno kromě `cancelled` | blokují `requested`, `awaitingDeposit`, `confirmed`; uvolňují `rejected`, `cancelled`, `expired` |
| Změna stavu | `reservation/setState` na libovolný stav | `reservation/transition` s pevnými přechody (§ 3) |
| Úprava | modál `Crud`, bez e-mailu | modál s termíny i splatnostmi a e-mailem o změně (§ 3) |
| E-maily | poptávka (host + vlastník), potvrzení, storno; prostý text | 9 hostovi + 2 vlastníkovi; HTML s QR platbou (§ 5) |
| Automatika | žádná | hodinový cron, jen e-maily: připomínka zálohy, info k příjezdu, upozornění vlastníka (§ 4) |
| Admin | tabulka s menu akcí | tabulka s tlačítkem „další krok“ → modál; detail jako routa (§ 6) |
| Historie | žádná | `eventList` na rezervaci: kdo, kdy, jaký přechod, jaký e-mail |

## 2. Stavy v databázi

Dokument má `NEW` i `PENDING_APPROVAL`. `NEW` by u nás trval jen do odeslání prvního e-mailu,
takže je to **jeden stav** `requested`. Zamítnutí má vlastní stav (`rejected`), protože má
jiný e-mail i význam než storno.

| Stav | Česky v adminu | Blokuje termín |
|---|---|:---:|
| `requested` | Nová žádost | ano |
| `awaitingDeposit` | Čeká na zálohu | ano |
| `confirmed` | Potvrzeno | ano |
| `completed` | Po pobytu | ano¹ |
| `rejected` | Zamítnuto | ne |
| `cancelled` | Zrušeno | ne |
| `expired` | Propadlo | ne |

¹ Pobyt je v minulosti, na blokaci nezáleží. Ponechané kvůli exportu a historii.

Všechny stavy kromě `requested` nastavuje vlastník akcí v adminu. Ruční záznam a import
vznikají rovnou jako `confirmed`, stejně jako dnes.

Typy blokace z dokumentu (PENDING / HOLD / BOOKED) vyplývají ze stavu, nejsou zvláštní pole.
Veřejný kalendář i iCal export dál ukazují jen „obsazeno“.

### 2.1 Struktura dokumentu v kolekci `reservation` — KE SCHVÁLENÍ

Jedna kolekce pro všechnu obsazenost zůstává (web, ruční záznamy, blokace, importy). Mění se
tvar peněz a přibývá historie s komunikací. Příklad rezervace z webu, která čeká na zálohu:

```jsonc
{
  "id": "6710c0ffee…",                    // Mongo _id, plní Dao
  "propertyId": "roubenka",
  "source": "web",                        // "web" | "manual" | kód iCal feedu ("booking", …)
  "icalUid": "res-…@caio-propertyman",
  "icalFeedCode": null,                   // null = vzniklo u nás (export ano, import nesahá)

  "state": "awaitingDeposit",             // § 2
  "lang": "cs",                           // jazyk hosta: "cs" | "en" | "de" | "pl" | "sk"; z useLanguage() na webu, mění se v modálu

  // Pobyt
  "dateFrom": "2026-11-07",
  "dateTo": "2026-11-09",                 // exkluzivní (den odjezdu)
  "guestCount": 4,
  "reason": null,                         // jen blokace: "maintenance" | "owner"

  // Host
  "contact": { "name": "Jan Novák", "email": "jan@seznam.cz", "phone": "+420 777 123 456" },
  "note": "Přistýlka prosím",             // poznámka hosta z formuláře
  "desc": null,                           // interní poznámka vlastníka, host ji nevidí

  // Peníze. null u blokací a importů.
  "payment": {
    "totalPrice": 9000,                   // dohodnutá cena; ceník se může změnit, vlastník ji může přepsat
    "variableSymbol": "26110701",         // YYMMDD příjezdu + pořadí; jeden VS na zálohu i doplatek
    "deposit": { "amount": 4500, "dueDate": "2026-10-11", "paidDate": null },
    "balance": { "dueDate": "2026-10-24", "paidDate": null }   // částka = totalPrice − deposit.amount
    // Při přijetí 14 a méně dní před příjezdem: deposit.amount = totalPrice, balance = null.
    // Do přijetí (`requested`) jsou deposit i balance null.
  },

  // Automatické e-maily, aby každý odešel jen jednou. Plní cron (§ 4, později).
  "reminder": {
    "depositSentAt": null,
    "balanceSentAt": null,
    "arrivalInfoSentAt": null,
    "depositOverdueSentAt": null
  },

  // Historie a komunikace s hostem, od nejstarší.
  "eventList": [
    {
      "at": "2026-10-07T19:40:12.345Z",
      "by": null,                         // null = host / systém, jinak { "identity": "…", "name": "…" }
      "type": "created",                  // "created" | "transition" | "update" | "reminder"
      "emailList": [
        {
          "template": "requestReceived",  // kód e-mailu (§ 5)
          "lang": "cs",
          "to": "jan@seznam.cz",
          "subject": "Přijali jsme vaši žádost o rezervaci — 7. 11. 2026 – 9. 11. 2026 (2 noci)",
          "text": "Dobrý den,\n\nděkujeme za zájem…",   // přesně to, co odešlo (textová verze)
          "status": "sent",               // "sent" | "failed"
          "error": null,
          "sentAt": "2026-10-07T19:40:13.002Z"
        },
        { "template": "ownerNewRequest", "to": "majitel@…", "subject": "…", "text": "…", "status": "sent", "error": null, "sentAt": "…" }
      ]
    },
    {
      "at": "2026-10-08T07:12:00.000Z",
      "by": { "identity": "1-2-3", "name": "Ondřej" },
      "type": "transition",
      "action": "approve",
      "from": "requested",
      "to": "awaitingDeposit",
      "message": "Těšíme se, přistýlku připravíme.",   // „Zpráva hostovi“ z modálu, vložená do e-mailu
      "sendEmail": true,                               // stav zaškrtávátka v modálu
      "emailList": [{ "template": "depositRequested", "…": "…" }]
    },
    {
      "at": "2026-10-10T18:03:00.000Z",
      "by": { "identity": "1-2-3", "name": "Ondřej" },
      "type": "update",
      "changes": [{ "field": "payment.deposit.dueDate", "from": "2026-10-11", "to": "2026-10-14" }],
      "message": null,
      "sendEmail": true,
      "emailList": [{ "template": "reservationChanged", "…": "…" }]
    }
  ],

  "clientIp": "…",                        // jen rate limit, nikdy se nevrací z API
  "sys": { "cts": "…", "mts": "…", "rev": 3 } // plní Dao
}
```

**Proč takhle:**

- **Odvozené hodnoty se neukládají** (rozhodnutí majitele 2026-10-08). Dopočítává je API a
  šablony e-mailů:
  - `nights` z termínu. Dnes uložené `nights` se rozchází: `syncFeed` při změně termínu
    importu přepíše data, ale počet nocí nechá starý.
  - cena za noc jako `totalPrice / nights`;
  - částka doplatku jako `totalPrice − deposit.amount`;
  - sazebník (dřív `channel`) podle `source`.

  Na seznamu v adminu se dál dá řadit podle nocí, protože tabulka řadí načtená data v prohlížeči a server
  `nights` přidá do odpovědi.

- **Komunikace patří k události, ne do zvláštního seznamu.** U každé změny stavu nebo úpravy je
  vidět, kdo ji udělal, co napsal hostovi (`message`) a které e-maily odešly. Historie
  v detailu je pak jen výpis `eventList`.
- **Ukládá se textová verze e-mailu, ne HTML.** Obsah je stejný, HTML se dá kdykoli vyrobit
  znovu a QR obrázek by zbytečně zvětšoval dokument. Jeden e-mail má zhruba 1–2 kB, celá
  historie rezervace desítky kB, hluboko pod limitem Monga.
- **Selhaný e-mail se zapíše se `status: "failed"`** a chybou. Přechod se tím nevrací,
  stejně jako dnes. V detailu je to vidět a půjde přidat „poslat znovu“.
- **Peníze v jednom objektu `payment`.** Uložená je jen dohodnutá cena (`totalPrice`) a
  záloha (`deposit.amount`, protože jde o rozhodnutí: 50 % zaokrouhleno, nebo ručně upraveno).
  Záloha i doplatek mají `dueDate` a `paidDate`.
  `paidDate` je datum, kdy peníze přišly: v modálu „Záloha přijata“ se předvyplní dnešek a
  jde přepsat.
- **Data bez času:** `dueDate` a `paidDate` jsou data (`YYYY-MM-DD`), splatnost platí do 23:59
  toho dne. Časové značky (`at`, `sentAt`) jsou ISO s časem v UTC, jako `sys.cts`.
- **Variabilní symbol** `YYMMDDNN` (datum příjezdu + pořadí v ten den): vlastník podle něj
  pozná pobyt i na výpisu z banky. Unikátní index.
- **`approvedAt` není samostatné pole**, vyčte se z `eventList`.
- **Co se nevrací ve výpisu:** `eventList` jen v detailu (`reservation/get`), ve výpisu ne,
  kvůli velikosti. `clientIp` nikdy.

**Blokace termínu a import** mají stejný tvar s `contact: null`, `payment: null` a
`eventList` jen se záznamem `created`.

**Indexy:**
- `{ dateFrom, dateTo }` a `{ state }`, jako dnes;
- unikátní `{ icalFeedCode, icalUid }` pro importy, jako dnes;
- nový unikátní `{ "payment.variableSymbol" }` (jen tam, kde je vyplněný).

Pro cron se později přidá `{ state, "payment.deposit.dueDate" }`.

**Bez migrace:** na produkci rezervace nejsou a lokální kolekce je smazaná.

## 3. Přechody a úpravy

### Přechody

Jediný use case `reservation/transition { id, action, sendEmail = true, message? }`. Server
ověří, že je akce z aktuálního stavu povolená, jinak vrátí `409 invalidTransition`. Každý
přechod zapíše událost do `eventList`, včetně toho, jestli e-mail odešel.

| Akce | Z → do | Co se stane | E-mail |
|---|---|---|---|
| `approve` — Přijmout | `requested` → `awaitingDeposit` | spočte zálohu, splatnosti a VS; vyžaduje `totalPrice`. Při 14 a méně dnech do příjezdu chce celou částku najednou. | H2 |
| `reject` — Zamítnout | `requested` → `rejected` | uvolní termín | H3 |
| `markDepositPaid` — Záloha přijata | `awaitingDeposit` → `confirmed` | `payment.deposit.paidDate` (předvyplněný dnešek) | H5 |
| `expire` — Propadlo | `awaitingDeposit` → `expired` | uvolní termín | H6a |
| `reopen` — Obnovit | `expired` → `awaitingDeposit` | jen když je termín pořád volný; nová splatnost | H2 |
| `cancel` — Stornovat | `awaitingDeposit` / `confirmed` → `cancelled` | uvolní termín | H6b |
| `markBalancePaid` — Doplatek přijat | `confirmed` → `confirmed` | `payment.balance.paidDate` (předvyplněný dnešek) | — |
| `complete` — Ukončit pobyt | `confirmed` → `completed` | | H8 |

- **`message`:** volitelný text vlastníka, který se vloží do e-mailu (typicky u zamítnutí a storna).
- **Zpětné přechody** („vrátit k potvrzení“) nejsou. Odeslaný e-mail nejde vzít zpět a
  překlik zachytí modál, ve kterém je vidět, co se stane.
- **Importy (Booking, e-chalupy) a blokace** zůstávají bez akcí, stejně jako dnes.

### Pravidla, která hlídá server (z oponentního review E1, 2026-10-08)

- **Souběh:** každý zápis úpravy i přechodu je podmíněný (optimistický zámek: stav i
  `sys.mts` se od přečtení nezměnily). Dvojklik, dva správci naráz nebo úprava souběžně
  s přijetím → druhý dostane `409 concurrentChange` a nic nepřepíše.
- **Přijetí a obnovení** zkontroluje kolizi termínu. Jiná nepřijatá žádost (`requested`)
  přijetí nebrání: vlastník si vybere, kterou přijme, druhou zamítne. Přijatá nebo
  potvrzená rezervace brání.
- **Obnovení propadlé** spočítá platební plán znovu od dneška (včetně pravidla „14 dní a méně
  = celá částka“). VS zůstává.
- **Platební plán musí dávat smysl po každé úpravě** (`400 invalidPaymentPlan`, chyba u pole):
  - cena je vyplněná a záloha ≤ cena;
  - záloha je splatná nejpozději se doplatkem a nejpozději v den příjezdu;
  - doplatek je splatný před příjezdem.

  Při posunu příjezdu se splatnosti **nepřepočítávají samy**. Server změnu odmítne, dokud je
  vlastník nesrovná ve stejné úpravě.
- **VS se při posunu příjezdu nemění:** host ho už dostal a páruje se podle něj.
- **Datum zaplacení** jde úpravou jen opravit u už zaplacené platby. Označit jako zaplacené
  jde jen akcí („Záloha přijata“ / „Doplatek přijat“), zrušit zaplacení nejde vůbec.
- **Rezervace s hostem a blokace se úpravou nepřevádějí** jedna na druhou (vyprázdnění
  kontaktu / doplnění kontaktu k blokaci → 400).
- **Platební plán má jen dva tvary** (oponentní review E2, 2026-10-09):
  - záloha + doplatek: 0 < záloha < cena;
  - celá částka najednou (bez doplatku): záloha = cena.

  Nic mezi tím, jinak hostovi odcházelo „Doplatek 0 Kč“ nebo „závazně potvrzeno“ s nedoplatkem. Úpravou:
  - splatnost doplatku vyplněná doplatek přidá, vymazaná ho zruší (= celá částka);
  - u celé částky jde nezaplacená záloha automaticky s cenou;
  - po zaplacení musí vlastník rozdíl vybrat jako doplatek.
- **„Propadlo“ až po splatnosti zálohy:** e-mail hostovi říká „do … jsme neobdrželi zálohu“. Dřív se dá rezervace ukončit stornem.
- **Změna splatnosti nebo příjezdu** vynuluje příslušné `reminder.*SentAt`, aby připomínka
  (až bude cron) odešla znovu.
- **E-maily a zápis historie po úspěšné změně nikdy nevrátí chybu.** Selhání se zaloguje
  a e-mail se zapíše jako `failed`.

### Úpravy

`reservation/update` mění pobyt (termín, počet osob, cenu), zálohu a obě splatnosti.
- **Kolize:** změna termínu pobytu projde kolizní kontrolou jako dnes, včetně vědomého „přesto uložit“.
- **E-mail:** u rezervace ve stavu `awaitingDeposit` nebo `confirmed` má modál úpravy
  zaškrtávátko **„Poslat hostovi e-mail o změně“** (výchozí zaškrtnuté). Host dostane H9 s tím,
  co se změnilo, a aktuálními platebními údaji.

## 4. Automatika: `reservation/tick` (jen e-maily, žádné změny stavu) — AŽ POZDĚJI

Odloženo (2026-10-08). Do té doby žádné připomínky ani informace k příjezdu nechodí. Struktura
dokumentu (`reminder`) je na ně ale připravená, takže se později nic nepředělává. Nastavení
Cloud Scheduleru popisuje `release.md` (cron na `calendar/sync`) a bude stejné.

- **Spouštění:** nový use case pro Cloud Scheduler, **každou hodinu**. Chráněný stejně jako
  `calendar/sync`: `X-Appengine-Cron`, nebo sdílený secret.
- **Bezpečnost:** idempotentní, každý e-mail hlídá své pole `…SentAt`.

| Podmínka | Akce |
|---|---|
| `awaitingDeposit`, do splatnosti zálohy ≤ 24 h, bez `reminder.depositSentAt` | H4 připomínka hostovi |
| `awaitingDeposit`, splatnost zálohy je pryč, bez `reminder.depositOverdueSentAt` | V2 vlastníkovi: „záloha po splatnosti, rozhodni“ |
| `confirmed`, doplatek nezaplacený, do jeho splatnosti ≤ 3 dny, bez `reminder.balanceSentAt` | H10 připomínka doplatku |
| `confirmed`, do příjezdu ≤ 2 dny, bez `reminder.arrivalInfoSentAt` | H7 informace k příjezdu |

**Propadnutí zálohy je ruční:** vlastník dostane V2 a v adminu buď klikne **Propadlo**, nebo
prodlouží splatnost úpravou. Tím odpadá riziko z prvního návrhu, že cron zruší rezervaci,
kterou host zaplatil poslední den a převod se ještě nepřipsal.

## 5. E-maily — majitel zreviduje po implementaci

### Formát

- **HTML a text:** všechny e-maily půjdou jako HTML s textovou alternativou. HTML kvůli QR kódu.
- **Neodpovídat (rozhodnutí majitele 2026-10-08):** e-maily hostovi jsou generované a host na ně
  nemá odpovídat. Žádný text ho proto k odpovědi nevybízí. Každý končí patičkou s kontaktem:

  ```
  --
  Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
  Kontakt: {telefon} · {kontaktní e-mail}
  ```

  - **Technicky:** odesílá se z `MAIL_FROM` **bez `Reply-To`**. Odesílací adresa by měla být
    „noreply“ (např. `noreply@<doména>`), aby případná odpověď neskončila v osobní schránce.
  - **E-maily vlastníkovi (V1, V2)** jsou interní a patička v nich není. V1 dál má `Reply-To`
    na hosta, takže vlastník může hostovi odpovědět přímo z notifikace.
- **Podpis:** „Roubený ráj“. Kontakt je v patičce.

### QR platba

E-maily s výzvou k platbě obsahují **QR Platbu** (český standard SPAYD, umí ji každá česká
bankovní appka). QR je obrázek vložený do e-mailu (inline `cid`), takže se zobrazí i bez
načítání obrázků z internetu. Obsah kódu:

```
SPD*1.0*ACC:CZ9808000000006338724003*AM:4500.00*CC:CZK*X-VS:12345678*MSG:ROUBENY RAJ ZALOHA 7.11.2026
```

- **Nová závislost:** obrázek generuje balíček `qrcode` (npm).
- **Ověření:** při implementaci je potřeba aspoň jednou skutečně načíst QR bankovní appkou.

### Zástupné hodnoty

| Zástupka | Kde se bere / co znamená |
|---|---|
| `{termín}` | `7. 11. 2026 – 9. 11. 2026 (2 noci)` |
| `{splatnost zálohy}` | `10. 10. 2026` |
| `{splatnost doplatku}` | `24. 10. 2026` |
| `{účet}` | `6338724003/0800` |
| `[QR …]` | QR platba |
| `{telefon}` | telefon vlastníka |
| `{kontaktní e-mail}` | kontaktní e-mail z webu (sekce Kontakt) |
| `{web}` | adresa webu |

Řádky v hranatých závorkách `[…]` se vypíšou jen tehdy, když mají obsah.

### Kódy e-mailů (`template` v `eventList`)

| Kód | Šablona | Kód | Šablona |
|---|---|---|---|
| H1 | `requestReceived` | H6b | `reservationCancelled` |
| V1 | `ownerNewRequest` | H7 | `arrivalInfo` |
| H2 | `depositRequested` | H8 | `thankYou` |
| H3 | `requestRejected` | H9 | `reservationChanged` |
| H4 | `depositReminder` | H10 | `balanceReminder` |
| H5 | `reservationConfirmed` | V2 | `ownerDepositOverdue` |
| H6a | `reservationExpired` | | |

**Platba celé částky najednou** (přijetí 14 a méně dní před příjezdem):
- **H2:** místo řádků „Záloha / Doplatek“ obsahuje řádek „Celá částka: {cena}, splatná do {splatnost}“. Předmět zní „…prosíme o úhradu do {splatnost}“.
- **H5:** nemá blok doplatku.

---

### H1 — Žádost přijata (host, hned po odeslání formuláře)

**Předmět:** Přijali jsme vaši žádost o rezervaci — {termín}

```
Dobrý den,

děkujeme za zájem o Roubený ráj. Vaši žádost o rezervaci jsme přijali a teď ověřujeme
dostupnost termínu.

Termín:          {termín}
Počet osob:      {počet osob}
Orientační cena: {cena}
[Vaše poznámka:  {poznámka}]

Termín pro vás zatím předběžně držíme. Ozveme se vám nejpozději do 24 hodin.

Tato zpráva není potvrzením rezervace.

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### V1 — Nová žádost (vlastník, hned po odeslání formuláře)

**Předmět:** Nová žádost: {termín}, {jméno}, {počet osob} os.

```
Nová žádost o rezervaci z webu. Termín je předběžně blokovaný.

Termín:      {termín}
Počet osob:  {počet osob}
Cena:        {cena}

Jméno:       {jméno}
E-mail:      {e-mail}
Telefon:     {telefon hosta}
[Poznámka:   {poznámka}]

Přijmout nebo zamítnout: {web}/admin/reservation?id={id}
```

### H2 — Termín schválen, čekáme na zálohu (host, po „Přijmout“ a „Obnovit“)

**Předmět:** Termín je pro vás volný — prosíme o zálohu do {splatnost zálohy}

```
Dobrý den,

termín {termín} je pro vás volný a rádi vás u nás přivítáme.

Počet osob:     {počet osob}
Celková cena:   {cena}
Záloha:         {záloha}, splatná do {splatnost zálohy}
Doplatek:       {doplatek}, splatný do {splatnost doplatku}

Platba zálohy
Číslo účtu:          {účet}
Částka:              {záloha}
Variabilní symbol:   {VS}
Splatnost:           {splatnost zálohy}
[QR platba zálohy]

Termín pro vás držíme do {splatnost zálohy}. Pokud záloha do té doby nedorazí, rezervaci
zrušíme a termín uvolníme. Jakmile zálohu přijmeme, pošleme vám potvrzení závazné
rezervace.

[Storno podmínky: {storno}]

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H3 — Žádost zamítnuta (host, po „Zamítnout“)

**Předmět:** Termín {termín} vám bohužel nemůžeme potvrdit

```
Dobrý den,

děkujeme za zájem o Roubený ráj. Termín {termín} vám bohužel nemůžeme potvrdit.
[{zpráva vlastníka}]

Předběžnou blokaci jsme zrušili. Volné termíny najdete na {web}, rádi vás přivítáme
jindy.

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H4 — Připomínka zálohy (host, cron 24 h před splatností)

**Předmět:** Připomínka: záloha za pobyt {termín} — splatnost {splatnost zálohy}

```
Dobrý den,

připomínáme, že vaše rezervace v Roubeném ráji na termín {termín} čeká na úhradu zálohy.

Číslo účtu:          {účet}
Částka:              {záloha}
Variabilní symbol:   {VS}
Splatnost:           {splatnost zálohy}
[QR platba zálohy]

Pokud záloha nebude uhrazena do {splatnost zálohy}, rezervaci zrušíme a termín uvolníme.
Platíte-li na poslední chvíli, pošlete nám prosím potvrzení o platbě na {kontaktní e-mail}
— převod se může připisovat i dva pracovní dny.

Pokud jste už zaplatili, děkujeme a tuto zprávu ignorujte.

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H5 — Rezervace potvrzena (host, po „Záloha přijata“)

**Předmět:** Rezervace je závazně potvrzena — {termín}

```
Dobrý den,

zálohu jsme přijali, děkujeme. Vaše rezervace v Roubeném ráji je závazně potvrzena.

Termín:          {termín}
Počet osob:      {počet osob}
Celková cena:    {cena}
Přijatá záloha:  {záloha}
Zbývá doplatit:  {doplatek}, splatný do {splatnost doplatku}

Platba doplatku
Číslo účtu:          {účet}
Částka:              {doplatek}
Variabilní symbol:   {VS}
Splatnost:           {splatnost doplatku}
[QR platba doplatku]

Příjezd od 15:00, odjezd do 10:00. Dva dny před příjezdem vám pošleme informace
k příjezdu.

[Storno podmínky: {storno}]

Těšíme se na vás.
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H6a — Rezervace propadla (host, po „Propadlo“)

**Předmět:** Rezervace zrušena — záloha nedorazila ({termín})

```
Dobrý den,

protože jsme do {splatnost zálohy} neobdrželi zálohu, vaši rezervaci termínu {termín}
jsme zrušili a termín uvolnili.
[{zpráva vlastníka}]

Pokud jste zálohu mezitím poslali, ozvěte se nám prosím na {telefon} nebo
{kontaktní e-mail} — domluvíme se.

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H6b — Rezervace stornována (host, po „Stornovat“)

**Předmět:** Rezervace zrušena — {termín}

```
Dobrý den,

vaše rezervace v Roubeném ráji na termín {termín} byla zrušena.
[{zpráva vlastníka}]

[Zálohu {záloha} vám vrátíme podle storno podmínek; ozveme se vám s podrobnostmi.]

Pokud zrušení není podle vašeho přání, ozvěte se nám prosím na {telefon} nebo
{kontaktní e-mail}.

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H7 — Informace k příjezdu (host, cron 2 dny před příjezdem)

**Předmět:** Informace k příjezdu — {datum příjezdu}

Obsah dodá vlastník (`wip.md`). Půjde do konfigurace, ne natvrdo do kódu.

```
Dobrý den,

pozítří se u nás uvidíme. Tady je vše, co se vám bude hodit:

Adresa:      Libošovice 6, 507 44 Libošovice — {odkaz na mapu}
Příjezd:     od 15:00
Odjezd:      do 10:00
[Klíče:      {instrukce k předání klíčů}]
[Parkování:  {parkování}]
[Wi-Fi:      {síť} / {heslo}]
Kontakt:     {telefon}
[Doplatek {doplatek} zatím neevidujeme — účet {účet}, VS {VS}. [QR platba doplatku]]

Šťastnou cestu!
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H8 — Děkujeme za návštěvu (host, po „Ukončit pobyt“)

**Předmět:** Děkujeme za návštěvu Roubeného ráje

```
Dobrý den,

děkujeme, že jste u nás byli. Doufáme, že jste si pobyt užili.

[Budeme rádi, když nám necháte hodnocení: {odkaz}]         ← zatím vynecháno, viz wip.md
[Ještě evidujeme nezaplacený doplatek {doplatek} — účet {účet}, VS {VS}. [QR]]

Těšíme se na další shledání.
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H9 — Změna rezervace (host, po úpravě se zaškrtnutým e-mailem)

**Předmět:** Změna vaší rezervace — {termín}

```
Dobrý den,

ve vaší rezervaci v Roubeném ráji jsme upravili:

{seznam změn, např. „Splatnost zálohy: 10. 10. 2026 → 14. 10. 2026“}
[{zpráva vlastníka}]

Aktuální stav:
Termín:          {termín}
Počet osob:      {počet osob}
Celková cena:    {cena}
[Záloha:         {záloha}, splatná do {splatnost zálohy}]     ← jen u awaitingDeposit
[Doplatek:       {doplatek}, splatný do {splatnost doplatku}]
[Platební údaje a QR k tomu, co je právě k úhradě]

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### H10 — Připomínka doplatku (host, cron 3 dny před splatností doplatku)

**Předmět:** Připomínka: doplatek za pobyt {termín} — splatnost {splatnost doplatku}

```
Dobrý den,

blíží se váš pobyt v Roubeném ráji ({termín}). Připomínáme splatnost doplatku:

Číslo účtu:          {účet}
Částka:              {doplatek}
Variabilní symbol:   {VS}
Splatnost:           {splatnost doplatku}
[QR platba doplatku]

Pokud jste už zaplatili, děkujeme a tuto zprávu ignorujte.

S pozdravem
Roubený ráj
--
Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.
Kontakt: {telefon} · {kontaktní e-mail}
```

### V2 — Záloha po splatnosti (vlastník, cron)

**Předmět:** Záloha po splatnosti: {termín}, {jméno}

```
Záloha za rezervaci {jméno} ({termín}, VS {VS}) měla dorazit do {splatnost zálohy}.
Rezervace pořád blokuje termín.

Rozhodni v adminu — „Záloha přijata“, „Propadlo“, nebo prodluž splatnost úpravou:
{web}/admin/reservation?id={id}
```

## 6. Admin

### Seznam (`admin/reservations`)

- **Výchozí filtr:** **Aktivní** (`requested`, `awaitingDeposit`, `confirmed`). Dál jen jeden
  stav, nebo Vše.
- **Sloupce:** stav, termín, host, osob, cena a **K úhradě do**. Splatnost zálohy, nebo doplatku,
  podle toho, co je na řadě. Zvýrazněné, když zbývá méně než 24 h nebo je po splatnosti.
- **Tlačítko „další krok“ na řádku** podle stavu. Otevře **modál změny stavu**, ve kterém je
  vidět všechno a akce se teprve potvrzuje.

| Stav | Tlačítko na řádku |
|---|---|
| `requested` | **Přijmout** |
| `awaitingDeposit` | **Záloha přijata** |
| `confirmed` | **Doplatek přijat** (dokud není), po odjezdu **Ukončit pobyt** |
| ostatní | — |

- **Klik na řádek** otevře detail.

### Modál změny stavu

- **Tělo:** všechny údaje o rezervaci:
  - stav;
  - pobyt (termín, osob, cena, poznámka hosta);
  - kontakt;
  - platby (záloha, VS, splatnosti, co je zaplaceno);
  - interní poznámka.
- **Nad patičkou:**
  - zaškrtávátko **„Poslat hostovi e-mail“** (výchozí zaškrtnuté);
  - pole **„Zpráva hostovi“** (nepovinné, vloží se do e-mailu);
  - u akcí s e-mailem řádek s jeho předmětem, ať je vidět, co odejde.
- **Patička:** **Zavřít** a **tlačítka všech akcí** povolených z aktuálního stavu.
  - Akce, kterou se modál otevřel, je primární (zvýrazněná). Ostatní jsou sekundární, takže
    z jednoho modálu jde třeba místo „Záloha přijata“ kliknout „Propadlo“.
  - U `requested` bez ceny je **Přijmout** neaktivní s vysvětlením.

### Úprava (modál)

- **Pole:**
  - pobyt: termín, osob, cena a poznámka;
  - kontakt;
  - záloha: částka a splatnost;
  - splatnost doplatku;
  - interní poznámka.
- **E-mail:** u `awaitingDeposit` a `confirmed` je dole zaškrtávátko „Poslat hostovi e-mail o změně“ (H9, výchozí zaškrtnuté) a pole „Zpráva hostovi“.

### Ruční rezervace (modál „Nová rezervace“ na seznamu)

- **Pole:** stejná jako v úpravě a k nim zaškrtávátko **„Vytvořit jako potvrzenou“** (výchozí zaškrtnuté).
- **Zaškrtnuté:** vznikne `confirmed`, stejně jako dnes. Volitelně „Poslat hostovi e-mail“ (H5).
- **Nezaškrtnuté:** vznikne `awaitingDeposit` se zálohou a splatnostmi podle pravidel výš. „Poslat hostovi e-mail“ (H2) je ve výchozím stavu zaškrtnuté.
- **Blokace** (bez kontaktu, s důvodem) jsou vždy `confirmed` a e-mail nemají.

### Detail (`admin/reservation?id=<id>`)

Routa s parametrem `id`. Router dynamický segment neumí (`decisions.md`), proto query parametr.

- **Obsah:** stejné bloky jako tělo modálu, k tomu **historie**: časová osa z `eventList` (přechody, úpravy, kdo je udělal, které e-maily odešly).
- **Tlačítka:** **Upravit** (modál úpravy) a akce stavu (každá otevře modál změny stavu).
- **Importy:** jen pro čtení (patří feedu, příští sync by změnu přepsal).
- **Blokace termínu:** bez akcí stavu, ale upravitelné (posun údržby nebo vlastního pobytu), stejně jako dřív.

## 7. Konfigurace

`server/config.js`:

```js
reservation: {
  depositPercent: 50,
  depositDueDays: 3,               // výchozí splatnost zálohy = schválení + 3 dny
  balanceDueDaysBeforeArrival: 14, // výchozí splatnost doplatku = příjezd − 14 dní
  depositReminderHours: 24,
  bankAccount: { number: "6338724003/0800", iban: "CZ9808000000006338724003" },
  arrivalInfo: { keys: null, parking: null, wifiName: null, wifiPassword: null }, // dodá majitel
}
```

Konstanta v kódu (rozhodnutí majitele): `ARRIVAL_INFO_DAYS_BEFORE = 2`.

## 8. Mimo rozsah

- **Párování plateb:** automatické párování přes API banky (např. Fio) podle VS, místo ručního „Záloha přijata“.
- **Platební brána.**
- **Expirace neschválených žádostí:** žádost `requested` visí, dokud ji vlastník nezpracuje. Seznam ji zvýrazní, když je starší než 24 h.
- **Race condition:** dvě souběžné žádosti o stejný termín (známé z v1) se tímhle flow neřeší; druhou vlastník zamítne.
- **Až v `wip.md`:** storno podmínky, odkaz na hodnocení a obsah informací k příjezdu.

## 9. Otázky

Q1–Q4 jsou zodpovězené (2026-10-08, viz rozhodnutí nahoře). Otevřená zůstává jen
**struktura dokumentu (§ 2.1)** ke schválení.
