import { createVisualComponent, useEffect } from "uu5g05";
import Config from "../config/config.js";
import { scrollToAnchor } from "../scroll.js";
import Hero from "../components/sections/hero.jsx";
import Stats from "../components/sections/stats.jsx";
import About from "../components/sections/about.jsx";
import Gallery from "../components/sections/gallery.jsx";
import Pricing from "../components/sections/pricing.jsx";
import Reservation from "../components/sections/reservation.jsx";
import Reviews from "../components/sections/reviews.jsx";
import Surroundings from "../components/sections/surroundings.jsx";
import Faq from "../components/sections/faq.jsx";
import Contact from "../components/sections/contact.jsx";

// Home = celá předloha na jedné stránce, sekce pod sebou. Menu i tlačítka míří na kotvy
// (id sekcí), žádná sekce nemá vlastní stránku.
//
// `scrollTo` používají staré routy sekcí (/gallery, /cenik...) -- vyrenderují home
// a doscrollují na svou kotvu. Rám stránky (lišta + patička) dodává UiApp.Spa.

const Home = createVisualComponent({
  uu5Tag: Config.TAG + "Home",

  render({ scrollTo }) {
    // Skok se musí odbavit po vykreslení sekcí, jinak cílové id ještě neexistuje.
    // Odsazení pod sticky lištu řeší scrollMarginBlockStart na Section, ne tenhle kód.
    useEffect(() => {
      if (!scrollTo) return;
      scrollToAnchor(scrollTo);
    }, [scrollTo]);

    return (
      <>
        <Hero />
        <Stats />
        <About />
        <Gallery />
        <Pricing />
        <Reservation />
        <Reviews />
        <Surroundings />
        <Faq />
        <Contact />
      </>
    );
  },
});

export default Home;
