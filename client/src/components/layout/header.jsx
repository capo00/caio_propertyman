import { createVisualComponent, useState, useEffect, useRoute, useScreenSize, Lsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import Button from "./button.jsx";

const { theme } = Config;

// Horní lišta webu. Staví se ručně, protože UiApp.Top ani UiApp.Page nejsou z caio-ui
// exportované (caio-ui-app/exports.js reexportuje jen spa-provider, spa a with-route).
// Nám to vyhovuje -- předloha má hlavičku webu, ne aplikační top bar.
//
// Chování z předlohy: nad hero je lišta průhledná se světlým textem, po odscrollování
// se překlopí do krémové s tmavým. Na podstránkách (bez hero) je krémová rovnou.

// Popisky jsou LSI objekty, i když se renderuje jen `cs` -- přidání jazyka je pak doplnění
// klíče, ne refaktor.
//
// Každá položka má DVA cíle: kotvu (na home, kde jsou všechny sekce pod sebou) a routu
// (na samostatných stránkách sekcí). Bez toho by na /pricing odkaz "#galerie" nic neudělal,
// protože ta sekce na stránce není.
const NAV = [
  { anchor: "#o-roubence", route: "about", label: { cs: "O roubence" } },
  { anchor: "#galerie", route: "gallery", label: { cs: "Galerie" } },
  { anchor: "#cenik", route: "pricing", label: { cs: "Ceník" } },
  { anchor: "#rezervace", route: "reservation", label: { cs: "Rezervace" } },
  { anchor: "#recenze", route: "reviews", label: { cs: "Recenze" } },
  { anchor: "#okoli", route: "surroundings", label: { cs: "Okolí" } },
  { anchor: "#kontakt", route: "contact", label: { cs: "Kontakt" } },
];

const SCROLL_THRESHOLD = 24;

// Pevná výška lišty. Musí být konstanta, protože podle ní odsazuje obsah page.jsx --
// lišta je `fixed`, takže z toku dokumentu vypadává a sama nic neodsune.
const HEADER_HEIGHT = 64;

const Header = createVisualComponent({
  uu5Tag: Config.TAG + "Header",

  render({ transparent = false }) {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [screenSize] = useScreenSize();
    const [route, setRoute] = useRoute();

    const isCompact = screenSize === "xs" || screenSize === "s";

    // Na home jsou všechny sekce pod sebou, takže menu scrolluje na kotvy. Na samostatné
    // stránce sekce kotva neexistuje, tak se místo toho naviguje na routu.
    const isHome = route?.uu5Route === "home" || route?.uu5Route === "";
    const targetOf = (item) => (isHome ? item.anchor : item.route);

    useEffect(() => {
      if (!transparent) return undefined;
      const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
      onScroll(); // stav po reloadu uprostřed stránky
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }, [transparent]);

    // Průhledná jen dokud jsme nahoře nad hero.
    const isOverHero = transparent && !scrolled;
    const fg = isOverHero ? theme.color.onDark : theme.color.fg;

    function goHome(e) {
      e.preventDefault();
      setRoute("home");
      setMenuOpen(false);
    }

    return (
      <header
        className={Config.Css.css({
          // `fixed`, ne `sticky`: průhledná lišta musí PŘEKRÝVAT hero, ne se nad ním skládat.
          // Se `sticky` by ležela na podkladu stránky a světlý text by na krému zmizel.
          position: "fixed",
          insetBlockStart: 0,
          insetInline: 0,
          // Pod uu5 popoverem (990), ať nepřekryje otevřené menu uu5 komponent.
          zIndex: theme.zIndex.header,
          backgroundColor: isOverHero ? "transparent" : theme.color.bg,
          borderBlockEnd: `1px solid ${isOverHero ? "transparent" : theme.color.border}`,
          transition: "background-color 160ms ease, border-color 160ms ease",
        })}
      >
        <div
          className={Config.Css.css({
            maxWidth: theme.maxWidth,
            marginInline: "auto",
            paddingInline: isCompact ? theme.gutter.xs : theme.gutter.m,
            blockSize: HEADER_HEIGHT,
            display: "flex",
            alignItems: "center",
            gap: 16,
          })}
        >
          {/* Logo: dlaždice s iniciálou + dvouřádkový název */}
          <a
            href="/home"
            onClick={goHome}
            className={Config.Css.css({
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: fg,
              marginInlineEnd: "auto",
            })}
          >
            <span
              className={Config.Css.css({
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                borderRadius: theme.radius / 2,
                backgroundColor: theme.color.forest,
                color: theme.color.onDark,
                fontFamily: theme.font.display,
                fontWeight: 600,
                fontSize: 18,
                // Na tmavém hero by zelená dlaždice zanikla.
                outline: isOverHero ? `1px solid ${theme.color.onDark}4D` : "none",
              })}
            >
              R
            </span>
            <span className={Config.Css.css({ display: "flex", flexDirection: "column", lineHeight: 1.15 })}>
              <span className={Config.Css.css({ ...theme.text.h3, fontSize: 17, color: "inherit" })}>
                Roubenka Libošovice
              </span>
              <span className={Config.Css.css({ ...theme.text.eyebrow, fontSize: 9, opacity: 0.75 })}>
                Český ráj
              </span>
            </span>
          </a>

          {!isCompact &&
            NAV.map((item) => (
              <a
                key={item.route}
                href={targetOf(item)}
                onClick={(e) => {
                  if (isHome) return; // kotva -- prohlížeč si poradí sám
                  e.preventDefault();
                  setRoute(item.route);
                }}
                className={Config.Css.css({
                  ...theme.text.body,
                  fontSize: 15,
                  color: fg,
                  textDecoration: "none",
                  opacity: 0.85,
                  "&:hover": { opacity: 1 },
                })}
              >
                <Lsi lsi={item.label} />
              </a>
            ))}

          {!isCompact && (
            <Button anchor="#rezervace" route="reservation" variant={isOverHero ? "onDark" : "solid"}
              className={Config.Css.css({ paddingBlock: 10, paddingInline: 18 })}>
              <Lsi lsi={{ cs: "Rezervovat" }} />
            </Button>
          )}

          {isCompact && (
            <Uu5Elements.Button
              icon={menuOpen ? "uugds-close" : "uugds-menu"}
              significance="subdued"
              onClick={() => setMenuOpen((open) => !open)}
              className={Config.Css.css({ color: fg })}
            />
          )}
        </div>

        {/* Mobilní menu -- rozbalené pod lištou, vždy na plném podkladu kvůli čitelnosti */}
        {isCompact && menuOpen && (
          <nav
            className={Config.Css.css({
              backgroundColor: theme.color.bg,
              borderBlockStart: `1px solid ${theme.color.border}`,
              paddingInline: theme.gutter.xs,
              paddingBlock: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            })}
          >
            {NAV.map((item) => (
              <a
                key={item.route}
                href={targetOf(item)}
                onClick={(e) => {
                  setMenuOpen(false);
                  if (isHome) return;
                  e.preventDefault();
                  setRoute(item.route);
                }}
                className={Config.Css.css({
                  ...theme.text.body,
                  color: theme.color.fg,
                  textDecoration: "none",
                  paddingBlock: 10,
                })}
              >
                <Lsi lsi={item.label} />
              </a>
            ))}
            <Button anchor="#rezervace" route="reservation" onClick={() => setMenuOpen(false)}
              className={Config.Css.css({ marginBlockStart: 8 })}>
              <Lsi lsi={{ cs: "Rezervovat" }} />
            </Button>
          </nav>
        )}
      </header>
    );
  },
});

export { NAV, HEADER_HEIGHT };
export default Header;
