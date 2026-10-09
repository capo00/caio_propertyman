import { createVisualComponent, Lsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../../config/config.js";
import { lsi } from "../../../lsi/import-lsi.js";
import { DateValue, Price, stateLabelCode } from "./fields.jsx";

// Historie rezervace z `eventList`: kdo, kdy, co udělal, co napsal hostovi a které e-maily
// odešly -- i s textem, přesně jak odešel (docs/proposal-reservation-flow.md § 2.1).
//
// Řádek události (majitel 2026-10-09): „9. 10. 2026 23:18 **Vytvořeno** · systém / host“.
// E-mail se rozbaluje šipkou do CollapsibleBox.

const css = {
  list: () => Config.Css.css({ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }),
  item: () => Config.Css.css({ borderLeft: "2px solid currentColor", paddingLeft: 12, opacity: 0.95 }),
  meta: () => Config.Css.css({ display: "flex", flexWrap: "wrap", columnGap: 8, rowGap: 2, alignItems: "baseline" }),
  text: () => Config.Css.css({ whiteSpace: "pre-wrap", margin: "6px 0 0", fontSize: 13, overflowWrap: "anywhere" }),
};

const STATUS_COLOR = { sent: "positive", failed: "negative", skipped: "building" };

function EmailRecord({ email }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Uu5Elements.Link onClick={() => setOpen((value) => !value)} colorScheme="building">
        <Uu5Elements.Icon icon={open ? "uugds-chevron-down" : "uugds-chevron-right"} />{" "}
        <Lsi lsi={lsi("admin", "history", "email")} />: {email.subject ?? email.template}
      </Uu5Elements.Link>{" "}
      <Uu5Elements.Text colorScheme={STATUS_COLOR[email.status] ?? "building"} significance="common">
        (<Lsi lsi={lsi("admin", "history", "status", email.status)} />
        {email.error ? ` — ${email.error}` : null}
        {!email.error && email.reason && (
          <>
            {" — "}
            <Lsi lsi={lsi("admin", "history", "reason", email.reason)} />
          </>
        )}
        )
      </Uu5Elements.Text>
      <Uu5Elements.CollapsibleBox collapsed={!open}>
        {email.text && <pre className={css.text()}>{email.text}</pre>}
      </Uu5Elements.CollapsibleBox>
    </div>
  );
}

// Pole v historii (`changes[].field`, tvar dokumentu) → klíč popisku v `admin.reservation`
// (stejné popisky jako ve formuláři) a jak ukázat hodnotu.
const FIELD_LABEL = {
  "contact.name": "guest",
  "contact.email": "contactEmail",
  "contact.phone": "contactPhone",
  "payment.totalPrice": "totalPrice",
  "payment.deposit.amount": "depositAmount",
  "payment.deposit.dueDate": "depositDueDate",
  "payment.deposit.paidDate": "depositPaidDate",
  "payment.balance.dueDate": "balanceDueDate",
  "payment.balance.paidDate": "balancePaidDate",
};
const PRICE_FIELDS = new Set(["payment.totalPrice", "payment.deposit.amount"]);

function ChangeValue({ field, value }) {
  if (value == null || value === "") return "—";
  if (PRICE_FIELDS.has(field)) return <Price value={value} />;
  if (field === "reason") return <Lsi lsi={lsi("admin", "reason", value)} />;
  if (field === "lang") return <Lsi lsi={lsi("admin", "lang", value)} />;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return <DateValue value={value} />;
  return String(value);
}

function Change({ change }) {
  const labelKey = FIELD_LABEL[change.field] ?? change.field;
  return (
    <li>
      <Lsi lsi={lsi("admin", "reservation", labelKey)} />: <ChangeValue field={change.field} value={change.from} /> →{" "}
      <ChangeValue field={change.field} value={change.to} />
    </li>
  );
}

/** Kdo událost udělal: jméno přihlášeného, jinak host (žádost z webu) nebo systém. */
function Actor({ event, source }) {
  if (event.by?.name) return event.by.name;
  const guest = event.type === "created" && source === "web";
  return <Lsi lsi={lsi("admin", "history", guest ? "guest" : "system")} />;
}

const ReservationHistory = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationHistory",

  /** @param source  zdroj rezervace -- „Vytvořeno“ žádosti z webu udělal host, ne systém. */
  render({ eventList = [], source }) {
    if (!eventList.length) {
      return (
        <Uu5Elements.Text colorScheme="building" significance="subdued">
          <Lsi lsi={lsi("admin", "history", "noEvents")} />
        </Uu5Elements.Text>
      );
    }

    // Nejnovější nahoře -- to vlastníka zajímá.
    const list = [...eventList].reverse();
    return (
      <ul className={css.list()}>
        {list.map((event, i) => (
          <li key={`${event.at}-${i}`} className={css.item()}>
            <div className={css.meta()}>
              <Uu5Elements.Text colorScheme="building" significance="subdued">
                {/* Časy jsou UTC; vlastník je čte v pražském čase. */}
                <Uu5Elements.DateTime value={event.at} dateFormat="medium" timeFormat="short" timeZone="Europe/Prague" />
              </Uu5Elements.Text>
              <strong>
                {event.action ? (
                  // Název akce v době přechodu (server zapisuje `fullPayment`), ne podle dnešního plánu.
                  <Lsi lsi={lsi("admin", "action", event.fullPayment ? "markFullPaid" : event.action)} />
                ) : (
                  <Lsi lsi={lsi("admin", "history", event.type)} />
                )}
              </strong>
              {event.to && event.type === "transition" && (
                <Uu5Elements.Text colorScheme="building" significance="subdued">
                  → <Lsi lsi={lsi("admin", "state", stateLabelCode(event.to, null, Boolean(event.fullPayment)))} />
                </Uu5Elements.Text>
              )}
              <Uu5Elements.Text colorScheme="building" significance="subdued">
                · <Actor event={event} source={source} />
              </Uu5Elements.Text>
            </div>
            {event.changes?.length > 0 && (
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {event.changes.map((change, j) => (
                  <Change key={j} change={change} />
                ))}
              </ul>
            )}
            {event.message && <p className={css.text()}>„{event.message}“</p>}
            {(event.emailList ?? []).map((email, j) => (
              <EmailRecord key={j} email={email} />
            ))}
          </li>
        ))}
      </ul>
    );
  },
});

export default ReservationHistory;
