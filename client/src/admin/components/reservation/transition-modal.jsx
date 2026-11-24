import { createVisualComponent, Lsi, useEffect, useLsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../../config/config.js";
import { UiElements } from "caio-ui";
import importLsi, { lsi, ERROR_LSI } from "../../../lsi/import-lsi.js";
import { getReservation, previewReservationEmail, transitionReservation } from "../../calls.js";
import { CancellationInfo, DueAlert } from "./summary.jsx";
import EmailPreviewModal from "./email-preview-modal.jsx";
import { ACTION_META, todayIso, actionIcon, actionLabelCode, dateRange, isFullPayment, DateValue, Price } from "./fields.jsx";
import { PAID_ACTION_LIST, receivedDefault, transitionMoneyDtoIn } from "./modal-money.js";
import { AmountDate, DueInfo, EmailSection, GuestNoteSection, ModalDivider, PaymentRow, PaymentRows, PaymentSection, ReservationInfo } from "./modal-parts.jsx";

// State change modal (docs/proposal-reservation-flow.md § 6, owner's decision 2026-10-08; layout
// by the owner's approved design 2026-11-24, modal-parts.jsx): the reservation in brief (the price
// can be changed only on approval), then what the action needs -- the guest's note for a request,
// the payments otherwise (the amount actually received and its date for "… received") -- and the
// e-mail to the guest. In the footer the buttons of all allowed actions.
//
// The selected action is highlighted and the preview shows ITS e-mail. A click on another action first
// selects it (and switches the preview), only a click on the selected one runs it.
//
// Rule that guards against sending an e-mail the owner has not seen (adversarial review E3):
// running is possible only when the loaded preview is EXACTLY for the current action, language, message
// and money entered in the modal -- payment date and received amount, price on approval (`previewKey`,
// `transitionMoneyDtoIn`). The preview also validates that money on the server. Until then the button is disabled -- a double click on another action
// thus only selects it. And the e-mail is sent only when the preview showed it (`sendEmail` is otherwise
// explicitly false, never "unset", which the server would take as yes).



/**
 * Footer layout (owner 2026-10-09, variant b):
 * - phone (xs): the selected action full width on top, the others below it side by side filling the row;
 *   widths in proportion to label length (`fr`), so a longer text does not wrap and a shorter button does not bloat;
 * - wider: everything in one row aligned right, the selected action rightmost.
 * Reserve of 4 characters for the icon.
 */
function footerLayout(mainCode, otherCodes, labelOf) {
  const others = otherCodes.map((code, i) => [`o${i}`, (labelOf(code)?.length ?? 10) + 4]);
  const otherAreas = others.map(([area]) => area).join(" ");
  // Without a selected action (the state changed in the meantime) all actions are equal in one row.
  if (!mainCode) {
    return {
      templateAreas: { xs: otherAreas, s: otherAreas },
      templateColumns: { xs: others.map(([, weight]) => `${weight}fr`).join(" "), s: `repeat(${others.length}, auto)` },
      areaOf: Object.fromEntries(otherCodes.map((code, i) => [code, others[i][0]])),
    };
  }
  return {
    templateAreas: {
      xs: others.length ? `${others.map(() => "main").join(" ")}, ${otherAreas}` : "main",
      s: `${otherAreas} main`.trim(),
    },
    templateColumns: {
      xs: others.length ? others.map(([, weight]) => `${weight}fr`).join(" ") : "1fr",
      s: `repeat(${others.length + 1}, auto)`,
    },
    areaOf: Object.fromEntries([[mainCode, "main"], ...otherCodes.map((code, i) => [code, others[i][0]])]),
  };
}

/** E-mail language: the reservation's language if there are templates for it, otherwise the first available (Select would stay empty otherwise). */
function emailLang(data) {
  const list = data.emailLanguageList?.length ? data.emailLanguageList : ["cs"];
  return list.includes(data.lang) ? data.lang : list[0];
}

/**
 * E-mail result from the last event → alert. null = the e-mail was sent or there was none. Only when
 * the last event really is this action -- otherwise the alert would report the e-mail of a previous event.
 */
function emailProblem(item, action) {
  const event = item?.eventList?.at(-1);
  if (event?.type !== "transition" || event.action !== action) return null;
  const email = event.emailList?.[0];
  if (!email) return null;
  if (email.status === "failed") return "emailFailed";
  if (email.status === "skipped") return "emailSkipped";
  return null;
}

/**
 * The middle of the modal by the action: the guest's note for a request, the payments otherwise.
 * "… received" takes the amount that actually arrived and its date (the due date below the date --
 * the alert above says whether it is overdue).
 */
function ActionSection({ item, action, paidAmount, onPaidAmountChange, paidDate, onPaidDateChange }) {
  const paymentLsi = useLsi(importLsi, ["admin", "payment"]) ?? {};
  const transitionLsi = useLsi(importLsi, ["admin", "transition"]) ?? {};
  const today = todayIso();
  const full = isFullPayment(item);

  if (!action || ["approve", "reject", "reopen"].includes(action)) return <GuestNoteSection note={item.note} />;

  const dateField = {
    dateLabel: transitionLsi.paidDate,
    date: paidDate,
    onDateChange: onPaidDateChange,
    // The same range as the reservation form (today − 1 year); the server refuses the future.
    min: dateRange([paidDate]).min,
    max: today,
  };

  switch (action) {
    case "markDepositPaid":
      return (
        <PaymentSection>
          <DueAlert item={item} today={today} paymentLsi={paymentLsi} />
          <AmountDate
            amountLabel={full ? transitionLsi.amount : paymentLsi.kind?.deposit}
            amount={paidAmount}
            onAmountChange={onPaidAmountChange}
            dateInfo={<DueInfo date={item.depositDueDate} />}
            {...dateField}
          />
        </PaymentSection>
      );
    case "markBalancePaid":
      return (
        <PaymentSection>
          <PaymentRow kind="deposit" amount={item.depositAmount} paidDate={item.depositPaidDate} dueDate={item.depositDueDate} today={today} />
          <DueAlert item={item} today={today} paymentLsi={paymentLsi} />
          <AmountDate
            amountLabel={paymentLsi.kind?.balance}
            amount={paidAmount}
            onAmountChange={onPaidAmountChange}
            dateInfo={<DueInfo date={item.balanceDueDate} />}
            {...dateField}
          />
        </PaymentSection>
      );
    case "expire":
      return (
        <PaymentSection>
          <DueAlert item={item} today={today} paymentLsi={paymentLsi} />
        </PaymentSection>
      );
    case "cancel":
      return (
        <PaymentSection>
          <PaymentRows item={item} today={today} />
          <CancellationInfo cancellation={item.cancellation} />
        </PaymentSection>
      );
    case "complete":
      return (
        <PaymentSection>
          <PaidTotal item={item} />
        </PaymentSection>
      );
    default:
      return null;
  }
}

/** Ukončení pobytu: kolik host zaplatil celkem a kdy naposledy. */
function PaidTotal({ item }) {
  const paymentLsi = useLsi(importLsi, ["admin", "payment"]) ?? {};
  const transitionLsi = useLsi(importLsi, ["admin", "transition"]) ?? {};
  if (item.depositAmount == null) {
    return (
      <Uu5Elements.Text colorScheme="building" significance="subdued">
        {paymentLsi.noPlan}
      </Uu5Elements.Text>
    );
  }
  const paid = (item.depositPaidDate ? item.depositAmount : 0) + (item.balancePaidDate ? item.balanceAmount ?? 0 : 0);
  const lastPaid = [item.depositPaidDate, item.balancePaidDate].filter(Boolean).sort().at(-1);
  const settled = item.totalPrice != null && paid >= item.totalPrice;
  return (
    <>
      <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" alignItems="center" columnGap={8}>
        <Uu5Elements.Text category="interface" segment="content" type="medium">
          {transitionLsi.paidTotal}{" "}
          <strong>
            <Price value={paid} />
          </strong>{" "}
          {paymentLsi.of} <Price value={item.totalPrice} />
        </Uu5Elements.Text>
        <Uu5Elements.Tag
          colorScheme={settled ? "positive" : "warning"}
          significance="distinct"
          icon={settled ? "uugds-check-circle" : "uugds-clock"}
          size="s"
        >
          {settled ? paymentLsi.paidTotal : paymentLsi.status?.unpaid}
        </Uu5Elements.Tag>
      </Uu5Elements.Grid>
      {lastPaid && (
        <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building" significance="subdued">
          {transitionLsi.lastPayment} <DateValue value={lastPaid} />
        </Uu5Elements.Text>
      )}
    </>
  );
}

const TransitionModal = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationTransitionModal",

  /**
   * @param id      reservation
   * @param action  the action the modal was opened with (preselected)
   * @param onDone  (item) => …, after the action is run (reload of the list / detail)
   */
  render({ id, action: initialAction, onClose, onDone }) {
    const { addAlert } = Uu5Elements.useAlertBus();
    const errorMessage = UiElements.useErrorMessage(ERROR_LSI);
    const transitionLsi = useLsi(importLsi, ["admin", "transition"]);
    const actionLsi = useLsi(importLsi, ["admin", "action"]);

    const [item, setItem] = useState();
    const [action, setAction] = useState(initialAction);
    const [sendEmail, setSendEmail] = useState(true);
    const [lang, setLang] = useState();
    const [message, setMessage] = useState("");
    const [paidDate, setPaidDate] = useState(todayIso());
    // Price on approval and the amount actually received ("… received"); defaults from the reservation.
    const [price, setPrice] = useState(null);
    const [paidAmount, setPaidAmount] = useState(null);
    // The last loaded preview: for which parameters (`key`) and which action, the e-mail (null = the action
    // has no e-mail) or an error (e.g. approval without a price).
    const [preview, setPreview] = useState({ key: null, action: null, email: undefined, error: null });
    const [pending, setPending] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    // The action the modal was opened with is no longer valid (the state was changed by another tab / device).
    // Then nothing is preselected -- otherwise a second click on the same spot would run a different action.
    const [stale, setStale] = useState(false);

    function applyFresh(data, wanted) {
      setItem(data);
      if (!data.actionList.includes(wanted)) {
        setAction(null);
        setStale(true);
        // The list / detail under the modal shows the old state -- refresh it now, not only after the action.
        onDone?.(data);
      }
    }

    const isPaidAction = PAID_ACTION_LIST.includes(action);
    const isApprove = action === "approve";
    const previewKey = JSON.stringify({
      action,
      lang,
      message,
      paidDate: isPaidAction ? paidDate : null,
      paidAmount: isPaidAction ? paidAmount : null,
      totalPrice: isApprove ? price : null,
    });
    const previewReady = preview.key === previewKey;
    // What to show: the preview of the same action (even while a new one is loading because the message
    // changed -- otherwise the message field would disappear while typing). For another action undefined = loading.
    const shownEmail = preview.action === action ? preview.email : undefined;
    // A zero price is the same as none: the deposit would come out as 0 CZK (the server rejects it too).
    const missingPrice = isApprove && Boolean(item) && !(price > 0);
    const paidDateMissing = isPaidAction && !paidDate;
    const paidAmountMissing = isPaidAction && !(paidAmount > 0);
    const inputMissing = missingPrice || paidDateMissing || paidAmountMissing;
    const canRun = Boolean(item) && Boolean(action) && previewReady && !preview.error && !pending && !inputMissing;

    // Fresh data on open -- the list may be a few minutes old.
    useEffect(() => {
      let cancelled = false;
      getReservation(id)
        .then((data) => {
          if (cancelled) return;
          setLang(emailLang(data));
          setPrice(data.totalPrice ?? null);
          applyFresh(data, initialAction);
        })
        .catch((e) => !cancelled && addAlert({ message: errorMessage(e), priority: "error" }));
      return () => {
        cancelled = true;
      };
    }, [id]);

    // The received amount defaults to what was asked for -- again whenever another "… received" is picked.
    useEffect(() => {
      if (item && PAID_ACTION_LIST.includes(action)) setPaidAmount(receivedDefault(item, action));
    }, [item, action]);

    // E-mail preview of the selected action. The message is reflected in the preview with a short delay; until
    // then `previewReady` is not true and the action cannot be run. The preview also validates the
    // price and the received amount (an error is shown before the action runs).
    useEffect(() => {
      if (!item || !action || inputMissing) return undefined;
      let cancelled = false;
      const key = previewKey;
      const forAction = action;
      const timer = setTimeout(() => {
        previewReservationEmail({ id, action, lang, message: message || undefined, ...moneyDtoIn() })
          .then((data) => !cancelled && setPreview({ key, action: forAction, email: data.email, error: null }))
          .catch((e) => !cancelled && setPreview({ key, action: forAction, email: undefined, error: errorMessage(e) }));
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [item, previewKey]);

    /** What the modal entered besides the e-mail (modal-money.js). */
    function moneyDtoIn() {
      return transitionMoneyDtoIn({ action, item, price, paidAmount, paidDate });
    }

    async function run() {
      if (!canRun) return;
      // Only the e-mail the preview showed. Message and language only with it -- with the e-mail turned off
      // the message would be written to the history and the reservation language changed, even though the fields are hidden.
      const withEmail = Boolean(preview.email) && sendEmail;
      setPending(true);
      try {
        const result = await transitionReservation({
          id,
          action,
          sendEmail: withEmail,
          ...(withEmail ? { lang, message: message || undefined } : null),
          ...moneyDtoIn(),
        });
        const problem = withEmail ? emailProblem(result, action) : null;
        addAlert({
          message: problem ? transitionLsi[problem] : transitionLsi.done,
          priority: problem ? "warning" : "success",
          durationMs: problem ? 8000 : 3000,
        });
        onDone?.(result);
        onClose?.();
      } catch (e) {
        addAlert({ message: errorMessage(e), priority: "error" });
        // The state may have changed in the meantime (409) -- reload so the modal shows the truth.
        getReservation(id)
          .then((data) => applyFresh(data, action))
          .catch(() => undefined);
      } finally {
        setPending(false);
      }
    }

    const codeList = item?.actionList ?? [];
    const otherCodes = codeList.filter((code) => code !== action);
    const layout = footerLayout(action, otherCodes, (code) => actionLsi?.[actionLabelCode(code, item)]);
    // No "Close": the modal is closed with the cross in the header (owner 2026-10-09).
    const footer = codeList.length ? (
      <Uu5Elements.Grid
        templateAreas={layout.templateAreas}
        templateColumns={layout.templateColumns}
        justifyContent={{ xs: "stretch", s: "end" }}
        columnGap={8}
        rowGap={8}
      >
        {codeList.map((code) => {
          const selected = code === action;
          const meta = ACTION_META[code] ?? {};
          return (
            <Uu5Elements.Grid.Item key={code} gridArea={layout.areaOf[code]}>
              <Uu5Elements.Button
                icon={actionIcon(code, item)}
                colorScheme={selected ? meta.colorScheme ?? "primary" : "building"}
                significance={selected ? "highlighted" : "common"}
                // The selected action can be run only with a preview for the current settings; others can always be selected.
                disabled={pending || (selected && !canRun)}
                onClick={() => (selected ? run() : setAction(code))}
                width="100%"
              >
                <Lsi lsi={lsi("admin", "action", actionLabelCode(code, item))} />
              </Uu5Elements.Button>
            </Uu5Elements.Grid.Item>
          );
        })}
      </Uu5Elements.Grid>
    ) : null;

    return (
      <Uu5Elements.Modal
        open
        // Narrower than the reservation detail: the modal has a summary, a few fields and the e-mail.
        width={640}
        onClose={pending ? undefined : onClose}
        header={<Lsi lsi={action ? lsi("admin", "transition", "title", actionLabelCode(action, item)) : lsi("admin", "transition", "header")} />}
        footer={footer}
      >
        {!item ? (
          <Uu5Elements.Pending />
        ) : (
          <>
            <Uu5Elements.Grid rowGap={16}>
              <ReservationInfo
                item={item}
                price={isApprove ? price : item.totalPrice}
                onPriceChange={isApprove ? setPrice : undefined}
                priceFeedback={missingPrice ? "error" : undefined}
              />
              <ModalDivider />

              <ActionSection
                item={item}
                action={action}
                paidAmount={paidAmount}
                onPaidAmountChange={setPaidAmount}
                paidDate={paidDate}
                onPaidDateChange={setPaidDate}
              />

              {!inputMissing && previewReady && preview.error && (
                <Uu5Elements.HighlightedBox colorScheme="negative">{preview.error}</Uu5Elements.HighlightedBox>
              )}

              {!action && (
                <Uu5Elements.HighlightedBox colorScheme={stale ? "warning" : "building"}>
                  <Lsi lsi={lsi("admin", "transition", stale ? "stateChanged" : codeList.length ? "pickAction" : "noActions")} />
                </Uu5Elements.HighlightedBox>
              )}

              {action && <ModalDivider />}

              {action && shownEmail === null && (
                <Uu5Elements.Text colorScheme="building" significance="subdued">
                  {/* Every action has an e-mail -- there is none only when the guest has no address. */}
                  <Lsi lsi={lsi("admin", "transition", "noGuestEmail")} />
                </Uu5Elements.Text>
              )}

              {action && shownEmail !== null && (
                <EmailSection
                  item={item}
                  sendEmail={sendEmail}
                  onSendEmailChange={setSendEmail}
                  lang={lang}
                  onLangChange={setLang}
                  message={message}
                  onMessageChange={setMessage}
                  email={shownEmail}
                  loading={!inputMissing && !(previewReady && preview.error)}
                  onPreview={() => setPreviewOpen(true)}
                />
              )}
            </Uu5Elements.Grid>

            {/* The preview is always the one that will be sent: it reloads when the message or language changes. */}
            {previewOpen && shownEmail && <EmailPreviewModal email={shownEmail} onClose={() => setPreviewOpen(false)} />}
          </>
        )}
      </Uu5Elements.Modal>
    );
  },
});

export default TransitionModal;
