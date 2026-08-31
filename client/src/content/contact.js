// Kontaktní údaje.
//
// TODO OBSAH: telefon i e-mail jsou VYMYŠLENÉ (předloha ux/08-kontakt-footer.jpg).
// Před nasazením přepsat -- jinak by web zveřejnil cizí nebo neexistující číslo.

export default {
  addressLines: ["Libošovice 74", "507 44 Libošovice", "Český ráj"],
  phone: "+420 777 123 456",
  // Pro tel: odkaz -- bez mezer a závorek.
  phoneHref: "+420777123456",
  email: "info@roubenkalibosovice.cz",

  // Odkaz na mapu. Vlastní mapová komponenta ve v1 není -- OpenStreetMap výřez by znamenal
  // iframe na cizí doménu, což pro placeholder nemá cenu řešit.
  mapUrl: "https://www.openstreetmap.org/?mlat=50.4747&mlon=15.1725#map=14/50.4747/15.1725",
};
