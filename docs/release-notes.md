# Release notes

Jedna nota na vydání, novější nahoře. Číslování podle zvyklosti stacku caio-architecture:
dokud je appka na 0.x, oprava i nová funkce zvedá patch, minor je jen pro breaking změnu.

---

## v0.2.7 (2026-10-22)

Revize textů ve všech jazycích, texty chyb v jazyce stránky a oprava vykreslení po
nasazení. Stack: `caio-server` 0.4.3, `caio-ui` 0.4.5, `caio-devkit` 0.4.5.

### Texty a překlady

- Revize češtiny a všech překladů: čísla a procenta s nezlomitelnou mezerou, kilometry
  a počet lůžek se skloňují, počet dní do příjezdu ve stornu taky.
- Polština a slovenština: opravené texty o blokaci termínu v e-mailech a názvy
  (stupátko, vejměnek).
- E-mail o zamítnutí poptávky má funkční odkaz, popisek fotky koupelny v podkroví je
  opravený a každá fotka galerie má popisek (hlídá test).
- Vzdálenost na Kost (2,5 km) je na webu z jednoho zdroje, adresa je bez regionu,
  perex bez hvězdiček.
- Platby ze zahraničí mají v pokynech BIC a variabilní symbol, QR platba jde jako
  příloha. Stránka 404 má vlastní titulek a pořadí jazyků v přepínači je sjednocené.

### Chyby v jazyce stránky

- Server posílá u chyby kód a anglickou zprávu, host i admin vidí text v jazyce stránky
  (lsi `errors`, nový kód = nový klíč v 5 jazycích). Stojí na `caio-ui` 0.4.5.

### Stack

- Po nasazení se web v prohlížeči s cache mohl přestat vykreslovat (ETag na App Engine se
  mezi buildy neměnil). HTML teď chodí bez ETagu, vstupy mají v import mapě `?v=<hash>`
  a produkční HTML je bez komentářů (`caio-server` 0.4.3, `caio-devkit` 0.4.4).
- `og:*` z manifestu se vkládají jen tam, kde je stránka nemá, takže jazykové verze už
  nemají dvě sady OG tagů (`caio-devkit` 0.4.5).
- Lišta po posunu stránky dosedne jako částečně průhledná zelená s rozmazaným obsahem
  pod ní, nahoře zůstává plná (`caio-ui` 0.4.5).
- `uu5codekitg01-forms` 3.5.0.

## v0.2.6 (2026-10-18)

Odkaz do administrace přímo v liště webu a čitelnější výběr termínu v kalendáři. Stack beze
změny: `caio-server` 0.4.2, `caio-ui` 0.4.4, `caio-devkit` 0.4.3.

### Odkaz do administrace

- Kdo se v prohlížeči přihlásil do adminu s rolí `authorities`, má v liště webu ikonu
  správy, která vede na `/admin/` (ctrl/cmd-klik a klik kolečkem otevřou nový panel).
  Prohlížeč si to pamatuje v `localStorage`; přihlášení bez té role záznam smaže.
- Přepínač jazyka je v liště dál jako kód jazyka (`CS`). Kde se nevejde, je v menu jako
  položka „Jazyk“ s kódem vybraného jazyka a podmenu jazyků (aktivní s fajfkou). Na
  mobilu tak správce vidí v liště ikonu správy a menu.

### Kalendář

- Vybraný termín je zelený, ne červený, a nesplývá s obsazenými dny.

## v0.2.5 (2026-10-17)

Web ve všech jazycích má vlastní adresy a admin je samostatná část webu. Stack: `caio-server`
0.4.2, `caio-ui` 0.4.4, `caio-devkit` 0.4.3 (jazykové verze jsou nová funkce stacku).

### Jazyk v adrese

- Čeština zůstává bez prefixu (`/cenik`), ostatní jazyky mají vlastní adresy s názvy stránek
  ve svém jazyce: `/en/prices`, `/de/preise`, `/pl/cennik`, `/sk/cennik`,
  `/en/accommodation/barn`. `/cs/…` je česky vždy.
- `roubenyraj.cz` je vždycky česky, jazyk prohlížeče se už nebere v potaz. Kdo si v přepínači
  vybere jiný jazyk, při další návštěvě adresy bez jazyka se rovnou dostane na svou verzi.
- Vyhledávače vidí každou jazykovou verzi zvlášť: `hreflang`, canonical v jazyce stránky,
  sitemap se všemi 75 adresami a alternativami, popis a strukturovaná data v jazyce i bez JS.
- Adresa s názvem stránky z jiného jazyka (`/de/cenik`) přesměruje na správnou, neznámá
  adresa vrátí 404 v jazyce adresy.

### Admin

- Admin je samostatný dokument na `/admin/` s vlastním balíčkem; návštěvník webu nestahuje
  nic z jeho kódu. Adresy obrazovek se nemění (`/admin/reservations`, odkaz v e-mailu).

### Načítání

- Indikátor načítání ve stylu uu5: prstenec kolem kresby roubenky, název pod ním.

## v0.2.4 (2026-10-15)

Rychlejší načtení na mobilu (podnět: PageSpeed mobil, výkon 68, LCP 7,8 s, CLS 0,112)
a přístupnost (83 → 86). Stack beze změny: `caio-server` 0.4.1, `caio-ui` 0.4.3,
`caio-devkit` 0.4.2.

### Výkon

- Fotky jako WebP s menšími variantami (480/800 px); stránka si podle displeje vezme
  vhodnou velikost, plnou fotku stáhne až lightbox galerie.
- Fotka hero se na home začne stahovat hned s HTML (na ostatních adresách ne).
- Písma jsou přímo v HTML a stahují se hned; text při načtení nepřeskakuje.
- Web se poprvé vykreslí rovnou v jazyce návštěvníka, ne česky a pak přeložený.
- Rezervační formulář a galerie se načítají až když jsou potřeba; sekce home pod
  „O roubence“ se vykreslí až při přiblížení. `uu5g05-forms` zůstává ve startu kvůli
  `caio-ui` (řeší se ve stacku).
- Lokálně (Lighthouse mobil): CLS 0,013–0,1 → 0,001, LCP o ~1,5 s kratší.

### Přístupnost

- Terakota (`accent`) ztmavená na #955F35 kvůli kontrastu textu (vzdálenosti, lůžka).
- Popisky v ceníku a obsazené dny v kalendáři s čitelným kontrastem.
- Logo v liště má přístupný název.
- Zbylé nálezy jsou v uu5 (`docs/uu5-proposal-a11y.md`).

### Ostatní

- Procenta bez mezery v podmínkách rezervace a v FAQ o stornu (cs, de, sk).

## v0.2.3 (2026-10-14)

Web i e-maily hostům v pěti jazycích (cs, en, de, pl, sk) a SEO: meta údaje podle stránky,
`robots.txt`, `sitemap.xml`, strukturovaná data a skutečná 404. Stack: `caio-server` 0.4.1,
`caio-ui` 0.4.3, `caio-devkit` 0.4.2; uu5g05 1.52.2.

### Jazyky

- Přepínač jazyka v liště (kód jazyka, rozbalení s nativními názvy). Výchozí je jazyk
  prohlížeče, jazyk, který web nemá, dostane angličtinu; volba se pamatuje v prohlížeči.
  Jazyk není v adrese (`docs/decisions.md` § Frontend).
- Na telefonu se do hamburgeru sbalí „Rezervovat“, přepínač zůstává vidět.
- E-maily hostovi jdou v jazyce rezervace (vybraný na webu, v adminu se dá změnit);
  vlastníkovi dál česky. Mimo češtinu má platba navíc IBAN.
- **Překlady jsou strojové** a čekají na kontrolu (`docs/wip.md` § Jazyky).

### SEO

- Každá stránka má vlastní titulek, popis, canonical a `og:*`; admin a neznámé adresy
  `noindex`. `robots.txt` a `sitemap.xml` se generují při buildu.
- Neznámá adresa vrací 404 (se stránkou „nenalezeno“), `/home` přesměruje na `/`, adresa
  s lomítkem na konci na adresu bez něj (`caio-server` 0.4.1).
- Strukturovaná data (JSON-LD) o webu a roubence, drobečková navigace podle stránky.
- **Známé omezení:** vyhledávač zná jen jednu jazykovou verzi každé adresy a Googlebot
  stránky vykresluje anglicky (`docs/wip.md` § Jazyky).

### Konfigurace

- `APP_URL` (`https://roubenyraj.cz`) čte i build -- z něj jsou canonical, `robots.txt`
  a `sitemap.xml`. `CANONICAL_HOST` přesměruje `www`. Obojí je v produkčním `.env`.
- Po nasazení odeslat `https://roubenyraj.cz/sitemap.xml` v Search Console.

---

## v0.2.2 (2026-10-12)

Letní týdny stojí všechny stejně, v patičce jsou loga sociálních sítí. Stack beze změny:
`caio-server` 0.4.0, `caio-ui` 0.4.3, `caio-devkit` 0.4.1.

### Ceník

- V letní sezóně (pobyt s aspoň jednou nocí 1. 7.–31. 8.) se za svátky nepřiráží, všechny
  letní týdny stojí 28 000 Kč, i ty s nocemi na 5. a 6. 7. Platí i pro týden přes hranici
  sezóny a pro kratší pobyt zapsaný ručně v adminu; víkendová přirážka u krátkého pobytu
  zůstává (`docs/decisions.md` § Ceník).

### Web

- Kontaktní patička má loga Facebooku, Instagramu a WhatsAppu.
- Check-in ve statistikách pod hero se jmenuje „self“ místo „bezkontaktní“.

### Konfigurace

- Bez nových proměnných v `.env`.

---

## v0.2.1 (2026-10-12)

Schválený ceník — web poprvé počítá ostré ceny a přijímá žádosti s cenou. K tomu faktura
v PDF a fotky na úvodní stránce. Stack: `caio-server` 0.4.0, `caio-ui` 0.4.3,
`caio-devkit` 0.4.1.

### Ceník

- Ceník od vlastníka (`docs/decisions.md` § Ceník): první dvě noci 3 800 Kč, každá další
  3 700 Kč, k tomu úklid, celek zaokrouhlený nahoru na 500 Kč. Noc na svátek +20 %, noc
  na víkend +20 % jen u pobytu do 5 nocí. Vánoce (noci na 24. a 25. 12.) celý pobyt ×1,8,
  Silvestr (noc na 1. 1.) ×2. Počet osob cenu neovlivňuje.
- Host vidí jen jednu cenu za pobyt — ve formuláři i v ceníku, bez rozpadu.
- Stránka Ceník ukazuje víkend (11 000 Kč) a týden (28 000 Kč), čísla bere ze serveru
  (`price/list`), takže se nemůžou rozejít s cenou rezervace.
- Web neprodá Vánoce kratší než 3 noci a v červenci a srpnu jiný pobyt než na 7 nocí;
  formulář místo ceny řekne proč. Vlastník v adminu tahle omezení obchází.

### Admin

- Faktura v PDF na žádost zákazníka (detail rezervace).

### Web

- Hero s fotkou chalupy (desktop v pozadí, mobil nad textem), fotka Libošovic v sekci
  Zajímavosti v okolí.
- Chyby ze serveru se ukazují u konkrétního pole formuláře; modál úpravy rezervace se po
  chybě nezavře (potřebuje `caio-ui` 0.4.3).

### Konfigurace

- Bez nových proměnných v `.env`.

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
