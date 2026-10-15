import { createVisualComponent } from "uu5g05";
import Config from "../config/config.js";
import Hero from "../components/hero.jsx";
import Stats from "../components/stats.jsx";
import About from "../components/about.jsx";
import Gallery from "../components/gallery/gallery.jsx";
import Pricing from "../components/pricing/pricing.jsx";
import Reservation from "../components/reservation/reservation.jsx";
import Reviews from "../components/reviews.jsx";
import Surroundings from "../components/surroundings/surroundings.jsx";
import Faq from "../components/faq/faq.jsx";
import LazySection from "../components/lazy-section.jsx";

// Home je po rozpadu webu do rout VÝKLADNÍ SKŘÍŇ, ne celý obsah (docs/proposal-routes.md).
// Sekce, které unesou detail, jsou tu zkrácené a končí odkazem na svou stránku:
//
//   About        -- karty prostorů -> /ubytovani/<code>, tlačítko -> /ubytovani
//   Gallery      -- šest fotek -> /galerie
//   Pricing      -- víkend a týden -> /cenik
//   Reviews      -- tři recenze -> /recenze
//   Surroundings -- tři místa -> /okoli
//
// Celé zůstávají dvě: Reservation (cíl hlavního CTA, nemá smysl ho odklikávat jinam)
// a Faq (accordion je i v plné délce krátký a hodí se přečíst před odesláním poptávky).
//
// KONTAKT tady není -- je to poslední sekce každé veřejné routy a přidává ji rám stránky
// v app.jsx, takže kotva `#kontakt` existuje i na /cenik nebo /ubytovani/loznice.
//
// Prop `scrollTo` zmizel spolu s one-pagerem: staré routy sekcí jsou dnes přesměrování
// na skutečné stránky (router.jsx), ne home s doscrollováním.
//
// Vše pod „O roubence“ se vykresluje až u viewportu (LazySection, docs/decisions.md
// 2026-10-15). `id` musí sedět s `id` sekce uvnitř -- placeholder ho drží kvůli kotvám.
// `estimate` jsou změřené výšky sekcí v px (xs 412, s 700, m 1000, xl 1400 px šířky).
// Recenze ho nemají: bez dat je sekce prázdná (2026-10-15 i na produkci).

const TEASER = {
  gallery: 4,
  reviews: 3,
  surroundings: 3,
};

const ESTIMATE = {
  galerie: { xs: 1450, s: 820, m: 850, xl: 570 },
  cenik: { xs: 605, s: 471, m: 519 },
  rezervace: { xs: 1630, s: 1576, m: 851 },
  okoli: { xs: 1230, s: 1226, m: 754, xl: 798 },
  faq: { xs: 737, s: 760, m: 808 },
};

const Home = createVisualComponent({
  uu5Tag: Config.TAG + "Home",

  render() {
    return (
      <>
        <Hero />
        <Stats />
        <About />
        <LazySection id="galerie" estimate={ESTIMATE.galerie}>
          <Gallery limit={TEASER.gallery} />
        </LazySection>
        <LazySection id="cenik" estimate={ESTIMATE.cenik}>
          <Pricing teaser />
        </LazySection>
        <LazySection id="rezervace" estimate={ESTIMATE.rezervace}>
          <Reservation />
        </LazySection>
        <LazySection id="recenze">
          <Reviews limit={TEASER.reviews} />
        </LazySection>
        <LazySection id="okoli" estimate={ESTIMATE.okoli}>
          <Surroundings limit={TEASER.surroundings} />
        </LazySection>
        <LazySection id="faq" estimate={ESTIMATE.faq}>
          <Faq />
        </LazySection>
      </>
    );
  },
});

export default Home;
