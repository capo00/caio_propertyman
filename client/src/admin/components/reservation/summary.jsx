import { createVisualComponent, Lsi, useLanguage, useLsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../../config/config.js";
import importLsi, { lsi } from "../../../lsi/import-lsi.js";
import { DateValue, NumberValue, Price, StateTag, todayIso, dueOf } from "./fields.jsx";

// Souhrn rezervace -- schválená varianta A návrhu „Souhrn rezervace“ (majitel 2026-10-09):
//
//   pruh (stav, termín, nocí / osob / cena / zdroj)
//   upozornění na platbu, která je na řadě (po splatnosti / splatná dnes nebo zítra)
//   Platby (karty záloha + doplatek, „Uhrazeno X z Y“) a poznámka hosta | Kontakt
//   interní poznámka
//
// Na telefonu je všechno pod sebou, od šířky `m` platby vlevo a kontakt vpravo. V modálu se
// mřížka řídí šířkou modálu (jeho tělo zakládá ContentSizeProvider), v detailu šířkou okna.
// Sdílí ji modál změny stavu i detail -- vlastník vidí všude totéž.

const css = {
  // Víceřádkový text hosta / vlastníka: zalomení řádků zachovat, dlouhé slovo zalomit.
  note: () => Config.Css.css({ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }),
};

const DAY = 86_400_000;

// Konečné stavy: rezervace už nic nedluží, splatnost se nevyhodnocuje.
const FINAL_STATE_LIST = ["completed", "cancelled", "rejected", "expired"];

function addDaysIso(iso, days) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY);
}

/**
 * „1 den“ / „3 dny“ / „5 dní“. Admin nemá vlastní přepínač, ale jde za jazykem zvoleným na webu
 * (package.json `caio.languages`), takže ostatní jazyky dává `Intl` -- ten by česky psal „5 dnů“, proto
 * čeština zůstává ručně.
 */
function daysLabel(n, language) {
  if (language === "cs") return `${n} ${n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní"}`;
  return new Intl.NumberFormat(language, { style: "unit", unit: "day", unitDisplay: "long" }).format(n);
}

/**
 * Stav jedné platby pro kartu: zaplaceno / po splatnosti / splatné dnes / zítra / nezaplaceno.
 * Barva nikdy sama: vždy s ikonou a textem.
 */
function paymentStatus({ paidDate, dueDate }, today, final) {
  if (paidDate) return { code: "paid", colorScheme: "positive", icon: "uugds-check-circle" };
  // Zrušená / propadlá / ukončená rezervace už nic nedluží -- „po splatnosti“ by jen strašilo.
  if (final) return { code: "unpaid", colorScheme: "building", icon: undefined };
  if (dueDate && dueDate < today) return { code: "overdue", colorScheme: "negative", icon: "uugds-alert-circle" };
  if (dueDate === today) return { code: "dueToday", colorScheme: "warning", icon: "uugds-clock" };
  if (dueDate && dueDate === addDaysIso(today, 1)) return { code: "dueTomorrow", colorScheme: "warning", icon: "uugds-clock" };
  return { code: "unpaid", colorScheme: "building", icon: undefined };
}

function SectionTitle({ icon, title, aside }) {
  return (
    <Uu5Elements.Grid templateColumns="1fr auto" alignItems="center" columnGap={8}>
      <Uu5Elements.Text category="interface" segment="title" type="micro" colorScheme="building">
        <Uu5Elements.Icon icon={icon} /> <Lsi lsi={lsi("admin", "section", title)} />
      </Uu5Elements.Text>
      {aside && (
        <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building" significance="subdued">
          {aside}
        </Uu5Elements.Text>
      )}
    </Uu5Elements.Grid>
  );
}

// Velikost „xl“ (hodnota large, popisek medium): údaje pruhu se čtou na první pohled -- u „s“
// byly drobné (majitel 2026-10-09).
function Fact({ label, children }) {
  return <Uu5Elements.InfoItem direction="vertical-reverse" size="xl" title={children ?? "—"} subtitle={<Lsi lsi={label} />} />;
}

/** Pruh nahoře. V detailu je stav a termín v hlavičce bloku, tak tu jsou jen údaje. */
function Strip({ item, showState, isGuest }) {
  const r = (key) => lsi("admin", "reservation", key);
  const source = ["web", "manual"].includes(item.source) ? <Lsi lsi={lsi("admin", "source", item.source)} /> : item.source;
  return (
    <Uu5Elements.Tile significance="distinct" borderRadius="moderate">
      <Uu5Elements.Grid rowGap={12}>
        {showState && (
          <Uu5Elements.Grid rowGap={4} justifyItems="start">
            <StateTag state={item.state} item={item} />
            <Uu5Elements.Text category="interface" segment="title" type="minor">
              <DateValue value={item.dateFrom} /> – <DateValue value={item.dateTo} />
            </Uu5Elements.Text>
          </Uu5Elements.Grid>
        )}
        {!isGuest && (
          <div>
            <Uu5Elements.Tag colorScheme="building" significance="distinct" icon="uugds-calendar" size="s">
              <Lsi lsi={lsi("admin", "reservation", item.icalFeedCode != null ? "importTag" : "blockTag")} />
            </Uu5Elements.Tag>
          </div>
        )}
        <Uu5Elements.Grid templateColumns={{ xs: "repeat(2, minmax(0, 1fr))", m: "repeat(4, minmax(0, 1fr))" }} rowGap={8} columnGap={16}>
          <Fact label={r("nights")}>
            <NumberValue value={item.nights} />
          </Fact>
          {isGuest ? (
            <>
              <Fact label={r("guestCount")}>
                <NumberValue value={item.guestCount} />
              </Fact>
              <Fact label={r("totalPrice")}>{item.totalPrice != null ? <Price value={item.totalPrice} /> : null}</Fact>
            </>
          ) : (
            item.reason && <Fact label={lsi("admin", "reservation", "reasonShort")}><Lsi lsi={lsi("admin", "reason", item.reason)} /></Fact>
          )}
          <Fact label={r("source")}>{source}</Fact>
        </Uu5Elements.Grid>
      </Uu5Elements.Grid>
    </Uu5Elements.Tile>
  );
}

/** Upozornění jen na platbu, která je na řadě, a jen když hoří. */
function DueAlert({ item, today, paymentLsi }) {
  const [language] = useLanguage();
  const due = dueOf(item);
  if (!due) return null;
  const status = paymentStatus({ dueDate: due.date }, today);
  if (status.colorScheme !== "negative" && status.colorScheme !== "warning") return null;

  const fullPayment = item.balanceDueDate == null;
  const kind = due.kind === "deposit" ? (fullPayment ? "full" : "deposit") : "balance";
  const amount = due.kind === "deposit" ? item.depositAmount : item.balanceAmount;
  const when =
    status.code === "overdue"
      ? Utils.String.format(paymentLsi.alertOverdue, { days: daysLabel(daysBetween(due.date, today), language) })
      : paymentLsi[status.code === "dueToday" ? "alertToday" : "alertTomorrow"]?.[kind];

  return (
    <Uu5Elements.HighlightedBox colorScheme={status.colorScheme} icon={status.icon}>
      <strong>
        {paymentLsi.kind?.[kind]} <Price value={amount} /> {when}
      </strong>{" "}
      ({paymentLsi.dueOn} <DateValue value={due.date} />).
    </Uu5Elements.HighlightedBox>
  );
}

function PaymentCard({ label, amount, dueDate, paidDate, today, paymentLsi, wide, final }) {
  const status = paymentStatus({ paidDate, dueDate }, today, final);
  const dateText = paidDate ? (
    <>
      {paymentLsi.paidOn} <DateValue value={paidDate} />
    </>
  ) : dueDate ? (
    <>
      {paymentLsi.dueOn} <DateValue value={dueDate} />
    </>
  ) : null;
  return (
    <Uu5Elements.Grid.Item colSpan={wide ? 2 : undefined}>
      <Uu5Elements.Tile significance="common" borderRadius="moderate">
        <Uu5Elements.Grid rowGap={2} justifyItems="start">
          <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building" significance="subdued">
            {label}
          </Uu5Elements.Text>
          <Uu5Elements.Text category="interface" segment="title" type="minor">
            <Price value={amount} />
          </Uu5Elements.Text>
          {dateText && (
            <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building" significance="subdued">
              {dateText}
            </Uu5Elements.Text>
          )}
          <Uu5Elements.Tag colorScheme={status.colorScheme} significance="distinct" icon={status.icon} size="s">
            {paymentLsi.status?.[status.code]}
          </Uu5Elements.Tag>
        </Uu5Elements.Grid>
      </Uu5Elements.Tile>
    </Uu5Elements.Grid.Item>
  );
}

/**
 * Storno podle podmínek (server/reservation/cancellation.js): poplatek a kolik vrátit hostovi.
 * `done` = zapsané při stornu (u stornované rezervace), jinak náhled ke dnešku (modál Stornovat).
 */
export function CancellationInfo({ cancellation, done = false }) {
  if (!cancellation) return null;
  const c = (key) => lsi("admin", "cancellation", key);
  return (
    <Uu5Elements.HighlightedBox colorScheme={done ? "building" : "warning"} icon="uugds-info">
      <strong>
        <Lsi lsi={c("fee")} /> <NumberValue value={cancellation.percent} /> % · <Price value={cancellation.fee} />
      </strong>{" "}
      (<NumberValue value={cancellation.daysToArrival} /> <Lsi lsi={c("daysBefore")} />
      {done && (
        <>
          , <Lsi lsi={c("on")} /> <DateValue value={cancellation.date} />
        </>
      )}
      )
      <br />
      <Lsi lsi={c("paid")} /> <Price value={cancellation.paid} /> · <Lsi lsi={c("refund")} />{" "}
      <strong>
        <Price value={cancellation.refund} />
      </strong>
    </Uu5Elements.HighlightedBox>
  );
}

function Payments({ item, today, paymentLsi }) {
  const r = (key) => lsi("admin", "reservation", key);
  const vs = item.variableSymbol ? `VS ${item.variableSymbol}` : null;

  if (item.depositAmount == null) {
    return (
      <Uu5Elements.Grid rowGap={8}>
        <SectionTitle icon="uugds-credit-card" title="payment" />
        <Uu5Elements.HighlightedBox colorScheme="building" icon="uugds-info">
          {/* Plán vzniká přijetím žádosti; ručně potvrzená rezervace ho nemá vůbec. */}
          <Lsi lsi={lsi("admin", "payment", item.state === "requested" ? "none" : "noPlan")} />
        </Uu5Elements.HighlightedBox>
      </Uu5Elements.Grid>
    );
  }

  const fullPayment = item.balanceDueDate == null;
  const final = FINAL_STATE_LIST.includes(item.state);
  const paid = (item.depositPaidDate ? item.depositAmount : 0) + (!fullPayment && item.balancePaidDate ? item.balanceAmount ?? 0 : 0);

  return (
    <Uu5Elements.Grid rowGap={8}>
      <SectionTitle icon="uugds-credit-card" title="payment" aside={vs} />
      <Uu5Elements.Grid templateColumns="repeat(2, minmax(0, 1fr))" columnGap={8} rowGap={8}>
        {fullPayment ? (
          <PaymentCard
            wide
            label={<Lsi lsi={r("fullPayment")} />}
            amount={item.depositAmount}
            dueDate={item.depositDueDate}
            paidDate={item.depositPaidDate}
            today={today}
            final={final}
            paymentLsi={paymentLsi}
          />
        ) : (
          <>
            <PaymentCard
              label={<Lsi lsi={r("depositAmount")} />}
              amount={item.depositAmount}
              dueDate={item.depositDueDate}
              paidDate={item.depositPaidDate}
              today={today}
              final={final}
              paymentLsi={paymentLsi}
            />
            <PaymentCard
              label={<Lsi lsi={r("balanceAmount")} />}
              amount={item.balanceAmount}
              dueDate={item.balanceDueDate}
              paidDate={item.balancePaidDate}
              today={today}
              final={final}
              paymentLsi={paymentLsi}
            />
          </>
        )}
      </Uu5Elements.Grid>
      {fullPayment ? (
        <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building" significance="subdued">
          <Lsi lsi={lsi("admin", "payment", "fullPaymentInfo")} />
        </Uu5Elements.Text>
      ) : (
        item.totalPrice != null && (
          <Uu5Elements.Grid templateColumns="1fr auto" columnGap={8}>
            <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building" significance="subdued">
              <Lsi lsi={lsi("admin", "payment", "paidTotal")} />
            </Uu5Elements.Text>
            <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building">
              <strong>
                <Price value={paid} />
              </strong>{" "}
              {paymentLsi.of} <Price value={item.totalPrice} />
            </Uu5Elements.Text>
          </Uu5Elements.Grid>
        )
      )}
      {item.state === "cancelled" && <CancellationInfo cancellation={item.cancellation} done />}
    </Uu5Elements.Grid>
  );
}

function Contact({ item }) {
  const r = (key) => lsi("admin", "reservation", key);
  return (
    <Uu5Elements.Grid rowGap={8} alignContent="start">
      <SectionTitle icon="uugds-account" title="contact" />
      <Uu5Elements.InfoItem
        icon="uugds-account"
        title={item.contactName ?? "—"}
        subtitle={item.lang ? <Lsi lsi={lsi("admin", "lang", item.lang)} /> : undefined}
      />
      {item.contactEmail && (
        <Uu5Elements.InfoItem icon="uugds-email" title={item.contactEmail} subtitle={<Lsi lsi={r("contactEmail")} />} href={`mailto:${item.contactEmail}`} />
      )}
      {item.contactPhone && (
        <Uu5Elements.InfoItem
          icon="uugds-phone"
          title={item.contactPhone}
          subtitle={<Lsi lsi={r("contactPhone")} />}
          href={`tel:${item.contactPhone.replace(/[^+\d]/g, "")}`}
        />
      )}
    </Uu5Elements.Grid>
  );
}

function GuestNote({ note }) {
  return (
    <Uu5Elements.Grid rowGap={8}>
      <SectionTitle icon="uugds-comment-text" title="guestNote" />
      <p className={css.note()}>{note}</p>
    </Uu5Elements.Grid>
  );
}

const ReservationSummary = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationSummary",

  render({ item, showState = true }) {
    const paymentLsi = useLsi(importLsi, ["admin", "payment"]) ?? {};
    const today = todayIso();
    const isGuest = item.icalFeedCode == null && Boolean(item.contactName || item.contactEmail || item.contactPhone);

    return (
      <Uu5Elements.Grid rowGap={16}>
        <Strip item={item} showState={showState} isGuest={isGuest} />

        {isGuest && <DueAlert item={item} today={today} paymentLsi={paymentLsi} />}

        {isGuest && (
          <Uu5Elements.Grid
            templateAreas={item.note ? { xs: "pay, contact, note", m: "pay contact, note contact" } : { xs: "pay, contact", m: "pay contact" }}
            templateColumns={{ xs: "minmax(0, 1fr)", m: "minmax(0, 7fr) minmax(0, 5fr)" }}
            rowGap={16}
            columnGap={28}
          >
            <Uu5Elements.Grid.Item gridArea="pay">
              <Payments item={item} today={today} paymentLsi={paymentLsi} />
            </Uu5Elements.Grid.Item>
            <Uu5Elements.Grid.Item gridArea="contact">
              <Contact item={item} />
            </Uu5Elements.Grid.Item>
            {item.note && (
              <Uu5Elements.Grid.Item gridArea="note">
                <GuestNote note={item.note} />
              </Uu5Elements.Grid.Item>
            )}
          </Uu5Elements.Grid>
        )}

        {item.desc && (
          <Uu5Elements.HighlightedBox colorScheme="secondary" icon="uugds-lock-closed">
            <strong>
              <Lsi lsi={lsi("admin", "section", "desc")} />
            </strong>{" "}
            · <Lsi lsi={lsi("admin", "section", "descInfo")} />
            <p className={css.note()}>{item.desc}</p>
          </Uu5Elements.HighlightedBox>
        )}
      </Uu5Elements.Grid>
    );
  },
});

export default ReservationSummary;
