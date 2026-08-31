import { createVisualComponent } from "uu5g05";
import Config from "../config/config.js";
import Page from "../components/layout/page.jsx";
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

// Home = celá předloha na jedné stránce, sekce pod sebou. Kotvy v menu (#galerie, #cenik...)
// míří na id jednotlivých sekcí.
//
// Každá sekce má navíc vlastní routu (routes/section-page.jsx), která tutéž komponentu
// vyrenderuje samostatně -- proto sekce nesmí být závislá na tom, co je nad ní.

const Home = createVisualComponent({
  uu5Tag: Config.TAG + "Home",

  render() {
    return (
      <Page transparentHeader>
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
      </Page>
    );
  },
});

export default Home;
