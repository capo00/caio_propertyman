import { createVisualComponent, Lsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../../config/config.js";
import { lsi } from "../../../lsi/import-lsi.js";
import { previewCreateEmail, previewUpdateEmail } from "../../calls.js";
import EmailPreviewModal from "./email-preview-modal.jsx";

// „Náhled e-mailu“ ve formuláři nové rezervace a úpravy: ukáže e-mail, který by uložení
// formuláře hostovi poslalo (výzva k záloze / potvrzení / změna rezervace), z aktuálních hodnot
// formuláře -- server ho počítá stejně jako při uložení, jen nic nezapíše ani neodešle.
//
// Pole formuláře se jménem (`name`), aby ho Form.View umístil do své mřížky (gridLayout).

/** Změněná pole proti výchozím datům -- stejně jako odeslání úpravy (Crud / edit-modal). */
function changedFields(value, initial) {
  const result = {};
  for (const key in value) {
    if (key === "sys") continue;
    if (value[key] !== (initial[key] ?? undefined)) result[key] = value[key] ?? null;
  }
  return result;
}

const FormEmailPreview = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationFormEmailPreview",

  /**
   * @param operation  "create" | "update"
   * @param data       upravovaná rezervace (u update)
   */
  render({ operation, data, className }) {
    const { value } = Uu5Forms.useFormApi();
    const [state, setState] = useState({ pending: false, email: undefined, error: null });

    // Bez zaškrtnutého e-mailu není co ukazovat.
    if (value?.sendEmail === false) return null;

    async function open() {
      setState({ pending: true, email: undefined, error: null });
      try {
        const result =
          operation === "update"
            ? await previewUpdateEmail({ id: data.id, ...changedFields(value, data) })
            : await previewCreateEmail(value);
        setState({ pending: false, email: result.email, error: null });
      } catch (e) {
        setState({ pending: false, email: undefined, error: e.message });
      }
    }

    return (
      <div className={className}>
        <Uu5Elements.Link onClick={open} disabled={state.pending}>
          <Lsi lsi={lsi("admin", "transition", "preview")} />
        </Uu5Elements.Link>
        {state.pending && <Uu5Elements.Pending size="xs" />}
        {state.email === null && (
          <Uu5Elements.Text colorScheme="building" significance="subdued">
            {" "}
            <Lsi lsi={lsi("admin", "reservation", "noEmailForChange")} />
          </Uu5Elements.Text>
        )}
        {state.error && (
          <Uu5Elements.Text colorScheme="negative" significance="common">
            {" "}
            {state.error}
          </Uu5Elements.Text>
        )}
        {state.email && <EmailPreviewModal email={state.email} onClose={() => setState((s) => ({ ...s, email: undefined }))} />}
      </div>
    );
  },
});

export default FormEmailPreview;
