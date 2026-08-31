// Vybavení -- mřížka karet v sekci "O roubence".
// Tvar drží budoucí `property.amenities` (design.md § 6).
//
// TODO OBSAH: placeholder z předlohy (ux/02-o-roubence-galerie.jpg).

export default [
  {
    code: "beds",
    title: { cs: "8 lůžek ve 4 ložnicích" },
    description: { cs: "Dvě podkrovní ložnice, dvě v přízemí, dětská postýlka na vyžádání." },
    order: 10,
  },
  {
    code: "sauna",
    title: { cs: "Finská sauna" },
    description: { cs: "Vytápěná sauna s odpočívárnou a studenou kádí na zahradě." },
    order: 20,
  },
  {
    code: "kitchen",
    title: { cs: "Plně vybavená kuchyň" },
    description: { cs: "Myčka, trouba, kávovar, litinové nádobí i kamna na dřevo." },
    order: 30,
  },
  {
    code: "terrace",
    title: { cs: "Terasa a ohniště" },
    description: { cs: "Krytá terasa, gril, ohniště a 1 200 m² oplocené zahrady." },
    order: 40,
  },
  {
    code: "pets",
    title: { cs: "Zvířata vítána" },
    description: { cs: "Pes je u nás doma — zahrada je celá oplocená." },
    order: 50,
  },
  {
    code: "wifi",
    title: { cs: "Wi-Fi a klid" },
    description: { cs: "Rychlé připojení, když je potřeba. A ticho, když není." },
    order: 60,
  },
];
