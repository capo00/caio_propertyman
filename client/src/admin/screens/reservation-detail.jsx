import { createVisualComponent, Lsi, useEffect, useRoute, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import UiElements from "caio-ui/src/caio-ui-elements";
import { lsi, ERROR_LSI } from "../../lsi/import-lsi.js";
import { getReservation } from "../calls.js";
import ReservationSummary from "../components/reservation/summary.jsx";
import ReservationHistory from "../components/reservation/history.jsx";
import TransitionModal from "../components/reservation/transition-modal.jsx";
import EditModal from "../components/reservation/edit-modal.jsx";
import InvoiceSection from "../components/invoice/invoice-section.jsx";
import { ACTION_META, StateTag, DateValue, actionLabelCode } from "../components/reservation/fields.jsx";

// Reservation detail as a route (`/admin/reservation?id=…`) -- this is where the reservation is managed
// in full: details, payments, editing, state changes and history including sent e-mails.
//
// The router cannot do a dynamic path segment (docs/decisions.md), hence the `id` query parameter.

const ReservationDetail = createVisualComponent({
  uu5Tag: Config.TAG + "AdminReservationDetail",

  render() {
    const [route, setRoute] = useRoute();
    const id = route?.params?.id;
    const [item, setItem] = useState();
    const [error, setError] = useState();
    const errorMessage = UiElements.useErrorMessage(ERROR_LSI);
    const [transition, setTransition] = useState(null);
    const [editing, setEditing] = useState(false);

    function load() {
      if (!id) return;
      getReservation(id)
        .then((data) => {
          setItem(data);
          setError(undefined);
        })
        .catch((e) => setError(e));
    }

    useEffect(load, [id]);

    const back = (
      <Uu5Elements.Button icon="uugds-chevron-left" significance="subdued" onClick={() => setRoute("reservations", item?.scope === "archive" ? { scope: "archive" } : undefined)}>
        <Lsi lsi={lsi("admin", "reservation", "backToList")} />
      </Uu5Elements.Button>
    );

    if (error || !id) {
      return (
        <>
          {back}
          <Uu5Elements.HighlightedBox colorScheme="negative" className={Config.Css.css({ marginTop: 16 })}>
            {error ? errorMessage(error) : <Lsi lsi={lsi("admin", "reservation", "notFound")} />}
          </Uu5Elements.HighlightedBox>
        </>
      );
    }
    if (!item) return <Uu5Elements.Pending size="xl" />;

    const imported = item.icalFeedCode != null;
    // Invoice only for a reservation with a guest -- neither an import nor a block has a customer (the server checks it too).
    const hasGuest = !imported && Boolean(item.contactName || item.contactEmail || item.contactPhone);
    const actionList = [
      ...(item.actionList ?? []).map((action) => ({
        icon: ACTION_META[action]?.icon,
        children: <Lsi lsi={lsi("admin", "action", actionLabelCode(action, item))} />,
        colorScheme: action === item.nextAction ? ACTION_META[action]?.colorScheme : undefined,
        significance: action === item.nextAction ? "highlighted" : undefined,
        // There is enough room in the detail -- all state actions are visible, a menu only when they do not fit.
        collapsed: "auto",
        onClick: () => setTransition(action),
      })),
      !imported && {
        icon: "uugds-pencil",
        children: <Lsi lsi={lsi("admin", "reservation", "edit")} />,
        collapsed: "auto",
        onClick: () => setEditing(true),
      },
    ].filter(Boolean);

    return (
      <>
        {back}
        <Uu5Elements.Block
          className={Config.Css.css({ marginTop: 12 })}
          header={
            <span className={Config.Css.css({ display: "inline-flex", gap: 12, alignItems: "center", flexWrap: "wrap" })}>
              {item.contactName ||
                item.contactEmail ||
                item.contactPhone ||
                (item.reason ? (
                  <Lsi lsi={lsi("admin", "reason", item.reason)} />
                ) : ["web", "manual"].includes(item.source) ? (
                  <Lsi lsi={lsi("admin", "source", item.source)} />
                ) : (
                  item.source
                ))}
              <span>
                <DateValue value={item.dateFrom} /> – <DateValue value={item.dateTo} />
              </span>
              <StateTag state={item.state} item={item} size="m" />
            </span>
          }
          headerType="heading"
          actionList={actionList}
          card="full"
        >
          <ReservationSummary item={item} showState={false} />
        </Uu5Elements.Block>

        {hasGuest && <InvoiceSection reservationId={item.id} />}

        <Uu5Elements.Block
          className={Config.Css.css({ marginTop: 16 })}
          header={<Lsi lsi={lsi("admin", "section", "history")} />}
          headerType="title"
          card="full"
        >
          <ReservationHistory eventList={item.eventList} source={item.source} />
        </Uu5Elements.Block>

        {transition && <TransitionModal id={item.id} action={transition} onClose={() => setTransition(null)} onDone={load} />}
        {editing && <EditModal item={item} onClose={() => setEditing(false)} onSaved={load} />}
      </>
    );
  },
});

export default ReservationDetail;
