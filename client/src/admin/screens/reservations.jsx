import { createVisualComponent, useMemo, useState, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../config/config.js";
import { lsi } from "../../lsi/import-lsi.js";
import { reservationCalls, setReservationState } from "../calls.js";

const STATE_LIST = ["pending", "confirmed", "cancelled", "completed"];
const SOURCE_LIST = ["web", "manual"];
const REASON_LIST = ["maintenance", "owner"];

// Barva stavu nese informaci, ne dekoraci: čeká na mě (warning) / je hotovo (positive) /
// je pryč (negative). Schémata jsou z GDS, žádná vlastní paleta.
const STATE_COLOR = {
  pending: "warning",
  confirmed: "positive",
  cancelled: "negative",
  completed: "building",
};

const [ReservationProvider] = UiElements.CrudContext.create("reservation");

function selectItemList(group, codeList, { empty } = {}) {
  const itemList = codeList.map((code) => ({ value: code, children: <Lsi lsi={lsi("admin", group, code)} /> }));
  return empty ? [{ value: "", children: <Lsi lsi={lsi("admin", "filter", "all")} /> }, ...itemList] : itemList;
}

function formatDate(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

/**
 * Sloupce a formulářová pole v jedné deklaraci -- `Crud.generate` z ní udělá tabulku
 * a `Crud.generateInputs` modál.
 *
 * Kontakt je PLOCHÝ (`contactName`, ...), i když v databázi je `contact` vnořený objekt:
 * formulářový modál pracuje s klíči první úrovně, takže vnořený objekt by se nepředvyplnil.
 * Převod dělá server na hranici API (design-v2.md § 6).
 */
const fieldCfg = {
  dateFrom: {
    label: lsi("admin", "reservation", "dateFrom"),
    sort: true,
    columnProps: { width: 110 },
    output: (value) => formatDate(value),
    input: { Component: Uu5Forms.FormDate, props: { required: true } },
  },
  dateTo: {
    label: lsi("admin", "reservation", "dateTo"),
    sort: true,
    columnProps: { width: 110 },
    output: (value) => formatDate(value),
    input: { Component: Uu5Forms.FormDate, props: { required: true } },
  },
  nights: {
    label: lsi("admin", "reservation", "nights"),
    sort: true,
    columnProps: { horizontalAlignment: "right", width: 70 },
  },
  guestCount: {
    label: lsi("admin", "reservation", "guestCount"),
    // Ve výchozím pohledu skryté: devět sloupců se na běžnou šířku nevejde a tabulka se
    // pak láme po písmenech. Zapíná se přepínačem sloupců v hlavičce.
    visible: false,
    columnProps: { horizontalAlignment: "right", width: 80 },
    input: { Component: Uu5Forms.FormNumber, props: { min: 1, max: 20 } },
  },
  totalPrice: {
    label: lsi("admin", "reservation", "totalPrice"),
    sort: true,
    columnProps: { horizontalAlignment: "right", width: 110 },
    output: (value) =>
      value == null ? null : <Uu5Elements.Number value={value} currency="CZK" currencyFormat="symbol" maxDecimalDigits={0} />,
    // Cena se u ruční rezervace dá zadat rovnou. Když se nechá prázdná, spočítá ji server
    // z ceníku -- ale jen pokud je ceník schválený, jinak by v produkci vrátil 503.
    input: { Component: Uu5Forms.FormNumber, props: { min: 0 } },
  },
  state: {
    label: lsi("admin", "reservation", "state"),
    sort: true,
    columnProps: { width: 180 },
    // Stav se z formuláře needituje: mění ho `reservation/setState`, které podle změny
    // pošle hostovi e-mail. Kdyby šel přepsat v modálu, host by se nic nedozvěděl.
    output: (value) => (
      <Uu5Elements.Tag colorScheme={STATE_COLOR[value] ?? "building"} significance="highlighted" size="s">
        <Lsi lsi={lsi("admin", "state", value)} />
      </Uu5Elements.Tag>
    ),
  },
  source: {
    label: lsi("admin", "reservation", "source"),
    sort: true,
    columnProps: { width: 100 },
    // Zdroj není ve výčtu jen web/manual: importované záznamy nesou kód svého feedu.
    output: (value) => (SOURCE_LIST.includes(value) ? <Lsi lsi={lsi("admin", "source", value)} /> : value),
  },
  contactName: {
    label: lsi("admin", "reservation", "contactName"),
    sort: true,
    columnProps: { width: 180 },
    input: { Component: Uu5Forms.FormText, props: { maxLength: 200 } },
  },
  contactEmail: {
    label: lsi("admin", "reservation", "contactEmail"),
    visible: false,
    input: { Component: Uu5Forms.FormText, props: { maxLength: 320 } },
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
    input: { Component: Uu5Forms.FormTextArea, props: { maxLength: 2000, rows: 3 } },
  },
};

const INPUT_ORDER = [
  "dateFrom", "dateTo", "guestCount", "totalPrice",
  "contactName", "contactEmail", "contactPhone", "reason", "note",
];

const { seriesList, columnList, sorterList } = UiElements.Crud.generate(fieldCfg);

const Reservations = createVisualComponent({
  uu5Tag: Config.TAG + "AdminReservations",

  render() {
    // Filtr se posílá na SERVER (dtoIn), ne do klientského filtru tabulky: ten by filtroval
    // jen načtenou stránku, takže by při víc než jedné stránce lhal.
    //
    // Klíče musí být pořád stejné, jen s prázdnou hodnotou -- `CrudProvider` dává
    // `Object.values(dtoIn)` do závislostí efektu a měnící se počet klíčů by React shodil.
    const [filter, setFilter] = useState({ state: "", source: "" });
    const dtoIn = useMemo(() => ({ state: filter.state, source: filter.source }), [filter.state, filter.source]);
    const { addAlert } = Uu5Elements.useAlertBus();

    return (
      <ReservationProvider calls={reservationCalls} dtoIn={dtoIn} pageSize={50}>
        {(dataList) => (
          <>
            <Uu5Elements.Grid
              templateColumns={{ xs: "1fr", s: "240px 240px" }}
              className={Config.Css.css({ marginBlockEnd: 16 })}
            >
              <Uu5Forms.Select
                label={<Lsi lsi={lsi("admin", "filter", "state")} />}
                value={filter.state}
                itemList={selectItemList("state", STATE_LIST, { empty: true })}
                onChange={(e) => setFilter((f) => ({ ...f, state: e.data.value ?? "" }))}
              />
              <Uu5Forms.Select
                label={<Lsi lsi={lsi("admin", "filter", "source")} />}
                value={filter.source}
                itemList={selectItemList("source", SOURCE_LIST, { empty: true })}
                onChange={(e) => setFilter((f) => ({ ...f, source: e.data.value ?? "" }))}
              />
            </Uu5Elements.Grid>

            <UiElements.Crud
              header={<Lsi lsi={lsi("admin", "reservation", "heading")} />}
              dataList={dataList}
              seriesList={seriesList}
              columnList={columnList}
              sorterDefinitionList={sorterList}
              getItemActionList={({ data }) => {
                const item = data?.data;
                // Virtualizovaná tabulka volá tohle i pro řádky, které se teprve načítají --
                // ty ještě `data` nemají (`uu5tilesg02` si drží placeholdery).
                if (!item) return [];
                // Importovaný záznam patří feedu: příští sync by změnu přepsal, takže se
                // jeho stav odsud měnit nedá (server to odmítne taky).
                if (item.icalFeedCode != null) return [];

                return STATE_LIST.filter((state) => state !== item.state && state !== "completed").map((state) => ({
                  icon: state === "confirmed" ? "uugds-check" : state === "cancelled" ? "uugds-close" : "uugds-alert",
                  children: <Lsi lsi={lsi("admin", "setState", state)} />,
                  onClick: async () => {
                    try {
                      await setReservationState(item.id, state);
                      // Reload celého seznamu, ne lokální úprava řádku: stav mění i cenu
                      // v exportu a chceme vidět, co je opravdu v databázi.
                      await dataList.handlerMap.load(dtoIn);
                    } catch (e) {
                      addAlert({ message: e.message, priority: "error" });
                    }
                  },
                }));
              }}
            >
              {({ type }) => UiElements.Crud.generateInputs(fieldCfg, { operation: type, orderList: INPUT_ORDER })}
            </UiElements.Crud>
          </>
        )}
      </ReservationProvider>
    );
  },
});

export default Reservations;
