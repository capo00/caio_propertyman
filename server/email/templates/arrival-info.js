// H7 — Arrival information (guest). Sent before arrival -- per docs/wip.md by the owner from the
// admin (the action does not exist yet), the cron is postponed.
//
// The practical information (parking, the key box, hot water, heating, what is ready, departure) is
// the owner's text from 2026-11-18, the same for every stay, translated into every web language. The
// key box code is different for every stay: the owner fills it in when sending (`keyCode`), the
// e-mail shows it framed at the top and in the opening steps; without it the e-mail is not rendered.
// The address links to the map. From the Settings (`app.private.arrival`,
// server/app-settings/) comes only the Wi-Fi: the network name, the password and a QR code to join;
// without a network name the Wi-Fi section is left out.
//
// Every language has the same structure (`body`), only the texts differ (`TEXTS`).
import { SITE } from "../site.js";
import { p, facts, heading, steps, list, wifi, highlight, signature } from "../blocks.js";
import { balancePayment, hasUnpaidBalance } from "./_shared.js";

const MAP_URL = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address)}`;

const TEXTS = {
  cs: {
    subject: "Informace k příjezdu",
    hello: "Dobrý den,",
    intro: "aby pro Vás byl příjezd co nejjednodušší, posíláme několik praktických informací:",
    facts: { address: "Adresa", arrival: "Příjezd", arrivalTime: `od ${SITE.checkIn}`, departure: "Odjezd", departureTime: `do ${SITE.checkOut}`, contact: "Kontakt" },
    keyCode: "Kód ke schránce na klíče",
    unpaid: (amount) => `Zatím neevidujeme doplatek ${amount}.`,
    parking: {
      title: "🚗 Parkování",
      text: "Ideální místo k zaparkování je autobusová otočka, která se nachází přibližně 20 m před chalupou. Samozřejmě můžete parkovat také přímo na pozemku chalupy za vraty. Prosíme pouze, abyste nenechávali auto stát na příjezdové cestě, která slouží výhradně k průjezdu.",
    },
    entry: {
      title: "🔑 Vstup do roubenky",
      where: "Napravo od vchodových dveří najdete na trámu černou schránku na klíče.",
      how: "Postup otevření:",
      steps: (code) => [
        "Odklopte kryt schránky směrem dolů.",
        "Přidržte prst uprostřed displeje, dokud se nezobrazí číselná klávesnice.",
        `Zadejte kód ${code} a potvrďte.`,
        "Schránka se odemkne. Vyndejte klíče a schránku opět zavřete.",
      ],
      keys: "Větší klíč je od hlavních dveří, menší klíč patří ke kůlně vedle chalupy, kde se nachází hlavní jistič pro případ nouze.",
    },
    water: {
      title: "💧 Teplá voda",
      text: "Hned za vstupními dveřmi uvnitř roubenky najdete pojistkovou skříňku. Prosíme, nahoďte jističe č. 14 a 15, které napájejí bojlery. Přibližně do 30 minut budete mít k dispozici teplou vodu.",
    },
    heating: {
      title: "🌡️ Vytápění a nastavení teploty",
      intro: "V kuchyni u dveří najdete termostat. Pro nastavení požadované teploty postupujte následovně:",
      steps: ["Zmáčkněte otočné kolečko.", "Otočením nastavte požadovanou teplotu 21 °C.", "Opětovným zmáčknutím nastavení potvrďte."],
      note: "Menší ložnice se vytopí poměrně rychle, proto doporučujeme nezvyšovat teplotu přímo na jednotlivých radiátorech. Nastavení na termostatu by mělo zajistit příjemnou teplotu v celé roubence.",
    },
    ready: {
      title: "🧺 Co pro Vás máme připraveno",
      text: "Pro každého hosta je připravena jedna osuška a jeden ručník. V kuchyni na Vás čeká také utěrka, houbička na nádobí a prostředek na mytí nádobí.",
    },
    wifi: {
      title: "📶 Wi-Fi",
      labels: { network: "Síť", password: "Heslo", caption: "Naskenujte fotoaparátem telefonu a připojíte se bez opisování hesla.", file: "wifi.png" },
    },
    departure: {
      title: "🏡 Při odjezdu Vás prosíme o:",
      items: [
        "Nastavení termostatu na 14 °C (stejným způsobem jako při příjezdu).",
        "Vypnutí jističů č. 14 a 15 (oba bojlery).",
        "Vrácení klíčů do schránky na klíče a její uzavření.",
      ],
    },
    closing: "Věříme, že si pobyt u nás krásně užijete, odpočinete si a budete se v roubence cítit jako doma.",
  },
  en: {
    subject: "Arrival information",
    hello: "Hello,",
    intro: "To make your arrival as easy as possible, here is some practical information:",
    facts: { address: "Address", arrival: "Check-in", arrivalTime: `from ${SITE.checkIn}`, departure: "Check-out", departureTime: `by ${SITE.checkOut}`, contact: "Contact" },
    keyCode: "Key box code",
    unpaid: (amount) => `We have not yet received the balance of ${amount}.`,
    parking: {
      title: "🚗 Parking",
      text: "The best place to park is the bus turnaround, about 20 m before the cottage. You are of course also welcome to park on the cottage grounds behind the gate. We only ask that you do not leave your car on the access road, which must be kept clear for passing traffic.",
    },
    entry: {
      title: "🔑 Getting into the cottage",
      where: "To the right of the front door, you will find a black key box on the wooden beam.",
      how: "How to open it:",
      steps: (code) => [
        "Fold the cover of the box down.",
        "Hold your finger in the middle of the display until a number keypad appears.",
        `Enter the code ${code} and confirm.`,
        "The box unlocks. Take out the keys and close the box again.",
      ],
      keys: "The larger key is for the main door. The smaller key is for the shed next to the cottage, where the main circuit breaker is, in case of emergency.",
    },
    water: {
      title: "💧 Hot water",
      text: "Just inside the front door you will find the fuse box. Please switch on circuit breakers no. 14 and 15, which power the water heaters. Hot water will be available in about 30 minutes.",
    },
    heating: {
      title: "🌡️ Heating and temperature",
      intro: "The thermostat is in the kitchen by the door. To set the temperature:",
      steps: ["Press the dial.", "Turn it to set the temperature to 21 °C.", "Press it again to confirm."],
      note: "The smaller bedroom warms up quite quickly, so we recommend not turning up the individual radiators. The thermostat setting should keep the whole cottage at a pleasant temperature.",
    },
    ready: {
      title: "🧺 What we have ready for you",
      text: "Each guest has one bath towel and one hand towel. In the kitchen you will also find a tea towel, a dish sponge and washing-up liquid.",
    },
    wifi: {
      title: "📶 Wi-Fi",
      labels: { network: "Network", password: "Password", caption: "Scan it with your phone camera to connect without typing the password.", file: "wifi.png" },
    },
    departure: {
      title: "🏡 When you leave, please:",
      items: [
        "Set the thermostat to 14 °C (the same way as on arrival).",
        "Switch off circuit breakers no. 14 and 15 (both water heaters).",
        "Put the keys back in the key box and close it.",
      ],
    },
    closing: "We hope you will have a lovely stay, get some rest and feel at home in the cottage.",
  },
  de: {
    subject: "Informationen zur Anreise",
    hello: "Guten Tag,",
    intro: "damit Ihre Anreise so einfach wie möglich ist, senden wir Ihnen einige praktische Informationen:",
    facts: { address: "Adresse", arrival: "Anreise", arrivalTime: `ab ${SITE.checkIn} Uhr`, departure: "Abreise", departureTime: `bis ${SITE.checkOut} Uhr`, contact: "Kontakt" },
    keyCode: "Code für den Schlüsselsafe",
    unpaid: (amount) => `Die Restzahlung von ${amount} ist bei uns noch nicht eingegangen.`,
    parking: {
      title: "🚗 Parken",
      text: "Am besten parken Sie an der Bus-Wendeschleife, etwa 20 m vor dem Haus. Selbstverständlich können Sie auch direkt auf dem Grundstück hinter dem Tor parken. Wir bitten Sie nur, Ihr Auto nicht auf der Zufahrt abzustellen, die ausschließlich als Durchfahrt dient.",
    },
    entry: {
      title: "🔑 Zugang zum Haus",
      where: "Rechts neben der Eingangstür finden Sie am Holzbalken einen schwarzen Schlüsselsafe.",
      how: "So öffnen Sie ihn:",
      steps: (code) => [
        "Klappen Sie die Abdeckung des Safes nach unten.",
        "Halten Sie den Finger in die Mitte des Displays, bis ein Ziffernfeld erscheint.",
        `Geben Sie den Code ${code} ein und bestätigen Sie ihn.`,
        "Der Safe öffnet sich. Nehmen Sie die Schlüssel heraus und schließen Sie den Safe wieder.",
      ],
      keys: "Der größere Schlüssel ist für die Haustür, der kleinere für den Schuppen neben dem Haus, in dem sich für den Notfall der Hauptschalter befindet.",
    },
    water: {
      title: "💧 Warmwasser",
      text: "Gleich hinter der Eingangstür finden Sie den Sicherungskasten. Bitte schalten Sie die Sicherungen Nr. 14 und 15 ein, die die Warmwasserspeicher versorgen. Nach etwa 30 Minuten haben Sie warmes Wasser.",
    },
    heating: {
      title: "🌡️ Heizung und Temperatur",
      intro: "Das Thermostat befindet sich in der Küche an der Tür. So stellen Sie die gewünschte Temperatur ein:",
      steps: ["Drücken Sie den Drehknopf.", "Stellen Sie durch Drehen die gewünschte Temperatur von 21 °C ein.", "Bestätigen Sie die Einstellung durch erneutes Drücken."],
      note: "Das kleinere Schlafzimmer heizt sich recht schnell auf, daher empfehlen wir, die Temperatur nicht direkt an den einzelnen Heizkörpern zu erhöhen. Die Einstellung am Thermostat sollte im ganzen Haus für eine angenehme Temperatur sorgen.",
    },
    ready: {
      title: "🧺 Was wir für Sie vorbereitet haben",
      text: "Für jeden Gast liegen ein Badetuch und ein Handtuch bereit. In der Küche finden Sie außerdem ein Geschirrtuch, einen Spülschwamm und Spülmittel.",
    },
    wifi: {
      title: "📶 WLAN",
      labels: { network: "Netzwerk", password: "Passwort", caption: "Mit der Handykamera scannen und ohne Eintippen des Passworts verbinden.", file: "wlan.png" },
    },
    departure: {
      title: "🏡 Bei der Abreise bitten wir Sie:",
      items: [
        "das Thermostat auf 14 °C zu stellen (genauso wie bei der Anreise),",
        "die Sicherungen Nr. 14 und 15 (beide Warmwasserspeicher) auszuschalten,",
        "die Schlüssel in den Schlüsselsafe zurückzulegen und ihn zu schließen.",
      ],
    },
    closing: "Wir wünschen Ihnen einen schönen und erholsamen Aufenthalt und hoffen, dass Sie sich bei uns wie zu Hause fühlen.",
  },
  pl: {
    subject: "Informacje o przyjeździe",
    hello: "Dzień dobry,",
    intro: "aby przyjazd był dla Państwa jak najprostszy, przesyłamy kilka praktycznych informacji:",
    facts: { address: "Adres", arrival: "Przyjazd", arrivalTime: `od ${SITE.checkIn}`, departure: "Wyjazd", departureTime: `do ${SITE.checkOut}`, contact: "Kontakt" },
    keyCode: "Kod do skrytki na klucze",
    unpaid: (amount) => `Nie otrzymaliśmy jeszcze dopłaty w wysokości ${amount}.`,
    parking: {
      title: "🚗 Parking",
      text: "Najlepszym miejscem do parkowania jest pętla autobusowa, około 20 m przed domem. Oczywiście można też zaparkować bezpośrednio na posesji za bramą. Prosimy jedynie, aby nie zostawiać samochodu na drodze dojazdowej, która służy wyłącznie do przejazdu.",
    },
    entry: {
      title: "🔑 Wejście do domu",
      where: "Po prawej stronie drzwi wejściowych, na belce, znajdą Państwo czarną skrytkę na klucze.",
      how: "Jak ją otworzyć:",
      steps: (code) => [
        "Odchylić osłonę skrytki w dół.",
        "Przytrzymać palec na środku wyświetlacza, aż pojawi się klawiatura numeryczna.",
        `Wpisać kod ${code} i zatwierdzić.`,
        "Skrytka się otworzy. Wyjąć klucze i ponownie zamknąć skrytkę.",
      ],
      keys: "Większy klucz jest do drzwi głównych, mniejszy do szopy obok domu, w której na wypadek awarii znajduje się wyłącznik główny.",
    },
    water: {
      title: "💧 Ciepła woda",
      text: "Zaraz za drzwiami wejściowymi, wewnątrz domu, znajduje się skrzynka z bezpiecznikami. Prosimy włączyć bezpieczniki nr 14 i 15, które zasilają bojlery. Ciepła woda będzie dostępna po około 30 minutach.",
    },
    heating: {
      title: "🌡️ Ogrzewanie i ustawienie temperatury",
      intro: "Termostat znajduje się w kuchni przy drzwiach. Aby ustawić temperaturę:",
      steps: ["Nacisnąć pokrętło.", "Obracając, ustawić temperaturę 21 °C.", "Ponownie nacisnąć, aby zatwierdzić ustawienie."],
      note: "Mniejsza sypialnia nagrzewa się dość szybko, dlatego nie zalecamy podkręcania temperatury bezpośrednio na poszczególnych grzejnikach. Ustawienie termostatu powinno zapewnić przyjemną temperaturę w całym domu.",
    },
    ready: {
      title: "🧺 Co dla Państwa przygotowaliśmy",
      text: "Dla każdego gościa przygotowany jest jeden ręcznik kąpielowy i jeden ręcznik do rąk. W kuchni czeka też ściereczka, gąbka do naczyń i płyn do mycia naczyń.",
    },
    wifi: {
      title: "📶 Wi-Fi",
      labels: { network: "Sieć", password: "Hasło", caption: "Wystarczy zeskanować aparatem telefonu, aby połączyć się bez wpisywania hasła.", file: "wifi.png" },
    },
    departure: {
      title: "🏡 Przy wyjeździe prosimy o:",
      items: [
        "ustawienie termostatu na 14 °C (tak samo jak przy przyjeździe),",
        "wyłączenie bezpieczników nr 14 i 15 (oba bojlery),",
        "odłożenie kluczy do skrytki i jej zamknięcie.",
      ],
    },
    closing: "Wierzymy, że pobyt u nas będzie udany, że Państwo odpoczną i poczują się w naszym domu jak u siebie.",
  },
  sk: {
    subject: "Informácie k príchodu",
    hello: "Dobrý deň,",
    intro: "aby bol pre Vás príchod čo najjednoduchší, posielame niekoľko praktických informácií:",
    facts: { address: "Adresa", arrival: "Príchod", arrivalTime: `od ${SITE.checkIn}`, departure: "Odchod", departureTime: `do ${SITE.checkOut}`, contact: "Kontakt" },
    keyCode: "Kód ku schránke na kľúče",
    unpaid: (amount) => `Zatiaľ sme neprijali doplatok ${amount}.`,
    parking: {
      title: "🚗 Parkovanie",
      text: "Ideálnym miestom na zaparkovanie je autobusové otočisko, ktoré sa nachádza približne 20 m pred chalupou. Samozrejme môžete parkovať aj priamo na pozemku chalupy za bránou. Prosíme len, aby ste nenechávali auto stáť na príjazdovej ceste, ktorá slúži výhradne na prejazd.",
    },
    entry: {
      title: "🔑 Vstup do zrubu",
      where: "Napravo od vchodových dverí nájdete na tráme čiernu schránku na kľúče.",
      how: "Postup otvorenia:",
      steps: (code) => [
        "Odklopte kryt schránky smerom nadol.",
        "Pridržte prst v strede displeja, kým sa nezobrazí číselná klávesnica.",
        `Zadajte kód ${code} a potvrďte.`,
        "Schránka sa odomkne. Vyberte kľúče a schránku opäť zatvorte.",
      ],
      keys: "Väčší kľúč je od hlavných dverí, menší kľúč patrí ku kôlni vedľa chalupy, kde sa nachádza hlavný istič pre prípad núdze.",
    },
    water: {
      title: "💧 Teplá voda",
      text: "Hneď za vstupnými dverami vo vnútri zrubu nájdete poistkovú skrinku. Prosíme, zapnite ističe č. 14 a 15, ktoré napájajú bojlery. Približne do 30 minút budete mať k dispozícii teplú vodu.",
    },
    heating: {
      title: "🌡️ Vykurovanie a nastavenie teploty",
      intro: "V kuchyni pri dverách nájdete termostat. Na nastavenie požadovanej teploty postupujte takto:",
      steps: ["Stlačte otočné koliesko.", "Otočením nastavte požadovanú teplotu 21 °C.", "Opätovným stlačením nastavenie potvrďte."],
      note: "Menšia spálňa sa vykúri pomerne rýchlo, preto odporúčame nezvyšovať teplotu priamo na jednotlivých radiátoroch. Nastavenie na termostate by malo zabezpečiť príjemnú teplotu v celom zrube.",
    },
    ready: {
      title: "🧺 Čo pre Vás máme pripravené",
      text: "Pre každého hosťa je pripravená jedna osuška a jeden uterák. V kuchyni na Vás čaká aj utierka, hubka na riad a prostriedok na umývanie riadu.",
    },
    wifi: {
      title: "📶 Wi-Fi",
      labels: { network: "Sieť", password: "Heslo", caption: "Naskenujte fotoaparátom telefónu a pripojíte sa bez prepisovania hesla.", file: "wifi.png" },
    },
    departure: {
      title: "🏡 Pri odchode Vás prosíme o:",
      items: [
        "Nastavenie termostatu na 14 °C (rovnakým spôsobom ako pri príchode).",
        "Vypnutie ističov č. 14 a 15 (oba bojlery).",
        "Vrátenie kľúčov do schránky na kľúče a jej zatvorenie.",
      ],
    },
    closing: "Veríme, že si pobyt u nás krásne užijete, oddýchnete si a budete sa v zrube cítiť ako doma.",
  },
};

/** The e-mail in one language: the same blocks for all, `t` = the texts of that language. */
function body(c, t) {
  // Without the code the guest cannot get in: the e-mail fails (recorded in the history with this
  // reason) rather than going out without it.
  if (!c.keyCode) throw new Error("The key box code is missing -- the arrival e-mail cannot be rendered.");
  const { wifiName, wifiPassword } = c.settings.arrival;
  return [
    p(t.hello),
    p(t.intro),
    highlight(t.keyCode, c.keyCode),
    facts([
      [t.facts.address, { text: SITE.address, url: MAP_URL() }],
      [t.facts.arrival, t.facts.arrivalTime],
      [t.facts.departure, t.facts.departureTime],
      [t.facts.contact, SITE.contact.phone],
    ]),
    hasUnpaidBalance(c) && p(t.unpaid(c.f.price(c.balanceAmount))),
    hasUnpaidBalance(c) && balancePayment(c),
    heading(t.parking.title),
    p(t.parking.text),
    heading(t.entry.title),
    p(t.entry.where),
    p(t.entry.how),
    steps(t.entry.steps(c.keyCode)),
    p(t.entry.keys),
    heading(t.water.title),
    p(t.water.text),
    heading(t.heating.title),
    p(t.heating.intro),
    steps(t.heating.steps),
    p(t.heating.note),
    heading(t.ready.title),
    p(t.ready.text),
    wifiName && heading(t.wifi.title),
    wifi({ name: wifiName, password: wifiPassword, labels: t.wifi.labels }),
    heading(t.departure.title),
    list(t.departure.items),
    p(t.closing),
    signature(),
  ];
}

const language = (lang) => ({
  subject: (c) => `${TEXTS[lang].subject} — ${c.f.date(c.r.dateFrom)}`,
  body: (c) => body(c, TEXTS[lang]),
});

export default {
  code: "arrivalInfo",
  recipient: "guest",
  cs: language("cs"),
  en: language("en"),
  de: language("de"),
  pl: language("pl"),
  sk: language("sk"),
};
