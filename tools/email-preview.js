// Náhled všech e-mailů se vzorovými daty: tmp/email-preview/index.html (HTML i text vedle sebe).
// Pro revizi textů bez spuštěné appky a bez odesílání.
//
//   npm run email:preview
//
// QR je v náhledu jako data URI (v e-mailu je to inline příloha cid -- prohlížeč cid neumí).
import fs from "fs";
import path from "path";
import { renderEmail, htmlForBrowser } from "../server/email/send.js";
import { SAMPLES } from "../server/email/samples.js";

const outDir = path.resolve(process.cwd(), "tmp", "email-preview");
fs.mkdirSync(outDir, { recursive: true });

const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sections = [];
for (const [code, label, reservation, options] of SAMPLES) {
  const mail = await renderEmail(code, reservation, options);
  const html = htmlForBrowser(mail);
  const file = `${sections.length + 1}-${code}.html`;
  fs.writeFileSync(path.join(outDir, file), html);
  sections.push(`<section>
  <h2>${escapeHtml(code)} <small>— ${escapeHtml(label)} · ${mail.recipient === "guest" ? "host" : "vlastník"} · ${mail.lang}</small></h2>
  <p class="subject"><b>Předmět:</b> ${escapeHtml(mail.subject)}</p>
  <div class="pair"><iframe src="${file}" title="${escapeHtml(code)}"></iframe><pre>${escapeHtml(mail.text)}</pre></div>
</section>`);
}

fs.writeFileSync(path.join(outDir, "index.html"), `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Náhled e-mailů</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;background:#eee}
section{background:#fff;padding:16px 20px;margin:0 0 24px;border-radius:8px}
h2{margin:0 0 6px;font-size:18px} small{color:#666;font-weight:normal}
.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
iframe{width:100%;height:760px;border:1px solid #ddd;border-radius:6px}
pre{white-space:pre-wrap;font-size:13px;background:#fafafa;border:1px solid #ddd;border-radius:6px;padding:12px;margin:0;overflow:auto;max-height:760px}
@media (max-width:900px){.pair{grid-template-columns:1fr}}
</style></head><body><h1>Náhled e-mailů (${sections.length})</h1>${sections.join("\n")}</body></html>`);

console.log(`Náhled: ${path.join(outDir, "index.html")} (${sections.length} e-mailů)`);
