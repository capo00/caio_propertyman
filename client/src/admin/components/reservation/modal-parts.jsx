import { Lsi, useLanguage, useLsi, useScreenSize } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../../config/config.js";
import importLsi, { lsi } from "../../../lsi/import-lsi.js";
import { countLabel, DateValue, isFullPayment, languageItemList, Price } from "./fields.jsx";

// Společné části modalu změny stavu a modalu ručního e-mailu (schválený návrh majitelky
// 2026-11-24):
//
//   jméno  termín                    (na telefonu pod sebou)
//   noci · osoby              cena   (cenu jde změnit jen při přijetí žádosti)
//   ───
//   poznámka hosta / platby          (podle akce, skládá volající)
//   ───
//   [x] Poslat e-mail          [CS]
//   Komu, Předmět, zpráva hostovi, náhled
//
// Odškrtnutý e-mail pole nechá vidět, jen je zašedí a zruší jejich povinnost.

const css = {
  // Jméno a termín: na telefonu pod sebou, jinak na jednom řádku s termínem vpravo -- zarovnaný
  // s cenou pod ním (stejné odsazení zprava jako číslo ceny).
  head: (phone) =>
    Config.Css.css(
      phone
        ? { display: "grid", rowGap: 2 }
        : { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "baseline", columnGap: 16, "& > :last-child": { paddingRight: 9, textAlign: "right" } },
    ),
  // Cena: na 9 číslic, pevná i v poli na stejném místě a ve stejném formátu.
  price: () => Config.Css.css({ width: 140, "& input": { textAlign: "right", fontWeight: 700 } }),
  priceFixed: () =>
    Config.Css.css({ width: 140, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, paddingRight: 9, boxSizing: "border-box" }),
  priceValue: () => Config.Css.css({ fontWeight: 700 }),
  priceUnit: () => Config.Css.css({ opacity: 0.7 }),
  note: () => Config.Css.css({ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }),
  emailMeta: () => Config.Css.css({ display: "grid", gap: 4, overflowWrap: "anywhere" }),
  off: () => Config.Css.css({ opacity: 0.45 }),
};

const NUMBER_CS = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });

/** Nejvyšší částka, kterou server bere (server/reservation/api.js `readAmount`). */
const MAX_AMOUNT = 10_000_000;

export function useIsPhone() {
  const [screenSize] = useScreenSize();
  return screenSize === "xs";
}

export function ModalDivider() {
  return <Uu5Elements.Line significance="subdued" />;
}

export function SectionTitle({ icon, children }) {
  return (
    <Uu5Elements.Text category="interface" segment="title" type="micro" colorScheme="building">
      <Uu5Elements.Icon icon={icon} /> {children}
    </Uu5Elements.Text>
  );
}

/**
 * Údaje o rezervaci nahoře v modalu.
 * @param price          zobrazená cena (při přijetí ta z pole)
 * @param onPriceChange  jen u přijetí žádosti: cena je pole, jinak pevný text
 */
export function ReservationInfo({ item, price, onPriceChange, priceFeedback }) {
  const [language] = useLanguage();
  const phone = useIsPhone();
  const reservationLsi = useLsi(importLsi, ["admin", "reservation"]) ?? {};
  const counts = [
    item.nights != null && countLabel(reservationLsi.nightsCount, item.nights, language),
    item.guestCount != null && countLabel(reservationLsi.guestCountLabel, item.guestCount, language),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Uu5Elements.Grid rowGap={4}>
      <div className={css.head(phone)}>
        <Uu5Elements.Text category="interface" segment="title" type="common">
          {item.contactName ?? "—"}
        </Uu5Elements.Text>
        <Uu5Elements.Text category="interface" segment="content" type="large">
          <DateValue value={item.dateFrom} /> – <DateValue value={item.dateTo} />
        </Uu5Elements.Text>
      </div>
      <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" alignItems="center" columnGap={12}>
        <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building" significance="subdued">
          {counts}
        </Uu5Elements.Text>
        {onPriceChange ? (
          <div className={css.price()}>
          <Uu5Forms.Number
            value={price}
            onChange={(e) => onPriceChange(e.data.value ?? null)}
            suffix="Kč"
            min={1}
            max={MAX_AMOUNT}
            required
            width="100%"
            feedback={priceFeedback}
            inputAttrs={{ "aria-label": reservationLsi.totalPrice }}
          />
          </div>
        ) : (
          <div className={css.priceFixed()}>
            <span className={css.priceValue()}>{price != null ? NUMBER_CS.format(price) : "—"}</span>
            <span className={css.priceUnit()}>Kč</span>
          </div>
        )}
      </Uu5Elements.Grid>
    </Uu5Elements.Grid>
  );
}

export function GuestNoteSection({ note }) {
  return (
    <Uu5Elements.Grid rowGap={6}>
      <SectionTitle icon="uugds-comment-text">
        <Lsi lsi={lsi("admin", "section", "guestNote")} />
      </SectionTitle>
      {note ? (
        <p className={css.note()}>{note}</p>
      ) : (
        <Uu5Elements.Text colorScheme="building" significance="subdued">
          <Lsi lsi={lsi("admin", "transition", "noNote")} />
        </Uu5Elements.Text>
      )}
    </Uu5Elements.Grid>
  );
}

export function PaymentSection({ children }) {
  return (
    <Uu5Elements.Grid rowGap={12}>
      <SectionTitle icon="uugds-credit-card">
        <Lsi lsi={lsi("admin", "section", "payment")} />
      </SectionTitle>
      {children}
    </Uu5Elements.Grid>
  );
}

/**
 * Řádek platby: „Záloha 3 000 Kč“ a vpravo stav (zaplaceno dne / nezaplaceno).
 * @param kind  `deposit` | `balance` | `full` (popisek z `admin.payment.kind`)
 */
export function PaymentRow({ kind, amount, paidDate, dueDate, today }) {
  const paymentLsi = useLsi(importLsi, ["admin", "payment"]) ?? {};
  const overdue = !paidDate && dueDate && dueDate < today;
  return (
    <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" alignItems="center" columnGap={8}>
      <Uu5Elements.Text category="interface" segment="content" type="medium">
        {paymentLsi.kind?.[kind]}{" "}
        <strong>
          <Price value={amount} />
        </strong>
      </Uu5Elements.Text>
      {paidDate ? (
        <Uu5Elements.Tag colorScheme="positive" significance="distinct" icon="uugds-check-circle" size="s">
          {paymentLsi.status?.paid} <DateValue value={paidDate} />
        </Uu5Elements.Tag>
      ) : (
        <Uu5Elements.Tag colorScheme={overdue ? "negative" : "warning"} significance="distinct" icon={overdue ? "uugds-alert-circle" : "uugds-clock"} size="s">
          {paymentLsi.status?.[overdue ? "overdue" : "unpaid"]}
        </Uu5Elements.Tag>
      )}
    </Uu5Elements.Grid>
  );
}

/** Záloha a doplatek (nebo celá částka) se stavem. */
export function PaymentRows({ item, today }) {
  if (item.depositAmount == null) return null;
  if (isFullPayment(item)) {
    return <PaymentRow kind="full" amount={item.depositAmount} paidDate={item.depositPaidDate} dueDate={item.depositDueDate} today={today} />;
  }
  return (
    <>
      <PaymentRow kind="deposit" amount={item.depositAmount} paidDate={item.depositPaidDate} dueDate={item.depositDueDate} today={today} />
      <PaymentRow kind="balance" amount={item.balanceAmount} paidDate={item.balancePaidDate} dueDate={item.balanceDueDate} today={today} />
    </>
  );
}

/**
 * Částka a datum vedle sebe (přijatá platba / připomínka). Na telefonu v poměru 2 : 3, ať se
 * datum vejde celé.
 */
export function AmountDate({ amountLabel, amount, onAmountChange, amountInfo, amountFeedback, amountMessage, dateLabel, date, onDateChange, dateInfo, dateFeedback, dateMessage, min, max }) {
  const phone = useIsPhone();
  return (
    <Uu5Elements.Grid templateColumns={phone ? "minmax(0, 2fr) minmax(0, 3fr)" : "repeat(2, minmax(0, 1fr))"} columnGap={12} alignItems="start">
      <Uu5Forms.Number
        label={amountLabel}
        value={amount}
        onChange={(e) => onAmountChange(e.data.value ?? null)}
        suffix="Kč"
        min={1}
        max={MAX_AMOUNT}
        required
        infoMessage={amountFeedback ? undefined : amountInfo}
        feedback={amountFeedback}
        message={amountMessage}
      />
      <Uu5Forms.Date
        label={dateLabel}
        value={date}
        onChange={(e) => onDateChange(e.data.value ?? "")}
        min={min}
        max={max}
        required
        infoMessage={dateFeedback ? undefined : dateInfo}
        feedback={dateFeedback}
        message={dateMessage}
      />
    </Uu5Elements.Grid>
  );
}

/** „Splatnost 20. 11. 2026“ pod polem data. */
export function DueInfo({ date }) {
  if (!date) return null;
  return (
    <>
      <Lsi lsi={lsi("admin", "transition", "dueOn")} /> <DateValue value={date} />
    </>
  );
}

/**
 * E-mail hostovi.
 * @param email      načtený náhled (`{ to, subject }`), undefined = načítá se
 * @param alwaysSend e-mail se odešle vždy, bez zaškrtávátka (informace k příjezdu -- bez e-mailu
 *                   modal nic nedělá)
 * @param extra      (off) => pole navíc nad zprávou (kód ke schránce)
 * @param loading    náhled se načítá (false = chybí vstup nebo náhled skončil chybou, předmět je „—“)
 */
export function EmailSection({ item, sendEmail, onSendEmailChange, alwaysSend, lang, onLangChange, message, onMessageChange, email, extra, onPreview, loading = true }) {
  const off = !alwaysSend && !sendEmail;
  const reservationLsi = useLsi(importLsi, ["admin", "reservation"]) ?? {};
  const transitionLsi = useLsi(importLsi, ["admin", "transition"]) ?? {};
  return (
    <Uu5Elements.Grid rowGap={12}>
      <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" alignItems="center" columnGap={12}>
        {alwaysSend ? (
          <SectionTitle icon="uugds-email">{transitionLsi.email}</SectionTitle>
        ) : (
          <Uu5Forms.Checkbox box={false} label={transitionLsi.sendEmail} value={sendEmail} onChange={(e) => onSendEmailChange(e.data.value)} />
        )}
        <Uu5Forms.Select
          value={lang}
          onChange={(e) => onLangChange(e.data.value)}
          // Jen zkratka (CS) -- vedle zaškrtávátka není na celý název místo; celý je v nabídce.
          itemList={languageItemList(item.emailLanguageList).map((it) => ({ ...it, selectedChildren: String(it.value).toUpperCase() }))}
          size="s"
          width={84}
          required={!off}
          disabled={off}
          // Bez viditelného popisku: název pro čtečku musí být na ovládacím prvku, ne na obalu.
          inputAttrs={{ "aria-label": reservationLsi.lang }}
        />
      </Uu5Elements.Grid>

      <div className={[css.emailMeta(), off && css.off()].filter(Boolean).join(" ")}>
        <Uu5Elements.Text category="interface" segment="content" type="medium">
          <Uu5Elements.Text colorScheme="building" significance="subdued">
            {transitionLsi.to}{" "}
          </Uu5Elements.Text>
          {email?.to ?? item.contactEmail}
        </Uu5Elements.Text>
        <Uu5Elements.Text category="interface" segment="content" type="medium">
          <Uu5Elements.Text colorScheme="building" significance="subdued">
            {transitionLsi.subject}{" "}
          </Uu5Elements.Text>
          {email ? <strong>{email.subject}</strong> : loading ? <Uu5Elements.Pending size="xs" /> : "—"}
        </Uu5Elements.Text>
      </div>

      {extra?.(off)}

      <Uu5Forms.TextArea
        placeholder={reservationLsi.message}
        value={message}
        onChange={(e) => onMessageChange(e.data.value ?? "")}
        rows={2}
        autoResize
        maxLength={2000}
        disabled={off}
        inputAttrs={{ "aria-label": reservationLsi.message }}
      />

      <div>
        {off || !email ? (
          <Uu5Elements.Text colorScheme="building" significance="subdued" className={off ? css.off() : undefined}>
            {transitionLsi.preview}
          </Uu5Elements.Text>
        ) : (
          <Uu5Elements.Link onClick={onPreview}>{transitionLsi.preview}</Uu5Elements.Link>
        )}
      </div>
    </Uu5Elements.Grid>
  );
}

/** Kód ke schránce: na telefonu popisek nad polem, jinak vedle v poměru 1 : 2. */
export function KeyCodeInput({ value, onChange, off, invalid }) {
  const phone = useIsPhone();
  return (
    <Uu5Forms.Text
      label={<Lsi lsi={lsi("admin", "reservation", "keyCode")} />}
      layout={phone ? "vertical" : "1:2"}
      value={value}
      maxLength={10}
      required={!off}
      disabled={off}
      inputAttrs={{ inputMode: "numeric", autoComplete: "off" }}
      onChange={(e) => onChange((e.data.value ?? "").trim())}
      feedback={!off && invalid ? "error" : undefined}
      message={!off && invalid ? <Lsi lsi={lsi("admin", "sendEmail", "keyCodeInvalid")} /> : undefined}
    />
  );
}
