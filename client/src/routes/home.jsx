import { createVisualComponent } from "uu5g05";
import Config from "../config/config.js";
import Hero from "../components/sections/hero.jsx";
import Stats from "../components/sections/stats.jsx";
import About from "../components/sections/about.jsx";
import Gallery from "../components/sections/gallery.jsx";
import Pricing from "../components/sections/pricing.jsx";
import Reservation from "../components/sections/reservation.jsx";
import Reviews from "../components/sections/reviews.jsx";
import Surroundings from "../components/sections/surroundings.jsx";
import Faq from "../components/sections/faq.jsx";

// Home je po rozpadu webu do rout VÝKLADNÍ SKŘÍŇ, ne celý obsah (docs/proposal-routes.md).
// Sekce, které unesou detail, jsou tu zkrácené a končí odkazem na svou stránku:
//
//   About        -- karty prostorů -> /ubytovani/<code>, tlačítko -> /ubytovani
//   Gallery      -- šest fotek -> /galerie
//   Pricing      -- "od X Kč za noc" -> /cenik
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

const TEASER = {
  gallery: 6,
  reviews: 3,
  surroundings: 3,
};

const Home = createVisualComponent({
  uu5Tag: Config.TAG + "Home",

  render() {
    return (
      <>
        <Hero />
        <Stats />
        <About />
        <Gallery limit={TEASER.gallery} />
        <Pricing teaser />
        <Reservation />
        <Reviews limit={TEASER.reviews} />
        <Surroundings limit={TEASER.surroundings} />
        <Faq />
      </>
    );
  },
});

export default Home;
