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

  // Sociální sítě a chat, v patičce jako oficiální loga (contact.jsx).
  //
  // `facebook` je stránka "Roubený ráj" (Hotel a ubytování), uživatelské jméno `roubenyraj`
  // od 2026-10-12. Dřívější adresa s číselným id (profile.php?id=61595012053371) funguje dál.
  //
  // TODO OBSAH: `instagram` je ZATÍM VYMYŠLENÁ adresa -- vlastník pošle skutečnou. Před
  // vydáním přepsat, jinak web odkazuje na cizí nebo neexistující účet.
  //
  // WhatsApp je totéž číslo jako telefon; wa.me chce číslo bez "+" a mezer. Otevře chat
  // v aplikaci (mobil) nebo ve WhatsApp Web, bez předvyplněné zprávy.
  social: {
    facebook: "https://www.facebook.com/roubenyraj",
    instagram: "https://www.instagram.com/roubenyraj/",
    whatsapp: `https://wa.me/${phone.replace(/\D/g, "")}`,
  },

  // Odkaz "otevřít v Google Maps" pod mapou (map.jsx). Samotný výřez mapy
  // se skládá ze souřadnic v config/property.js, tady je jen odkaz ven.
  mapUrl: "https://maps.app.goo.gl/7GW3ApWY7uX8MdFw8",
};
