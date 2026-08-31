import nodemailer from "nodemailer";
import config from "../config.js";

// Bez notifikací by o rezervaci nikdo nevěděl -- v1 nemá admin, takže e-mail je jediný kanál,
// kterým se vlastník o nové poptávce dozví (design-v1.md § 6).

let transporter;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.OWNER_EMAIL);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      // 465 = implicitní TLS, 587 = STARTTLS. Nodemailer to podle `secure` rozliší sám.
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function formatPrice(value) {
  return `${value.toLocaleString("cs-CZ")} Kč`;
}

function ownerBody({ id, dateFrom, dateTo, nights, guestCount, totalPrice, contact, note }) {
  return [
    "Nová poptávka termínu z webu.",
    "",
    `Termín:      ${formatDate(dateFrom)} – ${formatDate(dateTo)} (${nights} nocí)`,
    `Počet osob:  ${guestCount}`,
    `Cena:        ${formatPrice(totalPrice)}`,
    "",
    `Jméno:       ${contact.name}`,
    `E-mail:      ${contact.email}`,
    `Telefon:     ${contact.phone}`,
    note ? `Poznámka:    ${note}` : null,
    "",
    `ID rezervace: ${id}`,
    "",
    "Rezervace je ve stavu `pending` a čeká na tvoje potvrzení -- host to ví.",
  ].filter((line) => line !== null).join("\n");
}

function guestBody({ dateFrom, dateTo, nights, guestCount, totalPrice }) {
  return [
    "Dobrý den,",
    "",
    "děkujeme za vaši poptávku. Přijali jsme ji v tomto znění:",
    "",
    `Termín:     ${formatDate(dateFrom)} – ${formatDate(dateTo)} (${nights} nocí)`,
    `Počet osob: ${guestCount}`,
    `Cena:       ${formatPrice(totalPrice)}`,
    "",
    // Tohle je to podstatné sdělení: rezervace ještě NENÍ potvrzená.
    "Termín zatím není závazně potvrzený. Ozveme se vám do 24 hodin s potvrzením",
    "dostupnosti a přesnou cenou.",
    "",
    `Příjezd od ${config.checkIn}, odjezd do ${config.checkOut}.`,
    "",
    "S pozdravem",
    "Roubenka Libošovice",
  ].join("\n");
}

/**
 * Pošle notifikaci vlastníkovi a potvrzení hostovi.
 *
 * Když SMTP není nastavené, jen zaloguje a skončí -- appka musí jít vyvíjet a nasadit
 * bez e-mailového účtu. Volající to navíc obaluje try/catch, takže selhání odeslání
 * nikdy neshodí už zapsanou rezervaci.
 */
export async function sendReservationEmails(reservation) {
  if (!isConfigured()) {
    console.warn("[email] SMTP není nastavené (SMTP_HOST/USER/PASS, OWNER_EMAIL) -- notifikace se neposílá");
    return { skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const mailer = getTransporter();
  const termin = `${formatDate(reservation.dateFrom)} – ${formatDate(reservation.dateTo)}`;

  // Vlastníkovi jde mail jako první: je důležitější, aby se poptávka neztratila, než aby
  // host dostal potvrzení. `reply-to` na hosta, ať se dá odpovědět jedním klikem.
  await mailer.sendMail({
    from,
    to: process.env.OWNER_EMAIL,
    replyTo: reservation.contact.email,
    subject: `Nová poptávka: ${termin} (${reservation.contact.name})`,
    text: ownerBody(reservation),
  });

  await mailer.sendMail({
    from,
    to: reservation.contact.email,
    subject: `Přijali jsme vaši poptávku — ${termin}`,
    text: guestBody(reservation),
  });

  return { skipped: false };
}
