// Wi-Fi QR code: the de-facto standard that the camera apps of Android and iOS read and offer to join
// the network without typing the password.
//
//   WIFI:T:WPA;S:<network name>;P:<password>;;
//
// `\ ; , : "` in the name and the password are escaped with a backslash. Without a password the type
// is `nopass` (an open network). WPA covers WPA2 and WPA3 too -- the phone negotiates the rest.

function escapeValue(value) {
  return String(value).replace(/([\\;,:"])/g, "\\$1");
}

/** Text of the Wi-Fi QR code for `name` (network name, SSID) and `password` (may be empty). */
export function wifiQrText({ name, password }) {
  if (!name) throw new Error("Wi-Fi QR: the network name is missing");
  const security = password ? `T:WPA;S:${escapeValue(name)};P:${escapeValue(password)}` : `T:nopass;S:${escapeValue(name)}`;
  return `WIFI:${security};;`;
}
