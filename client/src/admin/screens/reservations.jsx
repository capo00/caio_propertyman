import { createVisualComponent, useEffect, useMemo, useState, useRoute, useLsi, Lsi } from "uu5g05";
import UiElements from "caio-ui/src/caio-ui-elements";
import Config from "../../config/config.js";
import importLsi, { lsi } from "../../lsi/import-lsi.js";
import { reservationCalls, icalFeedCalls } from "../calls.js";
import { fieldCfg, ReservationFormView, ACTION_META, SOURCE_LIST, actionLabelCode } from "../components/reservation/fields.jsx";
import TransitionModal from "../components/reservation/transition-modal.jsx";

// Seznam rezervací (docs/proposal-reservation-flow.md § 6), rozdělený na Aktivní a Archiv
// (rozhodnutí majitele 2026-10-09). Co patří kam, říká server (`scope`, viz
// server/reservation/scope.js); archiv je po letech a rok je v něm povinný.
//
// - Klik na řádek (na mobilu na dlaždici) otevře detail, jméno hosta je k tomu odkaz.
// - „Další krok“ (Přijmout / Záloha přijata / Doplatek přijat / Ukončit pobyt) je tlačítko
//   přímo v řádku (`collapsed: "never"`), ostatní povolené akce v menu „⋮“. Každá otevře
//   modál změny stavu -- nic se neprovádí jedním klikem bez náhledu e-mailu.
// - Které akce smí, říká server (`actionList`, `nextAction`); klient tabulku přechodů nemá.
// - Filtry jsou ve FilterBaru a filtruje server (`Crud.useFilter`): klientský filtr by viděl
//   jen načtenou stránku.

const [ReservationProvider] = UiElements.CrudContext.create("reservation");

const { seriesList, columnList, sorterList } = UiElements.Crud.generate(fieldCfg);

const SCOPE_LIST = ["active", "archive"];

// Archiv: rezervace hosta v konečném stavu, k tomu proběhlé blokace a importy (ty zůstávají
// `confirmed`, akce stavu nemají).
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
    // Ve filtru jeden stav pro obojí: čeká na zálohu i na platbu celé částky.
    children: <Lsi lsi={lsi("admin", group, group === "state" && code === "awaitingDeposit" ? "awaitingAny" : code)} />,
  }));
}

/** Definice filtrů FilterBaru. Hodnoty jdou na server (`dtoIn`), na klientu se nefiltruje. */
function filterDefinitionList(scope, feedList) {
  return [
    scope === "archive" && {
      key: "year",
      label: lsi("admin", "filter", "year"),
      inputType: "year",
      // Povinný a s výchozím letoškem: archiv bez roku by vracel všechno, co kdy proběhlo.
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
      // Importy nesou kód svého feedu (booking, …), ne „web“ / „ručně“.
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

  /** @param onScopeChange  přepnutí záložky (záložky jsou v hlavičce bloku Crud, `Block` `tabList`) */
  render({ scope, feedList, onScopeChange }) {
    const [, setRoute] = useRoute();
    // Popisky akcí jako řetězce: ActionGroup dává tooltip jen z řetězce, a když tlačítko
    // v úzkém řádku zúží na ikonu, bez tooltipu by „Přijmout“ a „Záloha přijata“ nešly poznat.
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
              {...filter.crudProps}
              header={<Lsi lsi={lsi("admin", "reservation", "heading")} />}
              // Aktivní / Archiv jako záložky bloku -- Crud zbylé props předá do `Uu5Elements.Block`.
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
                // Virtualizovaná tabulka volá tohle i pro řádky, které se teprve načítají --
                // ty ještě `data` nemají (`uu5tilesg02` si drží placeholdery).
                if (!item) return [];

                const stateActions = (item.actionList ?? []).map((action) => {
                  const next = action === item.nextAction;
                  return {
                    icon: ACTION_META[action]?.icon,
                    children: actionLsi?.[actionLabelCode(action, item)],
                    tooltip: actionLsi?.[actionLabelCode(action, item)],
                    colorScheme: next ? ACTION_META[action]?.colorScheme : undefined,
                    significance: next ? "highlighted" : undefined,
                    // Další krok v řádku, ostatní v menu.
                    collapsed: next ? "never" : "always",
                    onClick: () => setTransition({ id: item.id, action }),
                  };
                });

                return [
                  ...stateActions,
                  // Importovaný záznam patří feedu: příští sync by změnu přepsal (server ji
                  // odmítne taky), takže úprava ani mazání se nenabízejí.
                  item.icalFeedCode != null && { key: "update", hidden: true },
                  item.icalFeedCode != null && { key: "delete", hidden: true },
                  // Mazání rezervace s historií je výjimečný krok -- do menu, ať se na něj
                  // v úzkém řádku vedle „Přijmout“ neklikne omylem.
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
                // Reload celého seznamu, ne lokální úprava řádku: změna stavu může řádek
                // přesunout do archivu a chceme vidět, co je opravdu v databázi.
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
    // Rozsah je v URL (`?scope=archive`), ať „Zpět“ z detailu vrátí do stejné záložky.
    const scope = SCOPE_LIST.includes(route?.params?.scope) ? route.params.scope : "active";

    // Feedy jen kvůli popiskům ve filtru zdroje. Selhání nevadí -- filtr pak nabídne web / ručně.
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
        // Klíč podle rozsahu: filtry i data každé záložky začínají od nuly.
        key={scope}
        scope={scope}
        feedList={feedList}
        onScopeChange={(code) => setRoute("reservations", code === "active" ? undefined : { scope: code })}
      />
    );
  },
});

export default Reservations;
