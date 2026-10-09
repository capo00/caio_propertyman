import { createVisualComponent, Lsi, useEffect, useLsi, useState } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../../config/config.js";
import importLsi, { lsi } from "../../../lsi/import-lsi.js";
import { getReservation, previewReservationEmail, transitionReservation } from "../../calls.js";
import ReservationSummary, { CancellationInfo } from "./summary.jsx";
import EmailPreviewModal from "./email-preview-modal.jsx";
import { ACTION_META, languageItemList, todayIso, actionLabelCode } from "./fields.jsx";

// Modál změny stavu (docs/proposal-reservation-flow.md § 6, rozhodnutí majitele 2026-10-08):
// všechny údaje o rezervaci, pod nimi e-mail hostovi (zaškrtávátko, jazyk, zpráva, odkaz na
// náhled v samostatném modálu)
// a v patičce tlačítka všech povolených akcí.
//
// Vybraná akce je zvýrazněná a náhled ukazuje JEJÍ e-mail. Klik na jinou akci ji nejdřív
// vybere (a přepne náhled), teprve klik na vybranou ji provede.
//
// Pravidlo, které hlídá, že neodejde e-mail, který vlastník neviděl (oponentní review E3):
// provést jde jen tehdy, když je načtený náhled PŘESNĚ pro aktuální akci, jazyk, zprávu
// a datum zaplacení (`previewKey`). Do té doby je tlačítko neaktivní -- dvojklik na jinou akci
// ji tak jen vybere. A e-mail se pošle jen tehdy, když ho náhled ukázal (`sendEmail` jinak
// výslovně false, nikdy „nevyplněno“, které by server vzal jako ano).

const PAID_ACTIONS = new Set(["markDepositPaid", "markBalancePaid"]);

const css = {
  controls: () => Config.Css.css({ display: "grid", gap: 12, marginTop: 20 }),
  email: () => Config.Css.css({ display: "grid", gap: 2, overflowWrap: "anywhere" }),
};

/**
 * Rozložení patičky (majitel 2026-10-09, varianta b):
 * - telefon (xs): vybraná akce přes celou šířku nahoře, ostatní pod ní vedle sebe a vyplní řádek;
 *   šířky v poměru délky popisku (`fr`), ať se delší text nezalomí a kratší tlačítko nebobtná;
 * - širší: všechno v jednom řádku doprava, vybraná akce úplně vpravo.
 * Rezerva 4 znaky na ikonu.
 */
function footerLayout(mainCode, otherCodes, labelOf) {
  const others = otherCodes.map((code, i) => [`o${i}`, (labelOf(code)?.length ?? 10) + 4]);
  const otherAreas = others.map(([area]) => area).join(" ");
  // Bez vybrané akce (stav se mezitím změnil) jsou všechny akce rovnocenné v jednom řádku.
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

/** Jazyk e-mailu: jazyk rezervace, když pro něj jsou šablony, jinak první dostupný (Select by jinak zůstal prázdný). */
function emailLang(data) {
  const list = data.emailLanguageList?.length ? data.emailLanguageList : ["cs"];
  return list.includes(data.lang) ? data.lang : list[0];
}

/**
 * Výsledek e-mailu z poslední události → alert. null = e-mail odešel nebo nebyl. Jen když je
 * poslední událost opravdu tahle akce -- jinak by alert hlásil e-mail předchozí události.
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
   * @param id      rezervace
   * @param action  akce, kterou se modál otevřel (předvybraná)
   * @param onDone  (item) => …, po provedené akci (reload seznamu / detailu)
   */
  render({ id, action: initialAction, onClose, onDone }) {
    const { addAlert } = Uu5Elements.useAlertBus();
    const transitionLsi = useLsi(importLsi, ["admin", "transition"]);
    const actionLsi = useLsi(importLsi, ["admin", "action"]);

    const [item, setItem] = useState();
    const [action, setAction] = useState(initialAction);
    const [sendEmail, setSendEmail] = useState(true);
    const [lang, setLang] = useState();
    const [message, setMessage] = useState("");
    const [paidDate, setPaidDate] = useState(todayIso());
    // Poslední načtený náhled: pro jaké parametry (`key`) a jakou akci, e-mail (null = akce
    // e-mail nemá) nebo chyba (např. přijetí bez ceny).
    const [preview, setPreview] = useState({ key: null, action: null, email: undefined, error: null });
    const [pending, setPending] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    // Akce, se kterou se modál otevřel, mezitím přestala platit (stav změnil jiný tab / zařízení).
    // Pak se nic nepředvybírá -- jinak by druhý klik na stejné místo provedl jinou akci.
    const [stale, setStale] = useState(false);

    function applyFresh(data, wanted) {
      setItem(data);
      if (!data.actionList.includes(wanted)) {
        setAction(null);
        setStale(true);
        // Seznam / detail pod modálem ukazuje starý stav -- ať se obnoví hned, ne až po akci.
        onDone?.(data);
      }
    }

    const isPaidAction = PAID_ACTIONS.has(action);
    const previewKey = JSON.stringify({ action, lang, message, paidDate: isPaidAction ? paidDate : null });
    const previewReady = preview.key === previewKey;
    // Co ukázat: náhled téže akce (i když se zrovna načítá nový kvůli změně zprávy -- jinak by
    // pole zprávy při psaní mizelo). Pro jinou akci undefined = načítá se.
    const shownEmail = preview.action === action ? preview.email : undefined;
    // Nulová cena je totéž co žádná: záloha by vyšla 0 Kč (server ji odmítne taky).
    const missingPrice = action === "approve" && item && !(item.totalPrice > 0);
    const paidDateMissing = isPaidAction && !paidDate;
    const canRun = Boolean(item) && Boolean(action) && previewReady && !preview.error && !pending && !missingPrice && !paidDateMissing;

    // Čerstvá data při otevření -- seznam může být pár minut starý.
    useEffect(() => {
      let cancelled = false;
      getReservation(id)
        .then((data) => {
          if (cancelled) return;
          setLang(emailLang(data));
          applyFresh(data, initialAction);
        })
        .catch((e) => !cancelled && addAlert({ message: e.message, priority: "error" }));
      return () => {
        cancelled = true;
      };
    }, [id]);

    // Náhled e-mailu vybrané akce. Zpráva se do náhledu promítá s krátkým zpožděním; do té doby
    // `previewReady` není true a akci provést nejde.
    useEffect(() => {
      if (!item || !action || paidDateMissing) return undefined;
      let cancelled = false;
      const key = previewKey;
      const forAction = action;
      const timer = setTimeout(() => {
        previewReservationEmail({ id, action, lang, message: message || undefined, ...(isPaidAction ? { paidDate } : null) })
          .then((data) => !cancelled && setPreview({ key, action: forAction, email: data.email, error: null }))
          .catch((e) => !cancelled && setPreview({ key, action: forAction, email: undefined, error: e.message }));
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [item, previewKey]);

    async function run() {
      if (!canRun) return;
      // E-mail jen ten, který náhled ukázal. Zpráva a jazyk jen s ním -- s vypnutým e-mailem by
      // se zpráva zapsala do historie a jazyk rezervace změnil, i když jsou pole schovaná.
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
        addAlert({ message: e.message, priority: "error" });
        // Stav se mezitím mohl změnit (409) -- načíst znovu, ať modál ukazuje pravdu.
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
    // Bez „Zavřít“: modál se zavírá křížkem v hlavičce (majitel 2026-10-09).
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
                // Vybraná akce jde provést až s náhledem pro aktuální nastavení; ostatní jde vybrat vždy.
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
                  // Prázdné pole se drží (jde smazat a napsat znovu); provést jde až s datem.
                  onChange={(e) => setPaidDate(e.data.value ?? "")}
                  required
                />
              )}

              {/* Storno: poplatek a vratka podle podmínek ke dnešku -- totéž se zapíše při stornu. */}
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

            {/* Náhled je vždy ten, který odejde: při změně zprávy nebo jazyka se načte znovu. */}
            {previewOpen && shownEmail && <EmailPreviewModal email={shownEmail} onClose={() => setPreviewOpen(false)} />}
          </>
        )}
      </Uu5Elements.Modal>
    );
  },
});

export default TransitionModal;
