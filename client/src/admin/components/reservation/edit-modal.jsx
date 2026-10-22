import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../../config/config.js";
import { lsi, ERROR_LSI } from "../../../lsi/import-lsi.js";
import { reservationCalls } from "../../calls.js";
import { ReservationFormView } from "./fields.jsx";

// Editing a reservation from the detail. The same fields and the same rules as the form modal of
// `UiElements.Crud` on the list (shared `ReservationFormView`), just outside the table.
//
// Only what changed is sent -- same as in Crud. The server rejects a nonsensical payment
// plan with an error at the specific field (uu5g05-forms shows it right at the input).

function changedFields(value, initial) {
  const result = {};
  for (const key in value) {
    if (key === "sys") continue;
    if (value[key] !== initial[key]) result[key] = value[key] ?? null;
  }
  return result;
}

const EditModal = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationEditModal",

  render({ item, onClose, onSaved }) {
    const initialValue = Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v ?? undefined]));
    const formError = UiElements.useFormError(ERROR_LSI);

    return (
      <Uu5Forms.Form.Provider
        lsiError={ERROR_LSI}
        onSubmit={async (e) => {
          const changes = changedFields(e.data.value, initialValue);
          if (!Object.keys(changes).length) return item;
          try {
            return await reservationCalls.updateItem({ id: item.id, ...changes });
          } catch (error) {
            throw formError(error);
          }
        }}
        onSubmitted={(e) => {
          // uu5g05-forms calls onSubmitted even after a server error (client validation passed) --
          // the modal must then stay open, otherwise the error is thrown away.
          if (e.data.form?.submitError) return;
          onSaved?.(e.data.submitResult);
          onClose?.();
        }}
        initialValue={initialValue}
        disableLeaveConfirmation
      >
        <Uu5Elements.Modal
          open
          width={720}
          onClose={onClose}
          header={<Lsi lsi={lsi("admin", "reservation", "detail")} />}
          // The same footer as the form in Crud: on a phone, buttons side by side in proportion to their text.
          footer={<UiElements.Crud.FormModalFooter onClose={onClose} />}
        >
          <ReservationFormView operation="update" data={item} languageList={item.emailLanguageList} />
        </Uu5Elements.Modal>
      </Uu5Forms.Form.Provider>
    );
  },
});

export default EditModal;
