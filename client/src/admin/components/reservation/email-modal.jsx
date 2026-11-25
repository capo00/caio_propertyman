import { createVisualComponent, Lsi, useEffect, useLsi, useRoute, useScreenSize, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../../config/config.js";
import { UiElements } from "caio-ui";
import importLsi, { lsi, ERROR_LSI } from "../../../lsi/import-lsi.js";
import { getReservation, previewReservationSendEmail, sendReservationEmail } from "../../calls.js";
import { DueAlert } from "./summary.jsx";
import EmailPreviewModal from "./email-preview-modal.jsx";
import { DateValue, EMAIL_ACTION_META, emailLabelCode, isFullPayment, Price, todayIso } from "./fields.jsx";
import { reminderFullDue, reminderPlan, reminderPlanChanges } from "./modal-money.js";
import { AmountDate, EmailSection, KeyCodeInput, ModalDivider, PaymentRow, PaymentRows, PaymentSection, ReservationInfo } from "./modal-parts.jsx";

// E-mail, který majitelka posílá ručně: připomínka zálohy nebo doplatku, informace k příjezdu
// (docs/proposal-admin-emails.md § 6). Stav nemění, takže na rozdíl od modálu změny stavu nemá
// akce v patičce -- jen „Odeslat“. Rozložení podle schváleného návrhu majitelky 2026-11-24
// (modal-parts.jsx): u připomínky jde změnit částku a posunout splatnost; s odškrtnutým e-mailem
// se jen uloží ta změna („Uložit“).
//
// Připomínka zálohy, která žádá celou částku (fáze `fullDue`), pole nemá: e-mail chce celou cenu do
// splatnosti doplatku a pole zálohy by s tím neměla nic společného (nález P1 z 2026-11-25). Modál
// ukáže jen tu částku a splatnost; cenu nebo splatnost majitelka změní přes Upravit.
//
// Stejné pravidlo jako u změny stavu (oponentní review E3): odeslat jde, až když je načtený náhled
// PŘESNĚ pro aktuální e-mail, jazyk, zprávu a kód ke schránce (`previewKey`). Odejde tedy jen to,
// co majitelka v náhledu viděla.

/** Pole `reminder`, kde server drží čas posledního odeslání (server/reservation/states.js `REMINDER_FIELD`). */
const SENT_AT_FIELD = { depositReminder: "depositSentAt", balanceReminder: "balanceSentAt", arrivalInfo: "arrivalInfoSentAt" };

const KEY_CODE = /^\d{3,10}$/;


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
    const paymentLsi = useLsi(importLsi, ["admin", "payment"]) ?? {};
    const transitionLsi = useLsi(importLsi, ["admin", "transition"]) ?? {};
    const today = todayIso();
    const [screenSize] = useScreenSize();

    const [item, setItem] = useState();
    const [lang, setLang] = useState();
    const [message, setMessage] = useState("");
    const [keyCode, setKeyCode] = useState("");
    const [sendEmail, setSendEmail] = useState(true);
    // Připomínka platby: částka a splatnost (výchozí z plánu, změněné se pošlou serveru).
    const [amount, setAmount] = useState(null);
    const [dueDate, setDueDate] = useState("");
    const [preview, setPreview] = useState({ key: null, email: undefined, phase: null, wifiMissing: false, error: null });
    const [pending, setPending] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const arrival = email === "arrivalInfo";
    const reminder = !arrival;
    const fullDue = item && reminder ? reminderFullDue(item, email, today) : null;
    // Bez e-mailu by informace k příjezdu ani připomínka celé částky nedělaly nic -- tam se e-mail
    // vypnout nedá.
    const alwaysSend = arrival || Boolean(fullDue);
    const withEmail = alwaysSend || sendEmail;
    const available = Boolean(item?.emailActionList?.includes(email));
    const keyCodeValid = !arrival || KEY_CODE.test(keyCode);
    const plan = item && reminder ? reminderPlan(item, email) : null;
    const planChanges = reminderPlanChanges(plan, { amount, dueDate });
    const planValid = !reminder || (amount > 0 && Boolean(dueDate));
    const previewKey = JSON.stringify({ email, lang, message, keyCode: arrival ? keyCode : null, ...planChanges });
    const previewReady = preview.key === previewKey;
    const canSend =
      available && keyCodeValid && planValid && previewReady && Boolean(preview.email) && !preview.error && !pending &&
      // „Uložit“ bez změny nemá co uložit.
      (withEmail || Object.keys(planChanges).length > 0);
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
          const initial = reminderPlan(data, email);
          setAmount(initial.amount);
          setDueDate(initial.dueDate);
        })
        .catch((e) => !cancelled && addAlert({ message: errorMessage(e), priority: "error" }));
      return () => {
        cancelled = true;
      };
    }, [id]);

    // Náhled s krátkou prodlevou: zpráva a kód se píšou, do té doby odeslat nejde (`previewReady`).
    useEffect(() => {
      if (!item || !available || !keyCodeValid || !planValid) return undefined;
      let cancelled = false;
      const key = previewKey;
      const timer = setTimeout(() => {
        previewReservationSendEmail({ id, email, lang, message: message || undefined, ...(arrival ? { keyCode } : null), ...planChanges })
          .then((data) => !cancelled && setPreview({ key, email: data.email, phase: data.phase, wifiMissing: Boolean(data.wifiMissing), error: null }))
          .catch((e) => !cancelled && setPreview({ key, email: undefined, phase: null, wifiMissing: false, error: errorMessage(e) }));
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [item, previewKey, available, keyCodeValid, planValid]);

    async function send() {
      if (!canSend) return;
      setPending(true);
      try {
        const result = await sendReservationEmail({
          id,
          email,
          sendEmail: withEmail,
          ...(withEmail ? { lang, message: message || undefined } : null),
          ...(arrival ? { keyCode } : null),
          ...planChanges,
        });
        const outcome = withEmail ? sendResult(result, email) : "saved";
        const ok = outcome === "sent" || outcome === "saved";
        addAlert({ message: t[outcome], priority: ok ? "success" : "warning", durationMs: ok ? 3000 : 8000 });
        onDone?.(result);
        onClose?.();
      } catch (e) {
        addAlert({ message: errorMessage(e), priority: "error" });
        // Stav se mohl mezitím změnit (409) -- znovu načíst, ať modál ukazuje pravdu.
        getReservation(id)
          .then((data) => {
            setItem(data);
            const fresh = reminderPlan(data, email);
            setAmount(fresh.amount);
            setDueDate(fresh.dueDate);
          })
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
        width={640}
        onClose={pending ? undefined : onClose}
        header={label}
        footer={
          <div className={Config.Css.css({ display: "flex", justifyContent: "flex-end" })}>
            <Uu5Elements.Button
              icon={withEmail ? "uugds-send" : "uugds-check"}
              colorScheme="primary"
              significance="highlighted"
              disabled={!canSend}
              onClick={send}
              // Button nebere `width` podle velikosti obrazovky (jen řetězec / číslo).
              width={screenSize === "xs" ? "100%" : undefined}
            >
              {!withEmail ? t.save : sentAt ? t.sendAgain : t.send}
            </Uu5Elements.Button>
          </div>
        }
      >
        {!item ? (
          <Uu5Elements.Pending />
        ) : (
          <>
            <Uu5Elements.Grid rowGap={16}>
              {!available && (
                <Uu5Elements.HighlightedBox colorScheme="warning">
                  <Lsi lsi={lsi("admin", "sendEmail", "unavailable")} />
                </Uu5Elements.HighlightedBox>
              )}

              <ReservationInfo item={item} price={item.totalPrice} />
              <ModalDivider />

              <PaymentSection>
                {email === "balanceReminder" && (
                  <PaymentRow kind="deposit" amount={item.depositAmount} paidDate={item.depositPaidDate} dueDate={item.depositDueDate} today={today} />
                )}
                {reminder && <DueAlert item={item} today={today} paymentLsi={paymentLsi} />}
                {fullDue && (
                  <>
                    <Uu5Elements.HighlightedBox colorScheme="warning" icon={EMAIL_ACTION_META[email]?.icon}>
                      <Lsi lsi={lsi("admin", "sendEmail", "phase", "fullDue")} />
                    </Uu5Elements.HighlightedBox>
                    <Uu5Elements.Text category="interface" segment="content" type="medium">
                      {t.fullAmount}{" "}
                      <strong>
                        <Price value={fullDue.amount} />
                      </strong>
                      {", "}
                      {fullDue.dueDate ? (
                        <>
                          {paymentLsi.dueOn} <DateValue value={fullDue.dueDate} />
                        </>
                      ) : (
                        t.fullAsap
                      )}
                    </Uu5Elements.Text>
                  </>
                )}
                {/* Nedostupná připomínka (rezervace se mezitím změnila) nemá co uložit -- pole by jen mátla. */}
                {reminder && available && !fullDue && (
                  <AmountDate
                    amountLabel={email === "balanceReminder" ? paymentLsi.kind?.balance : isFullPayment(item) ? transitionLsi.amount : paymentLsi.kind?.deposit}
                    amount={amount}
                    onAmountChange={setAmount}
                    dateLabel={transitionLsi.dueOn}
                    date={dueDate}
                    onDateChange={setDueDate}
                    dateInfo={transitionLsi.dueDateInfo}
                  />
                )}
                {arrival && <PaymentRows item={item} today={today} />}
                {arrival && balanceUnpaid && (
                  <Uu5Elements.HighlightedBox colorScheme="warning" icon="uugds-clock">
                    <Lsi lsi={lsi("admin", "sendEmail", "balanceUnpaid")} />
                  </Uu5Elements.HighlightedBox>
                )}
              </PaymentSection>

              {available && previewReady && preview.error && (
                <Uu5Elements.HighlightedBox colorScheme="negative">{preview.error}</Uu5Elements.HighlightedBox>
              )}

              {available && withEmail && previewReady && preview.wifiMissing && (
                <Uu5Elements.HighlightedBox colorScheme="building">
                  <Lsi lsi={lsi("admin", "sendEmail", "wifiMissing")} />{" "}
                  <Uu5Elements.Link onClick={() => setRoute("settings")}>
                    <Lsi lsi={lsi("admin", "sendEmail", "settingsLink")} />
                  </Uu5Elements.Link>
                </Uu5Elements.HighlightedBox>
              )}

              {available && (
                <>
                  <ModalDivider />
                  {sentAt && (
                    <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building" significance="subdued">
                      <Lsi lsi={lsi("admin", "sendEmail", "lastSent")} />{" "}
                      <Uu5Elements.DateTime value={sentAt} dateFormat="medium" timeFormat="short" timeZone="Europe/Prague" />
                    </Uu5Elements.Text>
                  )}
                  <EmailSection
                    item={item}
                    sendEmail={withEmail}
                    onSendEmailChange={setSendEmail}
                    alwaysSend={alwaysSend}
                    lang={lang}
                    onLangChange={setLang}
                    message={message}
                    onMessageChange={setMessage}
                    email={shownEmail}
                    loading={keyCodeValid && planValid && !(previewReady && preview.error)}
                    onPreview={() => setPreviewOpen(true)}
                    extra={arrival ? (off) => <KeyCodeInput value={keyCode} onChange={setKeyCode} off={off} invalid={Boolean(keyCode) && !keyCodeValid} /> : undefined}
                  />
                </>
              )}
            </Uu5Elements.Grid>

            {/* Náhled je vždy ten, který odejde: znovu se načte při změně zprávy, jazyka nebo kódu. */}
            {previewOpen && shownEmail && <EmailPreviewModal email={shownEmail} onClose={() => setPreviewOpen(false)} />}
          </>
        )}
      </Uu5Elements.Modal>
    );
  },
});

export default EmailModal;
