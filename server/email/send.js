// Sending reservation emails and recording them into the history (docs/impl-plan-reservation-flow.md § 1).
//
// Shape of the record (one item of an event's `emailList`):
//   { template, lang, to, subject, text, status: "sent" | "failed" | "skipped", reason, error, sentAt }
// `text` is exactly the text version that was (or would have been) sent -- the history shows it.

import { Mailer } from "caio-server";
import config from "../config.js";
import { TEMPLATES } from "./templates/index.js";
import { render } from "./render.js";
import { formatter } from "./format.js";
import { balanceAmount } from "../reservation/payment.js";
import { localizedPath } from "../../client/src/config/routes.js";

// The transport (SMTP, TLS, timeouts, message size limit) is in caio-server: `Mailer.send`. Here
// are only the templates, rendering and the history record. SMTP is configured by caio-server's
// variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM); OWNER_EMAIL is ours.

/** The language the email is really sent in: the requested one if the template has it, otherwise Czech. */
export function resolveLang(template, lang) {
  if (template && lang && template[lang]) return lang;
  return "cs";
}

/** Languages all guest templates exist for -- the admin's "Email language" select offers only these. */
export function emailLanguages() {
  const guestTemplates = Object.values(TEMPLATES).filter((t) => t.recipient === "guest");
  return config.languages.filter((lang) => guestTemplates.every((t) => t[lang]));
}

/** Context for a template: reservation + formatter + derived values + links. */
function buildContext(reservation, { lang, message, changes }) {
  const f = formatter(lang);
  const web = config.email.webUrl();
  return {
    r: reservation,
    f,
    lang,
    stay: f.stay(reservation),
    balanceAmount: balanceAmount(reservation.payment),
    message: message || null,
    changes: changes ?? [],
    web,
    // A page of the web in the email's language (`pageUrl("pricing")` = /en/prices). The root of
    // the web would be the Czech home: the language redirect there only works with a language
    // saved in the same browser, which a guest opening the email on a phone usually does not have.
    pageUrl: (code) => web + (localizedPath(lang, { code }, config.languages[0]) ?? "/"),
    adminUrl: `${web}/admin/reservation?id=${reservation.id}`,
  };
}

function record(code, { lang, to, status, reason = null, error = null, subject = null, text = null, sentAt = null }) {
  return { template: code, lang, to, subject, text, status, reason, error, sentAt };
}

/**
 * Renders an email without sending it. For the admin preview (`reservation/emailPreview`) and
 * `npm run email:preview`. null when there is nobody to write to.
 */
export async function renderEmail(code, reservation, { lang, message, changes } = {}) {
  const template = TEMPLATES[code];
  if (!template) throw new Error(`Unknown email template: ${code}`);
  const guest = template.recipient === "guest";
  const to = guest ? reservation?.contact?.email || null : process.env.OWNER_EMAIL || null;
  const usedLang = guest ? resolveLang(template, lang ?? reservation?.lang) : "cs";
  const c = buildContext(reservation, { lang: usedLang, message, changes });
  const texts = template[usedLang];
  const { text, html, attachments } = await render(texts.body(c), { lang: usedLang, guest });
  return { template: code, recipient: template.recipient, lang: usedLang, to, subject: texts.subject(c), text, html, attachments };
}

/**
 * HTML of an email for a browser: inline attachments (QR) as data URIs. In the email they are
 * `cid:` attachments, which a browser cannot show (admin preview, `npm run email:preview`).
 */
export function htmlForBrowser(mail) {
  let html = mail.html;
  for (const attachment of mail.attachments ?? []) {
    html = html.replaceAll(`cid:${attachment.cid}`, `data:${attachment.contentType};base64,${attachment.content.toString("base64")}`);
  }
  return html;
}

/**
 * Sends one email and returns the history record. Never throws: a failed email must not bring
 * down a transition or a reservation write that has already happened.
 *
 * An email to the guest goes without Reply-To (it is generated, the guest is not meant to reply --
 * the footer gives them a contact). An email to the owner has Reply-To set to the guest, so it can
 * be answered straight from the notification.
 *
 * @returns {object|null}  null when there is nobody to write to (a guest without an email)
 */
export async function sendEmail(code, reservation, options = {}) {
  let mail;
  try {
    mail = await renderEmail(code, reservation, options);
  } catch (e) {
    console.error(`[email] ${code}: render failed`, e);
    return record(code, { lang: null, to: null, status: "failed", error: `render: ${e?.message ?? e}` });
  }

  const base = { lang: mail.lang, to: mail.to, subject: mail.subject, text: mail.text };
  if (mail.recipient === "guest" && !mail.to) return null;
  if (mail.recipient === "owner" && !mail.to) return record(code, { ...base, status: "skipped", reason: "ownerEmailMissing" });
  if (!Mailer.canSend()) return record(code, { ...base, status: "skipped", reason: "smtpNotConfigured" });

  try {
    await Mailer.send({
      to: mail.to,
      // An email to the guest without Reply-To (generated, the guest is not meant to reply); to the owner, the guest.
      replyTo: mail.recipient === "owner" ? reservation?.contact?.email || undefined : undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: mail.attachments,
    });
    return record(code, { ...base, status: "sent", sentAt: new Date().toISOString() });
  } catch (e) {
    console.error(`[email] ${code} → ${mail.to}: sending failed`, e?.message ?? e);
    return record(code, { ...base, status: "failed", error: String(e?.message ?? e) });
  }
}
