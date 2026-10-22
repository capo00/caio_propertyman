import { createVisualComponent, Lsi, useEffect, useLsi, useMemo, useState, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../../config/config.js";
import importLsi, { lsi, ERROR_LSI } from "../../../lsi/import-lsi.js";
import { createInvoice, getInvoiceDraft } from "../../calls.js";
import { downloadPdf } from "./download.js";

// Issuing an invoice on request (docs/proposal-invoice-pdf.md § 1). The supplier comes from config,
// read-only; the customer, line items and payment are prefilled by the server from the reservation
// (`invoice/draft`) and the owner edits them. "Generate" issues the invoice (number, storage) and downloads the PDF right away.
//
// Line items are flat inputs `line{i}Text` / `line{i}Amount`: the server sends the same keys
// in errors, so the error shows up at the specific field. Only the last line item can be removed,
// so that values do not shift between rows.

const MAX_LINES = 10;

const css = {
  section: () => Config.Css.css({ display: "grid", gap: 12 }),
  supplier: () => Config.Css.css({ margin: 0, whiteSpace: "pre-wrap" }),
};

/**
 * Field names from a server error, human-readable, for the form's summary message. The server sends
 * a paramMap with `$.<field>` keys (uu5g05-forms also shows the error right at the field), but a line
 * item without a label above it (`line0Amount`) is easier to find in the summary. `dtoOut` is a fallback
 * for caio-ui before 0.4.3, which did not yet put `paramMap` on the error.
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

/** null → undefined: uu5g05-forms treats undefined as an empty input. */
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
    const errorMessage = UiElements.useErrorMessage(ERROR_LSI);
    const [draft, setDraft] = useState();
    const [error, setError] = useState();
    const [lineCount, setLineCount] = useState(1);
    // One object for the whole life of the modal: a new reference on every render could reset
    // the form to its initial values in the middle of typing.
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
            <Uu5Elements.HighlightedBox colorScheme="negative">{errorMessage(error)}</Uu5Elements.HighlightedBox>
          ) : (
            <Uu5Elements.Pending size="xl" />
          )}
        </Uu5Elements.Modal>
      );
    }

    const { supplier } = draft;

    return (
      <Uu5Forms.Form.Provider
        lsiError={ERROR_LSI}
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
            // Extends the summary above the form with the list of fields: a line item without a label
            // above it (`line0Amount`) is easier to find in the summary. Form.View shows Utils.Error.Message
            // as is; an error from Call (caio-ui 0.4.3+) already is one, older Call threw a plain Error.
            const fields = badFieldLabels(error, t);
            const message = errorMessage(error);
            throw new Utils.Error.Message(fields.length ? `${message} (${fields.join(", ")})` : message, error);
          }
        }}
        onSubmitted={(e) => {
          // uu5g05-forms calls onSubmitted even after a server error (client validation passed):
          // then there is `form.submitError`, the modal stays open and the error is at the field.
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
          {/* Form.View shows the server error (summary at the top and at the specific fields). */}
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
