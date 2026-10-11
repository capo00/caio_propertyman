import { createVisualComponent, useState, useEffect, useRef, useLsi, useLanguage, Lsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import { useReCaptcha } from "uu5extrasg01";
import Config from "../../config/config.js";
import Calls, { errorCodeOf } from "../../calls.js";
import Button from "../button.jsx";
import importLsi, { lsi } from "../../lsi/import-lsi.js";
import { toIsoDate } from "../availability-calendar.jsx";
import { nightsForm } from "../../tools/nights.js";

const { theme } = Config;


// Rezervační formulář. Jediná část webu, která zapisuje data.
//
// Cena se přepočítává průběžně, ale je jen ORIENTAČNÍ -- závaznou spočítá server znovu
// při reservation/create a hodnotu z klienta ignoruje. Kdyby se rozešly, platí serverová.

const MIN_NIGHTS = 2;
// Musí sedět se `capacity.max` v server/config.js (9 lůžek + 1 přistýlka), jinak formulář
// pustí dál číslo, které server odmítne.
const MAX_GUESTS = 10;

// Kód chyby ze services/stay-rules.js → klíč hlášky v LSI `form`.
const STAY_PROBLEMS = {
  "caio-propertyman/stay/christmasMinNights": "christmasMinNights",
  "caio-propertyman/stay/summerWeekOnly": "summerWeekOnly",
};

// reCAPTCHA v3 action. Musí být stejná jako na serveru -- ten ověřuje proti názvu use casu.
const CAPTCHA_ACTION = "reservation/create";

// Částky sází Uu5Elements.Number podle jazyka aplikace -- proto tu není žádné vlastní
// formátování ani natvrdo psané "Kč"/"cs-CZ". `maxDecimalDigits={0}` je povinné, jinak
// Intl u měny přidá haléře.
function Price({ value }) {
  return <Uu5Elements.Number value={value} currency="CZK" currencyFormat="symbol" maxDecimalDigits={0} />;
}

/** Potvrzení po odeslání. Musí být jasné, že termín JEŠTĚ NENÍ potvrzený. */
function Confirmation({ result, onReset }) {
  return (
    <div className={Config.Css.css({ display: "grid", gap: 16, placeItems: "start" })}>
      <Uu5Elements.Icon icon="uugds-check-circle" className={Config.Css.css({ fontSize: 40, color: theme.color.primary })} />
      <h3 className={Config.Css.css({ ...theme.text.h3, margin: 0 })}>
        <Lsi lsi={lsi("form", "confirmationHeading")} />
      </h3>
      <p className={Config.Css.css({ ...theme.text.body, color: theme.color.mutedFg, margin: 0 })}>
        <Lsi lsi={lsi("form", "confirmationInfo")} />
      </p>
      {result?.totalPrice > 0 && (
        <p className={Config.Css.css({ ...theme.text.small, color: theme.color.mutedFg, margin: 0 })}>
          <Lsi lsi={lsi("form", "stayPrice")} />:{" "}
          <strong>
            <Price value={result.totalPrice} />
          </strong>{" "}
          ({result.nights} <Lsi lsi={lsi("form", "nights", nightsForm(result.nights))} />)
        </p>
      )}
      <Button variant="outline" onClick={onReset}>
        <Lsi lsi={lsi("form", "reset")} />
      </Button>
    </div>
  );
}

/**
 * Termín vybraný v kalendáři obsazenosti → pole „stay“ formuláře. Musí být uvnitř
 * Form.Provider (useFormApi). Zapisuje jen jinou hodnotu, než pole má -- jinak by se
 * kalendář a pole navzájem přepisovaly.
 */
function StaySync({ value }) {
  const { value: formValue, setItemValue } = Uu5Forms.useFormApi();
  useEffect(() => {
    if (!value) return;
    const current = formValue?.stay;
    if (current?.[0] === value[0] && current?.[1] === value[1]) return;
    setItemValue("stay", value);
    // eslint-disable-next-line uu5/hooks-exhaustive-deps
  }, [value?.[0], value?.[1]]);
  return null;
}

const ReservationForm = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationForm",

  /**
   * @param stay          termín vybraný v kalendáři obsazenosti ([od, do]) -- propíše se do pole
   * @param onStayChange  ([od, do] | null) => …, když termín změní pole formuláře
   */
  render({ onCreated, stay: externalStay, onStayChange }) {
    const { addAlert } = Uu5Elements.useAlertBus();
    const [confirmation, setConfirmation] = useState(null);
    const [price, setPrice] = useState(null);
    // Termín, který se neprodává (services/stay-rules.js) -- místo částky se ukáže proč.
    const [priceProblem, setPriceProblem] = useState(null);
    const [stay, setStay] = useState(null);
    const [guestCount, setGuestCount] = useState(4);

    // Termín z kalendáře počítá cenu stejně jako termín vybraný v poli.
    useEffect(() => {
      if (externalStay?.[0] && externalStay?.[1]) setStay(externalStay);
    }, [externalStay?.[0], externalStay?.[1]]);
    // Honeypot mimo stav formuláře -- do dtoIn se přidá až při odeslání.
    const honeypotRef = useRef(null);

    // reCAPTCHA v3 (uu5extrasg01). Hook připojí Google skript hned, jak dostane site key --
    // a formulář je na úvodní stránce, takže by se skript (a cookies Googlu) tahal při každé
    // návštěvě. Site key mu proto předáváme až po první interakci s formulářem; do odeslání
    // má skript dost času se načíst a nasbírat signály pro skóre.
    // Bez site key (lokální vývoj bez klíčů) execute() vrátí undefined a server v developmentu
    // token nevyžaduje.
    const [captchaActive, setCaptchaActive] = useState(false);
    const { execute: executeCaptcha } = useReCaptcha({
      siteKey: captchaActive ? (Config.recaptchaSiteKey ?? undefined) : undefined,
    });
    const activateCaptcha = () => !captchaActive && Config.recaptchaSiteKey && setCaptchaActive(true);

    // Celý uzel "form" najednou: popisky polí, hlášky alertů i validační zpráva se tu čtou
    // jako stringy (alert a onValidate potřebují text, ne element), takže jeden hook místo
    // patnácti. useLsi vrátí podstrom, ne jen list.
    const formLsi = useLsi(importLsi, ["form"]);

    // Jazyk hosta: server si ho uloží k rezervaci a posílá v něm e-maily (pokud pro něj má
    // šablonu, jinak česky). Region ("cs-CZ") se odřízne -- server zná jen kódy jazyků.
    const [language] = useLanguage();

    const today = toIsoDate(new Date());

    // Orientační přepočet ceny. Běží až když je termín kompletní -- FormDateRange vrací
    // během výběru [from, undefined].
    useEffect(() => {
      const [from, to] = stay ?? [];
      setPriceProblem(null);
      if (!from || !to || !guestCount) {
        setPrice(null);
        return undefined;
      }

      let cancelled = false;
      Calls.calculatePrice(from, to, guestCount)
        .then((dtoOut) => !cancelled && setPrice(dtoOut))
        // Ostatní chyby tady schválně polykáme: je to jen náhled ceny. Skutečnou validaci
        // dělá server při odeslání a tam se chyba zobrazí u konkrétního pole. Termín, který
        // se neprodává (Vánoce na krátko, léto jinak než na týden), je výjimka -- jinak by
        // host nevěděl, proč cena nenaskočila.
        .catch((err) => {
          if (cancelled) return;
          setPrice(null);
          const problem = STAY_PROBLEMS[errorCodeOf(err)];
          if (problem) setPriceProblem(problem);
        });

      return () => {
        cancelled = true;
      };
    }, [stay, guestCount]);

    async function handleSubmit(e) {
      const value = e.data.value;
      const [dateFrom, dateTo] = value.stay ?? [];

      // Token se bere při každém odeslání znovu -- je jednorázový a platí dvě minuty.
      // Selhání tady je skoro vždy zablokovaný Google skript (adblock); bez kódu chyby by
      // skončilo v obecném "odeslání se nepodařilo", proto zvlášť a se srozumitelnou radou.
      let captchaToken;
      try {
        captchaToken = await executeCaptcha(CAPTCHA_ACTION);
      } catch (err) {
        addAlert({
          header: formLsi.captchaUnavailableHeader,
          message: formLsi.captchaBlockedMessage,
          priority: "error",
        });
        throw err;
      }

      try {
        return await Calls.createReservation({
          dateFrom,
          dateTo,
          guestCount: value.guestCount,
          contact: { name: value.name, email: value.email, phone: value.phone },
          note: value.note,
          website: honeypotRef.current?.value ?? "",
          captchaToken,
          lang: language?.split("-")[0],
        });
      } catch (err) {
        const code = errorCodeOf(err);

        if (code === "caio-propertyman/reservation/dateOccupied") {
          addAlert({
            header: formLsi.occupiedHeader,
            message: formLsi.occupiedMessage,
            priority: "warning",
            durationMs: 8000,
          });
          onCreated?.(); // obnovit kalendář, ať je vidět aktuální obsazenost
        } else if (code === "caio-propertyman/price/notApproved") {
          addAlert({
            header: formLsi.notApprovedHeader,
            message: formLsi.notApprovedMessage,
            priority: "warning",
            durationMs: 10000,
          });
        } else if (code === "caio-server/captcha/failed") {
          addAlert({
            header: formLsi.captchaFailedHeader,
            message: formLsi.captchaFailedMessage,
            priority: "warning",
            durationMs: 10000,
          });
        } else if (code === "caio-server/captcha/unavailable") {
          addAlert({
            header: formLsi.captchaUnavailableHeader,
            message: formLsi.captchaUnavailableMessage,
            priority: "error",
          });
        } else if (code === "caio-propertyman/reservation/rateLimitExceeded") {
          addAlert({ header: formLsi.rateLimitHeader, message: err.message, priority: "warning" });
        } else if (!code) {
          // Bez kódu = síť nebo neošetřená chyba serveru. Validační chyby (400) mají
          // paramMap a uu5g05-forms je zobrazí přímo u pole, tam nic hlásit nemusíme.
          addAlert({
            header: formLsi.failedHeader,
            message: formLsi.failedMessage,
            priority: "error",
          });
        }

        throw err; // formulář zůstane vyplněný a odemkne se
      }
    }

    if (confirmation) {
      return <Confirmation result={confirmation} onReset={() => setConfirmation(null)} />;
    }

    return (
      // Capture na obalu: první fokus nebo klik kamkoli do formuláře zapne captchu
      // (viz activateCaptcha výš). Ruční výběr data v kalendáři je klik, vyplnění pole fokus.
      <div onFocusCapture={activateCaptcha} onPointerDownCapture={activateCaptcha}>
        <Uu5Forms.Form.Provider
          onSubmit={handleSubmit}
          onSubmitted={(e) => {
            setConfirmation(e.data.submitResult);
            onCreated?.();
          }}
          // Form.Provider se sám věší na useRouteLeave, takže rozdělaný formulář vyvolá
          // nativní dialog "Opustit stránku?" při každém odchodu -- i při kliknutí na
          // "Galerie" v menu. V interní aplikaci to dává smysl, na veřejném webu to hosta
          // jen vyděsí a data tu nejsou nijak cenná (nic se nerozpracovává na dlouho).
          disableLeaveConfirmation
        >
          <StaySync value={externalStay} />
          <Uu5Forms.Form.View
            gridLayout={{
              xs: "stay, guestCount, name, email, phone, note, price, submit",
              m: "stay stay, name guestCount, email phone, note note, price price, submit submit",
            }}
          >
            <Uu5Forms.FormDateRange
              name="stay"
              label={lsi("form", "stayLabel")}
              required
              min={today}
              onChange={(e) => {
                const value = e.data.value;
                // Během výběru přijde [from, undefined] -- počítáme až s oběma daty.
                const complete = Array.isArray(value) && value[0] && value[1] ? value : null;
                setStay(complete);
                // Kalendář obsazenosti ukazuje tentýž termín.
                onStayChange?.(complete);
              }}
              onValidate={(e) => {
                const [from, to] = e.data.value ?? [];
                if (!from || !to) return true;
                const nights = Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
                if (nights < MIN_NIGHTS) {
                  return { message: Utils.String.format(formLsi.minNights, { minNights: MIN_NIGHTS }) };
                }
                return true;
              }}
            />

            <Uu5Forms.FormNumber
              name="guestCount"
              label={lsi("form", "guestCountLabel")}
              required
              min={1}
              max={MAX_GUESTS}
              initialValue={4}
              onChange={(e) => setGuestCount(e.data.value)}
            />

            <Uu5Forms.FormText name="name" label={lsi("form", "nameLabel")} required maxLength={200} />

            {/* FormEmail má vlastní regex -- nepřidávat k němu pattern. */}
            <Uu5Forms.FormEmail name="email" label={lsi("form", "emailLabel")} required />

            {/* FormPhone neexistuje. Pattern se v uu5 NEKOTVÍ sám, ^…$ je na nás. */}
            <Uu5Forms.FormText
              name="phone"
              label={lsi("form", "phoneLabel")}
              required
              pattern="^\+?[\d\s()-]{9,20}$"
              inputAttrs={{ type: "tel", inputMode: "tel", autoComplete: "tel" }}
            />

            <Uu5Forms.FormTextArea
              name="note"
              label={lsi("form", "noteLabel")}
              placeholder={formLsi.notePlaceholder}
              maxLength={2000}
              rows={3}
            />

            <div name="price">
              {(price || priceProblem) && (
                <div
                  className={Config.Css.css({
                    backgroundColor: theme.color.muted,
                    borderRadius: theme.radius,
                    padding: 14,
                  })}
                >
                  {priceProblem ? (
                    <div className={Config.Css.css({ ...theme.text.small, color: theme.color.fg })}>
                      <Lsi lsi={lsi("form", priceProblem)} />
                    </div>
                  ) : (
                    <>
                      {/* Jen výsledná cena za pobyt -- host rozpad na noci a úklid nevidí
                          (majitel, 2026-10-12). */}
                      <div className={Config.Css.css({ ...theme.text.small, color: theme.color.mutedFg })}>
                        <Lsi lsi={lsi("form", "stayPrice")} /> · {price.nights}{" "}
                        <Lsi lsi={lsi("form", "nights", nightsForm(price.nights))} />
                      </div>
                      <div className={Config.Css.css({ ...theme.text.h3, fontSize: 22, margin: 0 })}>
                        <Price value={price.totalPrice} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <Uu5Forms.SubmitButton name="submit">
              <Lsi lsi={lsi("form", "submit")} />
            </Uu5Forms.SubmitButton>
          </Uu5Forms.Form.View>

          {/*
            Honeypot: skryté pole, které člověk nevyplní a bot ano. Nesmí to být type="hidden"
            -- ty boti přeskakují. Musí být mimo viewport, mimo pořadí tabulátoru a skryté
            pro čtečky, jinak by ho vyplnil i člověk s asistivní technologií.
          */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className={Config.Css.css({
              position: "absolute",
              insetInlineStart: -9999,
              inlineSize: 1,
              blockSize: 1,
              opacity: 0,
            })}
          />

          <p className={Config.Css.css({ ...theme.text.small, color: theme.color.mutedFg, marginBlockStart: 12 })}>
            <Lsi lsi={lsi("form", "consent")} />
            {Config.recaptchaSiteKey && (
              <>
                {" "}
                {/* Povinný text místo skrytého odznaku reCAPTCHA (main.jsx). */}
                <Lsi lsi={lsi("form", "captchaNotice", "before")} />{" "}
                <Uu5Elements.Link href="https://policies.google.com/privacy" target="_blank">
                  <Lsi lsi={lsi("form", "captchaNotice", "privacy")} />
                </Uu5Elements.Link>{" "}
                <Lsi lsi={lsi("form", "captchaNotice", "and")} />{" "}
                <Uu5Elements.Link href="https://policies.google.com/terms" target="_blank">
                  <Lsi lsi={lsi("form", "captchaNotice", "terms")} />
                </Uu5Elements.Link>{" "}
                <Lsi lsi={lsi("form", "captchaNotice", "after")} />
              </>
            )}
          </p>
        </Uu5Forms.Form.Provider>
      </div>
    );
  },
});

export default ReservationForm;
