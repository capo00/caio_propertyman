import config from "../config.js";

// Email envelope and the "do not reply" footer (owner's decision 2026-10-08: guest emails are
// generated, the guest is not meant to reply and no text invites them to).
//
// HTML with inline styles only: mail clients often drop a <style> in the head. No external
// images or fonts -- the only image is the QR code as an inline attachment (cid).

const LABELS = {
  cs: {
    footer: "Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.",
    contact: "Kontakt",
  },
  en: {
    footer: "This is an automated email. Please do not reply to it.",
    contact: "Contact",
  },
  de: {
    footer: "Diese E-Mail wurde automatisch erstellt, bitte antworten Sie nicht darauf.",
    contact: "Kontakt",
  },
  pl: {
    footer: "Ten e-mail został wygenerowany automatycznie, prosimy na niego nie odpowiadać.",
    contact: "Kontakt",
  },
  sk: {
    footer: "Tento e-mail bol vygenerovaný automaticky, neodpovedajte naň, prosím.",
    contact: "Kontakt",
  },
};

export function labels(lang) {
  return LABELS[lang] ?? LABELS.cs;
}

export function textFooter(lang) {
  const { phone, email } = config.email.contact;
  const l = labels(lang);
  return `--\n${l.footer}\n${l.contact}: ${phone} · ${email}`;
}

export function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** `tel:` from a number as a person writes it ("+420 723 872 512"). */
export function telHref(phone) {
  return "tel:" + String(phone).replace(/[^+\d]/g, "");
}

// Email and a phone number with an international prefix. A number without "+" is not linked:
// a payment reference, an account number or an amount would otherwise pose as a phone number.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\+\d{1,3}(?:[ \u00a0]?\d{2,4}){2,4}/g;

/**
 * Links in already escaped text: an email address → mailto:, a phone with a prefix → tel:
 * (owner 2026-10-09). Called only on the plain text of blocks, never on finished HTML.
 */
export function linkify(escapedText) {
  const style = `color:${COLOR.accent}`;
  return escapedText
    .replace(EMAIL_RE, (email) => `<a href="mailto:${email}" style="${style}">${email}</a>`)
    .replace(PHONE_RE, (phone) => `<a href="${telHref(phone)}" style="${style}">${phone}</a>`);
}

// The web's colours (client/src/config/theme.js) as constants -- an email cannot reach the app's theme.
export const COLOR = { text: "#1E2715", muted: "#646553", accent: "#315833", line: "#DFDBCB", background: "#FBF9F0", card: "#FFFDF9" };

/** The whole HTML: a 600 px envelope, the content and, for guest emails, the footer. */
export function wrapHtml(bodyHtml, { lang, guest }) {
  const { phone, email } = config.email.contact;
  const l = labels(lang);
  const footer = guest
    ? `<tr><td style="padding:16px 32px 28px;border-top:1px solid ${COLOR.line};color:${COLOR.muted};font-size:12px;line-height:1.5">
        ${escapeHtml(l.footer)}<br>${escapeHtml(l.contact)}: <a href="${escapeHtml(telHref(phone))}" style="color:${COLOR.muted}">${escapeHtml(phone)}</a> · <a href="mailto:${escapeHtml(email)}" style="color:${COLOR.muted}">${escapeHtml(email)}</a>
      </td></tr>`
    : "";
  return `<!doctype html>
<html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLOR.background}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.background}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLOR.card};border-radius:8px;font-family:Arial,Helvetica,sans-serif;color:${COLOR.text};font-size:15px;line-height:1.55">
<tr><td style="padding:28px 32px 8px">${bodyHtml}</td></tr>
${footer}
</table></td></tr></table>
</body></html>`;
}
