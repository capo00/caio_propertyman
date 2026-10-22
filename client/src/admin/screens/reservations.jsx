import { createVisualComponent, useEffect, useMemo, useState, useRoute, useLsi, Lsi } from "uu5g05";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../config/config.js";
import importLsi, { lsi, ERROR_LSI } from "../../lsi/import-lsi.js";
import { reservationCalls, icalFeedCalls } from "../calls.js";
import { fieldCfg, ReservationFormView, ACTION_META, SOURCE_LIST, actionLabelCode } from "../components/reservation/fields.jsx";
import TransitionModal from "../components/reservation/transition-modal.jsx";

// Reservation list (docs/proposal-reservation-flow.md § 6), split into Active and Archive
// (owner's decision 2026-10-09). What belongs where is decided by the server (`scope`, see
// server/reservation/scope.js); the archive is by year and the year is mandatory in it.
//
// - A click on a row (on mobile on a tile) opens the detail, the guest name is a link to it.
// - "Next step" (Accept / Deposit received / Balance received / Complete stay) is a button
//   right in the row (`collapsed: "never"`), other allowed actions in the "⋮" menu. Each opens
//   the state change modal -- nothing is done with a single click without an e-mail preview.
// - Which actions are allowed is decided by the server (`actionList`, `nextAction`); the client has no transition table.
// - Filters are in the FilterBar and the server filters (`Crud.useFilter`): a client filter would see
//   only the loaded page.

const [ReservationProvider] = UiElements.CrudContext.create("reservation");

const { seriesList, columnList, sorterList } = UiElements.Crud.generate(fieldCfg);

const SCOPE_LIST = ["active", "archive"];

// Archive: guest reservations in a final state, plus past blocks and imports (those stay
// `confirmed`, they have no state actions).
const SCOPE_STATE_LIST = {
  active: ["requested", "awaitingDeposit", "confirmed"],
  archive: ["completed", "cancelled", "rejected", "expired", "confirmed"],
};

function currentYear() {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague", year: "numeric" }).format(new Date()));
}

function itemList(group, codeList) {
  return codeList.map((code) => ({
    value: code,
    // One state in the filter for both: awaiting the deposit and awaiting payment of the full amount.
    children: <Lsi lsi={lsi("admin", group, group === "state" && code === "awaitingDeposit" ? "awaitingAny" : code)} />,
  }));
}

/** FilterBar filter definitions. Values go to the server (`dtoIn`), nothing is filtered on the client. */
function filterDefinitionList(scope, feedList) {
  return [
    scope === "archive" && {
      key: "year",
      label: lsi("admin", "filter", "year"),
      inputType: "year",
      // Mandatory and defaulting to this year: an archive without a year would return everything that ever happened.
      required: true,
      dtoIn: (year) => ({ year: String(year) }),
    },
    {
      key: "state",
      label: lsi("admin", "filter", "state"),
      inputType: "select",
      inputProps: { itemList: itemList("state", SCOPE_STATE_LIST[scope]), multiple: true },
      dtoIn: (value) => ({ stateList: [value].flat() }),
    },
    {
      key: "source",
      label: lsi("admin", "filter", "source"),
      inputType: "select",
      // Imports carry the code of their feed (booking, …), not "web" / "manual".
      inputProps: {
        itemList: [...itemList("source", SOURCE_LIST), ...feedList.map(({ code, name }) => ({ value: code, children: name || code }))],
      },
      dtoIn: (source) => ({ source }),
    },
    scope === "active" && {
      key: "arrival",
      label: lsi("admin", "filter", "arrival"),
      inputType: "date-range",
      dtoIn: ([from, to] = []) => ({ arrivalFrom: from || undefined, arrivalTo: to || undefined }),
    },
  ].filter(Boolean);
}

const ReservationList = createVisualComponent({
  uu5Tag: Config.TAG + "AdminReservationList",

  /** @param onScopeChange  tab switch (the tabs are in the header of the Crud block, `Block` `tabList`) */
  render({ scope, feedList, onScopeChange }) {
    const [, setRoute] = useRoute();
    // Action labels as strings: ActionGroup gives a tooltip only from a string, and when it narrows a button
    // to an icon in a narrow row, without a tooltip "Accept" and "Deposit received" could not be told apart.
    const actionLsi = useLsi(importLsi, ["admin", "action"]);
    const [transition, setTransition] = useState(null); // { id, action }

    const definitionList = useMemo(() => filterDefinitionList(scope, feedList), [scope, feedList]);
    const filter = UiElements.Crud.useFilter({
      filterDefinitionList: definitionList,
      initialFilterList: scope === "archive" ? [{ key: "year", value: currentYear() }] : [],
    });
    const dtoIn = useMemo(() => ({ scope, ...filter.dtoIn }), [scope, filter.dtoIn]);

    return (
      <ReservationProvider calls={reservationCalls} dtoIn={dtoIn} pageSize={50}>
        {(dataList) => (
          <>
            <UiElements.Crud
              lsiError={ERROR_LSI}
              {...filter.crudProps}
              header={<Lsi lsi={lsi("admin", "reservation", "heading")} />}
              // Active / Archive as block tabs -- Crud passes the remaining props to `Uu5Elements.Block`.
              tabList={SCOPE_LIST.map((code) => ({ code, label: <Lsi lsi={lsi("admin", "scope", code)} /> }))}
              tabCode={scope}
              onTabCodeChange={(e) => onScopeChange(e.data.tabCode)}
              dataList={dataList}
              seriesList={seriesList}
              columnList={columnList}
              sorterDefinitionList={sorterList}
              onItemClick={({ data }) => setRoute("reservation", { id: data.data.id })}
              getItemActionList={({ data }) => {
                const item = data?.data;
                // The virtualized table calls this also for rows that are still loading --
                // those have no `data` yet (`uu5tilesg02` keeps placeholders).
                if (!item) return [];

                const stateActions = (item.actionList ?? []).map((action) => {
                  const next = action === item.nextAction;
                  return {
                    icon: ACTION_META[action]?.icon,
                    children: actionLsi?.[actionLabelCode(action, item)],
                    tooltip: actionLsi?.[actionLabelCode(action, item)],
                    colorScheme: next ? ACTION_META[action]?.colorScheme : undefined,
                    significance: next ? "highlighted" : undefined,
                    // Next step in the row, others in the menu.
                    collapsed: next ? "never" : "always",
                    onClick: () => setTransition({ id: item.id, action }),
                  };
                });

                return [
                  ...stateActions,
                  // An imported record belongs to the feed: the next sync would overwrite a change (the server
                  // rejects it too), so neither editing nor deleting is offered.
                  item.icalFeedCode != null && { key: "update", hidden: true },
                  item.icalFeedCode != null && { key: "delete", hidden: true },
                  // Deleting a reservation with history is an exceptional step -- into the menu, so it is not
                  // clicked by mistake next to "Accept" in a narrow row.
                  { key: "delete", collapsed: "always" },
                ].filter(Boolean);
              }}
            >
              {({ type, data }) => <ReservationFormView operation={type} data={data} />}
            </UiElements.Crud>

            {transition && (
              <TransitionModal
                id={transition.id}
                action={transition.action}
                onClose={() => setTransition(null)}
                // Reload of the whole list, not a local row update: a state change can move the row
                // to the archive and we want to see what really is in the database.
                onDone={() => dataList.handlerMap.load(dtoIn)}
              />
            )}
          </>
        )}
      </ReservationProvider>
    );
  },
});

const Reservations = createVisualComponent({
  uu5Tag: Config.TAG + "AdminReservations",

  render() {
    const [route, setRoute] = useRoute();
    // The scope is in the URL (`?scope=archive`), so that "Back" from the detail returns to the same tab.
    const scope = SCOPE_LIST.includes(route?.params?.scope) ? route.params.scope : "active";

    // Feeds only for the labels in the source filter. A failure does not matter -- the filter then offers web / manual.
    const [feedList, setFeedList] = useState([]);
    useEffect(() => {
      let cancelled = false;
      icalFeedCalls
        .list({})
        .then((data) => !cancelled && setFeedList((data?.itemList ?? []).map(({ code, name }) => ({ code, name }))))
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, []);

    return (
      <ReservationList
        // Key by scope: filters and data of each tab start from scratch.
        key={scope}
        scope={scope}
        feedList={feedList}
        onScopeChange={(code) => setRoute("reservations", code === "active" ? undefined : { scope: code })}
      />
    );
  },
});

export default Reservations;
