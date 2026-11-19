import { createVisualComponent, Lsi, useEffect, useLsi, useRoute, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../../config/config.js";
import { UiElements } from "caio-ui";
import importLsi, { lsi, ERROR_LSI } from "../../../lsi/import-lsi.js";
import { getReservation, previewReservationSendEmail, sendReservationEmail } from "../../calls.js";
import ReservationSummary from "./summary.jsx";
import EmailPreviewModal from "./email-preview-modal.jsx";
import { EMAIL_ACTION_META, emailLabelCode, languageItemList } from "./fields.jsx";

// E-mail, který majitelka posílá ručně: připomínka zálohy nebo doplatku, informace k příjezdu
// (docs/proposal-admin-emails.md § 6). Stav nemění, takže na rozdíl od modálu změny stavu nemá
// akce v patičce -- jen „Odeslat“.
//
// Stejné pravidlo jako u změny stavu (oponentní review E3): odeslat jde, až když je načtený náhled
// PŘESNĚ pro aktuální e-mail, jazyk, zprávu a kód ke schránce (`previewKey`). Odejde tedy jen to,
// co majitelka v náhledu viděla.

/** Pole `reminder`, kde server drží čas posledního odeslání (server/reservation/states.js `REMINDER_FIELD`). */
const SENT_AT_FIELD = { depositReminder: "depositSentAt", balanceReminder: "balanceSentAt", arrivalInfo: "arrivalInfoSentAt" };

const KEY_CODE = /^\d{3,10}$/;

const css = {
  controls: () => Config.Css.css({ display: "grid", gap: 12, marginTop: 20 }),
  email: () => Config.Css.css({ display: "grid", gap: 2, overflowWrap: "anywhere" }),
};

/** Jazyk e-mailu: jazyk rezervace, má-li pro něj server šablony, jinak první dostupný. */
function emailLang(data) {
  const list = data.emailLanguageList?.length ? data.emailLanguageList : ["cs"];
  return list.includes(data.lang) ? data.lang : list[0];
}

/** Výsledek e-mailu z poslední události → kód textu alertu. */
function sendResult(item, email) {
  const event = item?.eventList?.at(-1);
  const record = event?.type === "email" && event.email === email ? event.emailList?.[0] : null;
  if (record?.status === "failed") return "failed";
  if (record?.status === "skipped") return "skipped";
  return "sent";
}

const EmailModal = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationEmailModal",

  /**
   * @param id      rezervace
   * @param email   `arrivalInfo` | `depositReminder` | `balanceReminder`
   * @param onDone  (item) => …, po odeslání (znovu načíst seznam / detail)
   */
  render({ id, email, onClose, onDone }) {
    const { addAlert } = Uu5Elements.useAlertBus();
    const [, setRoute] = useRoute();
    const errorMessage = UiElements.useErrorMessage(ERROR_LSI);
    const t = useLsi(importLsi, ["admin", "sendEmail"]) ?? {};
    const emailLsi = useLsi(importLsi, ["admin", "emailAction"]) ?? {};

    const [item, setItem] = useState();
    const [lang, setLang] = useState();
    const [message, setMessage] = useState("");
    const [keyCode, setKeyCode] = useState("");
    const [preview, setPreview] = useState({ key: null, email: undefined, phase: null, wifiMissing: false, error: null });
    const [pending, setPending] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const arrival = email === "arrivalInfo";
    const available = Boolean(item?.emailActionList?.includes(email));
    const keyCodeValid = !arrival || KEY_CODE.test(keyCode);
    const previewKey = JSON.stringify({ email, lang, message, keyCode: arrival ? keyCode : null });
    const previewReady = preview.key === previewKey;
    const canSend = available && keyCodeValid && previewReady && Boolean(preview.email) && !preview.error && !pending;
    const sentAt = item?.reminder?.[SENT_AT_FIELD[email]];
    const balanceUnpaid = arrival && item?.balanceDueDate && !item.balancePaidDate && item.balanceAmount > 0;

    // Čerstvá data při otevření -- seznam může být pár minut starý.
    useEffect(() => {
      let cancelled = false;
      getReservation(id)
        .then((data) => {
          if (cancelled) return;
          setItem(data);
          setLang(emailLang(data));
          setKeyCode(data.keyCode ?? "");
        })
        .catch((e) => !cancelled && addAlert({ message: errorMessage(e), priority: "error" }));
      return () => {
        cancelled = true;
      };
    }, [id]);

    // Náhled s krátkou prodlevou: zpráva a kód se píšou, do té doby odeslat nejde (`previewReady`).
    useEffect(() => {
      if (!item || !available || !keyCodeValid) return undefined;
      let cancelled = false;
      const key = previewKey;
      const timer = setTimeout(() => {
        previewReservationSendEmail({ id, email, lang, message: message || undefined, ...(arrival ? { keyCode } : null) })
          .then((data) => !cancelled && setPreview({ key, email: data.email, phase: data.phase, wifiMissing: Boolean(data.wifiMissing), error: null }))
          .catch((e) => !cancelled && setPreview({ key, email: undefined, phase: null, wifiMissing: false, error: errorMessage(e) }));
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [item, previewKey, available, keyCodeValid]);

    async function send() {
      if (!canSend) return;
      setPending(true);
      try {
        const result = await sendReservationEmail({ id, email, lang, message: message || undefined, ...(arrival ? { keyCode } : null) });
        const outcome = sendResult(result, email);
        addAlert({ message: t[outcome], priority: outcome === "sent" ? "success" : "warning", durationMs: outcome === "sent" ? 3000 : 8000 });
        onDone?.(result);
        onClose?.();
      } catch (e) {
        addAlert({ message: errorMessage(e), priority: "error" });
        // Stav se mohl mezitím změnit (409) -- znovu načíst, ať modál ukazuje pravdu.
        getReservation(id)
          .then(setItem)
          .catch(() => undefined);
      } finally {
        setPending(false);
      }
    }

    const label = item ? emailLsi[emailLabelCode(email, item)] : emailLsi[email];
    const shownEmail = preview.email;

    return (
      <Uu5Elements.Modal
        open
        width={900}
        onClose={pending ? undefined : onClose}
        header={label}
        footer={
          <div className={Config.Css.css({ display: "flex", justifyContent: "flex-end" })}>
            <Uu5Elements.Button
              icon="uugds-send"
              colorScheme="primary"
              significance="highlighted"
              disabled={!canSend}
              onClick={send}
              width={{ xs: "100%", s: "auto" }}
            >
              {sentAt ? t.sendAgain : t.send}
            </Uu5Elements.Button>
          </div>
        }
      >
        {!item ? (
          <Uu5Elements.Pending />
        ) : (
          <>
            <ReservationSummary item={item} />

            <div className={css.controls()}>
              {!available && (
                <Uu5Elements.HighlightedBox colorScheme="warning">
                  <Lsi lsi={lsi("admin", "sendEmail", "unavailable")} />
                </Uu5Elements.HighlightedBox>
              )}

              {available && sentAt && (
                <Uu5Elements.HighlightedBox colorScheme="building" icon="uugds-info">
                  <Lsi lsi={lsi("admin", "sendEmail", "lastSent")} />{" "}
                  <Uu5Elements.DateTime value={sentAt} dateFormat="medium" timeFormat="short" timeZone="Europe/Prague" />
                </Uu5Elements.HighlightedBox>
              )}

              {available && previewReady && ["overdue", "fullDue"].includes(preview.phase) && (
                <Uu5Elements.HighlightedBox colorScheme="warning" icon={EMAIL_ACTION_META[email]?.icon}>
                  <Lsi lsi={lsi("admin", "sendEmail", "phase", preview.phase)} />
                </Uu5Elements.HighlightedBox>
              )}

              {available && balanceUnpaid && (
                <Uu5Elements.HighlightedBox colorScheme="warning">
                  <Lsi lsi={lsi("admin", "sendEmail", "balanceUnpaid")} />
                </Uu5Elements.HighlightedBox>
              )}

              {available && previewReady && preview.wifiMissing && (
                <Uu5Elements.HighlightedBox colorScheme="building">
                  <Lsi lsi={lsi("admin", "sendEmail", "wifiMissing")} />{" "}
                  <Uu5Elements.Link onClick={() => setRoute("settings")}>
                    <Lsi lsi={lsi("admin", "sendEmail", "settingsLink")} />
                  </Uu5Elements.Link>
                </Uu5Elements.HighlightedBox>
              )}

              {available && arrival && (
                <Uu5Forms.Text
                  label={<Lsi lsi={lsi("admin", "reservation", "keyCode")} />}
                  info={<Lsi lsi={lsi("admin", "sendEmail", "keyCodeInfo")} />}
                  value={keyCode}
                  maxLength={10}
                  required
                  inputAttrs={{ inputMode: "numeric", autoComplete: "off" }}
                  onChange={(e) => setKeyCode((e.data.value ?? "").trim())}
                  feedback={keyCode && !keyCodeValid ? "error" : undefined}
                  message={keyCode && !keyCodeValid ? <Lsi lsi={lsi("admin", "sendEmail", "keyCodeInvalid")} /> : undefined}
                />
              )}

              {available && (
                <>
                  <Uu5Forms.Select
                    label={<Lsi lsi={lsi("admin", "reservation", "lang")} />}
                    value={lang}
                    itemList={languageItemList(item.emailLanguageList)}
                    onChange={(e) => setLang(e.data.value)}
                  />
                  <Uu5Forms.TextArea
                    label={<Lsi lsi={lsi("admin", "reservation", "message")} />}
                    info={<Lsi lsi={lsi("admin", "sendEmail", "messageInfo")} />}
                    value={message}
                    rows={2}
                    maxLength={2000}
                    onChange={(e) => setMessage(e.data.value ?? "")}
                  />
                </>
              )}

              {available && keyCodeValid && !shownEmail && !preview.error && <Uu5Elements.Pending size="s" />}

              {available && previewReady && preview.error && (
                <Uu5Elements.HighlightedBox colorScheme="negative">{preview.error}</Uu5Elements.HighlightedBox>
              )}

              {available && shownEmail && (
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
              )}
            </div>

            {/* Náhled je vždy ten, který odejde: znovu se načte při změně zprávy, jazyka nebo kódu. */}
            {previewOpen && shownEmail && <EmailPreviewModal email={shownEmail} onClose={() => setPreviewOpen(false)} />}
          </>
        )}
      </Uu5Elements.Modal>
    );
  },
});

export default EmailModal;
