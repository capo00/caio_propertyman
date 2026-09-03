// Kontaktní údaje. Popisky řádků ("Adresa", "Telefon", "E-mail") jsou v LSI pod
// "sections.contact"; tady jsou jen samotné hodnoty, které se nepřekládají.
//
// TODO OBSAH: telefon i e-mail jsou VYMYŠLENÉ (předloha ux/08-kontakt-footer.jpg).
// Před nasazením přepsat -- jinak by web zveřejnil cizí nebo neexistující číslo.

export default {
  addressLines: ["Libošovice 74", "507 44 Libošovice", "Český ráj"],
  phone: "+420 777 123 456",
  // Pro tel: odkaz -- bez mezer a závorek.
  phoneHref: "+420777123456",
  email: "info@roubenkalibosovice.cz",

  // Odkaz "otevřít v Google Maps" pod mapou (components/map.jsx). Samotný výřez mapy
  // se skládá ze souřadnic v content/property.js, tady je jen odkaz ven.
  mapUrl: "https://www.google.com/maps/search/?api=1&query=50.4747%2C15.1725",
};
