import { createVisualComponent, Lsi, useEffect, useLsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../../config/config.js";
import UiElements from "caio-ui/src/caio-ui-elements";
import importLsi, { lsi, ERROR_LSI } from "../../../lsi/import-lsi.js";
import { getReservation, previewReservationEmail, transitionReservation } from "../../calls.js";
import ReservationSummary, { CancellationInfo } from "./summary.jsx";
import EmailPreviewModal from "./email-preview-modal.jsx";
import { ACTION_META, languageItemList, todayIso, actionLabelCode } from "./fields.jsx";

// State change modal (docs/proposal-reservation-flow.md § 6, owner's decision 2026-10-08):
// all reservation details, below them the e-mail to the guest (checkbox, language, message, link to
// the preview in a separate modal)
// and in the footer the buttons of all allowed actions.
//
// The selected action is highlighted and the preview shows ITS e-mail. A click on another action first
// selects it (and switches the preview), only a click on the selected one runs it.
//
// Rule that guards against sending an e-mail the owner has not seen (adversarial review E3):
// running is possible only when the loaded preview is EXACTLY for the current action, language, message
// and payment date (`previewKey`). Until then the button is disabled -- a double click on another action
// thus only selects it. And the e-mail is sent only when the preview showed it (`sendEmail` is otherwise
// explicitly false, never "unset", which the server would take as yes).

const PAID_ACTIONS = new Set(["markDepositPaid", "markBalancePaid"]);

const css = {
  controls: () => Config.Css.css({ display: "grid", gap: 12, marginTop: 20 }),
  email: () => Config.Css.css({ display: "grid", gap: 2, overflowWrap: "anywhere" }),
};

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

    const isPaidAction = PAID_ACTIONS.has(action);
    const previewKey = JSON.stringify({ action, lang, message, paidDate: isPaidAction ? paidDate : null });
    const previewReady = preview.key === previewKey;
    // What to show: the preview of the same action (even while a new one is loading because the message
    // changed -- otherwise the message field would disappear while typing). For another action undefined = loading.
    const shownEmail = preview.action === action ? preview.email : undefined;
    // A zero price is the same as none: the deposit would come out as 0 CZK (the server rejects it too).
    const missingPrice = action === "approve" && item && !(item.totalPrice > 0);
    const paidDateMissing = isPaidAction && !paidDate;
    const canRun = Boolean(item) && Boolean(action) && previewReady && !preview.error && !pending && !missingPrice && !paidDateMissing;

    // Fresh data on open -- the list may be a few minutes old.
    useEffect(() => {
      let cancelled = false;
      getReservation(id)
        .then((data) => {
          if (cancelled) return;
          setLang(emailLang(data));
          applyFresh(data, initialAction);
        })
        .catch((e) => !cancelled && addAlert({ message: errorMessage(e), priority: "error" }));
      return () => {
        cancelled = true;
      };
    }, [id]);

    // E-mail preview of the selected action. The message is reflected in the preview with a short delay; until
    // then `previewReady` is not true and the action cannot be run.
    useEffect(() => {
      if (!item || !action || paidDateMissing) return undefined;
      let cancelled = false;
      const key = previewKey;
      const forAction = action;
      const timer = setTimeout(() => {
        previewReservationEmail({ id, action, lang, message: message || undefined, ...(isPaidAction ? { paidDate } : null) })
          .then((data) => !cancelled && setPreview({ key, action: forAction, email: data.email, error: null }))
          .catch((e) => !cancelled && setPreview({ key, action: forAction, email: undefined, error: errorMessage(e) }));
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [item, previewKey]);

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
          ...(isPaidAction ? { paidDate } : null),
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
                icon={meta.icon}
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
        width={900}
        onClose={pending ? undefined : onClose}
        header={
          <>
            <Lsi lsi={lsi("admin", "transition", "header")} />
            {action && (
              <>
                {": "}
                <Lsi lsi={lsi("admin", "action", actionLabelCode(action, item))} />
              </>
            )}
          </>
        }
        footer={footer}
      >
        {!item ? (
          <Uu5Elements.Pending />
        ) : (
          <>
            <ReservationSummary item={item} />

            <div className={css.controls()}>
              {isPaidAction && (
                <Uu5Forms.Date
                  label={<Lsi lsi={lsi("admin", "transition", "paidDate")} />}
                  value={paidDate}
                  max={todayIso()}
                  // An empty field is kept (it can be cleared and retyped); running is possible only with a date.
                  onChange={(e) => setPaidDate(e.data.value ?? "")}
                  required
                />
              )}

              {/* Cancellation: fee and refund according to the terms as of today -- the same is recorded on cancellation. */}
              {action === "cancel" && <CancellationInfo cancellation={item.cancellation} />}

              {missingPrice && (
                <Uu5Elements.HighlightedBox colorScheme="warning">
                  <Lsi lsi={lsi("admin", "transition", "missingPrice")} />
                </Uu5Elements.HighlightedBox>
              )}

              {!missingPrice && previewReady && preview.error && (
                <Uu5Elements.HighlightedBox colorScheme="negative">{preview.error}</Uu5Elements.HighlightedBox>
              )}

              {!action && (
                <Uu5Elements.HighlightedBox colorScheme={stale ? "warning" : "building"}>
                  <Lsi lsi={lsi("admin", "transition", stale ? "stateChanged" : codeList.length ? "pickAction" : "noActions")} />
                </Uu5Elements.HighlightedBox>
              )}

              {action && !missingPrice && !paidDateMissing && shownEmail === undefined && !preview.error && <Uu5Elements.Pending size="s" />}

              {shownEmail === null && (
                <Uu5Elements.Text colorScheme="building" significance="subdued">
                  <Lsi lsi={lsi("admin", "transition", item.contactEmail ? "noEmail" : "noGuestEmail")} />
                </Uu5Elements.Text>
              )}

              {shownEmail && (
                <>
                  <Uu5Forms.Checkbox
                    label={<Lsi lsi={lsi("admin", "reservation", "sendEmail")} />}
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.data.value)}
                  />
                  {sendEmail && (
                    <>
                      <Uu5Forms.Select
                        label={<Lsi lsi={lsi("admin", "reservation", "lang")} />}
                        value={lang}
                        itemList={languageItemList(item.emailLanguageList)}
                        onChange={(e) => setLang(e.data.value)}
                      />
                      <Uu5Forms.TextArea
                        label={<Lsi lsi={lsi("admin", "reservation", "message")} />}
                        info={<Lsi lsi={lsi("admin", "reservation", "messageInfo")} />}
                        value={message}
                        rows={2}
                        maxLength={2000}
                        onChange={(e) => setMessage(e.data.value ?? "")}
                      />
                      <div className={css.email()}>
                        <strong>
                          <Lsi lsi={lsi("admin", "transition", "email")} />: {shownEmail.subject}
                        </strong>
                        <Uu5Elements.Text colorScheme="building" significance="subdued">
                          <Lsi lsi={lsi("admin", "transition", "to")} /> {shownEmail.to}
                        </Uu5Elements.Text>
                        <div>
                          <Uu5Elements.Link onClick={() => setPreviewOpen(true)}>
                            <Lsi lsi={lsi("admin", "transition", "preview")} />
                          </Uu5Elements.Link>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* The preview is always the one that will be sent: it reloads when the message or language changes. */}
            {previewOpen && shownEmail && <EmailPreviewModal email={shownEmail} onClose={() => setPreviewOpen(false)} />}
          </>
        )}
      </Uu5Elements.Modal>
    );
  },
});

export default TransitionModal;
