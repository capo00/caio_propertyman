import { createVisualComponent, Lsi, useState, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../../config/config.js";
import { lsi } from "../../../lsi/import-lsi.js";

// Náhled e-mailu hostovi přesně tak, jak odejde: HTML verze (s QR kódem platby) a textová
// verze, kterou dostanou klienti bez HTML a která se ukládá do historie. Výchozí je HTML.
//
// Jeden scrollbar (majitel 2026-10-09): modál sám neroluje (`scrollable={false}`), obsah e-mailu
// vyplní zbytek výšky (flex 1) a roluje uvnitř.
//
// HTML jde do iframe se `srcDoc`: je to cizí dokument s vlastními styly (nesmí se míchat
// s adminem). Sandbox pustí jen odkazy (mailto:, tel:, web) do nového okna -- skripty a formuláře
// ne. QR je data URI (server ho do náhledu vkládá místo přílohy `cid:`).

const css = {
  body: () =>
    Config.Css.css({
      display: "flex",
      flexDirection: "column",
      gap: 12,
      // Přesně do těla modálu, ať modál sám nescrolluje: výška okna minus okraj dialogu (2× 16),
      // hlavička (~85), vnitřní odsazení těla (2× 32) a rezerva. Na desktopu strop pro pohodlné čtení.
      height: "min(calc(100dvh - 200px), 860px)",
      minHeight: 0,
    }),
  meta: () => Config.Css.css({ display: "grid", gap: 2, overflowWrap: "anywhere", flex: "none" }),
  content: () =>
    Config.Css.css({
      flex: 1,
      minHeight: 0,
      width: "100%",
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: 8,
      background: "#fff",
    }),
  text: () =>
    Config.Css.css({
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      fontSize: 13,
      margin: 0,
      padding: 12,
      overflow: "auto",
    }),
};

/** Odkazy v náhledu otevírat mimo iframe (mailto: / tel: / web), ne uvnitř sandboxu. */
function withLinkTarget(html) {
  const base = '<base target="_blank">';
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + base) : base + html;
}

const EmailPreviewModal = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationEmailPreviewModal",

  /** @param email  { subject, to, html, text } z náhledu na serveru */
  render({ email, onClose }) {
    const [format, setFormat] = useState("html");

    return (
      <Uu5Elements.Modal
        open
        width={760}
        scrollable={false}
        onClose={onClose}
        header={<Lsi lsi={lsi("admin", "transition", "previewHeader")} />}
      >
        <div className={css.body()}>
          <div className={css.meta()}>
            <strong>{email.subject}</strong>
            <Uu5Elements.Text colorScheme="building" significance="subdued">
              <Lsi lsi={lsi("admin", "transition", "to")} /> {email.to}
            </Uu5Elements.Text>
          </div>

          <Uu5Forms.SwitchSelect
            value={format}
            onChange={(e) => setFormat(e.data.value)}
            itemList={[
              { value: "html", children: <Lsi lsi={lsi("admin", "transition", "formatHtml")} /> },
              { value: "text", children: <Lsi lsi={lsi("admin", "transition", "formatText")} /> },
            ]}
          />

          {format === "html" ? (
            <iframe
              className={css.content()}
              srcDoc={withLinkTarget(email.html)}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              title={email.subject}
            />
          ) : (
            <pre className={Utils.Css.joinClassName(css.content(), css.text())}>{email.text}</pre>
          )}
        </div>
      </Uu5Elements.Modal>
    );
  },
});

export default EmailPreviewModal;
