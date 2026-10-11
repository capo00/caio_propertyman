import { createVisualComponent, Lsi, useEffect, useLsi, useMemo, useState, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../../config/config.js";
import importLsi, { lsi } from "../../../lsi/import-lsi.js";
import { createInvoice, getInvoiceDraft } from "../../calls.js";
import { downloadPdf } from "./download.js";

// Vystavení faktury na žádost (docs/proposal-invoice-pdf.md § 1). Dodavatel je z configu jen
// ke čtení, odběratele, položky a platbu předvyplní server z rezervace (`invoice/draft`)
// a vlastník je upraví. „Vygenerovat“ fakturu vystaví (číslo, uložení) a rovnou stáhne PDF.
//
// Položky jsou ploché inputy `line{i}Text` / `line{i}Amount`: stejné klíče posílá server
// v chybách, takže se chyba ukáže u konkrétního pole. Odebrat jde jen poslední položku,
// ať se hodnoty mezi řádky nepřesouvají.

const MAX_LINES = 10;

const css = {
  section: () => Config.Css.css({ display: "grid", gap: 12 }),
  supplier: () => Config.Css.css({ margin: 0, whiteSpace: "pre-wrap" }),
};

/**
 * Názvy polí z chyby serveru, čitelně, do souhrnné hlášky formuláře. Server posílá paramMap
 * s klíči `$.<pole>` (uu5g05-forms chybu ukáže i přímo u pole), ale položka bez popisku nad
 * sebou (`line0Amount`) se v souhrnu hledá líp. `dtoOut` je záloha pro caio-ui před 0.4.3,
 * které `paramMap` na chybu ještě nedávalo.
 */
function badFieldLabels(error, t) {
  const paramMap = error?.paramMap ?? error?.dtoOut?.paramMap ?? {};
  const keyList = Object.values(paramMap).flatMap((keyMap) => Object.keys(keyMap ?? {}).map((key) => key.replace(/^\$\./, "")));
  const labelOf = (key) => {
    const line = /^line(\d+)(Text|Amount)$/.exec(key);
    if (line) return `${line[2] === "Text" ? t.lineText : t.lineAmount} ${Number(line[1]) + 1}`;
    return t[key] ?? key;
  };
  return [...new Set(keyList.map(labelOf))];
}

/** null → undefined: uu5g05-forms bere undefined jako prázdný input. */
function initialValueOf(draft) {
  const value = {
    customerName: draft.customerName,
    customerAddress: draft.customerAddress,
    customerIco: draft.customerIco,
    customerDic: draft.customerDic,
    issuedDate: draft.issuedDate,
    paidAmount: draft.paidAmount,
    paidDate: draft.paidDate,
    dueDate: draft.dueDate,
  };
  draft.lineList.forEach((line, i) => {
    value[`line${i}Text`] = line.text;
    value[`line${i}Amount`] = line.amount;
  });
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, v ?? undefined]));
}

function Section({ title, children }) {
  return (
    <div className={css.section()}>
      <Uu5Elements.Text category="interface" segment="title" type="micro" colorScheme="building">
        {title}
      </Uu5Elements.Text>
      {children}
    </div>
  );
}

const InvoiceModal = createVisualComponent({
  uu5Tag: Config.TAG + "InvoiceModal",

  render({ reservationId, onClose, onDone }) {
    const t = useLsi(importLsi, ["admin", "invoice"]) ?? {};
    const { addAlert } = Uu5Elements.useAlertBus();
    const [draft, setDraft] = useState();
    const [error, setError] = useState();
    const [lineCount, setLineCount] = useState(1);
    // Jeden objekt na celý život modálu: nová reference při každém vykreslení by formulář
    // mohla vrátit na výchozí hodnoty uprostřed psaní.
    const initialValue = useMemo(() => (draft ? initialValueOf(draft) : undefined), [draft]);

    useEffect(() => {
      let cancelled = false;
      getInvoiceDraft(reservationId)
        .then((data) => {
          if (cancelled) return;
          setDraft(data);
          setLineCount(Math.max(1, data.lineList.length));
        })
        .catch((e) => !cancelled && setError(e));
      return () => {
        cancelled = true;
      };
    }, [reservationId]);

    const header = <Lsi lsi={lsi("admin", "invoice", "issue")} />;

    if (!draft) {
      return (
        <Uu5Elements.Modal open width={720} onClose={onClose} header={header}>
          {error ? (
            <Uu5Elements.HighlightedBox colorScheme="negative">{error.message}</Uu5Elements.HighlightedBox>
          ) : (
            <Uu5Elements.Pending size="xl" />
          )}
        </Uu5Elements.Modal>
      );
    }

    const { supplier } = draft;

    return (
      <Uu5Forms.Form.Provider
        onSubmit={async (e) => {
          const value = e.data.value;
          try {
            return await createInvoice({
              reservationId,
              customerName: value.customerName,
              customerAddress: value.customerAddress,
              customerIco: value.customerIco,
              customerDic: value.customerDic,
              lineList: Array.from({ length: lineCount }, (_, i) => ({ text: value[`line${i}Text`], amount: value[`line${i}Amount`] })),
              issuedDate: value.issuedDate,
              paidAmount: value.paidAmount ?? 0,
              paidDate: value.paidDate,
              dueDate: value.dueDate,
            });
          } catch (error) {
            // Souhrn nad formulářem doplní o seznam polí: položka bez popisku nad sebou
            // (`line0Amount`) se v souhrnu najde líp. Utils.Error.Message ukáže Form.View tak, jak
            // je; chyba z Call (caio-ui 0.4.3+) už jím je, starší Call házel obyčejný Error.
            const fields = badFieldLabels(error, t);
            throw new Utils.Error.Message(fields.length ? `${error.message} (${fields.join(", ")})` : error.message, error);
          }
        }}
        onSubmitted={(e) => {
          // uu5g05-forms volá onSubmitted i po chybě serveru (klientská validace prošla):
          // pak je tu `form.submitError`, modál zůstane otevřený a chyba je u pole.
          if (e.data.form?.submitError || !e.data.submitResult) return;
          const { invoice, filename, pdfBase64 } = e.data.submitResult;
          downloadPdf(filename, pdfBase64);
          addAlert({ message: Utils.String.format(t.generated, { number: invoice.number }), priority: "success", durationMs: 4000 });
          onDone?.(invoice);
          onClose?.();
        }}
        initialValue={initialValue}
        disableLeaveConfirmation
      >
        <Uu5Elements.Modal
          open
          width={720}
          onClose={onClose}
          header={header}
          footer={<UiElements.Crud.FormModalFooter onClose={onClose} submitLabel={t.generate} />}
        >
          {/* Form.View ukáže chybu ze serveru (souhrn nahoře i u konkrétních polí). */}
          <Uu5Forms.Form.View>
            <Uu5Elements.Grid rowGap={24}>
              {draft.supplierMissingList?.length > 0 && (
                <Uu5Elements.HighlightedBox colorScheme="warning">
                  {Utils.String.format(t.supplierMissing, { fields: draft.supplierMissingList.join(", ") })}
                </Uu5Elements.HighlightedBox>
              )}

              <Section title={t.supplier}>
                <p className={css.supplier()}>
                  <b>{supplier.name}</b>
                  {"\n"}
                  {supplier.address}
                  {"\n"}
                  {Utils.String.format(t.icoNotPayer, { ico: supplier.ico })}
                </p>
              </Section>

              <Section title={t.customer}>
                <Uu5Forms.FormText name="customerName" label={t.customerName} required />
                <Uu5Forms.FormTextArea name="customerAddress" label={t.customerAddress} rows={2} autoResize />
                <Uu5Elements.Grid templateColumns={{ xs: "1fr", s: "1fr 1fr" }} columnGap={16} rowGap={12}>
                  <Uu5Forms.FormText name="customerIco" label={t.customerIco} />
                  <Uu5Forms.FormText name="customerDic" label={t.customerDic} />
                </Uu5Elements.Grid>
              </Section>

              <Section title={t.lines}>
                {Array.from({ length: lineCount }, (_, i) => (
                  <Uu5Elements.Grid key={i} templateColumns={{ xs: "1fr", s: "1fr 160px" }} columnGap={16} rowGap={8}>
                    <Uu5Forms.FormText name={`line${i}Text`} label={t.lineText} required />
                    <Uu5Forms.FormNumber name={`line${i}Amount`} label={t.lineAmount} required />
                  </Uu5Elements.Grid>
                ))}
                <span className={Config.Css.css({ display: "flex", gap: 8, flexWrap: "wrap" })}>
                  {lineCount < MAX_LINES && (
                    <Uu5Elements.Button icon="uugds-plus-circle" significance="subdued" onClick={() => setLineCount(lineCount + 1)}>
                      {t.addLine}
                    </Uu5Elements.Button>
                  )}
                  {lineCount > 1 && (
                    <Uu5Elements.Button icon="uugds-minus-circle" significance="subdued" onClick={() => setLineCount(lineCount - 1)}>
                      {t.removeLine}
                    </Uu5Elements.Button>
                  )}
                </span>
              </Section>

              <Section title={t.payment}>
                <Uu5Elements.Grid templateColumns={{ xs: "1fr", s: "1fr 1fr" }} columnGap={16} rowGap={12}>
                  <Uu5Forms.FormDate name="issuedDate" label={t.issuedDate} required />
                  <Uu5Forms.FormNumber name="paidAmount" label={t.paidAmount} info={t.paidAmountInfo} min={0} />
                  <Uu5Forms.FormDate name="paidDate" label={t.paidDate} />
                  <Uu5Forms.FormDate name="dueDate" label={t.dueDate} />
                </Uu5Elements.Grid>
              </Section>
            </Uu5Elements.Grid>
          </Uu5Forms.Form.View>
        </Uu5Elements.Modal>
      </Uu5Forms.Form.Provider>
    );
  },
});

export default InvoiceModal;
