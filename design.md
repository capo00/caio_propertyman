# caio_propertyman - Specifikace webové aplikace pro krátkodobé pronájmy

## Přehled

Webová aplikace pro správu krátkodobého pronájmu roubenky. Dvě SPA: veřejný web pro hosty a administrace pro vlastníky. Architektura vychází z frameworku extrahovaného z projektu afkbratcice.

## Technologie

- **Frontend:** UU5 (uu5g05) + React 18, vlastní framework knihovny (oc_cli-elements, oc_cli-auth, oc_ecc)
- **Backend:** Node.js + Express, vlastní framework knihovny (oc_app-server, oc_app-auth, oc_mongo, oc_binarystore)
- **Databáze:** MongoDB Atlas
- **Deploy:** Google App Engine (nový GCP projekt)
- **Auth:** Google OAuth, Facebook OAuth, email/password (bcrypt)
- **Jazyky:** cs, en, de, pl (LSI systém z uu5g05)
- **Email:** Google SMTP nebo SendGrid/Mailgun

## Architektura

Monolitní full-stack aplikace se dvěma SPA entry pointy a jedním Express backendem.

```
caio_propertyman/
├── server/
│   ├── index.js
│   ├── caio-propertyman/
│   │   ├── reservation/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   ├── pricing/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   ├── property/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   ├── news/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   ├── review/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   ├── finance/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   ├── blocked-date/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   ├── content/
│   │   │   ├── dao.js
│   │   │   ├── abl.js
│   │   │   └── api.js
│   │   └── api.js              # Merge všech API registries
│   ├── libs/                   # Framework knihovny (npm závislosti)
│   ├── services/
│   │   ├── email.js
│   │   └── ical.js
│   └── config/
├── client/
│   ├── caio_propertyman-hi/
│   │   ├── src/
│   │   │   ├── web/
│   │   │   │   ├── spa.js         # Public SPA entry + route map
│   │   │   │   └── routes/        # Public routes
│   │   │   ├── admin/
│   │   │   │   ├── spa.js         # Admin SPA entry + route map
│   │   │   │   └── routes/        # Admin routes
│   │   │   ├── components/        # Sdílené komponenty
│   │   │   ├── libs/              # oc_cli-* knihovny
│   │   │   └── lsi/              # Jazykové soubory (cs, en, de, pl)
│   │   └── env/
├── public/                        # Built static assets
│   ├── index.html                 # → web/spa.js
│   └── admin.html                 # → admin/spa.js
├── tools/
│   ├── start.js
│   └── build.js
├── app.yaml                       # GAE config (nodejs22)
└── package.json
```

### Backend layering

API (routing + validace) → ABL (business logika) → DAO (MongoDB přístup)

### Autentifikace

- Google OAuth + Facebook OAuth + email/password
- JWT v httpOnly cookies
- Profily: `guest` (registrovaní hosté), `owner` (správci)

---

## Datový model (MongoDB kolekce)

### property

Nemovitost. Architektura počítá s více objekty v budoucnu.

- `name` - LSI objekt (cs, en, de, pl)
- `description` - LSI objekt
- `address` - street, city, zip, gps (lat, lng)
- `capacity` - beds, extraBeds
- `amenities` - pole stringů (wifi, parking, sauna, ...)
- `photos` - pole { binaryId, order, caption (LSI) }
- `rules` - LSI objekt (provozní řád)
- `minNights` - minimální počet nocí
- `checkIn` / `checkOut` - časy
- `state` - active | inactive
- `sys` - cts, mts (timestamps)

### pricing

Cenové tarify. `holiday` a `weekend` = fixní cena. `standard` = cena dle počtu nocí (rates).

- `propertyId` - reference na property
- `type` - standard | weekend | holiday
- `label` - LSI objekt (název tarifu)
- `dateRange` - { from, to } - pro holiday/weekend fixní dny (ISO datum)
- `price` - číslo (pro holiday/weekend: fixní cena za celý blok)
- `rates` - objekt { "2": cena, "3": cena, ... "7": cena } (jen pro standard)
- `priority` - číslo (holiday > weekend > standard)
- `sys` - cts, mts

Cenová logika:
1. Holiday tarif pokrývá termín → celý blok za fixní `price`, nelze vybrat jen část
2. Weekend (pá-ne) → fixní `price` za víkendový blok
3. Standard → cena z `rates` dle počtu nocí
4. Admin může aplikovat slevu → `discountedPrice` na rezervaci

### reservation

- `propertyId`, `guestId` - reference
- `dateFrom`, `dateTo` - ISO datum
- `nights` - počet nocí
- `guestCount` - počet hostů
- `totalPrice` - vypočtená cena
- `discountedPrice` - cena po slevě (null pokud bez slevy)
- `discountReason` - lastMinute | coupon | custom
- `state` - confirmed | cancelled | completed
- `source` - web | booking | echalupy
- `contact` - { name, email, phone }
- `note` - poznámka hosta
- `payment` - { state: pending|paid|refunded, paidDate, method: transfer|cash|card|gateway }
- `icalUid` - unikátní ID pro iCal feed
- `sys` - cts, mts

### sys_identity (guest/owner)

- `identity` - unikátní string
- `email`, `firstName`, `surname`, `name`, `phone`
- `password` - bcrypt hash
- `googleId`, `facebookId` - OAuth identifikátory
- `photo` - URL
- `registrationType` - google | facebook | password
- `profileList` - ["guest"] nebo ["owner"]
- `sys` - cts, mts

### news

- `propertyId` - reference
- `title`, `content` - LSI objekty
- `type` - news | event | lastMinute
- `validFrom`, `validTo` - ISO datum (platnost)
- `state` - active | archived
- `photo` - binaryId | null
- `sys` - cts, mts

### review

- `propertyId`, `guestId`, `reservationId` - reference
- `rating` - 1-5
- `text` - text recenze
- `state` - pending | approved | rejected
- `response` - odpověď vlastníka
- `sys` - cts, mts

### finance_record

- `propertyId` - reference
- `type` - income | expense
- `category` - rental | cleaning | repair | utilities | tax | insurance | supplies | other
- `amount` - číslo
- `date` - ISO datum
- `description` - popis
- `reservationId` - reference (pro automatické příjmy z pronájmu) | null
- `taxDeductible` - boolean
- `sys` - cts, mts

### blocked_date

- `propertyId` - reference
- `dateFrom`, `dateTo` - ISO datum
- `reason` - maintenance | owner | external
- `source` - manual | booking | echalupy
- `icalUid` - UID z externího iCal
- `sys` - cts, mts

### content (CMS)

- `propertyId` - reference
- `code` - rules | contact | about | home-intro
- `content` - LSI objekt (cs, en, de, pl)
- `sys` - cts, mts

---

## API use cases

### Public (bez autorizace)

- `property/get` (GET) - Info o nemovitosti
- `reservation/getAvailability` (GET) - Kalendář dostupnosti
- `pricing/get` (GET) - Ceník (všechny tarify)
- `news/list` (GET) - Aktivní novinky
- `review/list` (GET) - Schválené recenze
- `content/get` (GET) - CMS obsah dle kódu
- `calendar/ical` (GET) - iCal feed pro Booking/e-chalupy

### Guest (profil `guest`)

- `reservation/create` (POST) - Vytvořit rezervaci
- `reservation/myList` (GET) - Moje rezervace
- `reservation/cancel` (POST) - Storno
- `review/create` (POST) - Napsat recenzi (jen po dokončeném pobytu)

### Admin (profil `owner`)

- `reservation/list` (GET) - Všechny rezervace (filtry: stav, datum, zdroj)
- `reservation/get` (GET) - Detail
- `reservation/update` (POST) - Upravit
- `reservation/setState` (POST) - Změna stavu
- `property/update` (POST) - Upravit property info
- `pricing/list` (GET) - Seznam tarifů
- `pricing/create` (POST) - Vytvořit tarif
- `pricing/update` (POST) - Upravit tarif
- `pricing/delete` (POST) - Smazat tarif
- `news/create` (POST) - Vytvořit novinku
- `news/update` (POST) - Upravit
- `news/delete` (POST) - Smazat
- `review/listAll` (GET) - Všechny recenze (i neschválené)
- `review/approve` (POST) - Schválit/zamítnout
- `review/respond` (POST) - Odpovědět
- `finance/list` (GET) - Finanční záznamy
- `finance/createRecord` (POST) - Přidat
- `finance/updateRecord` (POST) - Upravit
- `finance/deleteRecord` (POST) - Smazat
- `finance/report` (GET) - Měsíční/roční report
- `finance/export` (GET) - CSV export
- `blockedDate/list` (GET) - Blokované termíny
- `blockedDate/create` (POST) - Blokovat
- `blockedDate/delete` (POST) - Odblokovat
- `calendar/sync` (POST) - iCal import
- `content/update` (POST) - CMS obsah
- `gallery/upload` (POST) - Nahrát fotku
- `gallery/update` (POST) - Upravit pořadí/popisek
- `gallery/delete` (POST) - Smazat fotku

---

## Frontend routy

### Public web (index.html → web/spa.js)

- `home` - Hero foto, krátký popis, CTA rezervace
- `about` - Podrobný popis, vybavení, kapacita
- `gallery` - Fotogalerie (lightbox)
- `reservation` - Kalendář dostupnosti + formulář
- `pricing` - Ceník (tarify + speciální období)
- `rules` - Provozní řád
- `news` - Novinky a akce
- `reviews` - Recenze hostů
- `contact` - Kontakt, mapa
- `my/reservations` - Moje rezervace (guest profil)

### Admin (admin.html → admin/spa.js)

- `dashboard` - Přehled (nadcházející rezervace, obsazenost, příjmy)
- `reservations` - Seznam + filtry
- `reservations/calendar` - Kalendářový pohled
- `reservations/detail` - Detail rezervace
- `pricing` - Správa ceníku (CRUD)
- `news` - CRUD novinky
- `reviews` - Schvalování, odpovědi
- `finance` - Finanční záznamy (CRUD)
- `finance/report` - Reporty + CSV export
- `content` - CMS editace
- `gallery` - Správa fotek
- `settings` - Property info, iCal URLs, notifikace
- `blocked-dates` - Blokované termíny

---

## Klíčové funkcionality

### iCal synchronizace (Booking.com / e-chalupy)

- **Export:** `/calendar/ical` generuje VCALENDAR/VEVENT feed. Booking/e-chalupy importují URL.
- **Import:** Admin zadá URL feedů. `calendar/sync` parsuje iCal → `blocked_date` záznamy.
- Kolizní detekce při vytváření rezervace kontroluje i importované blokace.
- Budoucí rozšíření: automatický cron (Cloud Scheduler).

### Email notifikace

- Nová rezervace → potvrzení hostu + notifikace admin
- 3 dny před příjezdem → připomenutí (check-in čas, adresa)
- Den po check-out → výzva k recenzi
- Storno → email oběma stranám
- Technologie: nodemailer + Google SMTP

### Finanční management

- Automatický příjmový záznam při potvrzení rezervace
- Manuální výdaje s kategorizací (úklid, opravy, energie, daň, pojištění, materiál)
- Měsíční přehled: příjmy vs. výdaje po kategoriích
- Roční přehled pro daňové přiznání (§ 9 ZDP - příjmy z pronájmu)
- CSV export připravený pro daňového poradce

### Cenový systém

Priorita: holiday (fixní blok, fixní cena) > weekend (fixní cena za víkend) > standard (rates dle počtu nocí). Admin může na rezervaci aplikovat slevu (lastMinute, kupón, custom).

---

## Etapy implementace

### Etapa 1: Init App

1. GCP projekt + MongoDB Atlas cluster
2. OAuth apps registrace (Google, Facebook)
3. Scaffold projektu (Express + UU5 devkit + framework libs)
4. Auth implementace (Google, Facebook, email/pass, JWT, profily guest/owner)
5. Health check endpoint
6. Dva HTML entry pointy + prázdné SPA shells
7. Deploy na GAE

**Výstup:** Fungující app na GAE, přihlášení funguje, dvě prázdné SPA.

### Etapa 2: Simple App

**Public:** Home, kalendář + rezervační formulář, ceník, novinky
**Admin:** Dashboard, rezervace (list, detail, stav), novinky CRUD, ceník (standard + weekend), property nastavení
**Email:** Základní potvrzení rezervace

### Etapa 3: Full App

**Public:** Galerie, provozní řád, recenze, kontakt + mapa, "moje rezervace", about, holiday tarify
**Admin:** Finance kompletní, holiday tarify, galerie, CMS, iCal sync, blokované termíny, recenze, embed externích recenzí, rozšířený dashboard, kompletní email notifikace, kalendářový pohled, last-minute slevy, stornační podmínky

---

## Budoucí rozšíření (mimo scope)

- Online platební brána (Stripe/GoPay/Comgate)
- Více nemovitostí (multi-property management)
- Mobilní aplikace
- Automatický cron pro iCal sync
- SMS notifikace
- Dynamické ceny (AI-based pricing)
- Věrnostní program
