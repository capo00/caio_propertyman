import { createVisualComponent, useState, useEffect, useRef, useLsi, useLanguage, Lsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import { useReCaptcha } from "uu5extrasg01";
import Config from "../../config/config.js";
import Calls, { errorCodeOf } from "../../calls.js";
import Button from "../button.jsx";
import importLsi, { lsi, ERROR_LSI } from "../../lsi/import-lsi.js";
// Deep import, not the caio-ui barrel: the barrel pulls in Crud with uu5tiles and Monaco,
// which the public web does not need (see calls.js).
import { useErrorMessage, useFormError } from "caio-ui/src/caio-ui-elements/use-error-message";
import { toIsoDate } from "../availability-calendar.jsx";
import { pluralForm } from "../../tools/plural.js";

const { theme } = Config;


// Reservation form. The only part of the website that writes data.
//
// The price is recalculated continuously, but it is only INDICATIVE -- the server computes the
// binding one again on reservation/create and ignores the client's value. If they differ, the server's wins.

const MIN_NIGHTS = 2;
// Must match `capacity.max` in server/config.js (9 beds + 1 extra bed), otherwise the form
// lets through a number the server rejects.
const MAX_GUESTS = 10;

// Error code from services/stay-rules.js → message key in the `form` LSI.
const STAY_PROBLEMS = {
  "caio-propertyman/stay/christmasMinNights": "christmasMinNights",
  "caio-propertyman/stay/summerWeekOnly": "summerWeekOnly",
};

// reCAPTCHA v3 action. Must be the same as on the server -- it verifies against the use case name.
const CAPTCHA_ACTION = "reservation/create";

// Amounts are typeset by Uu5Elements.Number according to the app language -- that is why there is
// no custom formatting or hard-coded "Kč"/"cs-CZ" here. `maxDecimalDigits={0}` is mandatory,
// otherwise Intl adds hellers to the currency.
function Price({ value }) {
  return <Uu5Elements.Number value={value} currency="CZK" currencyFormat="symbol" maxDecimalDigits={0} />;
}

/** Confirmation after submitting. It must be clear that the dates are NOT CONFIRMED YET. */
function Confirmation({ result, language, onReset }) {
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
          ({result.nights} <Lsi lsi={lsi("form", "nights", pluralForm(result.nights, language))} />)
        </p>
      )}
      <Button variant="outline" onClick={onReset}>
        <Lsi lsi={lsi("form", "reset")} />
      </Button>
    </div>
  );
}

/**
 * Dates selected in the availability calendar → the form's "stay" field. Must be inside
 * Form.Provider (useFormApi). Writes only a value different from the field's -- otherwise the
 * calendar and the field would keep overwriting each other.
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
   * @param stay          dates selected in the availability calendar ([from, to]) -- copied into the field
   * @param onStayChange  ([from, to] | null) => …, when the form field changes the dates
   */
  render({ onCreated, stay: externalStay, onStayChange }) {
    const { addAlert } = Uu5Elements.useAlertBus();
    const [confirmation, setConfirmation] = useState(null);
    const [price, setPrice] = useState(null);
    // Dates that are not for sale (services/stay-rules.js) -- the reason is shown instead of the amount.
    const [priceProblem, setPriceProblem] = useState(null);
    const [stay, setStay] = useState(null);
    const [guestCount, setGuestCount] = useState(4);

    // Dates from the calendar compute the price the same way as dates selected in the field.
    useEffect(() => {
      if (externalStay?.[0] && externalStay?.[1]) setStay(externalStay);
    }, [externalStay?.[0], externalStay?.[1]]);
    // Honeypot outside the form state -- it is added to dtoIn only on submit.
    const honeypotRef = useRef(null);

    // reCAPTCHA v3 (uu5extrasg01). The hook attaches the Google script as soon as it gets a site key --
    // and the form is on the home page, so the script (and Google's cookies) would be loaded on every
    // visit. That is why we pass it the site key only after the first interaction with the form; by
    // submit the script has enough time to load and collect signals for the score.
    // Without a site key (local development without keys) execute() returns undefined and the server
    // does not require the token in development.
    const [captchaActive, setCaptchaActive] = useState(false);
    const { execute: executeCaptcha } = useReCaptcha({
      siteKey: captchaActive ? (Config.recaptchaSiteKey ?? undefined) : undefined,
    });
    const activateCaptcha = () => !captchaActive && Config.recaptchaSiteKey && setCaptchaActive(true);

    // The whole "form" node at once: field labels, alert messages and the validation message are
    // read here as strings (alert and onValidate need text, not an element), so one hook instead
    // of fifteen. useLsi returns a subtree, not just a leaf.
    const formLsi = useLsi(importLsi, ["form"]);
    const errorMessage = useErrorMessage(ERROR_LSI);
    const formError = useFormError(ERROR_LSI);

    // Guest's language: the server stores it with the reservation and sends e-mails in it (if it has
    // a template for it, otherwise in Czech). The region ("cs-CZ") is cut off -- the server knows only language codes.
    const [language] = useLanguage();

    const today = toIsoDate(new Date());

    // Indicative price recalculation. Runs only once the dates are complete -- FormDateRange returns
    // [from, undefined] during selection.
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
        // Other errors are swallowed here on purpose: it is only a price preview. The real validation
        // is done by the server on submit, and there the error is shown at the specific field. Dates
        // that are not for sale (short Christmas stays, summer other than by the week) are the exception --
        // otherwise the guest would not know why the price did not show up.
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

      // The token is fetched again on every submit -- it is single-use and valid for two minutes.
      // A failure here is almost always a blocked Google script (adblock); without an error code it
      // would end up in the generic "submission failed", hence separately and with clear advice.
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
          onCreated?.(); // refresh the calendar so the current availability is visible
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
          addAlert({ header: formLsi.rateLimitHeader, message: errorMessage(err), priority: "warning" });
        } else if (!code) {
          // No code = network or an unhandled server error. Validation errors (400) have
          // a paramMap and uu5g05-forms shows them right at the field, nothing to report there.
          addAlert({
            header: formLsi.failedHeader,
            message: formLsi.failedMessage,
            priority: "error",
          });
        }

        throw formError(err); // the form stays filled in and gets unlocked
      }
    }

    if (confirmation) {
      return <Confirmation result={confirmation} language={language} onReset={() => setConfirmation(null)} />;
    }

    return (
      // Capture on the wrapper: the first focus or click anywhere in the form turns on the captcha
      // (see activateCaptcha above). Picking a date in the calendar is a click, filling a field is a focus.
      <div onFocusCapture={activateCaptcha} onPointerDownCapture={activateCaptcha}>
        <Uu5Forms.Form.Provider
          onSubmit={handleSubmit}
          lsiError={ERROR_LSI}
          onSubmitted={(e) => {
            setConfirmation(e.data.submitResult);
            onCreated?.();
          }}
          // Form.Provider hooks itself onto useRouteLeave, so a half-filled form triggers the
          // native "Leave page?" dialog on every navigation -- even when clicking
          // "Gallery" in the menu. In an internal app that makes sense, on a public website it
          // only scares the guest and the data here are not valuable (nothing is worked on for long).
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
                // During selection [from, undefined] arrives -- we compute only with both dates.
                const complete = Array.isArray(value) && value[0] && value[1] ? value : null;
                setStay(complete);
                // The availability calendar shows the same dates.
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

            {/* FormEmail has its own regex -- do not add a pattern to it. */}
            <Uu5Forms.FormEmail name="email" label={lsi("form", "emailLabel")} required />

            {/* FormPhone does not exist. In uu5 the pattern is NOT ANCHORED by itself, ^…$ is up to us. */}
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
                      {/* Only the final price for the stay -- the guest does not see the breakdown
                          into nights and cleaning (owner, 2026-10-12). */}
                      <div className={Config.Css.css({ ...theme.text.small, color: theme.color.mutedFg })}>
                        <Lsi lsi={lsi("form", "stayPrice")} /> · {price.nights}{" "}
                        <Lsi lsi={lsi("form", "nights", pluralForm(price.nights, language))} />
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
            Honeypot: a hidden field that a human does not fill in and a bot does. It must not be
            type="hidden" -- bots skip those. It must be outside the viewport, outside the tab order
            and hidden from screen readers, otherwise a person using assistive technology would fill it in too.
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
                {/* Mandatory text instead of the hidden reCAPTCHA badge (main.jsx). */}
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
