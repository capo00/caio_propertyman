import { test } from "node:test";
import assert from "node:assert/strict";
import { Language } from "caio-server";
import { renderEmail as renderWith, emailLanguages, resolveLang, htmlForBrowser } from "./send.js";
import { TEMPLATES } from "./templates/index.js";
import { SAMPLES, SAMPLE_SETTINGS } from "./samples.js";
import { webUrl, SITE } from "./site.js";
import { spayd, paymentMessage } from "./qr-payment.js";
import { formatter } from "./format.js";
import { labels } from "./layout.js";

// The owner's Settings come from the database in the app; the tests render with the sample ones.
const renderEmail = (code, reservation, options = {}) => renderWith(code, reservation, { settings: SAMPLE_SETTINGS, ...options });

// Templates that ask for a payment -- they must have a QR code.
const WITH_PAYMENT = new Set(["depositRequested", "depositReminder", "balanceReminder"]);

test("every template has a sample", () => {
  const sampled = new Set(SAMPLES.map(([code]) => code));
  assert.deepEqual(Object.keys(TEMPLATES).filter((code) => !sampled.has(code)), []);
});

// Guest emails in every web language, owner emails in Czech only.
const langsOf = (code) => (TEMPLATES[code].recipient === "guest" ? Language.list : ["cs"]);

for (const [code, label, reservation, options] of SAMPLES) {
  for (const lang of langsOf(code)) test(`${code} (${label}) [${lang}] renders cleanly`, async () => {
    const mail = await renderEmail(code, reservation, { ...options, lang });
    assert.equal(mail.lang, lang);
    const all = `${mail.subject}\n${mail.text}\n${mail.html}`;
    assert.ok(mail.subject.length > 5);
    assert.doesNotMatch(all, /undefined|NaN|\[object Object\]/);
    // No empty placeholder like "do " or ": \n" in a sentence with a date.
    assert.doesNotMatch(mail.text, /do \.|do $| ,/m);
    assert.ok(Buffer.byteLength(mail.html) < 100_000, "Gmail clips HTML above ~102 kB");

    if (mail.recipient === "guest") {
      assert.ok(mail.text.includes(labels(lang).footer), "\"do not reply\" footer");
      // Decision 2026-10-08: the guest must not be invited to reply to the email.
      if (lang === "cs") assert.doesNotMatch(mail.text.replace(/neodpovídejte/g, ""), /odpov[eě]/i);
    } else {
      assert.doesNotMatch(mail.text, /neodpovídejte/);
    }
    if (WITH_PAYMENT.has(code)) {
      assert.ok(mail.attachments.length >= 1, "a payment email must have a QR code");
      for (const attachment of mail.attachments) assert.ok(mail.html.includes(`cid:${attachment.cid}`));
    }
  });
}

// A translation must not forget a block or a row (e.g. the balance): the same number of
// paragraphs as in Czech, the same number of QR codes and, among the foreign languages, the
// same number of rows (the Czech version has no IBAN row). Without the guest's note and the
// owner's message -- those are Czech in the samples and do not change the email language.
for (const [code, label, reservation, options] of SAMPLES.filter(([code]) => TEMPLATES[code].recipient === "guest")) {
  test(`${code} (${label}): all languages have the same blocks, no Czech leftovers`, async () => {
    const plain = { ...reservation, note: null };
    const render = (lang) => renderEmail(code, plain, { ...options, message: null, lang });
    const cs = await render("cs");
    const chunks = (mail) => mail.text.split("\n\n").length;
    let foreignLines;
    for (const lang of Language.list.filter((lang) => lang !== "cs")) {
      const mail = await render(lang);
      assert.equal(chunks(mail), chunks(cs), `${lang}: number of paragraphs`);
      assert.equal(mail.attachments.length, cs.attachments.length, `${lang}: number of QR codes`);
      const lines = mail.text.split("\n").length;
      foreignLines ??= lines;
      assert.equal(lines, foreignLines, `${lang}: number of rows`);
      // ř, ě, ů are in none of the other languages; "Kč" is written only in Czech and Slovak.
      assert.doesNotMatch(`${mail.subject}\n${mail.text}`, /[řěůŘĚŮ]/, `${lang}: Czech letters`);
      if (lang !== "sk") assert.doesNotMatch(mail.text, /Kč/, `${lang}: "Kč"`);
      if (mail.attachments.some((a) => a.filename.startsWith("qr-payment"))) assert.match(mail.text, /IBAN: +CZ98 0800/, `${lang}: IBAN`);
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

test("thank-you e-mail asks for a review or feedback to the contact e-mail, in every language", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "thankYou");
  for (const lang of Language.list) {
    const { text, html } = await renderEmail(code, reservation, { ...options, lang });
    // Once in the footer contact line, once in the request itself.
    assert.equal(text.split(SITE.contact.email).length - 1, 2, lang);
    assert.ok(html.split(SITE.contact.email).length - 1 >= 2, lang);
  }
});

test("deposit request with balance shows both and one QR (deposit)", async () => {
  const sample = SAMPLES.find(([code, label]) => code === "depositRequested" && label.startsWith("záloha"));
  const mail = await renderEmail(sample[0], sample[2], sample[3]);
  // Intl puts a non-breaking space between the number and "Kč", hence \s.
  assert.match(mail.text, /Záloha: +4\s500\sKč, splatná do 11\. 10\. 2026/);
  assert.match(mail.text, /Doplatek: +4\s500\sKč, splatný do 24\. 10\. 2026/);
  assert.match(mail.text, /Přistýlku připravíme/);
  assert.equal(mail.attachments.length, 1);
});

test("language: only languages with all guest templates, fallback to cs", () => {
  assert.deepEqual(emailLanguages(), Language.list);
  assert.equal(resolveLang(TEMPLATES.requestReceived, "pl"), "pl");
  assert.equal(resolveLang(TEMPLATES.requestReceived, "cs"), "cs");
  assert.equal(resolveLang(TEMPLATES.requestReceived, "fr"), "cs");
  assert.equal(resolveLang(TEMPLATES.ownerNewRequest, "de"), "cs");
});

test("cancellation policy text per language", async () => {
  const { cancellationPolicyText } = await import("../reservation/cancellation.js");
  assert.equal(cancellationPolicyText(undefined, "en"), "61 or more days before arrival free of charge; 31–60 days 25% of the price of the stay; 15–30 days 50% of the price of the stay; 14 days or fewer 100% of the price of the stay.");
  assert.match(cancellationPolicyText(undefined, "cs"), /31–60 dní 25\u00a0% ceny pobytu/);
  assert.equal(cancellationPolicyText(undefined, "xx"), cancellationPolicyText());
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
  assert.deepEqual([1, 3, 5].map(cs.days), ["1 den", "3 dny", "5 dní"]);
  assert.deepEqual([1, 3, 5].map(formatter("sk").days), ["1 deň", "3 dni", "5 dní"]);
  assert.deepEqual([0, 1, 3].map(formatter("en").days), ["0 days", "1 day", "3 days"]);
  assert.deepEqual([1, 3].map(formatter("de").days), ["1 Tag", "3 Tage"]);
  assert.deepEqual([1, 3, 5].map(formatter("pl").days), ["1 dzień", "3 dni", "5 dni"]);
  // A non-breaking space before "%" in cs, sk, de; none in en, pl.
  assert.deepEqual(["cs", "sk", "de", "en", "pl"].map((lang) => formatter(lang).percent(25)), ["25\u00a0%", "25\u00a0%", "25\u00a0%", "25%", "25%"]);
  assert.equal(cs.stay({ dateFrom: "2026-11-07", dateTo: "2026-11-09" }), "7. 11. 2026 – 9. 11. 2026 (2 noci)");
});

test("cancellation e-mail: fee and refund from the record written at cancellation", async () => {
  const sample = SAMPLES.find(([code]) => code === "thankYou")[2]; // deposit and balance both paid
  const cancellation = { date: "2026-10-10", daysToArrival: 28, percent: 50, fee: 4500, paid: 9000, refund: 4500 };
  const mail = await renderEmail("reservationCancelled", { ...sample, state: "cancelled", cancellation }, {});
  assert.match(mail.text, /28 dní před příjezdem: poplatek 50\u00a0% z ceny, tj\. 4\s500\sKč\) vám ze zaplacené částky 9\s000\sKč vrátíme 4\s500\sKč/);
  const kept = { ...cancellation, percent: 100, fee: 9000, refund: 0 };
  const keptMail = await renderEmail("reservationCancelled", { ...sample, state: "cancelled", cancellation: kept }, {});
  assert.match(keptMail.text, /zaplacená částka 9\s000\sKč propadá jako storno poplatek/);

  // A cancellation the day before arrival: the number of days is declined.
  const dayBefore = { ...kept, daysToArrival: 1 };
  const render = (lang) => renderEmail("reservationCancelled", { ...sample, state: "cancelled", cancellation: dayBefore }, { lang });
  assert.match((await render("cs")).text, /\(1 den před příjezdem:/);
  assert.match((await render("en")).text, /\(1 day before arrival:/);
  assert.match((await render("pl")).text, /\(1 dzień przed przyjazdem:/);
});

test("foreign payment block has IBAN, BIC and where to put the variable symbol; Czech has neither", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "depositRequested");
  const cs = await renderEmail(code, reservation, { ...options, lang: "cs" });
  assert.doesNotMatch(cs.text, /IBAN|BIC/);
  assert.equal(cs.attachments[0].filename, "qr-platba-zaloha.png");
  for (const lang of ["en", "de", "pl", "sk"]) {
    const mail = await renderEmail(code, reservation, { ...options, lang });
    assert.match(mail.text, /BIC[^:]*: +GIBACZPX/, `${lang}: BIC`);
    assert.ok(mail.text.includes(reservation.payment.variableSymbol), `${lang}: VS`);
    assert.equal(mail.attachments[0].filename, "qr-payment-deposit.png", lang);
  }
  const en = await renderEmail(code, reservation, { ...options, lang: "en" });
  assert.match(en.text, /When paying from abroad, please enter \d+ in the message for the recipient\./);
});

test("rejection e-mail links to the prices page in the e-mail's language", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "requestRejected");
  const web = webUrl();
  const links = { cs: `${web}/cenik`, en: `${web}/en/prices`, de: `${web}/de/preise`, pl: `${web}/pl/cennik`, sk: `${web}/sk/cennik` };
  for (const [lang, url] of Object.entries(links)) {
    const mail = await renderEmail(code, reservation, { ...options, lang });
    assert.ok(mail.html.includes(`href="${url}"`), `${lang}: ${url}`);
  }
});

test("confirmation e-mail states the cancellation policy", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "reservationConfirmed");
  const mail = await renderEmail(code, reservation, options);
  assert.match(mail.text, /Storno podmínky: 61 a více dní před příjezdem zdarma; 31–60 dní 25\u00a0% ceny pobytu; 15–30 dní 50\u00a0% ceny pobytu; 14 a méně dní 100\u00a0% ceny pobytu\./);
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

test("arrival e-mail: fixed practical text, Wi-Fi from the Settings with a QR code", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "arrivalInfo");
  const arrival = { wifiName: "Roubeny raj", wifiPassword: "heslo;123" };
  const mail = await renderEmail(code, reservation, { ...options, settings: { ...SAMPLE_SETTINGS, arrival } });
  assert.match(mail.text, />>> Kód ke schránce na klíče: 4821 <<</);
  assert.match(mail.html, /letter-spacing:6px[^>]*>4821</);
  assert.match(mail.text, /3\. Zadejte kód 4821 a potvrďte\./);
  assert.match(mail.text, /Adresa: +Libošovice 6, 507 44 Libošovice <https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Libo/);
  assert.match(mail.html, /<a href="https:\/\/www\.google\.com\/maps[^"]*"[^>]*>Libošovice 6, 507 44 Libošovice<\/a>/);
  assert.doesNotMatch(mail.text, /^Mapa:/m);
  assert.match(mail.text, /Příjezd: +od 15:00/);
  assert.match(mail.text, /🚗 Parkování\n\nIdeální místo k zaparkování je autobusová otočka/);
  assert.match(mail.text, /1\. Odklopte kryt schránky směrem dolů\.\n2\. /);
  assert.match(mail.text, /jističe č\. 14 a 15/);
  assert.match(mail.text, /- Nastavení termostatu na 14 °C/);
  assert.match(mail.text, /Síť: +Roubeny raj\nHeslo: +heslo;123/);
  assert.match(mail.html, /<ol /);
  assert.deepEqual(mail.attachments.map((a) => a.filename), ["wifi.png"]);
  assert.ok(mail.html.includes(`cid:${mail.attachments[0].cid}`));
});

test("arrival e-mail without the key box code fails instead of going out without it", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "arrivalInfo");
  await assert.rejects(renderEmail(code, reservation, { ...options, keyCode: null }), /key box code is missing/);
});

test("arrival e-mail without a network name in the Settings has no Wi-Fi section and no QR code", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "arrivalInfo");
  const settings = { ...SAMPLE_SETTINGS, arrival: { wifiName: null, wifiPassword: "x" } };
  for (const lang of Language.list) {
    const mail = await renderEmail(code, reservation, { ...options, settings, lang });
    assert.doesNotMatch(mail.text, /Wi-Fi|WLAN/, lang);
    assert.equal(mail.attachments.length, 0, lang);
  }
});

test("Wi-Fi QR text: WPA with escaped name and password, open network without a password", async () => {
  const { wifiQrText } = await import("./qr-wifi.js");
  assert.equal(wifiQrText({ name: "Roubeny raj", password: 'a;b,c:d\\e"f' }), 'WIFI:T:WPA;S:Roubeny raj;P:a\\;b\\,c\\:d\\\\e\\"f;;');
  assert.equal(wifiQrText({ name: "Host", password: null }), "WIFI:T:nopass;S:Host;;");
  assert.throws(() => wifiQrText({ name: "" }), /network name/);
});

test("payment e-mail without the account in the Settings fails instead of going out without it", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "depositRequested");
  const settings = { ...SAMPLE_SETTINGS, payment: { accountNumber: null, iban: null, bic: null } };
  await assert.rejects(renderEmail(code, reservation, { ...options, settings }), /account .* is missing in the Settings/);
});

test("owner e-mail goes to ownerEmail from the Settings", async () => {
  const [code, , reservation, options] = SAMPLES.find(([c]) => c === "ownerNewRequest");
  assert.equal((await renderEmail(code, reservation, options)).to, SAMPLE_SETTINGS.ownerEmail);
  assert.equal((await renderEmail(code, reservation, { ...options, settings: { ...SAMPLE_SETTINGS, ownerEmail: null } })).to, null);
});

// ---------------------------------------------------------------------------------------
// Payment reminders sent by hand from the admin (docs/proposal-admin-emails.md § 4).
// ---------------------------------------------------------------------------------------

const sampleOf = (code, label) => SAMPLES.find(([c, l]) => c === code && l === label);

test("deposit reminder before the due date: pay by the due date", async () => {
  const [code, , reservation, options] = sampleOf("depositReminder", "připomínka zálohy před splatností");
  const mail = await renderEmail(code, reservation, options);
  assert.match(mail.subject, /^Připomínka: záloha za pobyt .* — splatnost 11\. 10\. 2026$/);
  assert.match(mail.text, /Pokud záloha nebude uhrazena do 11\. 10\. 2026, rezervaci zrušíme/);
  assert.match(mail.text, /Splatnost: +11\. 10\. 2026/);
});

test("deposit reminder after the due date: as soon as possible, no due date in the payment", async () => {
  const [code, , reservation, options] = sampleOf("depositReminder", "záloha po splatnosti");
  const mail = await renderEmail(code, reservation, options);
  assert.match(mail.subject, /Záloha za pobyt .* je po splatnosti/);
  assert.match(mail.text, /byla splatná do 11\. 10\. 2026\. Zatím ji u nás neevidujeme\./);
  assert.match(mail.text, /Prosíme o úhradu co nejdříve/);
  assert.match(mail.text, /Ozvěte se prosím/, "the owner's message");
  assert.doesNotMatch(mail.text, /Splatnost:/);
  assert.match(mail.text, /Částka: +4\s500\sKč/);
});

test("deposit reminder once it is time for the balance: the full price by the balance due date", async () => {
  const [code, , reservation, options] = sampleOf("depositReminder", "záloha po splatnosti, celá částka");
  const mail = await renderEmail(code, reservation, options);
  assert.match(mail.subject, /prosíme o úhradu celé částky/);
  assert.match(mail.text, /o úhradu celé částky 9\s000\sKč\./);
  assert.match(mail.text, /Částka: +9\s000\sKč/);
  assert.match(mail.text, /Splatnost: +24\. 10\. 2026/);
  assert.match(mail.text, /Pokud celá částka nebude uhrazena do 24\. 10\. 2026/);
  assert.deepEqual(mail.attachments.map((a) => a.filename), ["qr-platba.png"]);

  // The balance due date has passed too: as soon as possible.
  const late = await renderEmail(code, reservation, { ...options, today: "2026-10-26" });
  assert.match(late.text, /o úhradu celé částky 9\s000\sKč\./);
  assert.match(late.text, /Prosíme o úhradu co nejdříve/);
  assert.doesNotMatch(late.text, /Splatnost:/);
});

test("deposit reminder of a full-payment plan has no full-amount phase", async () => {
  const [code, , reservation, options] = sampleOf("depositReminder", "platba celé částky po splatnosti");
  const mail = await renderEmail(code, reservation, options);
  assert.match(mail.subject, /^Platba za pobyt .* je po splatnosti$/);
  assert.match(mail.text, /čeká na platbu, která byla splatná do 11\. 10\. 2026/);
});

test("the phase passed by the admin wins over the one computed from today", async () => {
  const [code, , reservation] = sampleOf("depositReminder", "připomínka zálohy před splatností");
  const mail = await renderEmail(code, reservation, { today: "2026-10-10", phase: "overdue" });
  assert.match(mail.subject, /je po splatnosti/);
});

test("balance reminder: before and after the due date", async () => {
  const [code, , reservation, options] = sampleOf("balanceReminder", "připomínka doplatku před splatností");
  const before = await renderEmail(code, reservation, options);
  assert.match(before.subject, /^Připomínka: doplatek/);
  assert.match(before.text, /Splatnost: +24\. 10\. 2026/);

  const [, , , lateOptions] = sampleOf("balanceReminder", "doplatek po splatnosti");
  const after = await renderEmail(code, reservation, lateOptions);
  assert.match(after.subject, /^Doplatek za pobyt .* je po splatnosti$/);
  assert.match(after.text, /zatím neevidujeme doplatek, který byl splatný do 24\. 10\. 2026/);
  assert.match(after.text, /Děkujeme a těšíme se\./);
  assert.doesNotMatch(after.text, /Splatnost:/);
});

test("arrival e-mail carries the owner's message and, with an unpaid balance, the payment", async () => {
  const [code, , reservation, options] = sampleOf("arrivalInfo", "informace k příjezdu se zprávou, doplatek nezaplacený");
  const mail = await renderEmail(code, reservation, options);
  assert.match(mail.text, /Klíče od kola jsou v kůlně\./);
  assert.match(mail.text, /Zatím neevidujeme doplatek 4\s500\sKč\./);
  assert.ok(mail.attachments.some((a) => a.filename === "qr-platba-doplatek.png"));
});
