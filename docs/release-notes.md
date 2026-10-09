# Release notes

Jedna nota na vydání, novější nahoře. Číslování podle zvyklosti stacku caio-architecture:
dokud je appka na 0.x, oprava i nová funkce zvedá patch, minor je jen pro breaking změnu.

---

## v0.2.0 (2026-10-10)

Rezervační flow se zálohou podle zadání vlastníka (`docs/proposal-reservation-flow.md`),
e-maily hostům s QR platbou, storno podmínky a reCAPTCHA na webu. Stack:
`caio-server` 0.4.0, `caio-ui` 0.4.2, `caio-devkit` 0.4.1.

### Rezervace

- Sedm stavů (žádost, čeká na zálohu / platbu, potvrzeno, po pobytu, zamítnuto, zrušeno,
  propadlo). Stav mění jen člověk v adminu, nic automaticky.
- Platební plán: záloha 50 % splatná do 3 dnů, doplatek 14 dní před příjezdem; při přijetí
  14 a méně dní před příjezdem celá částka najednou. Variabilní symbol z data příjezdu.
- Storno podmínky: 0–14 dní před příjezdem 100 %, 15–30 dní 50 %, 31–60 dní 25 %, 61+ dní
  zdarma. Storno zapíše poplatek a vratku do rezervace.
- Historie každé rezervace: kdo, kdy, co změnil, co napsal hostovi a které e-maily odešly
  (i s textem).

### E-maily

- Šablony pro hosta i vlastníka (žádost, výzva k záloze, potvrzení, změna, storno,
  propadnutí, poděkování…), HTML i text, QR Platba jako inline obrázek. E-maily hostovi
  jsou „neodpovídejte“, e-mail vlastníkovi má Reply-To na hosta.
- Posílá je `caio-server` (`Mailer.send`), appka už nemá vlastní nodemailer.
- E-mailové adresy a telefony s předvolbou jsou v HTML odkazy.

### Admin

- Seznam rezervací rozdělený na **Aktivní** a **Archiv** (archiv po letech), filtry ve
  FilterBaru (stav, zdroj, příjezd, rok) na serveru, klik na řádek otevře detail.
- Detail rezervace (`/admin/reservation?id=…`): souhrn (pobyt, platby, kontakt),
  akce, úprava, historie.
- Modál změny stavu se souhrnem, náhledem e-mailu (HTML s QR i text), volbou jazyka a zprávou
  hostovi; e-mail neodejde, dokud ho vlastník neviděl. Náhled e-mailu i ve formulářích.
- Data přes `Uu5Elements.DateTime`, čísla přes `Number`; admin má výchozí spacing
  (`normal`), web `loose`.

### Web

- reCAPTCHA v3 u rezervačního formuláře (odznak skrytý, text s odkazy pod formulářem).
- Kalendář obsazenosti je zároveň výběr termínu (propojený s polem formuláře); obsazeno
  červeně, rezervováno (čeká na platbu) oranžově.
- Kontrola e-mailové adresy (formát + doména) u žádosti.

### Breaking (konfigurace)

- **SMTP proměnné se přejmenovaly** na názvy `caio-server`: `SMTP_PASSWORD` (dřív
  `SMTP_PASS`) a `MAIL_FROM` (dřív `SMTP_FROM`). Viz `release.md`, 1.4.
- **`GOOGLE_RECAPTCHA_SECRET` je v produkci povinný** — bez něj rezervační formulář
  odmítne každé odeslání (503). Klíč pro klienta je `GOOGLE_RECAPTCHA_API_KEY`.
- Nový tvar dokumentu rezervace (stav, platby, historie) bez migrace — v produkci žádné
  rezervace nebyly.

### Co v tomhle vydání chybí

- **Ceník pořád není schválený** (`pricing.approved: false`) — server v produkci odmítne
  spočítat cenu, takže webová žádost zatím neprojde. Čeká na sazby od vlastníka.
- Automatické připomínky (cron), informace k příjezdu (obsah), odkaz na hodnocení po
  pobytu a překlady e-mailů do en/de/sk — `docs/wip.md`.
- `ICAL_SYNC_SECRET` není v produkčním `.env` vyplněný, plánovaná synchronizace
  kalendářů portálů (`calendar/sync`) se proto neověří.
- Obsazené dny v kalendáři mají `disabled`, ale `uu5g05` 1.52.1 ho ještě nečte — začne
  platit s novou verzí uu5g05.

---

## v0.1.0 (2026-09-29)

První vydání. Web běží, appka je nasaditelná na App Engine, ale ceník ještě čeká na
schválení vlastníkem a e-mailová služba na výběr — viz *Co v tomhle vydání chybí* níž.

### Veřejný web

- Jednostránková výkladní skříň (`home`) + vlastní routy pro detail: ubytování
  (rozcestník + detail každého prostoru), galerie s filtrem podle prostoru a lightboxem,
  ceník s kalendářem obsazenosti, rezervační formulář, recenze, okolí, časté dotazy.
- Kontakt ve dvou podobách stejné komponenty: kompaktní patička na každé stránce (adresa,
  telefon, e-mail, kresba roubenky), plná routa `/kontakt` navíc s mapou (Google Maps
  Embed, dvoufázově — statický náhled, pak iframe po kliknutí).
- Design systém nad `uu5g05`/`uu5g05-elements`: paleta a typografie (Fraunces + Karla)
  odečtené z předlohy, komponenty nastavené propsy, ne přestylované.
- Texty jen česky, ale připravené na další jazyk (`client/src/lsi/`, `importLsi`).

### Server

- Rezervace: dostupnost, orientační cena, vytvoření s honeypotem a rate limitem.
- iCal import (Booking.com, e-chalupy.cz) i export vlastních rezervací.
- E-mailové notifikace (kód hotový, čeká na SMTP účet — viz níž).

### Admin (v2)

- Lazy routa `/admin`, mimo hlavní bundle veřejného webu.
- Správa rezervací (ruční založení, úprava, storno), recenzí (schvalování) a iCal feedů.
- Role se čtou z kolekce `sys_member`, ne z identity.

### Struktura kódu

- `client/src` přeskládané na `assets/ admin/ config/ lsi/ routes/ tools/ components/` —
  anglické identifikátory a soubory, české routy bez diakritiky, `routes/` jako tenké
  drátování nad `components/`. Konvence zapsaná i obecně pro appky na stacku
  (`caio/knowledge-base/preferences/fe-slozkova-struktura.md`).

### Co v tomhle vydání chybí

- **Ceník není schválený** (`pricing.approved: false` v `client/src/components/pricing/content.js`
  i v `server/config.js`) — server v produkci odmítne spočítat cenu, rezervační formulář
  je proto zatím jen k vyzkoušení, ne k použití. Čeká na skutečné sazby od vlastníka.
- **SMTP účet není vybraný** — bez něj nechodí potvrzení rezervace ani upozornění
  vlastníkovi. Návrh řešení je v `docs/wip.md`.
- **Recenze jsou prázdné**, zadávají se v adminu.
- **Bez vlastní domény** — appka běží na výchozí `*.appspot.com` adrese App Engine.

Postup prvního nasazení je v [release.md](./release.md).
