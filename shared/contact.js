// Contact values derived from caio.config.js `app` (`property.address`, `contact.phone`), written the
// same way by the web, the e-mails and the build (JSON-LD). The phone is stored once, readable with
// spaces; the `tel:` and WhatsApp forms are derived -- they used to be separate values and drifted
// apart (the web showed one number and dialled another).
//
// Lives in shared/ for the same reason as pages.js: the server must never import from client/.
// Only pure functions, no imports.

/** Postal address on two lines: street, then postcode and town (no region, it would need translating). */
export function addressLines(address) {
  return [address.street, `${address.zip} ${address.city}`];
}

/** The number for a `tel:` link: digits and a leading "+", no spaces or brackets. */
export function phoneHref(phone) {
  return phone.replace(/[^+\d]/g, "");
}

/** A WhatsApp chat with the number (wa.me wants it without "+" and spaces), no prefilled message. */
export function whatsappUrl(phone) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
