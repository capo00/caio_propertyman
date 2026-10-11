# Návrh: faktura v PDF na žádost

- **Podklad:** [wip.md, zadání majitele, bod 4](./wip.md#zadání-majitele-2026-09-27).
- **Stav (2026-10-10):** implementováno (`server/invoice/`, `client/src/admin/components/invoice/`), údaje dodavatele doplněné 2026-10-11. Odchylky od původního návrhu jsou opravené přímo v textu níž.

## Rozhodnutí majitele (2026-10-10)

- **Majitel má IČO a není plátce DPH.** Faktura je bez DPH, s textem „Nejsem plátce DPH“ a s údajem o zápisu do živnostenského rejstříku. Poznámka o § 9 ZDP v [design.md § Finance](../design.md) tím neplatí: příjem z ubytování je živnost.
- **Faktura jen ad hoc, na žádost zákazníka.** Nic nevzniká automaticky a appka fakturu **neposílá**. Vlastník ji v adminu vygeneruje, stáhne PDF a pošle zákazníkovi sám.
- **Zálohová faktura ani e-maily s přílohou se nedělají.** Výzvu k platbě dál nese e-mail H2 s QR.
- **PDF se ukládá do databáze** (kolekce `invoice`, pole `pdf`), ne do Cloud Storage a negeneruje se znovu ze snímku údajů. Opakované stažení vrací přesně to PDF, které dostal zákazník.

## 1. Use case

1. Vlastník otevře detail rezervace a klikne na **„Vystavit fakturu“**.
2. Modál má předvyplněné:
   - **dodavatele** (vlastník) z configu, jen ke čtení,
   - **odběratele** z rezervace (`contact.name`), editovatelné; vlastník doplní adresu, případně IČO a DIČ firmy,
   - **položku** „Ubytování <termín>, <noci>, <osoby>“ a částku `totalPrice`, editovatelné,
   - **datum vystavení** (dnes), **datum zaplacení** (`paidDate` poslední platby), **VS** rezervace.
3. **„Vygenerovat“** zavolá cmd `invoice/create`. Server přidělí číslo, uloží fakturu a vrátí PDF. Prohlížeč ho rovnou stáhne jako `faktura-2026-0001.pdf`.
4. Vlastník PDF pošle zákazníkovi mimo appku.

Vystavená faktura je v detailu rezervace v sekci *Faktury* a jde stáhnout znovu (stejné PDF, nic se negeneruje znovu).

Tlačítko je u každé rezervace s hostem, i nezaplacené: zákazník může fakturu chtít kvůli proplacení. Když platba ještě nepřišla, datum zaplacení zůstane prázdné, na faktuře je splatnost místo „Uhrazeno“.

## 2. Data

Kolekce **`invoice`**, jedna položka = jedna vystavená faktura:

```jsonc
{
  "id": "…",
  "number": "2026-0001",
  "reservationId": "…",
  "variableSymbol": "26110701",
  "issuedDate": "2026-10-24",
  "paidAmount": 9000,                     // kolik už je zaplaceno; méně než total = na faktuře „Zbývá uhradit“
  "paidDate": "2026-10-20",               // datum (poslední) úhrady; null = nic nezaplaceno
  "dueDate": null,                        // splatnost zbytku; jen když paidAmount < total
  "supplier": { "name": "…", "address": "…", "ico": "…", "registry": "…", "account": "6338724003/0800" },
  "customer": { "name": "Firma s.r.o.", "address": "…", "ico": "12345678", "dic": "CZ12345678" },
  "lineList": [{ "text": "Ubytování 7.–9. 11. 2026, 2 noci, 4 osoby", "amount": 9000 }],
  "total": 9000,
  "pdf": "<Binary>",                      // ~30–60 kB
  "cancelled": false,
  "createdBy": "<identity id>",
  "createdAt": "…"
}
```

- **Číslo** z roční souvislé řady: nejvyšší číslo v roce (i stornované) + 1, unikátní index na `number`. Při souběhu druhý narazí na E11000 a zkusí další číslo. Ne čítač: ten by se zvedl i tehdy, když pak selže render PDF, a v řadě by vznikla díra. Takhle se nic nezapíše, dokud není PDF hotové.
- **Faktura se už nemění.** Ukládá se snímek údajů a hotové PDF, takže pozdější úprava rezervace, configu nebo šablony starou fakturu nepřepíše.
- **Chyba ve faktuře:** fakturu jde označit jako stornovanou (`invoice/cancel`) a vystavit novou. Stornovaná zůstane v řadě, jen se přeškrtne v seznamu. Nemaže se, ať v řadě nejsou díry.
- **Rezervace se nemění.** Fakturační údaje zákazníka se ukládají jen do faktury.

## 3. Server

- **cmd `invoice/draft`** `{ reservationId }` → předvyplněný formulář (dodavatel, odběratel, položka, platba).
- **cmd `invoice/create`** `{ reservationId, customerName, customerAddress, customerIco, customerDic, lineList, issuedDate, paidAmount, paidDate, dueDate }` → `{ invoice, pdfBase64 }`. Server ověří, že rezervace existuje a má hosta, přidělí číslo, vyrenderuje PDF, uloží a vrátí. Base64 v JSON odpovědi znamená, že se nemusí řešit binární odpovědi v caio-serveru. PDF je malé.
- **cmd `invoice/list`** `{ reservationId }` → seznam bez `pdf`.
- **cmd `invoice/download`** `{ id }` → `{ filename, pdfBase64 }`.
- **cmd `invoice/cancel`** `{ id }`.
- Vše jen pro roli vlastníka. Role se čte z databáze, ne z tokenu.
- **Kód:** `server/invoice/{api.js, crud.js, dao.js, draft.js, pdf.js}` + `invoice.test.js`.

## 4. PDF

- **Knihovna `pdfmake`** na serveru (popis dokumentu jako objekt, tabulky zadarmo, nad `pdfkit`). Nic v prohlížeči: číslo musí přidělit server a faktura se musí uložit. Puppeteer ne: Chromium na App Engine je těžký.
- **Písmo** Roboto, které pdfmake přibaluje (`pdfmake/fonts/Roboto`), umí českou diakritiku. Standardní PDF písma ji neumí.
- **Rozvržení, A4 na jednu stranu:** *Faktura č. 2026-0001*, data (vystavení, zaplacení nebo splatnost), dodavatel a odběratel vedle sebe, platební údaje (účet, VS), tabulka položek, celkem, „Uhrazeno, neplaťte“ (když je zaplaceno), patička „Nejsem plátce DPH. <zápis v rejstříku>“.
- **Náhled bez ukládání:** `npm run invoice:preview` vyrobí PDF z ukázkových dat do `tmp/`, stejně jako `email:preview`.

## 5. Admin (klient)

- **Detail rezervace:** sekce *Faktury* (číslo, datum, částka, odběratel, akce Stáhnout a Stornovat) a tlačítko **„Vystavit fakturu“**.
- **Modál** podle `uu5-forms` (`Form.Provider`, `Form.View`, `SubmitButton`): bloky Dodavatel (jen čtení), Odběratel (jméno povinné, adresa, IČO, DIČ), Položky (text + částka, přidat/odebrat), Data. Submit = „Vygenerovat“.
- **Stažení:** `pdfBase64` → `Blob` → dočasný `<a download>`. Na telefonu (admin je primárně na telefonu) se PDF otevře v prohlížeči nebo nabídne ke sdílení. Ověřit na reálném telefonu.
- `client/src/admin/calls.js` dostane `invoiceCalls`.

## 6. Konfigurace

`server/config.js`, sekce `invoice.supplier`: jméno, adresa, IČO, zápis v živnostenském rejstříku. Účet se bere z `bankAccount`.

## 7. Otevřené

- ~~**Údaje dodavatele**~~: doplněné v `server/config.js` (2026-10-11).
- **Poplatek z pobytu:** je v ceně, nebo má být na faktuře samostatný řádek? (Položky jsou editovatelné, takže jde přidat ručně i bez rozhodnutí.)
- **Jazyk:** jen čeština. Dvojjazyčná faktura až podle potřeby.

## 8. Mimo rozsah

- Odesílání faktury e-mailem z appky, zálohová faktura, automatické vystavení.
- Faktura bez rezervace (třeba za Booking hosta nebo jinou službu). Šlo by doplnit samostatnou obrazovkou *Faktury* se stejným modálem bez `reservationId`.
- DPH. Kdyby se majitel stal plátcem, je to nový návrh.
- Export faktur pro účetní.
