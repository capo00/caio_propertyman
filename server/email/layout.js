import config from "../config.js";

// Obálka e-mailu a patička „neodpovídejte“ (rozhodnutí majitele 2026-10-08: e-maily hostovi
// jsou generované, host na ně nemá odpovídat, žádný text ho k odpovědi nevybízí).
//
// HTML jen s inline styly: poštovní klienty <style> v hlavičce často zahazují. Žádné externí
// obrázky ani fonty -- jediný obrázek je QR jako inline příloha (cid).

const LABELS = {
  cs: {
    footer: "Tento e-mail je generovaný automaticky, neodpovídejte na něj prosím.",
    contact: "Kontakt",
  },
  en: {
    footer: "This e-mail was generated automatically, please do not reply to it.",
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
    footer: "Tento e-mail je generovaný automaticky, prosím, neodpovedajte naň.",
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

/** `tel:` z čísla, jak ho píše člověk („+420 723 872 512“). */
export function telHref(phone) {
  return "tel:" + String(phone).replace(/[^+\d]/g, "");
}

// E-mail a telefon s mezinárodní předvolbou. Číslo bez „+“ se neodkazuje: variabilní symbol,
// číslo účtu nebo částka by se pak tvářily jako telefon.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /\+\d{1,3}(?:[ \u00a0]?\d{2,4}){2,4}/g;

/**
 * Odkazy v už escapovaném textu: e-mailová adresa → mailto:, telefon s předvolbou → tel:
 * (majitel 2026-10-09). Volá se jen na čistý text bloků, ne na hotové HTML.
 */
export function linkify(escapedText) {
  const style = `color:${COLOR.accent}`;
  return escapedText
    .replace(EMAIL_RE, (email) => `<a href="mailto:${email}" style="${style}">${email}</a>`)
    .replace(PHONE_RE, (phone) => `<a href="${telHref(phone)}" style="${style}">${phone}</a>`);
}

// Barvy webu (client/src/config/theme.js) jako konstanty -- e-mail nemá jak sáhnout na téma appky.
export const COLOR = { text: "#1E2715", muted: "#646553", accent: "#315833", line: "#DFDBCB", background: "#FBF9F0", card: "#FFFDF9" };

/** Celé HTML: obálka 600 px, obsah, u e-mailů hostovi patička. */
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
