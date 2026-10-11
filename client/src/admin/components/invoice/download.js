// Stažení PDF, které server poslal jako base64 v JSONu. Přes Blob a dočasný odkaz `download`:
// na desktopu se soubor uloží, na telefonu ho prohlížeč otevře nebo nabídne ke sdílení.

export function downloadPdf(filename, pdfBase64) {
  const bytes = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari začne stahovat až po kliknutí -- okamžité revokeObjectURL by mu URL vzalo.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
