// Odesílání e-mailů k rezervaci a jejich záznam do historie (docs/impl-plan-reservation-flow.md § 1).
//
// Tvar záznamu (jeden prvek `emailList` u události):
//   { template, lang, to, subject, text, status: "sent" | "failed" | "skipped", reason, error, sentAt }
// `text` je přesně textová verze, která odešla (nebo by odešla) -- historie ji ukazuje.

import { Mailer } from "caio-server";
import config from "../config.js";
import { TEMPLATES } from "./templates/index.js";
import { render } from "./render.js";
import { formatter } from "./format.js";
import { balanceAmount } from "../reservation/payment.js";

// Transport (SMTP, TLS, timeouty, strop na zprávu) je v caio-serveru: `Mailer.send`. Tady jsou
// jen šablony, render a záznam do historie. SMTP se konfiguruje proměnnými caio-serveru
// (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM); OWNER_EMAIL je naše.

/** Jazyk, ve kterém e-mail opravdu odejde: požadovaný, pokud pro něj šablona je, jinak čeština. */
export function resolveLang(template, lang) {
  if (template && lang && template[lang]) return lang;
  return "cs";
}

/** Jazyky, pro které existují všechny šablony hostovi -- výběr „Jazyk e-mailu“ v adminu nabízí jen tyhle. */
export function emailLanguages() {
  const guestTemplates = Object.values(TEMPLATES).filter((t) => t.recipient === "guest");
  return config.languages.filter((lang) => guestTemplates.every((t) => t[lang]));
}

/** Kontext pro šablonu: rezervace + formátovač + odvozené hodnoty + odkazy. */
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
    adminUrl: `${web}/admin/reservation?id=${reservation.id}`,
  };
}

function record(code, { lang, to, status, reason = null, error = null, subject = null, text = null, sentAt = null }) {
  return { template: code, lang, to, subject, text, status, reason, error, sentAt };
}

/**
 * Vyrenderuje e-mail bez odeslání. Pro náhled v adminu (`reservation/emailPreview`) a pro
 * `npm run email:preview`. null, když není komu psát.
 */
export async function renderEmail(code, reservation, { lang, message, changes } = {}) {
  const template = TEMPLATES[code];
  if (!template) throw new Error(`Neznámá šablona e-mailu: ${code}`);
  const guest = template.recipient === "guest";
  const to = guest ? reservation?.contact?.email || null : process.env.OWNER_EMAIL || null;
  const usedLang = guest ? resolveLang(template, lang ?? reservation?.lang) : "cs";
  const c = buildContext(reservation, { lang: usedLang, message, changes });
  const texts = template[usedLang];
  const { text, html, attachments } = await render(texts.body(c), { lang: usedLang, guest });
  return { template: code, recipient: template.recipient, lang: usedLang, to, subject: texts.subject(c), text, html, attachments };
}

/**
 * HTML e-mailu pro prohlížeč: inline přílohy (QR) jako data URI. V e-mailu jsou to přílohy
 * `cid:`, které prohlížeč neumí (náhled v adminu, `npm run email:preview`).
 */
export function htmlForBrowser(mail) {
  let html = mail.html;
  for (const attachment of mail.attachments ?? []) {
    html = html.replaceAll(`cid:${attachment.cid}`, `data:${attachment.contentType};base64,${attachment.content.toString("base64")}`);
  }
  return html;
}

/**
 * Pošle jeden e-mail a vrátí záznam do historie. Nikdy nehází: selhání e-mailu nesmí shodit
 * přechod ani zápis rezervace, který už proběhl.
 *
 * E-mail hostovi jde bez Reply-To (je generovaný, host na něj nemá odpovídat -- patička mu
 * dá kontakt). E-mail vlastníkovi má Reply-To na hosta, ať mu jde odpovědět z notifikace.
 *
 * @returns {object|null}  null, když není komu psát (host bez e-mailu)
 */
export async function sendEmail(code, reservation, options = {}) {
  let mail;
  try {
    mail = await renderEmail(code, reservation, options);
  } catch (e) {
    console.error(`[email] ${code}: render selhal`, e);
    return record(code, { lang: null, to: null, status: "failed", error: `render: ${e?.message ?? e}` });
  }

  const base = { lang: mail.lang, to: mail.to, subject: mail.subject, text: mail.text };
  if (mail.recipient === "guest" && !mail.to) return null;
  if (mail.recipient === "owner" && !mail.to) return record(code, { ...base, status: "skipped", reason: "ownerEmailMissing" });
  if (!Mailer.canSend()) return record(code, { ...base, status: "skipped", reason: "smtpNotConfigured" });

  try {
    await Mailer.send({
      to: mail.to,
      // E-mail hostovi bez Reply-To (generovaný, host nemá odpovídat); vlastníkovi na hosta.
      replyTo: mail.recipient === "owner" ? reservation?.contact?.email || undefined : undefined,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: mail.attachments,
    });
    return record(code, { ...base, status: "sent", sentAt: new Date().toISOString() });
  } catch (e) {
    console.error(`[email] ${code} → ${mail.to}: odeslání selhalo`, e?.message ?? e);
    return record(code, { ...base, status: "failed", error: String(e?.message ?? e) });
  }
}
