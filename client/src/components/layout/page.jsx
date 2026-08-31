import { createVisualComponent } from "uu5g05";
import Config from "../../config/config.js";
import Header, { HEADER_HEIGHT } from "./header.jsx";
import Footer from "./footer.jsx";

// Rám každé stránky: hlavička + obsah + patička.
//
// `transparentHeader` zapíná průhlednou lištu nad hero -- používá to jen `home`,
// podstránky mají lištu krémovou rovnou, protože pod ní žádné hero není.

const Page = createVisualComponent({
  uu5Tag: Config.TAG + "Page",

  render({ transparentHeader = false, children }) {
    return (
      <div
        className={Config.Css.css({
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        })}
      >
        <Header transparent={transparentHeader} />
        {/*
          Lišta je `fixed`, takže z toku vypadává a obsah je potřeba odsadit ručně.
          Výjimka je průhledná varianta: tam má hero sahat až pod lištu a odsazení
          si řeší sám (padTop na Section), aby fotka byla vidět i za ní.
        */}
        <main
          className={Config.Css.css({
            flex: 1,
            paddingBlockStart: transparentHeader ? 0 : HEADER_HEIGHT,
          })}
        >
          {children}
        </main>
        <Footer />
      </div>
    );
  },
});

export default Page;
