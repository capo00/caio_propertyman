# Testovací scénáře rezervace

Ruční (a později naklikaný) test celého rezervačního procesu podle [flow-rezervace.md](./flow-rezervace.md).
Stav: **2026-11-25 prošly znovu scénáře 1–5 a 7 na telefonu s novými modaly akcí a videa 1–5 jsou
natočená znovu** (výsledky v oddílu „Výsledky běhu 25. 11. 2026“; scénář 6 se tentokrát
neopakoval, platí výsledek z 19. 11.). Struktura a detaily schválené 2026-11-18, doplněno:

- 2026-11-19: ruční e-maily z administrace: připomínky plateb včetně fází po splatnosti,
  informace k příjezdu a kód ke schránce ([proposal-admin-emails.md](./proposal-admin-emails.md));
  rozložení akcí: vpředu jen to, co je na řadě, zbytek v menu ⋮, v seznamu i v detailu; dlaždice
  rezervace na telefonu ([proposal-admin-reservation-tile.md](./proposal-admin-reservation-tile.md));
- 2026-11-25: nové modaly akcí podle návrhu majitelky z 24. 11. (commity `4271594`, `eb30694`,
  `69aad2c`): změna ceny při přijetí (scénář 2), skutečně přijatá částka a poznámka s novým
  doplatkem (4), změna splatnosti v připomínce a uložení bez e-mailu (1), e-mail H11 po přijetí
  doplatku (1). Popis modalů je ve [flow-rezervace.md](./flow-rezervace.md#akce-a-modaly-v-administraci).

## Princip

- **Každý přechod, e-mail a pohyb peněz se testuje jednou.** Scénáře jsou seřazené tak, že
  společný kus procesu (např. „Přijmout“ nebo „Záloha přijata“) projde jen jedna rezervace a
  ostatní pokračují jinou cestou. Proto třeba rezervace v zastoupení ve stavu „Čeká na
  schválení“ nejde znovu přes „Přijmout“ (to už udělal web), ale přes „Zamítnout“.
- **Jedna rezervace = jeden scénář**, v jednom termínu. Rezervace se navzájem nepřekrývají,
  takže jdou dělat za sebou. Na konci se všechny smažou (scénář 7).
- **E-maily se fyzicky neodesílají.** Appka posílá přes lokální testovací SMTP
  (`node tools/_tmp-smtp-sink.mjs`, rozhodnutí 2026-11-19). Ten poslouchá jen na 127.0.0.1:2525,
  každou zprávu uloží do `tmp/smtp-sink/` a nikam ji nepřeposílá. Appka tak e-maily zapíše do
  historie jako **odesláno** a ve videu nejsou varování o neodeslané poště, jako by šlo o ostrý
  provoz. Bez běžícího SMTP (Nastavení → Pošta prázdné) skončí e-maily jako **neodesláno · pošta
  není nastavená**, test projde taky, jen v něm budou tato varování. Kontrola e-mailu = na detailu
  rezervace v historii: správná šablona, adresát, předmět a klíčové řádky (částka, VS, splatnost,
  vyúčtování storna). Před potvrzením akce je navíc vidět Komu, Předmět a odkaz na náhled v modálu.
- **Data vypadají reálně** (videa jsou ukázka skutečného použití): běžná česká jména, telefony,
  šestimístný kód ke schránce. Adresy jsou dál na `mailinator.com`, aby nepatřily nikomu
  skutečnému. Seznam rezervací se ve videu ukazuje přiblížený na dlaždici, aby nebyly vidět
  ostatní lokální testovací rezervace (`QA …`, `Test 1`); modál otevřený ze seznamu je oříznutý
  pod svým spodním okrajem ze stejného důvodu.
- **Akce rezervace** jsou v řádku seznamu, v dlaždici na telefonu i v hlavičce detailu
  rozložené stejně. Vpředu je jen to, co je na řadě: výrazný e-mail, další krok (Přijmout,
  Záloha přijata, Platba přijata, Doplatek přijat, Ukončit pobyt) a Upravit (v seznamu tužka ✎).
  Ostatní je v menu **⋮**: akce stavu (Zamítnout, Propadlo, Obnovit, Stornovat), pod čarou ruční
  e-maily a v seznamu Smazat. Výrazný e-mail v menu podruhé není.
- **Modály akcí** mají jedno rozložení (návrh majitelky 2026-11-24): nahoře rezervace v kostce
  (jméno, termín, noci · osoby, cena), uprostřed podle akce poznámka hosta, nebo platby (u „…
  přijata“ přijatá částka a datum, u připomínky částka a splatnost, u storna poplatek a vratka),
  dole e-mail hostovi (Poslat e-mail, jazyk, Komu, Předmět, Zpráva hostovi, Náhled e-mailu). Na
  telefonu je to jeden sloupec bez záložek, u běžné akce na jednu obrazovku. V patičce modálu
  změny stavu jsou všechny povolené akce, vybraná výrazně nahoře.
- **Ruční e-maily** (připomínka zálohy / platby H4, připomínka doplatku H10, informace k příjezdu
  H7) posílá majitelka z administrace. S testovacím SMTP se chovají jako v ostrém provozu:
  zapíše se „Naposledy odesláno“, kód ke schránce zadaný v modálu se uloží k rezervaci
  a informace k příjezdu po odeslání přestanou být výrazné. Bez SMTP skončí jako neodeslané a nic
  z toho se nestane (ukládá se jen po skutečném odeslání), proto test vyplňuje kód předem
  v úpravě rezervace. Připomínka s odškrtnutým e-mailem jen **uloží** změněnou částku nebo
  splatnost (tlačítko Uložit).
- **Fáze připomínek se simulují úpravou splatnosti** (*jen pro test*): splatnost se posune do
  minulosti nebo těsně před dnešek, aby šla vidět připomínka po splatnosti nebo s celou částkou.
  Úprava se ukládá bez e-mailu o změně, kromě kroku 4.5, kde se e-mail o změně (H9) testuje.
  Skutečný odklad splatnosti (domluvený s hostem) se dělá v modálu připomínky (krok 1.12).
- **Telefon.** Na telefonu (`xs`/`s`, test na šířce 390 px) je místo tabulky vlastní dlaždice:
  jméno (odkaz na detail) a stav, termín a cena, řádek podrobností („Příjezd za 9 dní · 2 noci ·
  2 osoby · Web“), řádek platby (jen když je nějaká na řadě; po splatnosti, dnes a zítra tučně
  s ikonou, jinak tiše) a u zrušené kolik vrátit hostovi. Akce ve footeru: to, co je na řadě,
  vlevo, ✎ a ⋮ vpravo. Kroky **📱** se dělají v seznamu na telefonu, každý stav rezervace se tak
  aspoň jednou zkontroluje i v dlaždici. Šířky 320 a 600 px, tmavý režim a ovládání dlaždice jsou
  ve scénáři 6.
- **Automatický e-mail** zbyl jen jeden: V2 (záloha po splatnosti, nám). Cron, který ho posílá,
  neběží, takže se kontroluje přes `npm run email:preview` (scénář 6).
- **Testovací adresy** jsou na `mailinator.com`: appka ověřuje doménu v DNS (`example.com` odmítne,
  protože nepřijímá poštu) a mailinator je veřejná testovací schránka, ne cizí člověk.

## Struktura a videa

| # | Scénář | Rezervace | Cesta | Video |
|---|---|---|---|---|
| 0 | Příprava | — | ověřit lokální DB a prázdné SMTP, nastavit e-mail vlastníka a testovací Wi-Fi, přihlásit QA admina | ne |
| 1 | **Happy day**: web s předstihem až po pobyt | R1 | formulář → Přijmout (záloha + doplatek) → Záloha přijata → **odklad doplatku v připomínce, Uložit bez e-mailu** → Doplatek přijat (**H11**) → kód ke schránce → **Poslat info k příjezdu** → posun termínu do minulosti → Ukončit pobyt | **1** |
| 2 | Web na poslední chvíli + **sleva při přijetí** + **připomínka po splatnosti** + storno 100 % | R2 | formulář 9 dní před příjezdem → Přijmout se **změnou ceny** (celá částka) → splatnost do minulosti → **Připomenout platbu** → Platba přijata → Stornovat (zaplacené propadá) | 2 |
| 3 | V zastoupení „Čeká na schválení“ → zamítnutí | R3 | založení v adminu → Zamítnout → termín je zase volný | 3 |
| 4 | V zastoupení „Schválená“ → **připomínka celé částky** → propadnutí → obnovení → **jiná přijatá záloha** → **připomínka doplatku po splatnosti** → storno s vratkou | R4 | založení → úprava splatností (H9) → **Připomenout zálohu (celá částka)** → Propadlo → Obnovit → Záloha přijata **5 000 místo 4 750** → splatnost doplatku do minulosti → **Připomenout doplatek** → Stornovat 48 dní před (vratka) | 4 |
| 5 | V zastoupení „Potvrzená“ → storno zdarma | R5 | založení rovnou potvrzené → Stornovat 86 dní před (bez vyúčtování) | 5 |
| 6 | Automatický e-mail, výrazné akce a dlaždice na lokálních datech | — | `npm run email:preview`: V2; seznam rezervací na počítači i telefonu: výrazné akce, blokace, šířky, tmavý režim, modál informací k příjezdu bez odeslání | ne, jen screenshoty |
| 7 | Úklid | R1–R5 | smazat testovací rezervace, vrátit e-mail vlastníka | ne |

**Videa** (rozhodnutí 2026-11-18, 2026-11-19): jen česky, jen telefon (390 px). Každý e-mail, který
v kroku vznikne, je ve videu vidět jako obrazovka: komu je (host / majitel, adresa) a předmět musí
být čitelné. Kroky 📱 jsou ve videu jako přiblížená dlaždice ze seznamu na telefonu. Soubory
v `tmp/videa/`: `rezervace-1-happy-day-telefon.mp4`, `-2-posledni-chvile-`, `-3-zamitnuti-`,
`-4-propadnuti-storno-`, `-5-storno-zdarma-`, každé i v lehké verzi `…-telefon-lite.mp4`
(na poslání). Videa z 25. 11. přepsala ta z 19. 11.

Video 1 ukáže celou cestu od formuláře po „Po pobytu“. Posun termínu do minulosti je krok jen pro
test (schváleno 2026-11-18), ve videu je takhle označený.

## Pokrytí

| Co | 1 | 2 | 3 | 4 | 5 | 6 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| **Vznik** | | | | | | |
| formulář na webu (H1 host, V1 nám) | ✔ | | | | | |
| formulář na webu, termín ≤ 14 dní | | ✔ | | | | |
| v zastoupení: Čeká na schválení (H1, V1 ne) | | | ✔ | | | |
| v zastoupení: Schválená (H2) | | | | ✔ | | |
| v zastoupení: Potvrzená (H5, bez plánu) | | | | | ✔ | |
| **Přechody** | | | | | | |
| Přijmout → záloha + doplatek (H2) | ✔ | | | | | |
| Přijmout → celá částka (H2) | | ✔ | | | | |
| Přijmout se **změnou ceny** (sleva, změna v historii, H2 s novou cenou) | | ✔ | | | | |
| Zamítnout (H3) | | | ✔ | | | |
| Záloha přijata (H5 s doplatkem) | ✔ | | | ✔ | | |
| Záloha přijata s **jinou částkou** (doplatek se přepočítá, poznámka pod polem, změna v historii) | | | | ✔ | | |
| Platba přijata (H5 bez doplatku) | | ✔ | | | | |
| Doplatek přijat (**H11**) | ✔ | | | | | |
| úprava bez e-mailu (kód ke schránce, posun termínu, simulace splatnosti) | ✔ | ✔ | | ✔ | | |
| úprava s e-mailem (H9) | | | | ✔ | | |
| Propadlo (H6a) | | | | ✔ | | |
| Obnovit (H2 s novou splatností) | | | | ✔ | | |
| Stornovat, zaplaceno celé, 0–14 dní: 100 %, vratka 0 (H6b) | | ✔ | | | | |
| Stornovat, záloha zaplacená, 31–60 dní: 25 %, vratka > 0 (H6b) | | | | ✔ | | |
| Stornovat, nic nezaplaceno, 61+ dní (H6b bez vyúčtování) | | | | | ✔ | |
| Ukončit pobyt (H8, v modálu zaplaceno celkem) | ✔ | | | | | |
| **Modály** | | | | | | |
| rezervace v kostce, poznámka hosta (Přijmout, Zamítnout, Obnovit), e-mail se zprávou | ✔ | ✔ | ✔ | ✔ | | |
| platby v modálu: přijatá částka a datum, upozornění na splatnost, storno poplatek | ✔ | ✔ | | ✔ | ✔ | |
| patička: vybraná akce nahoře, ostatní povolené pod ní | ✔ | ✔ | ✔ | ✔ | | |
| **Rozložení akcí** | | | | | | |
| vpředu jen další krok a Upravit, akce stavu v ⋮ (detail i seznam) | ✔ | ✔ | ✔ | ✔ | ✔ | |
| ruční e-maily v ⋮ pod čarou podle stavu a zaplacení | ✔ | ✔ | | ✔ | ✔ | |
| výrazný e-mail vpředu a v ⋮ už ne | | ✔ | | ✔ | | ✔ |
| **Ruční e-maily** | | | | | | |
| připomínka před oknem: jen v menu, nevýrazná | ✔ | ✔ | | | | |
| připomínka: **změna splatnosti a Uložit bez e-mailu** (Úprava v historii) | ✔ | | | | | |
| připomínka výrazná (⚠ vpředu), „… přijata“ jen ikona | | ✔ | | ✔ | | ✔ |
| H4 platba (celá částka) po splatnosti | | ✔ | | | | |
| H4 záloha po splatnosti, je na řadě doplatek → celá částka jedním QR | | | | ✔ | | |
| H10 doplatek po splatnosti | | | | ✔ | | |
| kód ke schránce v úpravě, ve shrnutí a předvyplněný v modálu | ✔ | | | | | |
| H7 informace k příjezdu (kód, adresa s mapou, Wi-Fi s QR, zpráva majitele) | ✔ | | | | | |
| informace k příjezdu výrazné (zeleně do 2 dnů před příjezdem) | | | | | | ✔ |
| modál: neplatný kód, chybějící Wi-Fi | | | | | | ✔ |
| **Telefon (dlaždice)** | | | | | | |
| host: jméno + stav, termín + cena, „Příjezd za N dní · noci · osoby · zdroj“ | ✔ | ✔ | ✔ | ✔ | ✔ | |
| „· V zastoupení hosta“ v podrobnostech | | | ✔ | ✔ | ✔ | |
| řádek platby tichý (splatnost později) | ✔ | ✔ | | ✔ | | |
| řádek platby po splatnosti (tučně, červená ikona) | | ✔ | | ✔ | | ✔ |
| bez řádku platby (zaplaceno / bez plánu / konečný stav) | ✔ | | ✔ | | ✔ | ✔ |
| zrušená: „Vrátit hostovi …“ (0 Kč i vratka) / bez řádku, když host nic nezaplatil | | ✔ | | ✔ | ✔ | |
| archiv bez „Příjezd za …“ | ✔ | ✔ | ✔ | ✔ | ✔ | |
| footer: akce vlevo, ✎ ⋮ vpravo; jen ✎ ⋮ | ✔ | ✔ | ✔ | ✔ | ✔ | |
| „Příjezd zítra“ / „Pobyt probíhá“, blokace, 320 / 600 px, tmavý režim, klik a klávesnice | | | | | | ✔ |
| **Peníze** | | | | | | |
| host → my: záloha 50 % | ✔ | | | | | |
| host → my: záloha jiná než 50 % (5 000 z 9 500) | | | | ✔ | | |
| host → my: doplatek 50 % | ✔ | | | | | |
| host → my: celá částka (po slevě) | | ✔ | | | | |
| my → host: vratka | | | | ✔ | | |
| **Automatický e-mail** V2 | | | | | | ✔ |
| **Kontroly u každé rezervace** | | | | | | |
| detail: stav, termín, cena, platební plán, VS | ✔ | ✔ | ✔ | ✔ | ✔ | |
| detail: historie s e-maily „odesláno“ a jejich textem | ✔ | ✔ | ✔ | ✔ | ✔ | |
| kalendář na webu: předběžně / obsazeno / zase volno | ✔ | ✔ | ✔ | ✔ | ✔ | |

„Záloha přijata“ je ve 4 podruhé, protože bez zaplacené zálohy nejde vyzkoušet storno s vratkou
ani připomínka doplatku po splatnosti; zároveň se tu zkouší jiná přijatá částka.

Mimo ruční test zůstávají:

- **kryjí je serverové testy:** připomínka zálohy po splatnosti, když doplatek ještě není na řadě
  (stejná šablona jako u R2, jen „záloha“ místo „platba“), připomínka doplatku před splatností,
  oranžové informace k příjezdu 3 dny předem (vidět jen v den, kdy nějaká lokální rezervace
  přijíždí za 3 dny, viz 6.3); **změna částky v připomínce**, jiná přijatá **platba celé částky**
  a jiný **přijatý doplatek** (oboje mění cenu) a odmítnutí částky, která se do ceny nevejde
  (`server/reservation/modal-money.test.js`, `client/…/modal-money.test.js`);
- **dlaždice, které lokální data nemají:** import z portálu (v lokální DB žádný feed není),
  řádek platby „je splatná dnes / zítra“ a „Příjezd dnes“. Ty ukazuje jen
  [mockup](./mockups/reservation-tile.html).

## Testovací data

**Platí pro běh 25. 11. 2026 (středa).** Plán plateb i storno se počítají od dnešního dne, takže
jiný den vyjdou jiné splatnosti a jinde mohou padnout hranice. Pak termíny posunout tak, aby
platily stejné intervaly (R2 do 14 dní, R4 31–60 dní, R5 61+ dní, R1 a R3 19+ dní) a mimo
Vánoce, Silvestr, léto a obsazené termíny. **Před dalším během (nová videa) se tabulka přepočítá
na den běhu.** Simulované splatnosti v krocích („včera“, „za 2 dny“) a „Příjezd za N dní“
v dlaždicích se počítají od dne běhu.

Čísla jsou spočítaná serverovými funkcemi (`calculatePrice`, `createPaymentPlan`,
`computeCancellation`). Všechny termíny jsou 2 noci; pátek–neděle stojí 11 000 Kč (víkendový
příplatek), úterý–čtvrtek 9 500 Kč.

| | Host | E-mail | Telefon | Termín | Osob | Cena | Plán | VS |
|---|---|---|---|---|---|---|---|---|
| R1 | Jana Dvořáková | jana.dvorakova@mailinator.com | +420 731 245 678 | pá 22. 1. – ne 24. 1. 2027 | 4 | 11 000 Kč | záloha 5 500 do 28. 11. 2026, doplatek 5 500 do 8. 1. 2027 (v 1.12 odklad na 15. 1.) | 27012201 |
| R2 | Petr Novotný | petr.novotny@mailinator.com | +420 604 318 927 | pá 4. 12. – ne 6. 12. 2026 | 2 | 11 000 Kč, při přijetí sleva na **10 000 Kč** | celá částka 10 000 do 28. 11. 2026 | 26120401 |
| R3 | Kateřina Svobodová | katerina.svobodova@mailinator.com | +420 728 563 104 | pá 5. 2. – ne 7. 2. 2027 | 3 | 11 000 Kč | žádný (nepřijato) | — |
| R4 | Martin Procházka | martin.prochazka@mailinator.com | +420 776 205 349 | út 12. 1. – čt 14. 1. 2027 | 2 | 9 500 Kč | záloha 4 750 do 28. 11. 2026, doplatek 4 750 do 29. 12. 2026; přijatá záloha **5 000**, doplatek pak **4 500** | 27011201 |
| R5 | Lucie Králová | lucie.kralova@mailinator.com | +420 739 846 512 | pá 19. 2. – ne 21. 2. 2027 | 5 | 11 000 Kč | bez plánu (potvrzená) | — |

Kód ke schránce u R1: **905172**. Testovací Wi-Fi v Nastavení: síť `RoubenyRaj`, heslo `Chalupa-2027`
(vymyšlené, ne skutečné údaje).

Termíny jsou v lokální DB volné (stav k 25. 11. 2026; obsazené jsou mj. 20.–25. 11., 8.–12. 12.,
23.–25. 12. a 7.–9. 1.).

**Kontrola e-mailu v historii** (platí pro každý řádek „✉“ níž): v historii rezervace u události
je e-mail s kódem šablony, adresátem, stavem **odesláno** (bez testovacího SMTP **neodesláno · pošta není nastavená**) a po rozbalení
celý text. Kontroluje se předmět a uvedené řádky.

**Odeslání ručního e-mailu** (platí pro každý krok „Poslat …“ / „Připomenout …“ níž): modál ukáže
rezervaci v kostce, platby (u připomínky upozornění na splatnost a pole Částka a Splatnost), pak
Poslat e-mail s jazykem, Komu, Předmět, Zprávu hostovi a odkaz **Náhled e-mailu**. **Odeslat**
je aktivní, až když je náhled načtený. Po odeslání alert „E-mail je odeslaný.“, modál se zavře
a v historii přibude událost s názvem e-mailu (např. „Připomínka zálohy · po splatnosti“)
a e-mailem „odesláno“.

**Kontrola dlaždice** (platí pro každý řádek „📱“ níž): Správa → Rezervace na šířce 390 px,
dlaždice rezervace. Řádky se čtou shora: 1. jméno a štítek stavu, 2. termín a cena, 3. podrobnosti,
4. platba nebo vratka (jen když je), footer. Uvedené je jen to, co se v kroku mění nebo je nové.

---

## 0 · Příprava

| # | Krok | Očekávání |
|---|---|---|
| 0.1 | `npm run dev`, otevřít `http://localhost:3000` | web běží |
| 0.2 | Přihlásit se QA adminem (`npm run qa-accounts`, údaje z `.env.development`) a otevřít Správa → Rezervace | v seznamu jsou lokální testovací rezervace (např. „Petr Zálohový“ 23.–25. 11.), ne produkční data |
| 0.3 | Spustit `node tools/_tmp-smtp-sink.mjs`; Správa → Nastavení → Pošta: server `127.0.0.1`, port `2525`, bez přihlášení, odesílatel `Roubený ráj <rezervace@mailinator.com>`, uložit | uloženo; e-maily od teď skončí jen v `tmp/smtp-sink/`, ven nic neodejde |
| 0.4 | Správa → Nastavení → Roubenka: **E-mail majitele** = `roubeny.raj@mailinator.com`, uložit | uloženo. Bez něj by V1 skončil jako „chybí e-mail vlastníka“ a nešlo by zkontrolovat adresáta |
| 0.5 | Správa → Nastavení → Roubenka: Wi-Fi **název sítě** a **heslo** podle testovacích dat, uložit | uloženo. E-mail s informacemi k příjezdu pak ukáže Wi-Fi s QR kódem |
| 0.6 | Web → Rezervace, v kalendáři najít termíny R1–R5 | všechny volné |

## 1 · Happy day: web s předstihem až po pobyt (R1) · video 1

Host si na webu pošle poptávku 58 dní dopředu, majitelka ji přijme, host zaplatí zálohu, poprosí
o odklad doplatku a pak doplatí. Majitelka zapíše kód ke schránce a pošle informace k příjezdu,
proběhne pobyt.

| # | Krok | Očekávání |
|---|---|---|
| 1.1 | Web → Rezervace: termín 22. 1. – 24. 1. 2027, 4 osoby | formulář ukáže 2 noci a **Cena za pobyt 11 000 Kč** |
| 1.2 | Vyplnit jméno, e-mail, telefon a poznámku „Přijedeme kolem 17:00, dva dospělí a dvě děti.“, **Odeslat poptávku** | potvrzení „Poptávku jsme přijali“ |
| 1.3 | Kalendář na webu | 22.–24. 1. obarvené jako předběžně obsazené („čeká se na platbu, termín se může uvolnit“) |
| 1.4 | 📱 dlaždice R1 | **Jana Dvořáková** · `Nová žádost`; 22. 1. 2027 – 24. 1. 2027 · 11 000 Kč; „Příjezd za 58 dní · 2 noci · 4 osoby · Web“; řádek platby není. Footer: **Přijmout** vlevo, ✎ a ⋮ vpravo; v ⋮ Zamítnout a Smazat, e-maily žádné (ani čára) |
| 1.5 | Správa → Rezervace, otevřít R1 | stav **Nová žádost**, zdroj Web, cena 11 000 Kč, „Zatím bez platebního plánu — vznikne přijetím žádosti.“, poznámka hosta vidět. Vpředu **Přijmout** (zvýrazněné) a Upravit, v ⋮ Zamítnout |
| 1.6 | ✉ historie „Vytvořeno“ | **H1** hostovi `jana.dvorakova@…`: „Přijali jsme vaši poptávku — …“, termín, 4 osoby, 11 000 Kč, poznámka. **V1** na `roubeny.raj@…`: „Nová žádost: …, Jana Dvořáková, 4 os.“, odkaz do adminu |
| 1.7 | **Přijmout**: modál zkontrolovat, potvrzení **Přijmout** | modál „Přijmout žádost“ na jednu obrazovku: Jana Dvořáková, 22. 1. 2027 – 24. 1. 2027, „2 noci · 4 osoby“, cena **11 000 Kč jako pole** (nechat); Poznámka hosta; Poslat e-mail ☑ s CS, Komu `jana.dvorakova@…`, Předmět „Termín je pro vás volný — prosíme o zálohu do 28. 11. 2026“, Zpráva hostovi, Náhled e-mailu. Patička: **Přijmout** výrazně nahoře, Zamítnout pod ním. Po potvrzení alert „Hotovo“, stav **Čeká na zálohu**, VS **27012201**, Záloha 5 500 Kč splatnost 28. 11. 2026, Doplatek 5 500 Kč splatnost 8. 1. 2027. Vpředu **Záloha přijata** (ikona 💳); v ⋮ Propadlo chybí (splatnost nenastala), Stornovat a pod čarou **Připomenout zálohu** (nevýrazná, výrazná je až den před splatností) |
| 1.8 | ✉ historie „Přijmout“ | **H2 (A)**: „Termín je pro vás volný — prosíme o zálohu do 28. 11. 2026“, záloha 5 500, doplatek 5 500 do 8. 1. 2027, účet, VS 27012201, QR, storno podmínky |
| 1.9 | 📱 dlaždice R1 | `Čeká na zálohu`; řádek platby tiše „Záloha 5 500 Kč, splatnost 28. 11. 2026“ (bez ikony, netučně). Footer: **Záloha přijata** vlevo, ✎ ⋮ vpravo |
| 1.10 | **Záloha přijata** z dlaždice: Záloha 5 500 (předvyplněná), Zaplaceno = dnes, potvrdit | modál: pod datem „Splatnost 28. 11. 2026“, předmět „Rezervace je závazně potvrzena — …“, patička Záloha přijata + Stornovat. Stav **Potvrzeno**, záloha „zaplaceno 25. 11. 2026“, doplatek nezaplacen. Vpředu **Doplatek přijat** |
| 1.11 | ✉ historie | **H5 (A)**: „Rezervace je závazně potvrzena — …“, „zálohu jsme přijali“, Přijatá záloha 5 500, Zbývá doplatit 5 500 do 8. 1. 2027, QR doplatku |
| 1.12 | *Host poprosí o odklad doplatku:* **⋮ → Připomenout doplatek**: Splatnost **15. 1. 2027**, **odškrtnout** Poslat e-mail, **Uložit** | v ⋮ jen Stornovat a pod čarou **Připomenout doplatek** (nevýrazná); **Poslat info k příjezdu** chybí (doplatek není zaplacený a do příjezdu zbývá víc než 3 dny). Modál: Záloha 5 500 Kč „Zaplaceno 25. 11. 2026“, pole Doplatek 5 500 a Splatnost 8. 1. 2027 („Posunutím se změní i v rezervaci.“), předmět „Připomínka: doplatek za pobyt … — splatnost …“ (s novým datem se změní). Po odškrtnutí jsou pole e-mailu zašedlá a tlačítko **Uložit**. Alert „Uloženo.“; v historii „Úprava“: „Splatnost doplatku: 8. 1. 2027 → 15. 1. 2027“, bez e-mailu |
| 1.13 | 📱 dlaždice R1 | `Potvrzeno`; řádek platby „Doplatek 5 500 Kč, splatnost 15. 1. 2027“. Footer: **Doplatek přijat** vlevo |
| 1.14 | Kalendář na webu | 22.–24. 1. jako obsazené (ne předběžně) |
| 1.15 | **Doplatek přijat** z dlaždice: Doplatek 5 500, Zaplaceno = dnes, e-mail nechat zaškrtnutý, potvrdit | modál: Záloha 5 500 „Zaplaceno“, pole Doplatek a Zaplaceno, „Splatnost 15. 1. 2027“, předmět **„Doplatek jsme přijali — …“**. Uhrazeno 11 000 z 11 000 Kč, stav dál Potvrzeno. Ukončit pobyt chybí (pobyt ještě nebyl), vpředu tedy jen Upravit. V ⋮ Stornovat a pod čarou jen **Poslat info k příjezdu** (všechno je zaplaceno); výrazná není, příjezd je za víc než 3 dny. ✉ **H11**: „doplatek jsme přijali…“, Zaplaceno celkem 11 000 Kč, „Dva dny před příjezdem vám pošleme informace k pobytu.“ |
| 1.16 | 📱 dlaždice R1 | řádek platby zmizel; footer jen ✎ a ⋮ vpravo (vlevo nic) |
| 1.17 | **Upravit** → **Kód ke schránce na klíče** = 905172, uložit | uloženo bez e-mailu hostovi, i když „Poslat hostovi e-mail o změně“ zůstane zaškrtnuté (kód není mezi údaji, které host v e-mailu o změně vidí). Kód je vidět ve shrnutí rezervace, v historii „Úprava“ změna kódu bez e-mailu |
| 1.18 | **⋮ → Poslat info k příjezdu**: Zpráva hostovi „Těšíme se na vás! Kdybyste cokoli potřebovali, volejte.“, **Náhled e-mailu**, pak **Odeslat** | modál: obě platby „Zaplaceno“, žádné upozornění na doplatek ani na chybějící Wi-Fi; místo zaškrtávátka nadpis **E-mail hostovi** (posílá se vždy), CS, Komu `jana.dvorakova@…`, Předmět „Informace k příjezdu — 22. 1. 2027“, pole **Kód ke schránce na klíče** předvyplněné 905172. Náhled: zpráva, kód nahoře ve velkém rámečku, Wi-Fi s QR kódem. Po odeslání alert „E-mail je odeslaný.“; informace k příjezdu přestanou být výrazné a v modálu přibude „Naposledy odesláno“ |
| 1.19 | ✉ historie „Informace k příjezdu“ | **H7**: `>>> Kód ke schránce na klíče: 905172 <<<`, zpráva majitele, adresa „Libošovice 6, …“ s odkazem na mapu (samostatný řádek „Mapa:“ není), příjezd od 15:00, odjezd do 10:00; oddíly Parkování, Vstup do roubenky (krok 3 „Zadejte kód 905172 a potvrďte.“), Teplá voda, Vytápění, Co pro Vás máme připraveno, Wi-Fi (síť a heslo z kroku 0.5), Při odjezdu. Výzva k doplatku chybí (je zaplaceno) |
| 1.20 | *Jen pro test:* **Upravit** → Příjezd 16. 11. 2026, Odjezd 18. 11. 2026, Splatnost zálohy 14. 11. 2026, Splatnost doplatku 15. 11. 2026, **odškrtnout** „Poslat hostovi e-mail o změně“, uložit | uloženo. Bez posunu splatností úpravu nejde uložit (splatnost po příjezdu) |
| 1.21 | Historie „Úprava“ | seznam změn (termín, splatnosti), bez e-mailu. Vpředu nově **Ukončit pobyt**, z ⋮ zmizely e-maily (pobyt skončil) |
| 1.22 | **Ukončit pobyt** | modál: „Zaplaceno celkem 11 000 Kč z 11 000 Kč“ se štítkem Uhrazeno, „Poslední platba 25. 11. 2026“, předmět „Děkujeme za návštěvu Roubeného ráje“, patička Ukončit pobyt + Stornovat. Stav **Po pobytu**; rezervace zmizí z „Aktivní“ a je v „Archiv“ |
| 1.23 | ✉ historie | **H8**: „Děkujeme za návštěvu Roubeného ráje“, prosba o recenzi e-mailem, bez řádku o nezaplaceném doplatku |
| 1.24 | 📱 Archiv, dlaždice R1 | `Po pobytu`; podrobnosti bez „Příjezd …“, jen „2 noci · 4 osoby · Web“; bez řádku platby; footer jen ✎ ⋮ |

**Výsledek 25. 11. 2026, telefon (390 px), nové modaly: prošlo**; R1 = `6b06ea853304e30f7e8d8819`.
Video `tmp/videa/rezervace-1-happy-day-telefon.mp4` (4:30), lehká verze `-telefon-lite.mp4`.
Postřehy v oddílu „Výsledky běhu 25. 11. 2026“.

**Výsledek 18. 11. 2026: prošlo** (všechny tehdejší kroky, dnes číslované 1.1–1.3, 1.5–1.8, 1.10,
1.11, 1.14, 1.15 a 1.20–1.23, tehdy ještě se starým rozložením akcí; ostatní kroky přibyly 19. 11.;
R1 = `6afdd4348a755addecfd619c`). Video: `rezervace-1-happy-day.mp4`. Postřehy:

- Odkaz v e-mailu V1 vede na `http://localhost:8080/admin/…`, lokální appka ale běží na portu 3000.
  Bere se z `APP_URL`, nebo z `PORT` v `.env.development`. V produkci by měl sedět, lokálně odkaz nefunguje.
- V modálu změny stavu jsou vedle potvrzovacího tlačítka i ostatní povolené akce. U „Přijmout“ je
  to „Zamítnout“, u „Záloha přijata“ a „Ukončit pobyt“ je to „Stornovat“. Je to záměr (komentář
  v `transition-modal.jsx`), jenže na místě, kde bývá „Zrušit“, se dá splést se zavřením modálu.

**Výsledek 19. 11. 2026, celé na telefonu (390 px): prošlo.** Web i administrace byly
naklikané v emulaci telefonu v Edge. Data byla přepočítaná na 19. 11.: záloha splatná 22. 11.
a v dlaždici „Příjezd za 64 dní“. Natočeno podruhé s testovacím SMTP (e-maily „odesláno“, bez
varování) a s realistickými daty; R1 = `6aff5b81390f3ce7401f1506`. Video (nahrazené 25. 11.):
`tmp/videa/rezervace-1-happy-day-telefon.mp4`. Postřehy:

- **Menu ⋮ u dlaždice R1 se v jednom pokusu neotevřelo.** Při dalších bězích (scénáře 2–5) se
  ukázalo, že jde o artefakt emulace: ovladač prohlížeče při každém připojení přepíná
  stránku z počítače na telefon a menu otevřené po takovém překreslení nereaguje. Po čerstvém
  načtení stránky menu fungují. Ve videích jsou menu ukázaná z detailu.
- V detailu na telefonu jsou akce jen ikony: Přijmout ✓, Záloha přijata 💳, Ukončit pobyt ✓.
  Text mají jen v tooltipu.
- Modál úpravy rezervace má na telefonu nadpis „Detail“ a ukládá se tlačítkem „Odeslat“.
  „Uložit“ a „Upravit rezervaci“ by byly srozumitelnější.

## 2 · Web na poslední chvíli + sleva při přijetí + připomínka po splatnosti + storno 100 % (R2) · video 2

Poptávka 9 dní před příjezdem: platí se celá částka najednou. Host se v poznámce ptá na slevu,
majitelka při přijetí sníží cenu. Platba do splatnosti nedorazí, majitelka hostovi připomene, že
je po splatnosti. Host zaplatí a pak zruší, zaplacené propadá.

| # | Krok | Očekávání |
|---|---|---|
| 2.1 | Web → Rezervace: 4. 12. – 6. 12. 2026, 2 osoby, kontakt R2, poznámka „Jedeme jen ve dvou, dala by se domluvit sleva na poslední chvíli?“, Odeslat poptávku | cena 11 000 Kč, potvrzení poptávky |
| 2.2 | Detail R2, ✉ historie | Nová žádost; H1 a V1 jako v 1.6 (jen ověřit, že odešly) |
| 2.3 | **Přijmout**: v modálu cenu přepsat na **10 000**, Zpráva hostovi „Sleva na poslední chvíli je domluvená, cena je 10 000 Kč.“, potvrdit | modál: poznámka hosta hned pod cenou; předmět „Termín je pro vás volný — prosíme o úhradu do 28. 11. 2026“. Stav **Čeká na platbu**, cena **10 000 Kč**, VS **26120401**, Celá částka 10 000 Kč splatnost 28. 11. 2026, „Host platí celou částku najednou, doplatek není.“ V historii „Cena: 11 000 Kč → 10 000 Kč“ a zpráva hostovi (název události viz N7). Vpředu **Platba přijata** (ikona ✓ jako u doplatku, ne karta zálohy). V ⋮ Stornovat a pod čarou **Připomenout platbu** (ne „zálohu“), nevýrazná |
| 2.4 | ✉ historie | **H2 (B)**: „Termín je pro vás volný — prosíme o úhradu do 28. 11. 2026“, Celková cena 10 000, Celá částka 10 000, zpráva o slevě, žádný doplatek, QR na 10 000 |
| 2.5 | 📱 dlaždice R2 | **Petr Novotný** · `Čeká na platbu`; 4. 12. 2026 – 6. 12. 2026 · 10 000 Kč; „Příjezd za 9 dní · 2 noci · 2 osoby · Web“; tiše „Platba 10 000 Kč, splatnost 28. 11. 2026“. Footer: **Platba přijata** vlevo |
| 2.6 | *Jen pro test (host nezaplatil včas):* **Upravit** → Splatnost zálohy (u celé platby je to splatnost platby) = **včera**, **odškrtnout** „Poslat hostovi e-mail o změně“, uložit | platba **Po splatnosti**, v detailu červené upozornění „Platba 10 000 Kč je 1 den po splatnosti (splatnost …)“. Vpředu zleva **⚠ Připomenout platbu** (oranžově), „Platba přijata“ jen jako ikona ✓ s tooltipem, Upravit. V ⋮ nově **Propadlo** a Stornovat; Připomenout platbu tam už není (je vpředu), takže ani čára |
| 2.7 | 📱 dlaždice R2 | řádek platby tučně s červenou ikonou: „**Platba 10 000 Kč je 1 den po splatnosti**“. Footer vlevo **Připomenout platbu** a ikona ✓, vpravo ✎ ⋮ |
| 2.8 | **Připomenout platbu** z dlaždice: Zpráva hostovi „Termín se blíží, prosíme o platbu co nejdříve.“, **Odeslat** | modál: upozornění „Platba 10 000 Kč je 1 den po splatnosti“, pole Částka 10 000 a Splatnost (beze změny). Předmět „Platba za pobyt 4. 12. 2026 – 6. 12. 2026 (2 noci) je po splatnosti“, komu `petr.novotny@…` |
| 2.9 | ✉ historie „Připomínka platby · po splatnosti“ | **H4 po splatnosti**: „čeká na platbu, která byla splatná do *včera*. Zatím ji u nás neevidujeme.“, zpráva majitele, platební údaje 10 000 Kč a VS 26120401, QR, „Prosíme o úhradu co nejdříve, jinak budeme muset rezervaci zrušit…“, „Pokud jste už zaplatili, pošlete nám prosím potvrzení…“. Připomínka vpředu **zůstává výrazná** (dokud host nezaplatí) |
| 2.10 | **Platba přijata** (akce se tu jmenuje takhle, ne „Záloha přijata“): Částka 10 000, Zaplaceno dnes | modál: upozornění po splatnosti, pod datem „Splatnost …“, patička Platba přijata + Propadlo a Stornovat. Stav **Potvrzeno**, Uhrazeno 10 000 z 10 000 Kč, žádná akce Doplatek přijat. Výrazná připomínka zmizí. V ⋮ Stornovat a pod čarou **Poslat info k příjezdu** (zaplaceno) |
| 2.11 | ✉ historie | **H5 (B)**: „platbu jsme přijali“, bez řádků Přijatá záloha / Zbývá doplatit |
| 2.12 | **⋮ → Stornovat**, Zpráva hostovi „Rušíme na vaši žádost.“; v modálu zkontrolovat vyúčtování | modál: Platba 10 000 „Zaplaceno“, „Storno poplatek 100 % · 10 000 Kč (9 dní před příjezdem) · Zaplaceno 10 000 Kč · vrátit hostovi 0 Kč“, tlačítko Stornovat červeně |
| 2.13 | Detail po stornu | stav **Zrušeno**, Storno poplatek 10 000 Kč (100 %, 9 dní před příjezdem), vrátit hostovi 0 Kč; rezervace v „Archiv“ |
| 2.14 | ✉ historie | **H6b**: „Rezervace zrušena — …“, zpráva majitele, „zaplacená částka 10 000 Kč propadá jako storno poplatek“ |
| 2.15 | 📱 Archiv, dlaždice R2 | `Zrušeno`; bez „Příjezd …“; řádek „Vrátit hostovi **0 Kč**“ (host zaplatil, takže řádek je, i když se nevrací nic); footer jen ✎ ⋮ |
| 2.16 | Kalendář na webu | 4.–6. 12. zase volné |

## 3 · V zastoupení „Čeká na schválení“ → zamítnutí (R3) · video 3

Host z e-chalupy napsal poptávku, majitelka ji zapíše jako žádost a pak zamítne.

| # | Krok | Očekávání |
|---|---|---|
| 3.1 | Správa → Rezervace → ⋮ → **Vytvořit**: termín 5. 2. – 7. 2. 2027, Typ záznamu **V zastoupení hosta**, Stav rezervace **Čeká na schválení**, 3 osoby, kontakt R3, Poznámka hosta „Přijedeme ve třech, nejspíš až večer.“, cenu nevyplňovat | formulář ukáže cenu podle ceníku 11 000 Kč (placeholder) a Poslat hostovi e-mail s náhledem H1 |
| 3.2 | *Kontrola pravidel webu:* zkusit termín na 1 noc, pak zase vrátit 2 noci | 1 noc neprojde (minimum 2 noci), stejně jako na webu |
| 3.3 | Uložit, otevřít detail | stav **Nová žádost**, zdroj Ručně · V zastoupení hosta, bez platebního plánu. Vpředu Přijmout a Upravit, v ⋮ Zamítnout |
| 3.4 | ✉ historie „Vytvořeno“ | jen **H1** hostovi. **V1 není** (rezervaci jsme zakládali sami) |
| 3.5 | 📱 dlaždice R3 | **Kateřina Svobodová** · `Nová žádost`; 5. 2. 2027 – 7. 2. 2027 · 11 000 Kč; „Příjezd za 72 dní · 2 noci · 3 osoby · Ručně · V zastoupení hosta“; footer **Přijmout** vlevo |
| 3.6 | Kalendář na webu | 5.–7. 2. předběžně obsazené |
| 3.7 | **⋮ → Zamítnout**, Zpráva hostovi „Termín máme obsazený z jiného portálu.“ | modál „Zamítnout žádost“: poznámka hosta, předmět „Termín … vám bohužel nemůžeme potvrdit“, patička **Zamítnout** červeně nahoře, Přijmout pod ním. Stav **Zamítnuto**, v „Archiv“ |
| 3.8 | ✉ historie | **H3**: „Termín … vám bohužel nemůžeme potvrdit“, zpráva majitele, odkaz na volné termíny |
| 3.9 | 📱 Archiv (rok 2027), dlaždice R3 | `Zamítnuto`; bez „Příjezd …“, bez řádku platby i vratky; footer jen ✎ ⋮ |
| 3.10 | Kalendář na webu | 5.–7. 2. zase volné |

## 4 · V zastoupení „Schválená“ → připomínka celé částky → propadnutí → obnovení → jiná záloha → připomínka doplatku → storno s vratkou (R4) · video 4

Majitelka zapíše rezervaci rovnou jako schválenou. Záloha nedorazí a mezitím je na řadě i doplatek,
majitelka tedy připomene celou částku. Ani ta nedorazí, rezervace propadne. Host se pak ozve,
majitelka ji obnoví a host pošle zálohu, o 250 Kč vyšší. Doplatek nedorazí, majitelka ho připomene,
host za pár dní zruší 48 dní před příjezdem.

| # | Krok | Očekávání |
|---|---|---|
| 4.1 | Vytvořit: 12. 1. – 14. 1. 2027, V zastoupení hosta, Stav **Schválená**, 2 osoby, kontakt R4 | cena 9 500 Kč, náhled H2 |
| 4.2 | Uložit, detail | stav **Čeká na zálohu**, VS **27011201**, záloha 4 750 do 28. 11. 2026, doplatek 4 750 do 29. 12. 2026 |
| 4.3 | ✉ historie „Vytvořeno“ | **H2 (A)** se zálohou 4 750 a VS 27011201 |
| 4.4 | Akce v detailu | vpředu Záloha přijata a Upravit. V ⋮ **Propadlo** chybí (splatnost ještě nenastala), Stornovat, pod čarou Připomenout zálohu |
| 4.5 | *Simulace, že splatnost uplynula a blíží se doplatek:* **Upravit** → Splatnost zálohy = **včera**, Splatnost doplatku = **za 2 dny**, nechat zaškrtnuté „Poslat hostovi e-mail o změně“, uložit | záloha „Po splatnosti“; vpředu zleva **⚠ Připomenout zálohu** (oranžově), „Záloha přijata“ jen ikona, Upravit. V ⋮ nově **Propadlo** |
| 4.6 | ✉ historie „Úprava“ | **H9**: „Změna vaší rezervace — …“, řádky Splatnost zálohy 28. 11. 2026 → *včera* a Splatnost doplatku 29. 12. 2026 → *za 2 dny*, aktuální stav, platební údaje |
| 4.7 | 📱 dlaždice R4 | **Martin Procházka** · `Čeká na zálohu`; 12. 1. 2027 – 14. 1. 2027 · 9 500 Kč; „Příjezd za 48 dní · 2 noci · 2 osoby · Ručně · V zastoupení hosta“; tučně s červenou ikonou „**Záloha 4 750 Kč je 1 den po splatnosti**“. Footer vlevo **Připomenout zálohu** a ikona |
| 4.8 | **Připomenout zálohu** z dlaždice: bez zprávy, **Odeslat** | modál: červené „Záloha 4 750 Kč je 1 den po splatnosti“ a oranžové „Záloha je po splatnosti a je na řadě i doplatek. E-mail žádá rovnou celou částku, ne jen zálohu. Cenu nebo splatnost změníte přes Upravit.“, pod ním řádek „Celá částka **9 500 Kč**, splatnost *za 2 dny*“ (bez polí; video z 25. 11. je natočené před opravou P1 a ukazuje ještě pole Záloha a Splatnost). Místo zaškrtávátka nadpis „E-mail hostovi“. Předmět „Platba za pobyt 12. 1. 2027 – 14. 1. 2027 (2 noci) — prosíme o úhradu celé částky“, komu `martin.prochazka@…` |
| 4.9 | ✉ historie „Připomínka zálohy · celá částka“ | **H4 celá částka**: „čeká na úhradu zálohy, která byla splatná do *včera*… proto vás prosíme rovnou o úhradu celé částky 9 500 Kč“, **jeden** QR na 9 500 Kč s VS 27011201, „Pokud celá částka nebude uhrazena do *za 2 dny*, rezervaci zrušíme…“ |
| 4.10 | **⋮ → Propadlo**, Zpráva hostovi „Platba do termínu nedorazila, termín jsme uvolnili.“ | modál „Rezervace propadla“: upozornění na splatnost, předmět „Rezervace zrušena — záloha nedorazila: …“, patička Propadlo červeně, pod ním Záloha přijata a Stornovat. Stav **Propadlo**, v „Archiv“; kalendář 12.–14. 1. volný; e-maily z ⋮ zmizí |
| 4.11 | ✉ historie | **H6a**: „Rezervace zrušena — záloha nedorazila: …“, „do *včera* jsme neobdrželi zálohu“, zpráva majitele |
| 4.12 | 📱 Archiv (rok 2027), dlaždice R4 | `Propadlo`; bez „Příjezd …“ a bez řádku platby (konečný stav); footer jen ✎ ⋮, v ⋮ **Obnovit** |
| 4.13 | **⋮ → Obnovit** | modál „Obnovit rezervaci“: poznámka hosta („Host nic nenapsal.“), cena jen ke čtení, předmět „Termín je pro vás volný — prosíme o zálohu do 28. 11. 2026“. Stav **Čeká na zálohu**, plán spočítaný od dneška: záloha 4 750 do **28. 11. 2026**, doplatek do 29. 12. 2026, **VS zůstává 27011201**. Výrazná připomínka zmizí (nová splatnost je za 3 dny) |
| 4.14 | ✉ historie | **H2 (A)** znovu, s novou splatností 28. 11. 2026 |
| 4.15 | **Záloha přijata** z dlaždice: Záloha přepsat na **5 000**, Zaplaceno dnes, potvrdit | pod polem po chvíli „**Doplatek se změní na 4 500 Kč**“. Stav **Potvrzeno**, Uhrazeno 5 000 z 9 500 Kč, doplatek **4 500**; v historii „Záloha přijata“ se změnou „Záloha: 4 750 Kč → 5 000 Kč“; ✉ **H5 (A)**: Přijatá záloha 5 000, Zbývá doplatit 4 500 do 29. 12. 2026, QR na 4 500 |
| 4.16 | *Simulace, že doplatek nedorazil:* **Upravit** → Splatnost zálohy = **předevčírem**, Splatnost doplatku = **včera** (záloha nesmí být splatná po doplatku), **odškrtnout** „Poslat hostovi e-mail o změně“, uložit | doplatek „Po splatnosti“; vpředu zleva **⚠ Připomenout doplatek** (oranžově), „Doplatek přijat“ jen ikona ✓, Upravit. V ⋮ Stornovat; Poslat info k příjezdu tam není (není zaplaceno a příjezd je daleko) |
| 4.17 | 📱 dlaždice R4 | `Potvrzeno`; tučně s červenou ikonou „**Doplatek 4 500 Kč je 1 den po splatnosti**“; footer vlevo **Připomenout doplatek** a ikona ✓ |
| 4.18 | **Připomenout doplatek** z dlaždice: Zpráva hostovi „Doplatek zatím nedorazil, prosíme o kontrolu.“, **Odeslat** | modál: Záloha 5 000 „Zaplaceno“, upozornění „Doplatek 4 500 Kč je 1 den po splatnosti“, pole Doplatek 4 500 a Splatnost *včera*. Předmět „Doplatek za pobyt 12. 1. 2027 – 14. 1. 2027 (2 noci) je po splatnosti“ |
| 4.19 | ✉ historie „Připomínka doplatku · po splatnosti“ | **H10 po splatnosti**: „zatím neevidujeme doplatek, který byl splatný do *včera*. Prosíme o úhradu co nejdříve“, zpráva majitele, platba 4 500 Kč s VS 27011201 a QR, „Pokud jste už zaplatili, pošlete nám prosím potvrzení…“ |
| 4.20 | **⋮ → Stornovat**, Zpráva hostovi „Rušíme na vaši žádost, vratku pošleme převodem.“; v modálu vyúčtování | Záloha 5 000 „Zaplaceno“, Doplatek 4 500 „Po splatnosti“; 48 dní před příjezdem, poplatek 25 % = **2 375 Kč**, zaplaceno 5 000, **vrátit 2 625 Kč**; patička Stornovat a Doplatek přijat |
| 4.21 | Detail po stornu | stav **Zrušeno**, záznam storna se stejnými čísly; kalendář 12.–14. 1. volný |
| 4.22 | ✉ historie | **H6b**: „ze zaplacené částky 5 000 Kč vám vrátíme 2 625 Kč“ (vratku posílá majitelka ručně převodem, appka ji jen spočítá) |
| 4.23 | 📱 Archiv (rok 2027), dlaždice R4 | `Zrušeno`; řádek „Vrátit hostovi **2 625 Kč**“ |

## 5 · V zastoupení „Potvrzená“ → storno zdarma (R5) · video 5

Host z e-chalupy zaplatil mimo appku, majitelka rezervaci zapíše rovnou jako potvrzenou. Host ji
86 dní před příjezdem zruší.

| # | Krok | Očekávání |
|---|---|---|
| 5.1 | Vytvořit: 19. 2. – 21. 2. 2027, V zastoupení hosta, Stav **Potvrzená**, 5 osob, kontakt R5 | cena 11 000 Kč, náhled H5 |
| 5.2 | Uložit, detail | stav **Potvrzeno**, „Bez platebního plánu — platby se u téhle rezervace nesledují.“, žádný VS. Vpředu jen Upravit. V ⋮ Stornovat a pod čarou jen **Poslat info k příjezdu** (bez plánu se nic nedluží), žádná připomínka |
| 5.3 | ✉ historie | **H5 (B)**: bez zálohy, doplatku a QR |
| 5.4 | 📱 dlaždice R5 | **Lucie Králová** · `Potvrzeno`; 19. 2. 2027 – 21. 2. 2027 · 11 000 Kč; „Příjezd za 86 dní · 2 noci · **5 osob** · Ručně · V zastoupení hosta“; bez řádku platby; footer jen ✎ ⋮ |
| 5.5 | Kalendář na webu | 19.–21. 2. obsazené (ne předběžně) |
| 5.6 | **⋮ → Stornovat**; v modálu vyúčtování | „Storno poplatek 0 % · 0 Kč (86 dní před příjezdem) · Zaplaceno 0 Kč · vrátit hostovi 0 Kč“ |
| 5.7 | Detail a ✉ historie | stav **Zrušeno**; **H6b** bez odstavce o vyúčtování; kalendář volný |
| 5.8 | 📱 Archiv (rok 2027), dlaždice R5 | `Zrušeno`; řádek „Vrátit hostovi“ **není** (host nic nezaplatil) |

## 6 · Automatický e-mail, výrazné akce a dlaždice na lokálních datech · screenshoty

Cron, který posílá V2, zatím neběží, kontroluje se jen jeho podoba. Výrazné informace
k příjezdu nejdou ukázat na testovacích rezervacích: termíny do 3 dnů od běhu jsou v lokální DB
obsazené a admin překryv nepovolí. Proto se kontrolují na lokálních rezervacích, které tam už
jsou, stejně jako varianty dlaždice, které testovací rezervace nemají. Tady se **nic
neodesílá**, modály se zavírají křížkem. *Naposledy 19. 11. 2026, 25. 11. se neopakoval.*

| # | Krok | Očekávání |
|---|---|---|
| 6.1 | `npm run email:preview`, otevřít `tmp/email-preview/index.html` | stránka se všemi šablonami ve všech jazycích |
| 6.2 | **V2** záloha po splatnosti (nám) | „Záloha po splatnosti: …“, VS, splatnost, odkaz do adminu |
| 6.3 | Správa → Rezervace, Aktivní, počítač (stav k 19. 11. 2026, jiný den se liší) | **Test 1** (20.–22. 11., potvrzená bez plánu, příjezd zítra): **Poslat informace k příjezdu** zeleně na prvním místě, v ⋮ už ne. **Petr Zálohový** (23.–25. 11., doplatek po splatnosti od 9. 11.): **⚠ Připomenout doplatek** a ikona ✓. **Karel Pozdní** (záloha po splatnosti od 8. 10.): **⚠ Připomenout zálohu** a ikona ✓. **Eva Potvrzená** (zaplaceno, příjezd 8. 12.): nic výrazného. Oranžové informace k příjezdu (3 dny předem) jsou vidět jen v den, kdy nějaká rezervace přijíždí za 3 dny (20. 11. Petr Zálohový, i s nezaplaceným doplatkem) |
| 6.4 | 📱 stejný seznam na 390 px | **Test 1**: „Příjezd zítra · 2 noci · … · Ručně · V zastoupení hosta“, footer vlevo **Poslat informace k příjezdu** (zeleně). **Petr Zálohový**: „Příjezd za 4 dny · …“, tučně „Doplatek … Kč je 10 dní po splatnosti“ s červenou ikonou, vlevo Připomenout doplatek a ✓. **Karel Pozdní**: „Záloha 3 900 Kč je 42 dní po splatnosti“. **Údržba** (7.–9. 1. 2027): titulek „Údržba“, štítek `Blokace termínu` s ikonou kalendáře, podrobnosti jen „2 noci“ (bez „Příjezd za…“), bez ceny a řádku platby, footer ✎ ⋮ |
| 6.5 | 📱 šířka 320 px (nejužší telefon) | jméno se zalomí, štítek a cena zůstanou vpravo. U dlaždice s dlouhými akcemi (Petr Zálohový, od 20. 11. s informacemi k příjezdu) jde nejdřív ✎ do ⋮ jako „Upravit“, teprve pak se akční tlačítka zkrátí na ikony s tooltipem. Stránka nejezdí do strany |
| 6.6 | 📱 šířka 600 px (nejširší dlaždice) | dlaždice přes celou šířku, akce s textem vlevo, ✎ ⋮ vpravo, ✎ v řádku |
| 6.7 | 📱 tmavý režim | dlaždice s tmavým podkladem, text termínu, ceny a podrobností čitelný, červená ikona po splatnosti a zelené tlačítko informací k příjezdu odlišené |
| 6.8 | 📱 klik do volného místa dlaždice Test 1 | otevře detail. Klik na akční tlačítko otevře jen modál, klik na ⋮ jen menu, detail se neotevře |
| 6.9 | 📱 klávesnice: Tab | fokus jde na jméno (odkaz), pak na akce zleva doprava a ⋮; Enter na jménu otevře detail. Dlaždice sama fokus nedostane |
| 6.10 | U Test 1 otevřít **Poslat info k příjezdu**: kód prázdný, pak zadat „12“ | bez kódu se náhled nenačte a Odeslat je neaktivní; „12“ → „Zadejte 3 až 10 číslic.“ Zavřít křížkem |
| 6.11 | Správa → Nastavení: Wi-Fi vymazat (vrací krok 0.5), uložit; u Test 1 znovu otevřít modál, zadat kód 1234 | upozornění „V Nastavení chybí Wi-Fi, e-mail půjde bez ní.“ s odkazem **Otevřít Nastavení**; náhled bez oddílu Wi-Fi. Zavřít křížkem |

## 7 · Úklid

| # | Krok | Očekávání |
|---|---|---|
| 7.1 | Správa → Rezervace, Aktivní i Archiv: u R1–R5 **⋮ → Smazat** → potvrdit „Smazat položku?“ | rezervace zmizí |
| 7.2 | Správa → Nastavení: E-mail vlastníka vrátit na prázdný; Wi-Fi vymazat; Pošta vyprázdnit a testovací SMTP zastavit | uloženo |
| 7.3 | Kalendář na webu | termíny R1–R5 volné, ostatní data beze změny |

## Výsledky běhu 25. 11. 2026 (scénáře 1–5 a 7, telefon, nové modaly)

Scénáře 1–5 prošly. Běh i videa byly na telefonu (390 px, emulace v headless Edge) s testovacím
SMTP a realistickými daty, data přepočítaná na 25. 11. (tabulka Testovací data). Videa v
`tmp/videa/` přepsala verze z 19. 11.:

| Video | Délka | Soubor |
|---|---|---|
| 1 Happy day | 4:30 | `rezervace-1-happy-day-telefon.mp4` |
| 2 Poslední chvíle, sleva, storno 100 % | 2:50 | `rezervace-2-posledni-chvile-telefon.mp4` |
| 3 Zamítnutí | 1:23 | `rezervace-3-zamitnuti-telefon.mp4` |
| 4 Propadnutí, obnovení, jiná záloha, storno s vratkou | 3:19 | `rezervace-4-propadnuti-storno-telefon.mp4` |
| 5 Storno zdarma | 1:07 | `rezervace-5-storno-zdarma-telefon.mp4` |

Každé i v lehké verzi `…-telefon-lite.mp4`. Starší soubory `rezervace-1-happy-day.mp4`
a `-mobil.mp4` (18. 11., počítač) zůstaly.

- **1:** modál Přijmout na jednu obrazovku (cena jako pole, poznámka hosta, e-mail). Záloha
  přijata s předvyplněnou částkou a datem. Odklad doplatku v připomínce na 15. 1. s odškrtnutým
  e-mailem: tlačítko Uložit, alert „Uloženo.“, v historii jen „Úprava“. Doplatek přijat poslal
  H11. Informace k příjezdu s kódem předvyplněným z rezervace; Ukončit pobyt ukázal „Zaplaceno
  celkem 11 000 Kč z 11 000 Kč“.
- **2:** sleva při přijetí 11 000 → 10 000 Kč: plán, H2 i storno počítají s 10 000, v historii
  „Cena: 11 000 Kč → 10 000 Kč“. Připomínka platby po splatnosti, Platba přijata, storno 9 dní
  předem 100 % = 10 000, vrátit 0 Kč.
- **3:** založení v zastoupení, Zamítnout s poznámkou hosta v modálu. Krok 3.2 (1 noc neprojde)
  se ani tentokrát nezkoušel.
- **4:** připomínka celé částky (9 500 Kč jedním QR), Propadlo, Obnovit (VS 27011201 zůstal),
  Záloha přijata **5 000** místo 4 750: pod polem „Doplatek se změní na 4 500 Kč“, v historii
  „Záloha: 4 750 Kč → 5 000 Kč“, H5 se zbývajícím doplatkem 4 500. Připomínka doplatku po
  splatnosti na 4 500, storno 48 dní předem: 25 % = 2 375, vrátit 2 625 Kč.
- **5:** potvrzená bez plánu, storno 86 dní předem 0 %, v archivu bez řádku o vratce.
- **7:** testovací rezervace smazané (přímo v lokální DB), e-mail vlastníka, Wi-Fi i Pošta
  vrácené na prázdné, testovací SMTP zastavené, dočasné nástroje z `tools/` smazané.

Nálezy (N7 a P1 opraveny týž den):

- **N7 Název události u celé platby:** historie píše „Platba přijata“ u **každého** přechodu
  rezervace s celou částkou, nejen u přijetí platby. Ve scénáři 2 tak přijetí žádosti vypadá jako
  „Platba přijata → Čeká na platbu“ a storno jako „Platba přijata → Zrušeno“. Příčina:
  `history.jsx` bere `event.fullPayment ? "markFullPaid" : event.action` bez ohledu na akci
  (zavedeno opravou N1 v `e71340d`, je v produkci od 0.3.1). Oprava: `markFullPaid` jen pro
  `action === "markDepositPaid"`. Ve videu 2 proto historie přijetí a storna není.
  **Opraveno 2026-11-25** v `history.jsx` (podmínka na akci). Ověřeno na dočasné rezervaci
  s celou platbou: storno je v historii „Stornovat → Zrušeno“; uložená data se neměnila, oprava
  platí i pro starší události.
- **P1 Pole u připomínky celé částky neřídí, co e-mail žádá:** modál napíše, že e-mail žádá
  rovnou celou částku (9 500 Kč do splatnosti doplatku), ale pole pod tím jsou „Záloha 4 750 Kč“
  a „Splatnost“ zálohy. Server (`reminderPlanSet`) jimi mění zálohu a její splatnost: jiná
  záloha jen přesune peníze mezi zálohou a doplatkem a částka v e-mailu zůstane 9 500; posun
  splatnosti zálohy do budoucna přepne e-mail na obyčejnou připomínku zálohy.
  **Opraveno 2026-11-25** (Caio): ve fázi celé částky modál pole nemá, ukáže řádek „Celá částka
  9 500 Kč, splatnost 27. 11. 2026“ (po splatnosti doplatku „splatnost co nejdříve“), e-mail nejde
  odškrtnout (místo zaškrtávátka nadpis „E-mail hostovi“) a upozornění dodá „ne jen zálohu. Cenu
  nebo splatnost změníte přes Upravit.“ Fázi modál počítá sám (`reminderFullDue` v
  `modal-money.js`, stejné pravidlo jako server `reminderPhase`), takže se rozložení nemění, než
  dorazí náhled. Ověřeno na dočasné rezervaci (telefon): celá částka bez polí, běžná připomínka
  po splatnosti pole Záloha a Splatnost dál má. Rezervace smazaná.
- **P2 Odškrtnuté „Poslat e-mail“ pod kurzorem** vypadá skoro jako zaškrtnuté (obrys ✓ při
  najetí myší, ve videu 1 v kroku 1.12). Na telefonu bez kurzoru se to nestane, jen postřeh.
- **P3 Záložky Potvrzení / Info** z [proposal-reservation-tabs.md](./proposal-reservation-tabs.md)
  nejsou v kódu; na telefonu je modál jeden sloupec podle návrhu majitelky z 24. 11. a běžná akce
  se vejde na jednu obrazovku bez rolování; delší modál (připomínka celé částky se dvěma
  upozorněními) se mírně roluje, patička s tlačítkem zůstává pevně dole.
- Úprava splatnosti celé platby se v historii jmenuje „Splatnost zálohy“ (známé, krok 2.6).

## Výsledky běhu 19. 11. 2026 (scénáře 2–7, telefon)

Všechny scénáře prošly. Běh i videa byly na telefonu (390 px) s testovacím SMTP a
realistickými daty; data přepočítaná na 19. 11. (R2 příjezd za 8 dní, platba do 22. 11.; R4
54 dní, záloha do 22. 11., doplatek do 29. 12.; R5 92 dní). Videa v `tmp/videa/`:
`rezervace-2-posledni-chvile-telefon.mp4`, `-3-zamitnuti-`, `-4-propadnuti-storno-`,
`-5-storno-zdarma-`; screenshoty scénáře 6 v `tmp/videa/scenar-6/`.

- **2:** platba po splatnosti v dlaždici „Platba 11 000 Kč je 1 den po splatnosti“, vpředu
  Připomenout platbu a ikona ✓, v menu nově Propadlo. Připomínka H4 po splatnosti („co nejdříve“,
  QR na 11 000 Kč). Storno 8 dní předem: 100 %, vrátit 0 Kč, v archivu „Vrátit hostovi 0 Kč“.
- **3:** založení v adminu přes ⋮ → Vytvořit; stav je přepínač Čeká na schválení / Schválená /
  Potvrzená. Odešel jen e-mail hostovi (V1 ne). Zamítnutí z ⋮ v detailu.
  Krok 3.2 (1 noc neprojde) se v tomto běhu nezkoušel.
- **4:** připomínka zálohy ve fázi „celá částka“ (9 500 Kč jedním QR, do 21. 11.), Propadlo,
  Obnovit (nový plán, VS 27011201 zůstal), Záloha přijata, připomínka doplatku po splatnosti
  (H10), storno 54 dní předem: 25 % = 2 375 Kč, vrátit 2 375 Kč.
- **5:** potvrzená bez plánu: v menu jen Stornovat a Poslat informace k příjezdu, storno 0 %,
  v archivu bez řádku o vratce.
- **6:** V2 v náhledu; na počítači i telefonu výrazné akce u Test 1 (informace k příjezdu
  zeleně), Petr Zálohový a Karel Pozdní (připomínka + ikona), Eva nic; blokace Údržba. Na
  320 px jde tužka do ⋮ a akce se zkrátí na ikony. Tmavý režim čitelný. Klik do dlaždice
  otevře detail. Prázdný kód i „12“ drží Odeslat neaktivní, bez Wi-Fi modál upozorní.
- **7:** testovací rezervace smazané (přímo v DB), e-mail vlastníka, Wi-Fi i Pošta vrácené na
  prázdné, testovací SMTP zastavené, dočasné nástroje z `tools/` smazané.

Nálezy a co s nimi (majitel 2026-11-19):

- **N1 Historie u celé platby:** událost se jmenovala „Připomínka zálohy · po splatnosti“, i když
  akce je „Připomenout platbu“. **Opraveno:** událost nese `fullPayment` a historie píše
  „Připomínka platby“ (`crud.js` `sendManualEmail`, `history.jsx`, LSI ve všech jazycích).
- **N2 Archiv po rocích:** rezervace na příští rok byly vidět až po přepnutí roku a výběr roku
  řadil od nejstaršího (mřížka 2018–2034). **Opraveno:** filtr Rok zůstává, nabízí roky od
  nejvyššího (příští rok dolů po 2026), výchozí je letošní rok.
- **N3 Dlaždice má `role="button"`:** přidává ji `Uu5Elements.Box` (základ `Tile`), kdykoli
  dostane `onClick` (`let role = onClick ? "button" : undefined`, pak `{ role, ...attrs }`).
  Návrh dlaždice (§ 6) chce dlaždici bez role tlačítka. **Opraveno** podle návrhu níž
  (`elementAttrs={{ role: undefined }}` v `tile.jsx`); ověřeno v prohlížeči: žádná dlaždice roli
  nemá, klik do dlaždice otevře detail, tužka otevře úpravu.
- **N4 Termín ve formuláři nejde napsat z klávesnice:** chování `uu5g05-forms` 1.54.0-alpha
  (`DateRangeFieldView`), stejné i na webu. Po dopsání příjezdu zůstane kurzor na roce
  a nepřeskočí na odjezd. Na odjezd se jde jen šipkou →; Tab opustí celé pole s polovičním
  rozsahem a pole hlásí „Zadané datum neexistuje.“ a vymaže se; „-“ nic nedělá. Na telefonu šipka
  na klávesnici není, takže zbývá kalendář. Není to chyba appky.
- **N5 Tykání majitelce:** V2 tyká, V1 byl neosobní („Přijmout nebo zamítnout“). **Opraveno:**
  majitelce se vždy tyká, V1 „Přijmi nebo zamítni v adminu“; pravidlo v `decisions.md`.
- **N6 Menu ⋮ v emulaci:** artefakt emulace, v pořádku.

### Oprava N3: dlaždice bez role tlačítka (provedeno 2026-11-19)

`Uu5Elements.Box` skládá atributy jako `{ role: onClick ? "button" : undefined, ...attrs }`
a `attrs` obsahují `elementAttrs`, takže je přebijí. Stačí v `tile.jsx` předat dlaždici
`elementAttrs={{ role: undefined }}`:

- klik a ťuknutí na dlaždici dál otevřou detail (`onClick` zůstává na `div`);
- čtečka přestane hlásit celou dlaždici jako jedno tlačítko a přečte jméno (odkaz), údaje
  a tlačítka akcí zvlášť, jak chce § 6 návrhu dlaždice;
- klávesnice se nemění: dlaždice fokus nedostává už dnes, cesta na detail je přes jméno.

Varianta bez závislosti na pořadí atributů v uu5: `onClick` nedávat `Tile`, ale obalovacímu
`div` kolem ní. Ověřit po úpravě: atribut `role` na dlaždici chybí, klik do volného místa
otevře detail, klik na tlačítko nebo ⋮ ne.

## Otevřené otázky k doplnění (2026-11-19)

- **Kód ke schránce:** reálný je šestimístný, appka ale bere 3 až 10 číslic. Omezit na přesně 6?
- **„QA Admin“ v historii:** ve videu je u akcí vidět jméno lokálního QA účtu. Přejmenovat ho
  lokálně na jméno majitelky?

## Rozhodnutí

- 2026-11-18: struktura schválená; testovací rezervace se na konci smažou; posun termínu R1 do
  minulosti je pro test v pořádku; video na happy day a na každý alternativní scénář.
- 2026-11-18: detaily schválené; e-mail vlastníka se po dobu testu nastaví na
  `roubeny.raj@mailinator.com` a v úklidu vrátí na prázdný; scénář 6 bez videa; e-maily ve
  videích jako obrazovky (komu + předmět, dva vedle sebe); videa jen česky.
- 2026-11-19: scénáře doplněné o ruční e-maily: informace k příjezdu v happy day (1), připomínky
  po splatnosti v alternativních scénářích (2, 4). Videa zatím ne. *Čeká na schválení.*
- 2026-11-19: scénáře upravené na nové rozložení akcí (vpředu jen to, co je na řadě, zbytek v ⋮)
  a doplněné o dlaždice na telefonu (kroky 📱 v každém scénáři, varianty a ovládání ve scénáři 6).
  *Čeká na schválení.*
- 2026-11-19: video scénáře 1 jen na telefonu. Ukázka má vypadat jako skutečné použití: e-maily
  přes lokální testovací SMTP (zapíšou se jako odeslané, ven nic neodejde), realistická jména a
  telefony, šestimístný kód ke schránce, seznam ve videu přiblížený na dlaždici.
- 2026-11-25: videa 1–5 natočená znovu s novými modaly akcí (návrh majitelky 2026-11-24). Scénáře
  doplněné bez nových rezervací: sleva při přijetí (2), jiná přijatá záloha (4), odklad doplatku
  v připomínce s uložením bez e-mailu a H11 (1). Data přepočítaná na 25. 11.
