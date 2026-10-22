import { createVisualComponent, Lsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../../config/config.js";
import UiElements from "caio-ui/src/caio-ui-elements";
import { lsi, ERROR_LSI } from "../../../lsi/import-lsi.js";
import { previewCreateEmail, previewUpdateEmail } from "../../calls.js";
import EmailPreviewModal from "./email-preview-modal.jsx";

// "E-mail preview" in the new-reservation and edit forms: shows the e-mail that saving the form
// would send to the guest (deposit request / confirmation / reservation change), from the current form
// values -- the server computes it the same way as on save, it just writes and sends nothing.
//
// A form field with a name (`name`), so that Form.View places it in its grid (gridLayout).

/** Fields changed against the initial data -- same as submitting an edit (Crud / edit-modal). */
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
   * @param data       the reservation being edited (for update)
   */
  render({ operation, data, className }) {
    const { value } = Uu5Forms.useFormApi();
    const [state, setState] = useState({ pending: false, email: undefined, error: null });
    const errorMessage = UiElements.useErrorMessage(ERROR_LSI);

    // Without the e-mail checkbox ticked there is nothing to show.
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
        setState({ pending: false, email: undefined, error: errorMessage(e) });
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
