// Kontaktní údaje. Popisky řádků ("Adresa", "Telefon", "E-mail") jsou v LSI pod
// "sections.contact"; tady jsou jen samotné hodnoty, které se nepřekládají.
//
// Telefon se píše na JEDNOM místě (`phone`, čitelně s mezerami); podobu pro `tel:` odkaz
// si `phoneHref` odvodí sám. Dřív to byly dvě nezávislé hodnoty a rozešly se -- web ukazoval
// jedno číslo a vytáčel druhé.

const phone = "+420 723 872 512";

export default {
  addressLines: ["Libošovice 6", "507 44 Libošovice", "Český ráj"],
  phone,
  // Pro tel: odkaz -- bez mezer a závorek.
  phoneHref: phone.replace(/[^+\d]/g, ""),
  email: "capkova.leni@gmail.com",

  // Odkaz "otevřít v Google Maps" pod mapou (components/map.jsx). Samotný výřez mapy
  // se skládá ze souřadnic v content/property.js, tady je jen odkaz ven.
  mapUrl: "https://www.google.com/maps/search/?api=1&query=50.4861%2C15.15",
};
