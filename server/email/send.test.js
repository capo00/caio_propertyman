// Odeslání přes skutečný nodemailer proti lokálnímu SMTP sinku (nic neodchází ven):
// Reply-To jen u e-mailu vlastníkovi, inline QR, stavy skipped / failed do historie.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

const PORT = 2526;
const messages = [];
const sockets = new Set();
let server;

function startSink() {
  return new Promise((resolve) => {
    server = net.createServer((socket) => {
      sockets.add(socket);
      let buffer = "";
      let inData = false;
      let to = [];
      socket.write("220 sink\r\n");
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        for (;;) {
          if (inData) {
            const end = buffer.indexOf("\r\n.\r\n");
            if (end < 0) return;
            messages.push({ to, raw: buffer.slice(0, end) });
            buffer = buffer.slice(end + 5);
            inData = false;
            to = [];
            socket.write("250 ok\r\n");
            continue;
          }
          const nl = buffer.indexOf("\r\n");
          if (nl < 0) return;
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          const cmd = line.slice(0, 4).toUpperCase();
          if (cmd === "EHLO") socket.write("250-sink\r\n250 AUTH PLAIN LOGIN\r\n");
          else if (cmd === "AUTH") socket.write("235 ok\r\n");
          else if (cmd === "RCPT") { to.push(line); socket.write("250 ok\r\n"); }
          else if (cmd === "DATA") { inData = true; socket.write("354 go\r\n"); }
          else if (cmd === "QUIT") { socket.write("221 bye\r\n"); socket.end(); }
          else socket.write("250 ok\r\n");
        }
      });
    });
    server.listen(PORT, resolve);
  });
}

const header = (raw, name) => raw.match(new RegExp(`^${name}: (.*)$`, "mi"))?.[1] ?? null;
let send;
let SAMPLES;

before(async () => {
  Object.assign(process.env, {
    SMTP_HOST: "127.0.0.1", SMTP_PORT: String(PORT), SMTP_USER: "u", SMTP_PASSWORD: "p",
    MAIL_FROM: "noreply@roubenyraj.test", OWNER_EMAIL: "majitel@roubenyraj.test",
    // Sink nemá TLS. caio-server vynucuje STARTTLS při přihlášení mimo development; testy
    // běží bez NODE_ENV, tedy jako development.
  });
  await startSink();
  send = await import("./send.js");
  ({ SAMPLES } = await import("./samples.js"));
});

after(() => {
  for (const socket of sockets) socket.destroy();
  server?.close();
});

const sample = (code) => SAMPLES.find(([c]) => c === code)[2];

test("guest mail: sent, no Reply-To, inline QR, recorded with subject and text", async () => {
  const record = await send.sendEmail("depositRequested", sample("depositRequested"), {});
  assert.equal(record.status, "sent");
  assert.ok(record.subject && record.text.includes("Variabilní symbol"));
  const raw = messages.at(-1).raw;
  assert.equal(header(raw, "Reply-To"), null);
  assert.match(header(raw, "From"), /noreply@roubenyraj\.test/);
  assert.match(raw, /Content-ID: <qr-deposit@roubenyraj>/i);
});

test("owner mail: Reply-To is the guest", async () => {
  const record = await send.sendEmail("ownerNewRequest", sample("ownerNewRequest"), {});
  assert.equal(record.status, "sent");
  assert.equal(record.to, "majitel@roubenyraj.test");
  assert.match(header(messages.at(-1).raw, "Reply-To"), /jan\.novak@seznam\.cz/);
});

test("guest without e-mail → nothing to record", async () => {
  const r = sample("requestReceived");
  assert.equal(await send.sendEmail("requestReceived", { ...r, contact: { ...r.contact, email: null } }, {}), null);
});

test("SMTP unreachable → failed with the error, never throws", async () => {
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
  const record = await send.sendEmail("requestReceived", sample("requestReceived"), {});
  assert.equal(record.status, "failed");
  assert.match(record.error, /ECONNREFUSED|connect/);
});

test("no SMTP configured → skipped, but the text is in the record", async () => {
  delete process.env.SMTP_HOST;
  const record = await send.sendEmail("requestReceived", sample("requestReceived"), {});
  assert.equal(record.status, "skipped");
  assert.equal(record.reason, "smtpNotConfigured");
  assert.ok(record.text.length > 50);
});
