import config from "../config.js";
import { spayd, qrPng } from "./qr-payment.js";
import { formatter } from "./format.js";
import { wrapHtml, textFooter, escapeHtml, linkify, COLOR } from "./layout.js";

// Bloky → { text, html, attachments }. Text je to, co se ukládá do historie (`eventList`),
// HTML je tatáž věc pro poštovní klienty, QR jde jako inline příloha (cid).

const PAYMENT_LABELS = {
  cs: {
    heading: { deposit: "Platba zálohy", balance: "Platba doplatku", full: "Platba" },
    account: "Číslo účtu",
    amount: "Částka",
    variableSymbol: "Variabilní symbol",
    dueDate: "Splatnost",
    qrCaption: "QR Platba — naskenujte v bankovní aplikaci",
  },
};

function paymentLabels(lang) {
  return PAYMENT_LABELS[lang] ?? PAYMENT_LABELS.cs;
}

function paymentRows(block, f) {
  const l = paymentLabels(f.lang);
  return [
    [l.account, config.bankAccount.number],
    [l.amount, f.price(block.amount)],
    block.variableSymbol && [l.variableSymbol, block.variableSymbol],
    block.dueDate && [l.dueDate, f.date(block.dueDate)],
  ].filter(Boolean);
}

function textFacts(rows) {
  const width = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, value]) => `${`${label}:`.padEnd(width + 2)}${value}`).join("\n");
}

function htmlFacts(rows) {
  const cells = rows
    .map(([label, value]) => `<tr><td style="padding:3px 16px 3px 0;color:${COLOR.muted};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:3px 0;font-weight:bold">${htmlText(value)}</td></tr>`)
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${cells}</table>`;
}

function htmlText(text) {
  return linkify(escapeHtml(text)).replace(/\n/g, "<br>");
}

/**
 * @param {object[]} blocks  výstup šablony (falsy položky se vynechají)
 * @param {{ lang: string, guest: boolean }} options  guest = patička „neodpovídejte“
 */
export async function render(blocks, { lang, guest }) {
  const f = formatter(lang);
  const text = [];
  const html = [];
  const attachments = [];

  for (const block of blocks.filter(Boolean)) {
    switch (block.type) {
      case "p":
        text.push(block.text);
        html.push(`<p style="margin:0 0 16px">${htmlText(block.text)}</p>`);
        break;
      case "facts":
        if (!block.rows.length) break;
        text.push(textFacts(block.rows));
        html.push(htmlFacts(block.rows));
        break;
      case "quote":
        text.push(block.text.split("\n").map((line) => `  > ${line}`).join("\n"));
        html.push(`<div style="margin:0 0 16px;padding:10px 14px;border-left:3px solid ${COLOR.accent};background:${COLOR.background}">${htmlText(block.text)}</div>`);
        break;
      case "list":
        if (!block.items.length) break;
        text.push(block.items.map((item) => `- ${item}`).join("\n"));
        html.push(`<ul style="margin:0 0 16px;padding-left:20px">${block.items.map((item) => `<li>${htmlText(item)}</li>`).join("")}</ul>`);
        break;
      case "link":
        text.push(`${block.label}: ${block.url}`);
        html.push(`<p style="margin:0 0 16px"><a href="${escapeHtml(block.url)}" style="color:${COLOR.accent}">${htmlText(block.label)}</a></p>`);
        break;
      case "payment": {
        const l = paymentLabels(lang);
        const rows = paymentRows(block, f);
        const cid = `qr-${block.kind}@roubenyraj`;
        const png = await qrPng(spayd({
          iban: config.bankAccount.iban,
          amount: block.amount,
          dueDate: block.dueDate,
          variableSymbol: block.variableSymbol,
          message: block.qrMessage,
        }));
        attachments.push({ filename: `qr-platba-${block.kind}.png`, content: png, contentType: "image/png", cid });
        text.push(`${l.heading[block.kind]}\n${textFacts(rows)}`);
        html.push(`<p style="margin:8px 0 6px;font-weight:bold">${escapeHtml(l.heading[block.kind])}</p>${htmlFacts(rows)}
<p style="margin:0 0 20px"><img src="cid:${cid}" width="180" height="180" alt="${escapeHtml(l.qrCaption)}" style="display:block;border:0"><span style="font-size:12px;color:${COLOR.muted}">${escapeHtml(l.qrCaption)}</span></p>`);
        break;
      }
      case "signature":
        text.push(config.email.propertyName);
        html.push(`<p style="margin:0 0 16px">${escapeHtml(config.email.propertyName)}</p>`);
        break;
      default:
        throw new Error(`Neznámý blok e-mailu: ${block.type}`);
    }
  }

  const textBody = text.join("\n\n") + (guest ? `\n\n${textFooter(lang)}` : "") + "\n";
  return { text: textBody, html: wrapHtml(html.join("\n"), { lang, guest }), attachments };
}
