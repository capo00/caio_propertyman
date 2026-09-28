# Release notes

Jedna nota na vydání, novější nahoře. Číslování podle zvyklosti stacku caio-architecture:
dokud je appka na 0.x, oprava i nová funkce zvedá patch, minor je jen pro breaking změnu.

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
