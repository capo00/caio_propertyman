import { Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import { lsi } from "../../../lsi/import-lsi.js";
import FormEmailPreview from "./form-email-preview.jsx";

// Sdílená konfigurace rezervace pro seznam (sloupce `Crud.generate`) i formuláře (úprava
// a nová rezervace přes `Crud.generateInputs`). Detail a modál změny stavu berou odsud
// formátování a barvy stavů, ať je všude totéž.

export const SOURCE_LIST = ["web", "manual"];
export const REASON_LIST = ["maintenance", "owner"];

// Barva stavu nese informaci, ne dekoraci: čeká na mě (warning) / běží (primary) / je hotovo
// (positive) / je pryč (negative). Schémata jsou z GDS, žádná vlastní paleta.
export const STATE_COLOR = {
  requested: "warning",
  awaitingDeposit: "primary",
  confirmed: "positive",
  completed: "building",
  rejected: "negative",
  cancelled: "negative",
  expired: "negative",
};

// Ikona a „síla“ každé akce. Primární (další krok) dostane colorScheme primary; storno a
// propadnutí jsou negativní, ať se na ně neklikne omylem.
// Ikony ověřené proti uu_gds_svgg01 1.36.0 (neexistující uugds- ikona se vykreslí prázdná,
// viz caio lesson uu5-modal-width-a-ikony-neexistuji-potichu). Čtyři „další kroky“ mají
// každý jinou, ať jsou rozlišitelné i tam, kde se tlačítko zúží na ikonu.
export const ACTION_META = {
  approve: { icon: "uugds-check", colorScheme: "primary" },
  markDepositPaid: { icon: "uugds-credit-card", colorScheme: "primary" },
  markBalancePaid: { icon: "uugds-check-circle", colorScheme: "primary" },
  complete: { icon: "uugds-check-circle-solid", colorScheme: "primary" },
  reopen: { icon: "uugds-reload", colorScheme: "primary" },
  reject: { icon: "uugds-close", colorScheme: "negative" },
  cancel: { icon: "uugds-close", colorScheme: "negative" },
  expire: { icon: "uugds-close", colorScheme: "negative" },
};

/**
 * Kód popisku akce. Akce na serveru je jedna (`markDepositPaid`), ale u platby celé částky
 * (do příjezdu ≤ 14 dní, doplatek není) se nejmenuje „Záloha přijata“, ale „Platba přijata“
 * (majitel 2026-10-09). `item` je rezervace, ke které akce patří.
 */
export function actionLabelCode(action, item) {
  return action === "markDepositPaid" && isFullPayment(item) ? "markFullPaid" : action;
}

/** Datum (ISO `YYYY-MM-DD`) přes uu5 DateTime -- formát podle jazyka aplikace. */
export function DateValue({ value }) {
  if (!value) return null;
  return <Uu5Elements.DateTime value={value} dateFormat="medium" timeFormat="none" />;
}

/** Celé číslo přes uu5 Number (oddělovače podle jazyka). */
export function NumberValue({ value }) {
  if (value == null) return null;
  return <Uu5Elements.Number value={value} />;
}

/** Platba celé částky: záloha je celá cena, doplatek není. */
export function isFullPayment(item) {
  return item?.depositAmount != null && item?.balanceDueDate == null;
}

/**
 * Kód popisku stavu. Hodnota stavu je jedna (`awaitingDeposit`), ale u platby celé částky se
 * nečeká na zálohu, nýbrž na platbu (majitel 2026-10-09). `fullPayment` přebije `item` (historie
 * bere plán z doby události).
 */
export function stateLabelCode(state, item, fullPayment = isFullPayment(item)) {
  return state === "awaitingDeposit" && fullPayment ? "awaitingPayment" : state;
}

export function Price({ value }) {
  if (value == null) return null;
  return <Uu5Elements.Number value={value} currency="CZK" currencyFormat="symbol" maxDecimalDigits={0} />;
}

export function StateTag({ state, item, fullPayment, size = "s" }) {
  return (
    <Uu5Elements.Tag colorScheme={STATE_COLOR[state] ?? "building"} significance="highlighted" size={size}>
      <Lsi lsi={lsi("admin", "state", stateLabelCode(state, item, fullPayment ?? isFullPayment(item)))} />
    </Uu5Elements.Tag>
  );
}

/** Co je právě k úhradě a do kdy: záloha (do zaplacení), pak nezaplacený doplatek. */
export function dueOf(item) {
  if (item.depositDueDate && !item.depositPaidDate && item.state === "awaitingDeposit") return { kind: "deposit", date: item.depositDueDate };
  if (item.balanceDueDate && !item.balancePaidDate && item.balanceAmount > 0 && item.state === "confirmed") return { kind: "balance", date: item.balanceDueDate };
  return null;
}

export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date());
}

function tomorrowIso(today) {
  return new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

function selectItemList(group, codeList) {
  return codeList.map((code) => ({ value: code, children: <Lsi lsi={lsi("admin", group, code)} /> }));
}

/** Výběr jazyka e-mailu: jen jazyky, pro které server má šablony (`emailLanguageList`). */
export function languageItemList(languageList = ["cs"]) {
  return selectItemList("lang", languageList);
}

/**
 * Sloupce a formulářová pole v jedné deklaraci. Plochý tvar (`contactName`, `depositDueDate`)
 * odpovídá tomu, co server posílá a bere -- v databázi je `contact` a `payment` vnořené.
 */
export const fieldCfg = {
  state: {
    label: lsi("admin", "reservation", "state"),
    sort: true,
    columnProps: { width: 150 },
    // Stav se ve formuláři needituje: mění ho `reservation/transition` (modál změny stavu).
    output: (value, item) => <StateTag state={value} item={item?.data} />,
  },
  dateFrom: {
    label: lsi("admin", "reservation", "dateFrom"),
    sort: true,
    columnProps: { width: 110 },
    output: (value) => <DateValue value={value} />,
    input: { Component: Uu5Forms.FormDate, props: { required: true } },
  },
  dateTo: {
    label: lsi("admin", "reservation", "dateTo"),
    sort: true,
    columnProps: { width: 110 },
    output: (value) => <DateValue value={value} />,
    input: { Component: Uu5Forms.FormDate, props: { required: true } },
  },
  nights: {
    label: lsi("admin", "reservation", "nights"),
    sort: true,
    visible: false,
    columnProps: { horizontalAlignment: "right", width: 70 },
    output: (value) => <NumberValue value={value} />,
  },
  contactName: {
    label: lsi("admin", "reservation", "guest"),
    sort: true,
    columnProps: { width: 180 },
    // Jméno je odkaz na detail -- tam se rezervace spravuje celá.
    output: (value, item) =>
      item?.data?.id ? (
        <Uu5Elements.Link href={`admin/reservation?id=${item.data.id}`}>
          {value || (item.data.reason ? <Lsi lsi={lsi("admin", "reason", item.data.reason)} /> : <Lsi lsi={lsi("admin", "reservation", "detail")} />)}
        </Uu5Elements.Link>
      ) : (
        value
      ),
    input: { Component: Uu5Forms.FormText, props: { maxLength: 200 } },
  },
  guestCount: {
    label: lsi("admin", "reservation", "guestCount"),
    columnProps: { horizontalAlignment: "right", width: 70 },
    output: (value) => <NumberValue value={value} />,
    input: { Component: Uu5Forms.FormNumber, props: { min: 1, max: 20 } },
  },
  totalPrice: {
    label: lsi("admin", "reservation", "totalPrice"),
    sort: true,
    columnProps: { horizontalAlignment: "right", width: 110 },
    output: (value) => <Price value={value} />,
    input: { Component: Uu5Forms.FormNumber, props: { min: 0 } },
  },
  dueDate: {
    label: lsi("admin", "reservation", "dueDate"),
    columnProps: { width: 130 },
    // Odvozený sloupec: záloha, nebo doplatek, podle toho, co je na řadě. Po splatnosti
    // negativní, splatné dnes nebo zítra (méně než ~24 h) varování.
    output: (_, item) => {
      const due = item?.data ? dueOf(item.data) : null;
      if (!due) return null;
      const today = todayIso();
      const overdue = due.date < today;
      const soon = !overdue && due.date <= tomorrowIso(today);
      return (
        <Uu5Elements.Text colorScheme={overdue ? "negative" : soon ? "warning" : "building"} significance="common">
          {overdue || soon ? (
            <strong>
              <DateValue value={due.date} />
            </strong>
          ) : (
            <DateValue value={due.date} />
          )}
        </Uu5Elements.Text>
      );
    },
  },
  source: {
    label: lsi("admin", "reservation", "source"),
    sort: true,
    columnProps: { width: 90 },
    // Zdroj není ve výčtu jen web/manual: importované záznamy nesou kód svého feedu.
    output: (value) => (SOURCE_LIST.includes(value) ? <Lsi lsi={lsi("admin", "source", value)} /> : value),
  },
  contactEmail: {
    label: lsi("admin", "reservation", "contactEmail"),
    visible: false,
    input: { Component: Uu5Forms.FormEmail, props: { maxLength: 320 } },
  },
  contactPhone: {
    label: lsi("admin", "reservation", "contactPhone"),
    visible: false,
    input: { Component: Uu5Forms.FormText, props: { maxLength: 40 } },
  },
  reason: {
    label: lsi("admin", "reservation", "reason"),
    visible: false,
    output: (value) => (value ? <Lsi lsi={lsi("admin", "reason", value)} /> : null),
    // Vyplněný důvod a prázdný kontakt = blokace termínu (údržba, vlastní pobyt).
    input: { Component: Uu5Forms.FormSelect, props: { itemList: selectItemList("reason", REASON_LIST) } },
  },
  note: {
    label: lsi("admin", "reservation", "note"),
    visible: false,
    input: { Component: Uu5Forms.FormTextArea, props: { maxLength: 2000, rows: 2 } },
  },
  desc: {
    label: lsi("admin", "reservation", "desc"),
    visible: false,
    input: { Component: Uu5Forms.FormTextArea, props: { maxLength: 2000, rows: 2 } },
  },
  depositAmount: {
    label: lsi("admin", "reservation", "depositAmount"),
    output: false,
    input: { Component: Uu5Forms.FormNumber, props: { min: 1 } },
  },
  depositDueDate: {
    label: lsi("admin", "reservation", "depositDueDate"),
    output: false,
    input: { Component: Uu5Forms.FormDate },
  },
  depositPaidDate: {
    label: lsi("admin", "reservation", "depositPaidDate"),
    output: false,
    input: { Component: Uu5Forms.FormDate, props: { info: lsi("admin", "reservation", "paidDateInfo") } },
  },
  balanceDueDate: {
    label: lsi("admin", "reservation", "balanceDueDate"),
    output: false,
    input: { Component: Uu5Forms.FormDate, props: { info: lsi("admin", "reservation", "balanceDueDateInfo") } },
  },
  balancePaidDate: {
    label: lsi("admin", "reservation", "balancePaidDate"),
    output: false,
    input: { Component: Uu5Forms.FormDate, props: { info: lsi("admin", "reservation", "paidDateInfo") } },
  },
};

/**
 * Pole formuláře úpravy / nové rezervace. Co se ukáže, záleží na rezervaci:
 *  - platby (záloha, splatnosti) až po přijetí -- před ním server plán nemá;
 *  - data zaplacení jen u už zaplacené platby (oprava data; označit se dá jen akcí);
 *  - „Poslat hostovi e-mail o změně“ a zprávu jen u přijaté rezervace s hostem;
 *  - u nové rezervace „Vytvořit jako potvrzenou“ a e-mail.
 */
export function formInputs({ operation, data, generateInputs, languageList }) {
  const isCreate = operation === "create";
  // Bez kontaktu = blokace termínu, i bez vyplněného důvodu (server ho nevyžaduje a kontakt
  // dodatečně přidat nedovolí).
  const isBlock = Boolean(data) && !data.contactName && !data.contactEmail && !data.contactPhone;
  const hasPlan = data?.depositAmount != null;
  const order = [
    "dateFrom", "dateTo", "guestCount", "totalPrice",
    ...(isBlock ? [] : ["contactName", "contactEmail", "contactPhone"]),
    ...(isCreate || isBlock ? ["reason"] : []),
    "note", "desc",
    ...(hasPlan ? ["depositAmount", "depositDueDate"] : []),
    ...(hasPlan && data.depositPaidDate ? ["depositPaidDate"] : []),
    ...(hasPlan ? ["balanceDueDate"] : []),
    ...(hasPlan && data.balancePaidDate ? ["balancePaidDate"] : []),
  ];
  const inputs = generateInputs(fieldCfg, { operation, orderList: order });

  const guestEmail = !isBlock && (isCreate || ["awaitingDeposit", "confirmed"].includes(data?.state));
  return [
    ...inputs,
    isCreate && (
      <Uu5Forms.FormCheckbox
        key="asConfirmed"
        name="asConfirmed"
        initialValue
        label={lsi("admin", "reservation", "asConfirmed")}
        info={lsi("admin", "reservation", "asConfirmedInfo")}
      />
    ),
    guestEmail && (
      <Uu5Forms.FormCheckbox
        key="sendEmail"
        name="sendEmail"
        initialValue
        label={lsi("admin", "reservation", isCreate ? "sendEmail" : "sendEmailChange")}
      />
    ),
    // Náhled toho, co uložení hostovi pošle (stejné pravidlo jako v modálu změny stavu).
    guestEmail && <FormEmailPreview key="emailPreview" name="emailPreview" operation={isCreate ? "create" : "update"} data={data} />,
    guestEmail && (
      <Uu5Forms.FormSelect
        key="lang"
        name="lang"
        label={lsi("admin", "reservation", "lang")}
        itemList={languageItemList(languageList)}
        initialValue={data?.lang ?? "cs"}
      />
    ),
    guestEmail && (
      <Uu5Forms.FormTextArea
        key="message"
        name="message"
        label={lsi("admin", "reservation", "message")}
        info={lsi("admin", "reservation", "messageInfo")}
        rows={2}
        maxLength={2000}
      />
    ),
  ].filter(Boolean);
}

// Dvojice, které se na širším displeji vejdou vedle sebe (krátká pole). Na telefonu je
// všechno pod sebou. Podrobný layout formulářů se doladí (docs/wip.md).
const FORM_PAIR_LIST = [
  ["dateFrom", "dateTo"],
  ["guestCount", "totalPrice"],
  ["contactEmail", "contactPhone"],
  ["depositAmount", "depositDueDate"],
  ["balanceDueDate", "balancePaidDate"],
  ["asConfirmed", "sendEmail"],
];

/** `gridLayout` pro `Form.View` z názvů polí, která formulář opravdu má. */
function formGridLayout(nameList) {
  const rowList = [];
  for (let i = 0; i < nameList.length; i++) {
    const name = nameList[i];
    const pair = FORM_PAIR_LIST.find(([first]) => first === name);
    if (pair && nameList[i + 1] === pair[1]) {
      rowList.push(`${pair[0]} ${pair[1]}`);
      i++;
    } else {
      rowList.push(`${name} ${name}`);
    }
  }
  return { xs: nameList.join(", "), s: rowList.join(", ") };
}

/**
 * Formulář rezervace: pole z `formInputs` ve `Form.View` s mřížkou. Bez `gridLayout` dá
 * Form.View pole bez mezer těsně pod sebe (a `Crud` je do Form.View nebalí sám).
 */
export function ReservationFormView({ operation, data, languageList }) {
  const inputs = formInputs({ operation, data, generateInputs: UiElements.Crud.generateInputs, languageList });
  return <Uu5Forms.Form.View gridLayout={formGridLayout(inputs.map((input) => input.props.name))}>{inputs}</Uu5Forms.Form.View>;
}
