import { createVisualComponent, useState, useLanguage, useLsi, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../config/config.js";
import property from "../content/property.js";
import contact from "../content/contact.js";
import { lsi } from "../lsi/import-lsi.js";

// Mapa v kontaktu, dvoufázově:
//
// 1. STATICKÝ OBRÁZEK z Maps Static API ve výchozím vzhledu Googlu. `loading="lazy"`
//    znamená, že se request odešle teprve když se sekce dostane do viewportu -- kdo
//    doscrolluje jen k ceníku, nevygeneruje žádné volání.
// 2. INTERAKTIVNÍ iframe z Maps Embed API po kliknutí do mapy. Vlastní tlačítko tam není:
//    klikací je celá plocha (`Box onClick`), klávesnice ji obslouží přes `elementAttrs`
//    (role, tabIndex, Enter/Space) -- jinak by se na mapu nedalo dostat tabulátorem.
//
// Proč dvě fáze: Embed API (iframe) je zdarma a bez limitů, ale zakládá cookies. Static API
// cookies nenastaví -- odejde jen IP a referer -- a má 10 000 volání měsíčně zdarma
// (pak $7/1000), což je pro tenhle web strop, na který nedosáhne. Obrázek se NESMÍ
// ukládat k sobě a servírovat z našeho serveru, to podmínky Googlu zakazují.
//
// Vzhled mapy je schválně výchozí (majitel, 2026-09-03). Static API `style=` umí, takže
// paleta předlohy by šla dodat, ale interaktivní fáze ji dodat NEUMÍ (Embed API žádné
// stylování nemá) -- stylovaná statická mapa se pak po kliknutí viditelně přebarví.
//
// Klíč je v obou URL veřejný, takže musí být v Google Cloud omezený na HTTP referrer
// a na obě tahle API. Bez klíče zůstane placeholder a odkaz ven, ať se do produkce
// nedostane poloviční mapa.

const ZOOM = 14;
// 640x480 je strop Static API pro jedno volání; `scale=2` dodá dvojnásobek pixelů
// (1280x960) pro retina displeje, aniž by se to počítalo jako druhé volání.
const STATIC_SIZE = "640x480";

function staticUri(apiKey, gps, language) {
  const center = `${gps.lat},${gps.lng}`;
  const params = new URLSearchParams({
    key: apiKey,
    center,
    zoom: String(ZOOM),
    size: STATIC_SIZE,
    scale: "2",
    language,
    markers: center,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

function embedUri(apiKey, gps, language) {
  const params = new URLSearchParams({
    key: apiKey,
    q: `${gps.lat},${gps.lng}`,
    zoom: String(ZOOM),
    language,
  });
  return `https://www.google.com/maps/embed/v1/place?${params}`;
}

const Map = createVisualComponent({
  uu5Tag: Config.TAG + "Map",

  render() {
    const [interactive, setInteractive] = useState(false);
    const [language] = useLanguage();
    // Popisky musí být obyčejné stringy, ne Lsi objekty -- jdou do `alt`, `title` a
    // `aria-label`, a v nich by objekt skončil jako [object Object].
    const title = useLsi(lsi("sections", "contact", "mapTitle")) ?? "";
    const actionLabel = useLsi(lsi("sections", "contact", "mapButton")) ?? "";
    const apiKey = Config.googleMapsApiKey;
    const gps = property.address.gps;

    // Bez klíče není co načíst -- zůstává prázdný stav s odkazem ven.
    if (!apiKey) {
      return (
        <Uu5Elements.PlaceholderBox
          code="location"
          header={<Lsi lsi={lsi("sections", "contact", "mapCaption")} />}
          actionList={[
            {
              children: <Lsi lsi={lsi("sections", "contact", "mapLink")} />,
              href: contact.mapUrl,
              significance: "subdued",
            },
          ]}
        />
      );
    }

    const fillCss = Config.Css.css({
      inlineSize: "100%",
      blockSize: "100%",
      border: "none",
      borderRadius: "inherit",
      display: "block",
      objectFit: "cover",
    });

    // Statická fáze je klikací plocha; interaktivní už si klikání řeší iframe sám.
    const boxProps = interactive
      ? {}
      : {
        onClick: () => setInteractive(true),
        elementAttrs: {
          role: "button",
          tabIndex: 0,
          "aria-label": actionLabel,
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === "NumpadEnter" || e.key === " ") {
              e.preventDefault();
              setInteractive(true);
            }
          },
        },
      };

    return (
      <Uu5Elements.Grid rowGap={8} justifyItems="start">
        <Uu5Elements.Box
          {...boxProps}
          shape="background"
          significance="distinct"
          aspectRatio="4x3"
          borderRadius="moderate"
          className={Config.Css.css({ inlineSize: "100%" })}
        >
          {interactive ? (
            <iframe
              src={embedUri(apiKey, gps, language)}
              title={title}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className={fillCss}
            />
          ) : (
            <img src={staticUri(apiKey, gps, language)} alt={title} loading="lazy" className={fillCss} />
          )}
        </Uu5Elements.Box>

        {/* Že se kliknutím načte mapa z Googlu, musí být vidět i bez tlačítka. */}
        {!interactive && (
          <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="dim">
            <Lsi lsi={lsi("sections", "contact", "mapConsent")} />
          </Uu5Elements.Text>
        )}

        <Uu5Elements.Link href={contact.mapUrl} colorScheme="primary" underline="onHover">
          <Lsi lsi={lsi("sections", "contact", "mapLink")} />
        </Uu5Elements.Link>
      </Uu5Elements.Grid>
    );
  },
});

export default Map;
