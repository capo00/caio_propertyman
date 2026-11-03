import { Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import { UiApp, UiElements } from "caio-ui";
import { lsi } from "../../../lsi/import-lsi.js";
import FormEmailPreview from "./form-email-preview.jsx";
import { DATE_RANGE_NAME } from "./date-range.js";
import { usePriceHint } from "./use-price-hint.js";

// Sdílená konfigurace rezervace pro seznam (sloupce `Crud.generate`) i formuláře (úprava
// a nová rezervace přes `Crud.generateInputs`). Detail a modál změny stavu berou odsud
// formátování a barvy stavů, ať je všude totéž.

export const SOURCE_LIST = ["web", "manual"];
// `reason`: údržba a vlastní pobyt jsou blokace termínu (bez kontaktu), `onBehalf` je rezervace
// hosta, kterou za něj zakládá vlastník, jako by přišla z webu (jen při založení; server ji
// úpravou nastavit nedovolí).
export const REASON_LIST = ["maintenance", "owner", "onBehalf"];
const BLOCK_REASON_LIST = ["maintenance", "owner"];

// Stav, ve kterém rezervace v zastoupení hosta vznikne (`initialState`). Výchozí je žádost jako z webu.
const INITIAL_STATE_LIST = ["requested", "awaitingDeposit", "confirmed"];

// Datumová pole formuláře rezervace -- všechna dostanou rozsah `dateRange`.
const DATE_FIELD_LIST = ["dateFrom", "dateTo", "depositDueDate", "depositPaidDate", "balanceDueDate", "balancePaidDate"];

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

/** ISO den posunutý o `years` let; 29. 2. do roku bez přestupného dne dá 1. 3. */
function shiftYears(iso, years) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year + years, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * `min` a `max` pro výběr data v adminu rezervací: dnes ± 1 rok (pražský den). Bez nich má
 * `FormDate` rozsah zhruba 1921–2131 a svislý kalendář uu5 se na telefonu otevřel kolem roku
 * 2130 (docs/decisions.md).
 *
 * Uložená data (`valueList`) mimo rozsah ho rozšíří: uu5g05-forms hodnotu mimo `min`/`max` hlásí
 * jako chybu (validace `min`/`max`, i hned po otevření), takže by úprava staré rezervace nešla
 * uložit, i když na datum nikdo nesáhl.
 */
export function dateRange(valueList = []) {
  const today = todayIso();
  let min = shiftYears(today, -1);
  let max = shiftYears(today, 1);
  for (const value of valueList) {
    if (!value) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

/** `fieldCfg` s přidanými propsy inputů (`{ <pole>: { <prop>: hodnota } }`), bez zásahu do originálu. */
function withInputProps(cfg, propsMap) {
  const result = { ...cfg };
  for (const [name, extra] of Object.entries(propsMap)) {
    const { input } = cfg[name];
    const props = typeof input.props === "function" ? (arg) => ({ ...input.props(arg), ...extra }) : { ...input.props, ...extra };
    result[name] = { ...cfg[name], input: { ...input, props } };
  }
  return result;
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
        <Uu5Elements.Link href={`reservation?id=${item.data.id}`}>
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
    // Vyplněný důvod a prázdný kontakt = blokace termínu (údržba, vlastní pobyt). „V zastoupení
    // hosta“ jen při založení -- blokaci na rezervaci hosta úprava nepřevede.
    input: {
      Component: Uu5Forms.FormSelect,
      props: ({ operation }) => ({ itemList: selectItemList("reason", operation === "create" ? REASON_LIST : BLOCK_REASON_LIST) }),
    },
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
 * Pole formuláře rezervace: nová (`createFormInputs`), nebo úprava (`updateFormInputs`).
 *
 * `value` je aktuální hodnota formuláře (`useFormApi`): podle ní se pole mění, když vlastník
 * přepne typ záznamu, stav nebo e-mail. Skryté pole z hodnoty formuláře zmizí (uu5g05-forms
 * `preserveValueOnUnmount` je ve výchozím stavu vypnuté), takže server nedostane obojí naráz.
 */
export function formInputs({ operation, data, generateInputs, languageList, value, priceHint }) {
  return operation === "create"
    ? createFormInputs({ generateInputs, languageList, value, priceHint })
    : updateFormInputs({ data, generateInputs, languageList });
}

// Jazyky e-mailů pro novou rezervaci. Úprava dostává `emailLanguageList` z `reservation/get`
// (server/email/send.js `emailLanguages()`), nová rezervace žádná data ze serveru nemá. Jazyky webu
// z caio.config.js jsou tentýž seznam: šablony hostovi jsou ve všech jazycích webu a hlídá to test
// (server/email/email.test.js, `emailLanguages()` = `Language.list`).
const CREATE_LANGUAGE_LIST = UiApp.AppConfig.languages;

// Pole, která jsou u rezervace v zastoupení hosta povinná (server ji kontroluje jako žádost z webu).
const ON_BEHALF_REQUIRED_LIST = ["guestCount", "contactName", "contactEmail", "contactPhone"];

/**
 * Nová rezervace (pořadí a řádky viz `CREATE_ROW_LIST`):
 *  - příjezd a odjezd jedním polem `dateRange`; na server jdou dál jako `dateFrom`/`dateTo`
 *    (date-range.js -- rozkládá je volání `createItem` v screens/reservations.jsx a náhled e-mailu);
 *  - „V zastoupení hosta“: výběr stavu místo „Vytvořit jako potvrzenou“, povinný kontakt a počet
 *    osob a bez zprávy hostovi u stavu „Čeká na schválení“ (e-mail o přijetí žádosti zprávu nemá);
 *  - náhled a zprávu hostovi jen se zaškrtnutým „Poslat hostovi e-mail“; jazyk e-mailů vždy;
 *  - v poli Cena jako placeholder cena, kterou server při prázdném poli dopočítá (`priceHint`).
 */
function createFormInputs({ generateInputs, languageList, value, priceHint }) {
  const onBehalf = value?.reason === "onBehalf";
  const initialState = value?.initialState ?? "requested";
  // Před prvním vykreslením checkboxu ve hodnotě formuláře ještě není; výchozí je zaškrtnutý.
  const sendEmail = value?.sendEmail !== false;
  const cfg = withInputProps(fieldCfg, {
    ...(onBehalf ? Object.fromEntries(ON_BEHALF_REQUIRED_LIST.map((name) => [name, { required: true }])) : null),
    // Cena, kterou server dopočítá, když pole zůstane prázdné (use-price-hint.js).
    totalPrice: { placeholder: priceHint },
  });
  const orderList = ["reason", "contactName", "guestCount", "contactEmail", "contactPhone", "note", "desc", "totalPrice"];
  const field = Object.fromEntries(generateInputs(cfg, { operation: "create", orderList }).map((input) => [input.props.name, input]));

  return [
    <Uu5Forms.FormDateRange
      key={DATE_RANGE_NAME}
      name={DATE_RANGE_NAME}
      label={lsi("admin", "reservation", "dateRange")}
      required
      {...dateRange()}
    />,
    field.reason,
    // Tři krátké vzájemně se vylučující volby vedle sebe: SwitchSelect (uuGDS forms, 2–4 hodnoty).
    onBehalf && (
      <Uu5Forms.FormSwitchSelect
        key="initialState"
        name="initialState"
        initialValue="requested"
        required
        label={lsi("admin", "reservation", "initialState")}
        info={lsi("admin", "reservation", "initialStateInfo")}
        itemList={selectItemList("initialState", INITIAL_STATE_LIST)}
      />
    ),
    field.contactName,
    field.guestCount,
    field.contactEmail,
    field.contactPhone,
    field.note,
    field.desc,
    field.totalPrice,
    // Jazyk vždy, i bez e-mailu: rezervace si ho uloží a chodí v něm i další e-maily.
    <Uu5Forms.FormSelect
      key="lang"
      name="lang"
      label={lsi("admin", "reservation", "lang")}
      itemList={languageItemList(languageList ?? CREATE_LANGUAGE_LIST)}
      initialValue="cs"
    />,
    !onBehalf && (
      <Uu5Forms.FormCheckbox
        key="asConfirmed"
        name="asConfirmed"
        initialValue
        label={lsi("admin", "reservation", "asConfirmed")}
        info={lsi("admin", "reservation", "asConfirmedInfo")}
      />
    ),
    <Uu5Forms.FormCheckbox key="sendEmail" name="sendEmail" initialValue label={lsi("admin", "reservation", "sendEmail")} />,
    // Náhled toho, co uložení hostovi pošle (stejné pravidlo jako v modálu změny stavu).
    sendEmail && <FormEmailPreview key="emailPreview" name="emailPreview" operation="create" />,
    sendEmail && !(onBehalf && initialState === "requested") && (
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

/**
 * Úprava rezervace. Co se ukáže, záleží na rezervaci:
 *  - platby (záloha, splatnosti) až po přijetí -- před ním server plán nemá;
 *  - data zaplacení jen u už zaplacené platby (oprava data; označit se dá jen akcí);
 *  - „Poslat hostovi e-mail o změně“ a zprávu jen u přijaté rezervace s hostem.
 */
function updateFormInputs({ data, generateInputs, languageList }) {
  // Bez kontaktu = blokace termínu, i bez vyplněného důvodu (server ho nevyžaduje a kontakt
  // dodatečně přidat nedovolí).
  const isBlock = Boolean(data) && !data.contactName && !data.contactEmail && !data.contactPhone;
  const hasPlan = data?.depositAmount != null;
  const order = [
    "dateFrom", "dateTo", "guestCount", "totalPrice",
    ...(isBlock ? [] : ["contactName", "contactEmail", "contactPhone"]),
    ...(isBlock ? ["reason"] : []),
    "note", "desc",
    ...(hasPlan ? ["depositAmount", "depositDueDate"] : []),
    ...(hasPlan && data.depositPaidDate ? ["depositPaidDate"] : []),
    ...(hasPlan ? ["balanceDueDate"] : []),
    ...(hasPlan && data.balancePaidDate ? ["balancePaidDate"] : []),
  ];
  const range = dateRange(DATE_FIELD_LIST.map((name) => data?.[name]));
  const cfg = withInputProps(fieldCfg, Object.fromEntries(DATE_FIELD_LIST.map((name) => [name, range])));
  const inputs = generateInputs(cfg, { operation: "update", orderList: order });

  const guestEmail = !isBlock && ["awaitingDeposit", "confirmed"].includes(data?.state);
  return [
    ...inputs,
    guestEmail && <Uu5Forms.FormCheckbox key="sendEmail" name="sendEmail" initialValue label={lsi("admin", "reservation", "sendEmailChange")} />,
    // Náhled toho, co uložení hostovi pošle (stejné pravidlo jako v modálu změny stavu).
    guestEmail && <FormEmailPreview key="emailPreview" name="emailPreview" operation="update" data={data} />,
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

/**
 * Řádky formuláře nové rezervace, když jsou pole vedle sebe (šířka obsahu od `s`, viz
 * `createGridLayout`). Pole, které formulář zrovna nemá, z řádku vypadne a zbylé pole dostane
 * celou šířku, takže po skrytém poli nezůstane díra. „Vytvořit jako potvrzenou“ (jen bez „V zastoupení
 * hosta“) je samostatný řádek před e-mailem: rozhoduje, který e-mail se pošle (a co ukáže náhled).
 */
const CREATE_ROW_LIST = [
  [DATE_RANGE_NAME, "reason"],
  ["initialState"],
  ["contactName", "guestCount"],
  ["contactEmail", "contactPhone"],
  ["note"],
  ["desc"],
  ["totalPrice", "lang"],
  ["asConfirmed"],
  ["sendEmail", "emailPreview"],
  ["message"],
];

/**
 * `gridLayout` nové rezervace z názvů polí, která formulář opravdu má. Na úzkém obsahu (`xs`,
 * telefon) všechno pod sebou v pořadí polí, od `s` řádky z `CREATE_ROW_LIST`.
 *
 * `s`, ne `m`: Form.View měří šířku obsahu modálu (Grid má `sizePolicy: "content"` a modál
 * obaluje obsah ContentSizeProviderem), ne obrazovky. Modál je 640 px široký, jeho obsah tedy na
 * počítači spadá do `s` a pravidlo pro `m` by se neuplatnilo nikde.
 */
function createGridLayout(nameList) {
  const present = new Set(nameList);
  const rowList = [];
  for (const row of CREATE_ROW_LIST) {
    const visible = row.filter((name) => present.has(name));
    if (!visible.length) continue;
    rowList.push(visible.length === 1 ? `${visible[0]} ${visible[0]}` : visible.join(" "));
  }
  return { xs: nameList.join(", "), s: rowList.join(", ") };
}

// Dvojice formuláře úpravy, které se na širším displeji vejdou vedle sebe (krátká pole). Na
// telefonu je všechno pod sebou.
const FORM_PAIR_LIST = [
  ["dateFrom", "dateTo"],
  ["guestCount", "totalPrice"],
  ["contactEmail", "contactPhone"],
  ["depositAmount", "depositDueDate"],
  ["balanceDueDate", "balancePaidDate"],
];

/** `gridLayout` formuláře úpravy z názvů polí, která formulář opravdu má. */
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
  const { value } = Uu5Forms.useFormApi();
  const priceHint = usePriceHint(operation === "create" ? value : null);
  const inputs = formInputs({ operation, data, generateInputs: UiElements.Crud.generateInputs, languageList, value, priceHint });
  const nameList = inputs.map((input) => input.props.name);
  const gridLayout = operation === "create" ? createGridLayout(nameList) : formGridLayout(nameList);
  return <Uu5Forms.Form.View gridLayout={gridLayout}>{inputs}</Uu5Forms.Form.View>;
}
