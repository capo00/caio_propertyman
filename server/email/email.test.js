import { test } from "node:test";
import assert from "node:assert/strict";
import { renderEmail, emailLanguages, resolveLang, htmlForBrowser } from "./send.js";
import { TEMPLATES } from "./templates/index.js";
import { SAMPLES } from "./samples.js";
import { spayd, paymentMessage } from "./qr-payment.js";
import { formatter } from "./format.js";

// Šablony, ve kterých se platí -- musí mít QR.
const WITH_PAYMENT = new Set(["depositRequested", "depositReminder", "balanceReminder"]);

test("every template has a sample", () => {
  const sampled = new Set(SAMPLES.map(([code]) => code));
  assert.deepEqual(Object.keys(TEMPLATES).filter((code) => !sampled.has(code)), []);
});

for (const [code, label, reservation, options] of SAMPLES) {
  test(`${code} (${label}) renders cleanly`, async () => {
    const mail = await renderEmail(code, reservation, options);
    const all = `${mail.subject}\n${mail.text}\n${mail.html}`;
    assert.ok(mail.subject.length > 5);
    assert.doesNotMatch(all, /undefined|NaN|\[object Object\]/);
    // Žádná prázdná zástupka typu „do “ nebo „: \n“ ve větě s datem.
    assert.doesNotMatch(mail.text, /do \.|do $| ,/m);
    assert.ok(Buffer.byteLength(mail.html) < 100_000, "Gmail ořezává HTML nad ~102 kB");

    if (mail.recipient === "guest") {
      assert.match(mail.text, /neodpovídejte na něj prosím/);
      // Rozhodnutí 2026-10-08: host nemá být vybízen k odpovědi na e-mail.
      assert.doesNotMatch(mail.text.replace(/neodpovídejte/g, ""), /odpov[eě]/i);
    } else {
      assert.doesNotMatch(mail.text, /neodpovídejte/);
    }
    if (WITH_PAYMENT.has(code)) {
      assert.ok(mail.attachments.length >= 1, "platební e-mail musí mít QR");
      for (const attachment of mail.attachments) assert.ok(mail.html.includes(`cid:${attachment.cid}`));
    }
  });
}

test("full payment variant has no balance", async () => {
  const sample = SAMPLES.find(([code, label]) => code === "depositRequested" && label.startsWith("celá"));
  const mail = await renderEmail(sample[0], sample[2], sample[3]);
  assert.match(mail.subject, /prosíme o úhradu/);
  assert.doesNotMatch(mail.text, /Doplatek/);
  assert.equal(mail.attachments.length, 1);
});

test("deposit request with balance shows both and one QR (deposit)", async () => {
  const sample = SAMPLES.find(([code, label]) => code === "depositRequested" && label.startsWith("záloha"));
  const mail = await renderEmail(sample[0], sample[2], sample[3]);
  // Intl dává mezi číslo a „Kč“ nezlomitelnou mezeru, proto \s.
  assert.match(mail.text, /Záloha: +4\s500\sKč, splatná do 11\. 10\. 2026/);
  assert.match(mail.text, /Doplatek: +4\s500\sKč, splatný do 24\. 10\. 2026/);
  assert.match(mail.text, /Přistýlku připravíme/);
  assert.equal(mail.attachments.length, 1);
});

test("language: only languages with all guest templates, fallback to cs", () => {
  assert.deepEqual(emailLanguages(), ["cs"]);
  assert.equal(resolveLang(TEMPLATES.requestReceived, "en"), "cs");
  assert.equal(resolveLang(TEMPLATES.requestReceived, "cs"), "cs");
});

test("SPAYD string", () => {
  assert.equal(
    spayd({ iban: "CZ9808000000006338724003", amount: 4500, dueDate: "2026-10-11", variableSymbol: "26110701", message: "Roubený ráj záloha 7. 11. 2026" }),
    "SPD*1.0*ACC:CZ9808000000006338724003*AM:4500.00*CC:CZK*DT:20261011*X-VS:26110701*MSG:Roubeny raj zaloha 7. 11. 2026",
  );
  assert.equal(paymentMessage("a".repeat(80)).length, 60);
  assert.match(spayd({ iban: "CZ9808000000006338724003", amount: 1, message: "a*b" }), /MSG:a%2Ab$/);
  assert.throws(() => spayd({ iban: "6338724003/0800", amount: 1 }));
  assert.throws(() => spayd({ iban: "CZ9808000000006338724003", amount: 0 }));
  assert.throws(() => spayd({ iban: "CZ9808000000006338724003", amount: 1, variableSymbol: "12AB" }));
});

test("formatting per language", () => {
  const cs = formatter("cs");
  assert.equal(cs.nights(1), "1 noc");
  assert.equal(cs.nights(3), "3 noci");
  assert.equal(cs.nights(5), "5 nocí");
  assert.equal(cs.date("2026-11-07"), "7. 11. 2026");
  assert.match(cs.price(9000), /^9\s000\sKč$/);
  assert.equal(formatter("en").nights(2), "2 nights");
  assert.equal(cs.stay({ dateFrom: "2026-11-07", dateTo: "2026-11-09" }), "7. 11. 2026 – 9. 11. 2026 (2 noci)");
});

test("cancellation e-mail: fee and refund from the record written at cancellation", async () => {
  const sample = SAMPLES.find(([code]) => code === "thankYou")[2]; // záloha i doplatek zaplacené
  const cancellation = { date: "2026-10-10", daysToArrival: 28, percent: 50, fee: 4500, paid: 9000, refund: 4500 };
  const mail = await renderEmail("reservationCancelled", { ...sample, state: "cancelled", cancellation }, {});
  assert.match(mail.text, /28 dní před příjezdem: poplatek 50 % z ceny, tj\. 4\s500\sKč\) vám ze zaplacené částky 9\s000\sKč vrátíme 4\s500\sKč/);
  const kept = { ...cancellation, percent: 100, fee: 9000, refund: 0 };
  const keptMail = await renderEmail("reservationCancelled", { ...sample, state: "cancelled", cancellation: kept }, {});
  assert.match(keptMail.text, /zaplacená částka 9\s000\sKč propadá jako storno poplatek/);
});

test("confirmation e-mail states the cancellation policy", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "reservationConfirmed");
  const mail = await renderEmail(code, reservation, options);
  assert.match(mail.text, /Storno podmínky: 61 a více dní před příjezdem zdarma; 31–60 dní 25 % ceny pobytu; 15–30 dní 50 % ceny pobytu; 14 a méně dní 100 % ceny pobytu\./);
});

test("guest input is escaped in HTML and line breaks survive", async () => {
  const sample = SAMPLES.find(([code]) => code === "ownerNewRequest")[2];
  const evil = { ...sample, contact: { ...sample.contact, name: '<script>alert(1)</script>"' }, note: "řádek 1\nřádek 2" };
  const mail = await renderEmail("ownerNewRequest", evil, { message: "<b>x</b>" });
  assert.doesNotMatch(mail.html, /<script>/);
  assert.match(mail.html, /&lt;script&gt;/);
  assert.match(mail.html, /řádek 1<br>řádek 2/);
});

test("htmlForBrowser inlines QR as data URI", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "depositRequested");
  const mail = await renderEmail(code, reservation, options);
  const html = htmlForBrowser(mail);
  assert.doesNotMatch(html, /cid:/);
  assert.match(html, /src="data:image\/png;base64,[A-Za-z0-9+/]+=*"/);
});

test("linkify: e-mail and international phone become links, numbers without + do not", async () => {
  const { linkify } = await import("./layout.js");
  const html = linkify("Pište na jan.novak@seznam.cz, volejte +420 723 872 512. VS 26101901, účet 6338724003/0800.");
  assert.match(html, /href="mailto:jan\.novak@seznam\.cz"/);
  assert.match(html, /href="tel:\+420723872512"/);
  assert.doesNotMatch(html, /tel:2610|tel:6338/);
});
