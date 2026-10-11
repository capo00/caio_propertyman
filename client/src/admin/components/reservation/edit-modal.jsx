import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../../config/config.js";
import { lsi } from "../../../lsi/import-lsi.js";
import { reservationCalls } from "../../calls.js";
import { ReservationFormView } from "./fields.jsx";

// Úprava rezervace z detailu. Stejná pole a stejná pravidla jako formulářový modál
// `UiElements.Crud` na seznamu (sdílený `ReservationFormView`), jen mimo tabulku.
//
// Posílá se jen to, co se změnilo -- stejně jako v Crud. Server odmítne nesmyslný platební
// plán chybou u konkrétního pole (uu5g05-forms ji zobrazí přímo u inputu).

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

    return (
      <Uu5Forms.Form.Provider
        onSubmit={async (e) => {
          const changes = changedFields(e.data.value, initialValue);
          if (!Object.keys(changes).length) return item;
          return reservationCalls.updateItem({ id: item.id, ...changes });
        }}
        onSubmitted={(e) => {
          // uu5g05-forms volá onSubmitted i po chybě serveru (klientská validace prošla) --
          // modál pak musí zůstat otevřený, jinak se chyba zahodí.
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
          // Stejná patička jako formulář v Crud: na telefonu tlačítka vedle sebe v poměru textu.
          footer={<UiElements.Crud.FormModalFooter onClose={onClose} />}
        >
          <ReservationFormView operation="update" data={item} languageList={item.emailLanguageList} />
        </Uu5Elements.Modal>
      </Uu5Forms.Form.Provider>
    );
  },
});

export default EditModal;
