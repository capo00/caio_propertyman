import { createVisualComponent, Lsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../config/config.js";
import { lsi } from "../../lsi/import-lsi.js";
import { icalFeedCalls, syncIcalFeed } from "../calls.js";

const STATE_LIST = ["active", "inactive"];

const [IcalFeedProvider] = UiElements.CrudContext.create("icalFeed");

const stateItemList = STATE_LIST.map((code) => ({
  value: code,
  children: <Lsi lsi={lsi("admin", "feedState", code)} />,
}));

function formatDateTime(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("cs-CZ");
}

const fieldCfg = {
  name: {
    label: lsi("admin", "icalFeed", "name"),
    sort: true,
    columnProps: { width: 180 },
    input: { Component: Uu5Forms.FormText, props: { required: true, maxLength: 100 } },
  },
  code: {
    label: lsi("admin", "icalFeed", "code"),
    sort: true,
    columnProps: { width: 110 },
    // Kód se zadává jen při zakládání: je to spojovací klíč na `reservation.icalFeedCode`
    // a jeho změnou by osiřely všechny dosud naimportované záznamy toho feedu.
    input: {
      Component: Uu5Forms.FormText,
      props: ({ operation }) => ({
        required: operation === "create",
        readOnly: operation === "update",
        pattern: "^[a-z0-9][a-z0-9-]{1,19}$",
        maxLength: 20,
      }),
    },
  },
  url: {
    label: lsi("admin", "icalFeed", "url"),
    columnProps: { width: 280 },
    output: (value) => (
      <Uu5Elements.Link href={value} target="_blank" colorScheme="primary" underline="onHover">
        {value?.length > 60 ? `${value.slice(0, 60)}…` : value}
      </Uu5Elements.Link>
    ),
    input: { Component: Uu5Forms.FormText, props: { required: true, maxLength: 2000 } },
  },
  state: {
    label: lsi("admin", "icalFeed", "state"),
    sort: true,
    columnProps: { width: 110 },
    output: (value) => (
      <Uu5Elements.Tag colorScheme={value === "active" ? "positive" : "building"} significance="highlighted" size="s">
        <Lsi lsi={lsi("admin", "feedState", value)} />
      </Uu5Elements.Tag>
    ),
    input: { Component: Uu5Forms.FormSelect, props: { required: true, itemList: stateItemList } },
  },
  // Poslední běh importu. Jediné, co o synchronizaci vlastník uvidí -- proto i chyba,
  // ne jen počet.
  lastSync: {
    label: lsi("admin", "icalFeed", "lastSync"),
    columnProps: { width: 260 },
    output: (value) =>
      !value ? (
        <Lsi lsi={lsi("admin", "icalFeed", "neverSynced")} />
      ) : (
        <Uu5Elements.Tag
          colorScheme={value.state === "ok" ? "positive" : "negative"}
          significance="subdued"
          size="s"
          icon={value.state === "ok" ? "uugds-check" : "uugds-alert"}
        >
          {`${formatDateTime(value.at)} · ${value.state === "ok" ? `${value.importedCount}×` : value.message}`}
        </Uu5Elements.Tag>
      ),
  },
};

const INPUT_ORDER = ["name", "code", "url", "state"];
const { seriesList, columnList, sorterList } = UiElements.Crud.generate(fieldCfg);

const IcalFeeds = createVisualComponent({
  uu5Tag: Config.TAG + "AdminIcalFeeds",

  render() {
    const { addAlert } = Uu5Elements.useAlertBus();
    const [pending, setPending] = useState(false);

    return (
      <IcalFeedProvider calls={icalFeedCalls} pageSize={50}>
        {(dataList) => {
          async function sync(code) {
            setPending(true);
            try {
              const { feedList, skipped } = await syncIcalFeed(code);
              // Výsledek se hlásí per feed: chyba jednoho feedu neshodí import druhého,
              // takže „proběhlo“ bez detailu by zakrývalo, že jeden z nich selhal.
              if (skipped) {
                addAlert({ message: <Lsi lsi={lsi("admin", "icalFeed", "syncSkipped")} />, priority: "warning" });
              } else {
                for (const feed of feedList) {
                  addAlert({
                    header: feed.name,
                    message:
                      feed.state === "ok"
                        ? `+${feed.created} / ~${feed.updated} / −${feed.deleted}`
                        : feed.message,
                    priority: feed.state === "ok" ? "success" : "error",
                    durationMs: feed.state === "ok" ? 4000 : null,
                  });
                }
              }
              await dataList.handlerMap.load();
            } catch (e) {
              addAlert({ message: e.message, priority: "error" });
            } finally {
              setPending(false);
            }
          }

          return (
            <>
              {/* Mazání feedu bere s sebou i obsazenost, kterou naimportoval -- jinak by
                  zůstaly trvale obsazené termíny bez zdroje (design-v2.md § 8). Je to
                  nevratné, takže to musí být vidět dřív než v potvrzovacím dialogu. */}
              <Uu5Elements.HighlightedBox
                colorScheme="warning"
                icon="uugds-alert"
                className={Config.Css.css({ marginBlockEnd: 16 })}
              >
                <Lsi lsi={lsi("admin", "icalFeed", "deleteWarning")} />
              </Uu5Elements.HighlightedBox>

              <UiElements.Crud
                header={<Lsi lsi={lsi("admin", "icalFeed", "heading")} />}
                dataList={dataList}
                seriesList={seriesList}
                columnList={columnList}
                sorterDefinitionList={sorterList}
                actionList={[
                  {
                    icon: "uugds-refresh",
                    children: <Lsi lsi={lsi("admin", "icalFeed", "syncAll")} />,
                    disabled: pending,
                    onClick: () => sync(),
                  },
                ]}
                getItemActionList={({ data }) =>
                  // Řádek, který se teprve načítá, `data` nemá (virtualizace v uu5tilesg02).
                  !data?.data
                    ? []
                    : [
                        {
                          icon: "uugds-refresh",
                          children: <Lsi lsi={lsi("admin", "icalFeed", "sync")} />,
                          disabled: pending,
                          onClick: () => sync(data.data.code),
                        },
                      ]
                }
              >
                {({ type }) => UiElements.Crud.generateInputs(fieldCfg, { operation: type, orderList: INPUT_ORDER })}
              </UiElements.Crud>
            </>
          );
        }}
      </IcalFeedProvider>
    );
  },
});

export default IcalFeeds;
