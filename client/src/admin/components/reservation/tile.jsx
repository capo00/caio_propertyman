import { createVisualComponent, Lsi, useElementSize, useLanguage, useLsi, useState, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Config from "../../../config/config.js";
import importLsi, { lsi } from "../../../lsi/import-lsi.js";
import { arrivalStatus, countLabel, daysLabel, DateValue, dueStatus, dueWhen, Price, SOURCE_LIST, StateTag, todayIso } from "./fields.jsx";

// Dlaždice rezervace v seznamu na telefonu (docs/proposal-admin-reservation-tile.md, majitel
// 2026-11-19). Props dává caio-ui Crud (`TileSlot`): `data` (záznam v `data.data`), `actionList`
// (hotové akce, stejné jako v řádku tabulky) a `onClick` (klik na dlaždici otevře detail).
//
//   jméno (odkaz na detail)            stav
//   příjezd – odjezd                   cena
//   Příjezd za 2 dny · 3 noci · 4 osoby · Web
//   platba na řadě / u storna kolik vrátit hostovi
//   ────────────────────────────────────────────
//   [akce, které jsou na řadě]          [✎] [⋮]
//
// Footer: akční tlačítka (výrazná, `collapsed: "never"`) vlevo, ostatní ActionGroup vpravo
// (úprava a menu ⋮). Když se akční tlačítka s textem a tužka nevejdou vedle sebe, jde tužka
// do menu; teprve pak se akční tlačítka zkracují na ikony (majitel 2026-11-19).

const GAP = 8;

const css = {
  footer: () => Config.Css.css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: GAP, width: "100%" }),
  // `minWidth: 0`: bez něj by se levá skupina nezúžila a ActionGroup by nezkracoval na ikony.
  primary: () => Config.Css.css({ flex: "1 1 auto", minWidth: 0 }),
  rest: () => Config.Css.css({ flex: "0 0 auto", marginLeft: "auto" }),
};

const isPrimary = (action) => action.collapsed === "never" && action.significance === "highlighted";
const isEdit = (action) => action.icon === "uugds-pencil";

/**
 * Footer dlaždice. ActionGroup sám neumí rozdělit tlačítka doleva a doprava (kontejner tlačítek
 * má šířku obsahu), proto dvě skupiny. O tužce rozhoduje porovnání plných šířek obou skupin
 * (`onMeasure` `maxWidth`) se šířkou footeru.
 */
function TileFooter({ actionList }) {
  const { ref, width } = useElementSize();
  const [primaryWidth, setPrimaryWidth] = useState();
  const [restWidth, setRestWidth] = useState();

  const primaryList = actionList.filter(isPrimary);
  const restList = actionList.filter((action) => !isPrimary(action));
  const editFits = !primaryList.length || width == null || primaryWidth == null || restWidth == null || primaryWidth + GAP + restWidth <= width;

  const restItemList = restList.map((action) =>
    // V menu potřebuje text: Crud ho tužce v řádku nedává (jen tooltip).
    isEdit(action) && !editFits ? { ...action, collapsed: "always", children: action.children ?? action.tooltip } : action,
  );

  return (
    <div ref={ref} className={css.footer()}>
      {primaryList.length > 0 && (
        <div className={css.primary()}>
          <Uu5Elements.ActionGroup alignment="left" itemList={primaryList} onMeasure={(e) => setPrimaryWidth(e.data.maxWidth)} />
        </div>
      )}
      {restItemList.length > 0 && (
        <div className={css.rest()}>
          <Uu5Elements.ActionGroup
            itemList={restItemList}
            // Šířka i s tužkou: s tužkou v menu je skupina užší a porovnání by se rozkmitalo.
            onMeasure={(e) => editFits && setRestWidth(e.data.maxWidth)}
          />
        </div>
      )}
    </div>
  );
}

/** Platba na řadě. Hoří (po splatnosti, dnes, zítra) = tučně s barevnou ikonou, jinak tichý řádek. */
function DueLine({ item, today, paymentLsi, language }) {
  const due = dueStatus(item, today);
  if (!due) return null;

  if (due.code === "upcoming") {
    return (
      <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building">
        {paymentLsi.kind?.[due.kind]} <Price value={due.amount} />, {paymentLsi.dueOn} <DateValue value={due.date} />
      </Uu5Elements.Text>
    );
  }

  const overdue = due.code === "overdue";
  // Text v building, barvu nese jen ikona: červený nebo oranžový text by měl kontrast pod 4,5 : 1.
  return (
    <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building" bold>
      <Uu5Elements.Icon icon={overdue ? "uugds-alert-circle" : "uugds-clock"} colorScheme={overdue ? "negative" : "warning"} />{" "}
      {paymentLsi.kind?.[due.kind]} <Price value={due.amount} /> {dueWhen(due, today, paymentLsi, language)}
    </Uu5Elements.Text>
  );
}

/** Stornovaná rezervace: kolik vrátit hostovi (majitel 2026-11-19). Jen když host něco zaplatil. */
function RefundLine({ item }) {
  const cancellation = item.state === "cancelled" ? item.cancellation : null;
  if (!cancellation?.paid) return null;
  return (
    <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building">
      <Lsi lsi={lsi("admin", "cancellation", "refundTitle")} />{" "}
      <strong>
        <Price value={cancellation.refund} />
      </strong>
    </Uu5Elements.Text>
  );
}

const ReservationTile = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationTile",

  /** @param feedNameMap  `{ [kód feedu]: název }` pro titulek importu */
  render({ data, actionList, onClick, feedNameMap }) {
    const [language] = useLanguage();
    const reservationLsi = useLsi(importLsi, ["admin", "reservation"]) ?? {};
    const paymentLsi = useLsi(importLsi, ["admin", "payment"]) ?? {};
    const item = data?.data;
    // Načítání kreslí caio-ui (placeholder), tohle je jen pojistka.
    if (!item) return null;

    const today = todayIso();
    const imported = item.icalFeedCode != null;
    const isGuest = !imported && Boolean(item.contactName || item.contactEmail || item.contactPhone);

    const title = isGuest ? (
      item.contactName || <Lsi lsi={lsi("admin", "reservation", "detail")} />
    ) : imported ? (
      feedNameMap?.[item.source] ?? item.source
    ) : item.reason ? (
      <Lsi lsi={lsi("admin", "reason", item.reason)} />
    ) : (
      <Lsi lsi={lsi("admin", "reservation", "blockTag")} />
    );

    // Příjezd jen u hosta (i z portálu); u blokace („Údržba“) by „Příjezd za…“ nedával smysl.
    const arrival = isGuest || imported ? arrivalStatus(item, today) : null;
    const meta = [
      arrival &&
        (arrival.code === "in"
          ? Utils.String.format(reservationLsi.arrival?.in ?? "", { days: daysLabel(arrival.days, language) })
          : reservationLsi.arrival?.[arrival.code]),
      item.nights != null && countLabel(reservationLsi.nightsCount, item.nights, language),
      isGuest && item.guestCount != null && countLabel(reservationLsi.guestCountLabel, item.guestCount, language),
      isGuest && (SOURCE_LIST.includes(item.source) ? <Lsi key="source" lsi={lsi("admin", "source", item.source)} /> : item.source),
      // Rezervace hosta s typem záznamu = založená v zastoupení hosta (jako v souhrnu).
      isGuest && item.reason && <Lsi key="reason" lsi={lsi("admin", "reason", item.reason)} />,
    ]
      .filter(Boolean)
      .flatMap((part, i) => (i ? [" · ", part] : [part]));

    return (
      <Uu5Elements.Tile
        borderRadius="moderate"
        onClick={onClick}
        footer={actionList?.length ? <TileFooter actionList={actionList} /> : undefined}
        footerSeparator
      >
        <Uu5Elements.Grid rowGap={4}>
          <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" columnGap={8} alignItems="start">
            <Uu5Elements.Text category="interface" segment="title" type="micro">
              <Uu5Elements.Link href={`reservation?id=${item.id}`}>{title}</Uu5Elements.Link>
            </Uu5Elements.Text>
            {isGuest ? (
              <StateTag state={item.state} item={item} />
            ) : (
              <Uu5Elements.Tag colorScheme="building" significance="distinct" icon="uugds-calendar" size="s">
                <Lsi lsi={lsi("admin", "reservation", imported ? "importTag" : "blockTag")} />
              </Uu5Elements.Tag>
            )}
          </Uu5Elements.Grid>

          <Uu5Elements.Grid templateColumns="minmax(0, 1fr) auto" columnGap={8} alignItems="baseline">
            <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building">
              <DateValue value={item.dateFrom} /> – <DateValue value={item.dateTo} />
            </Uu5Elements.Text>
            {isGuest && item.totalPrice != null && (
              <Uu5Elements.Text category="interface" segment="content" type="medium" colorScheme="building">
                <Price value={item.totalPrice} />
              </Uu5Elements.Text>
            )}
          </Uu5Elements.Grid>

          {meta.length > 0 && (
            <Uu5Elements.Text category="interface" segment="content" type="small" colorScheme="building">
              {meta}
            </Uu5Elements.Text>
          )}

          {isGuest && <DueLine item={item} today={today} paymentLsi={paymentLsi} language={language} />}
          {isGuest && <RefundLine item={item} />}
        </Uu5Elements.Grid>
      </Uu5Elements.Tile>
    );
  },
});

export default ReservationTile;
