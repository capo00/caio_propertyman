import { createVisualComponent, Lsi } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../config/config.js";
import { lsi } from "../../lsi/import-lsi.js";
import { reviewCalls } from "../calls.js";

const STATE_LIST = ["pending", "approved", "rejected"];

// Na webu se ukážou jen `approved` -- ostatní stavy jsou pracovní.
const STATE_COLOR = { pending: "warning", approved: "positive", rejected: "negative" };

const [ReviewProvider] = UiElements.CrudContext.create("review");

const stateItemList = STATE_LIST.map((code) => ({
  value: code,
  children: <Lsi lsi={lsi("admin", "reviewState", code)} />,
}));

const fieldCfg = {
  author: {
    label: lsi("admin", "review", "author"),
    sort: true,
    columnProps: { width: 170 },
    input: { Component: Uu5Forms.FormText, props: { required: true, maxLength: 200 } },
  },
  place: {
    label: lsi("admin", "review", "place"),
    input: { Component: Uu5Forms.FormText, props: { maxLength: 200 } },
  },
  rating: {
    label: lsi("admin", "review", "rating"),
    sort: true,
    columnProps: { horizontalAlignment: "right", width: 110 },
    output: (value) => (value ? "★".repeat(value) : null),
    input: { Component: Uu5Forms.FormNumber, props: { required: true, min: 1, max: 5, step: 1 } },
  },
  text: {
    label: lsi("admin", "review", "text"),
    columnProps: { width: 360 },
    input: { Component: Uu5Forms.FormTextArea, props: { required: true, maxLength: 4000, rows: 4 } },
  },
  date: {
    label: lsi("admin", "review", "date"),
    sort: true,
    columnProps: { width: 120 },
    input: { Component: Uu5Forms.FormDate },
  },
  state: {
    label: lsi("admin", "review", "state"),
    sort: true,
    columnProps: { width: 150 },
    output: (value) => (
      <Uu5Elements.Tag colorScheme={STATE_COLOR[value] ?? "building"} significance="highlighted" size="s">
        <Lsi lsi={lsi("admin", "reviewState", value)} />
      </Uu5Elements.Tag>
    ),
    input: { Component: Uu5Forms.FormSelect, props: { required: true, itemList: stateItemList } },
  },
  response: {
    label: lsi("admin", "review", "response"),
    visible: false,
    input: { Component: Uu5Forms.FormTextArea, props: { maxLength: 4000, rows: 3 } },
  },
  order: {
    label: lsi("admin", "review", "order"),
    sort: true,
    visible: false,
    columnProps: { horizontalAlignment: "right" },
    // Pořadí na webu. Když se nechá prázdné, dá server nové recenzi 1000, tedy na konec.
    input: { Component: Uu5Forms.FormNumber, props: { min: 0, step: 10 } },
  },
};

const INPUT_ORDER = ["author", "place", "rating", "date", "text", "response", "state", "order"];
const { seriesList, columnList, sorterList } = UiElements.Crud.generate(fieldCfg);

const Reviews = createVisualComponent({
  uu5Tag: Config.TAG + "AdminReviews",

  render() {
    return (
      <ReviewProvider calls={reviewCalls} pageSize={50}>
        {(dataList) => (
          <UiElements.Crud
            header={<Lsi lsi={lsi("admin", "review", "heading")} />}
            dataList={dataList}
            seriesList={seriesList}
            columnList={columnList}
            sorterDefinitionList={sorterList}
            initialSorterList={[{ key: "order", ascending: true }]}
          >
            {({ type }) => UiElements.Crud.generateInputs(fieldCfg, { operation: type, orderList: INPUT_ORDER })}
          </UiElements.Crud>
        )}
      </ReviewProvider>
    );
  },
});

export default Reviews;
