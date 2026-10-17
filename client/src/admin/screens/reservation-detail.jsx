import { createVisualComponent, Lsi, useEffect, useRoute, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../config/config.js";
import { lsi } from "../../lsi/import-lsi.js";
import { getReservation } from "../calls.js";
import ReservationSummary from "../components/reservation/summary.jsx";
import ReservationHistory from "../components/reservation/history.jsx";
import TransitionModal from "../components/reservation/transition-modal.jsx";
import EditModal from "../components/reservation/edit-modal.jsx";
import InvoiceSection from "../components/invoice/invoice-section.jsx";
import { ACTION_META, StateTag, DateValue, actionLabelCode } from "../components/reservation/fields.jsx";

// Detail rezervace jako routa (`/admin/reservation?id=…`) -- tady se rezervace spravuje celá:
// údaje, platby, úprava, změny stavu a historie včetně odeslaných e-mailů.
//
// Router neumí dynamický segment v cestě (docs/decisions.md), proto query parametr `id`.

const ReservationDetail = createVisualComponent({
  uu5Tag: Config.TAG + "AdminReservationDetail",

  render() {
    const [route, setRoute] = useRoute();
    const id = route?.params?.id;
    const [item, setItem] = useState();
    const [error, setError] = useState();
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
            {error?.message ?? <Lsi lsi={lsi("admin", "reservation", "notFound")} />}
          </Uu5Elements.HighlightedBox>
        </>
      );
    }
    if (!item) return <Uu5Elements.Pending size="xl" />;

    const imported = item.icalFeedCode != null;
    // Faktura jen k rezervaci s hostem -- import ani blokace zákazníka nemají (server to hlídá taky).
    const hasGuest = !imported && Boolean(item.contactName || item.contactEmail || item.contactPhone);
    const actionList = [
      ...(item.actionList ?? []).map((action) => ({
        icon: ACTION_META[action]?.icon,
        children: <Lsi lsi={lsi("admin", "action", actionLabelCode(action, item))} />,
        colorScheme: action === item.nextAction ? ACTION_META[action]?.colorScheme : undefined,
        significance: action === item.nextAction ? "highlighted" : undefined,
        // V detailu je místa dost -- všechny akce stavu jsou vidět, menu jen když se nevejdou.
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
