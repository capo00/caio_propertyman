import { createVisualComponent, Lsi, useEffect, useLsi, useState, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../../config/config.js";
import importLsi, { lsi } from "../../../lsi/import-lsi.js";
import { cancelInvoice, downloadInvoice, listInvoices } from "../../calls.js";
import { DateValue, Price } from "../reservation/fields.jsx";
import { downloadPdf } from "./download.js";
import InvoiceModal from "./invoice-modal.jsx";

// Sekce „Faktury“ v detailu rezervace (docs/proposal-invoice-pdf.md § 5): vystavené faktury,
// znovu stažení uloženého PDF a storno. Faktura se vystavuje jen na žádost zákazníka a appka
// ji neposílá -- vlastník PDF stáhne a pošle sám.

const css = {
  row: () => Config.Css.css({ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "8px 0" }),
  title: () => Config.Css.css({ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }),
  cancelled: () => Config.Css.css({ textDecoration: "line-through" }),
  actions: () => Config.Css.css({ display: "inline-flex", gap: 4 }),
};

const InvoiceSection = createVisualComponent({
  uu5Tag: Config.TAG + "InvoiceSection",

  render({ reservationId }) {
    const t = useLsi(importLsi, ["admin", "invoice"]) ?? {};
    const { addAlert } = Uu5Elements.useAlertBus();
    const [itemList, setItemList] = useState();
    const [issuing, setIssuing] = useState(false);
    const [cancelling, setCancelling] = useState(null);

    function load() {
      listInvoices(reservationId)
        .then((data) => setItemList(data.itemList))
        .catch((e) => addAlert({ message: e.message, priority: "error" }));
    }

    useEffect(load, [reservationId]);

    function download(item) {
      downloadInvoice(item.id)
        .then((data) => downloadPdf(data.filename, data.pdfBase64))
        .catch((e) => addAlert({ message: e.message, priority: "error" }));
    }

    function confirmCancel() {
      const item = cancelling;
      setCancelling(null);
      cancelInvoice(item.id)
        .then(load)
        .catch((e) => addAlert({ message: e.message, priority: "error" }));
    }

    return (
      <Uu5Elements.Block
        className={Config.Css.css({ marginTop: 16 })}
        header={<Lsi lsi={lsi("admin", "section", "invoices")} />}
        headerType="title"
        actionList={[{ icon: "uugds-plus-circle", children: t.issue, collapsed: false, onClick: () => setIssuing(true) }]}
        card="full"
      >
        {!itemList ? (
          <Uu5Elements.Pending />
        ) : !itemList.length ? (
          <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building">
            {t.empty}
          </Uu5Elements.Text>
        ) : (
          itemList.map((item) => (
            <div key={item.id} className={css.row()}>
              <div>
                <span className={css.title()}>
                  <b className={item.cancelled ? css.cancelled() : undefined}>{item.number}</b>
                  {item.cancelled && (
                    <Uu5Elements.Tag colorScheme="negative" size="s">
                      {t.cancelled}
                    </Uu5Elements.Tag>
                  )}
                </span>
                <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building">
                  <DateValue value={item.issuedDate} /> · {item.customer?.name} · <Price value={item.total} />
                </Uu5Elements.Text>
              </div>
              <span className={css.actions()}>
                <Uu5Elements.Button icon="uugds-download" significance="subdued" tooltip={t.download} onClick={() => download(item)} />
                {!item.cancelled && (
                  <Uu5Elements.Button icon="uugds-close" significance="subdued" tooltip={t.cancel} onClick={() => setCancelling(item)} />
                )}
              </span>
            </div>
          ))
        )}

        {issuing && <InvoiceModal reservationId={reservationId} onClose={() => setIssuing(false)} onDone={load} />}

        <Uu5Elements.Dialog
          open={Boolean(cancelling)}
          onClose={() => setCancelling(null)}
          header={cancelling ? Utils.String.format(t.cancelHeader, { number: cancelling.number }) : null}
          info={t.cancelInfo}
          actionDirection="horizontal"
          actionList={[
            { children: t.back, onClick: () => setCancelling(null) },
            { children: t.cancel, colorScheme: "negative", significance: "highlighted", onClick: confirmCancel },
          ]}
        />
      </Uu5Elements.Block>
    );
  },
});

export default InvoiceSection;
