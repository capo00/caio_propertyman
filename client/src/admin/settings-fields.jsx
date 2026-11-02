import { createVisualComponent, useLsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../config/config.js";
import importLsi from "../lsi/import-lsi.js";

// Fields of the owner's section on the Settings screen (admin/settings.js). They get their values
// from `toForm` through the stack's shared Form.Provider, hence no `initialValue` here. Limits match
// the server's validator (server/app-settings/), which has the last word.

const LSI_PATH = ["admin", "settings"];

const SP = (size) => Uu5Elements.UuGds.SpacingPalette.getValue(["fixed", size]);
const ONE_COLUMN = { xs: "minmax(0, 1fr)" };
// Short fields in pairs from `m` up, one below the other on a phone.
const TWO_COLUMNS = { xs: "minmax(0, 1fr)", m: "repeat(2, minmax(0, 1fr))" };

function GroupHeader({ children }) {
  return (
    <Uu5Elements.Text category="interface" segment="title" type="minor" elementAttrs={{ role: "heading", "aria-level": 3 }}>
      {children}
    </Uu5Elements.Text>
  );
}

const SettingsFields = createVisualComponent({
  uu5Tag: Config.TAG + "SettingsFields",

  render() {
    const t = useLsi(importLsi, LSI_PATH);

    return (
      <Uu5Elements.Grid rowGap={SP("e")} templateColumns={ONE_COLUMN}>
        <GroupHeader>{t.ownerHeader}</GroupHeader>
        <Uu5Forms.FormEmail name="ownerEmail" label={t.ownerEmail} info={t.ownerEmailInfo} />

        <GroupHeader>{t.arrivalHeader}</GroupHeader>
        <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building" significance="subdued">
          {t.arrivalInfo}
        </Uu5Elements.Text>
        <Uu5Forms.FormTextArea name="arrivalKeys" label={t.arrivalKeys} maxLength={1000} autoResize />
        <Uu5Forms.FormTextArea name="arrivalParking" label={t.arrivalParking} maxLength={1000} autoResize />
        <Uu5Elements.Grid rowGap={SP("e")} columnGap={SP("d")} templateColumns={TWO_COLUMNS}>
          <Uu5Forms.FormText name="wifiName" label={t.wifiName} maxLength={100} />
          <Uu5Forms.FormText name="wifiPassword" label={t.wifiPassword} maxLength={100} />
        </Uu5Elements.Grid>

        <GroupHeader>{t.paymentHeader}</GroupHeader>
        <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building" significance="subdued">
          {t.paymentInfo}
        </Uu5Elements.Text>
        <Uu5Forms.FormText name="accountNumber" label={t.accountNumber} maxLength={50} />
        <Uu5Elements.Grid rowGap={SP("e")} columnGap={SP("d")} templateColumns={TWO_COLUMNS}>
          <Uu5Forms.FormText name="iban" label={t.iban} maxLength={42} />
          <Uu5Forms.FormText name="bic" label={t.bic} maxLength={11} />
        </Uu5Elements.Grid>

        <GroupHeader>{t.supplierHeader}</GroupHeader>
        <Uu5Elements.Grid rowGap={SP("e")} columnGap={SP("d")} templateColumns={TWO_COLUMNS}>
          <Uu5Forms.FormText name="supplierName" label={t.supplierName} maxLength={200} />
          <Uu5Forms.FormText name="supplierIco" label={t.supplierIco} maxLength={20} />
        </Uu5Elements.Grid>
        <Uu5Forms.FormTextArea name="supplierAddress" label={t.supplierAddress} maxLength={500} autoResize />
        <Uu5Forms.FormTextArea name="supplierRegistry" label={t.supplierRegistry} info={t.supplierRegistryInfo} maxLength={500} autoResize />
      </Uu5Elements.Grid>
    );
  },
});

export default SettingsFields;
