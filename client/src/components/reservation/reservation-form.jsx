import { createVisualComponent, useState, useEffect, useRef, useLsi, Lsi, Utils } from "uu5g05";
import Uu5Elements from "uu5g05-elements";
import Uu5Forms from "uu5g05-forms";
import Config from "../../config/config.js";
import Calls, { errorCodeOf } from "../../calls.js";
import Button from "../layout/button.jsx";
import importLsi, { lsi } from "../../lsi/import-lsi.js";
import { toIsoDate } from "./availability-calendar.jsx";

const { theme } = Config;

// Rezervační formulář. Jediná část webu, která zapisuje data.
//
// Cena se přepočítává průběžně, ale je jen ORIENTAČNÍ -- závaznou spočítá server znovu
// při reservation/create a hodnotu z klienta ignoruje. Kdyby se rozešly, platí serverová.

const MIN_NIGHTS = 2;
const MAX_GUESTS = 8;

function formatPrice(value) {
  return `${value.toLocaleString("cs-CZ")} Kč`;
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
          <Lsi lsi={lsi("form", "estimatedPrice")} />: <strong>{formatPrice(result.totalPrice)}</strong>{" "}
          ({result.nights} <Lsi lsi={lsi("form", "nights")} />)
        </p>
      )}
      <Button variant="outline" onClick={onReset}>
        <Lsi lsi={lsi("form", "reset")} />
      </Button>
    </div>
  );
}

const ReservationForm = createVisualComponent({
  uu5Tag: Config.TAG + "ReservationForm",

  render({ onCreated }) {
    const { addAlert } = Uu5Elements.useAlertBus();
    const [confirmation, setConfirmation] = useState(null);
    const [price, setPrice] = useState(null);
    const [stay, setStay] = useState(null);
    const [guestCount, setGuestCount] = useState(4);
    // Honeypot mimo stav formuláře -- do dtoIn se přidá až při odeslání.
    const honeypotRef = useRef(null);

    // Celý uzel "form" najednou: popisky polí, hlášky alertů i validační zpráva se tu čtou
    // jako stringy (alert a onValidate potřebují text, ne element), takže jeden hook místo
    // patnácti. useLsi vrátí podstrom, ne jen list.
    const formLsi = useLsi(importLsi, ["form"]);

    const today = toIsoDate(new Date());

    // Orientační přepočet ceny. Běží až když je termín kompletní -- FormDateRange vrací
    // během výběru [from, undefined].
    useEffect(() => {
      const [from, to] = stay ?? [];
      if (!from || !to || !guestCount) {
        setPrice(null);
        return undefined;
      }

      let cancelled = false;
      Calls.calculatePrice(from, to, guestCount)
        .then((dtoOut) => !cancelled && setPrice(dtoOut))
        // Chybu tady schválně polykáme: je to jen náhled ceny. Skutečnou validaci dělá
        // server při odeslání a tam se chyba zobrazí u konkrétního pole.
        .catch(() => !cancelled && setPrice(null));

      return () => {
        cancelled = true;
      };
    }, [stay, guestCount]);

    async function handleSubmit(e) {
      const value = e.data.value;
      const [dateFrom, dateTo] = value.stay ?? [];

      try {
        return await Calls.createReservation({
          dateFrom,
          dateTo,
          guestCount: value.guestCount,
          contact: { name: value.name, email: value.email, phone: value.phone },
          note: value.note,
          website: honeypotRef.current?.value ?? "",
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
              setStay(Array.isArray(value) && value[0] && value[1] ? value : null);
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
            {price && (
              <div
                className={Config.Css.css({
                  backgroundColor: theme.color.muted,
                  borderRadius: theme.radius,
                  padding: 14,
                })}
              >
                <div className={Config.Css.css({ ...theme.text.h3, fontSize: 22, margin: 0 })}>
                  {formatPrice(price.totalPrice)}
                </div>
                <div className={Config.Css.css({ ...theme.text.small, color: theme.color.mutedFg })}>
                  {price.nights} <Lsi lsi={lsi("form", "nights")} /> ·{" "}
                  {formatPrice(price.pricePerNight)} <Lsi lsi={lsi("form", "perNight")} />
                  {price.provisional && (
                    <>
                      {" · "}
                      <Lsi lsi={lsi("form", "provisional")} />
                    </>
                  )}
                </div>
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
        </p>
      </Uu5Forms.Form.Provider>
    );
  },
});

export default ReservationForm;
