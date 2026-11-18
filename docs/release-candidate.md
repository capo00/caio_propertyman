# Release candidate

## Přidáno
- E-mail s informacemi k příjezdu obsahuje praktické informace majitelky (parkování, schránka na klíče s postupem otevření, teplá voda, topení, co je připraveno, co udělat při odjezdu) ve všech jazycích webu, Wi-Fi z Nastavení s QR kódem pro připojení a výrazně zvýrazněný kód ke schránce na klíče. Adresa v e-mailu je odkaz na mapu. Odeslání z administrace zatím není.
- Nové fotky v ubytování (WebP s variantami jako dřív) a nový prostor Předsíň a schody s fotbálkem. Kuchyň a světnice, dvorek a hero mají nové fotky a pořadí. Ložnice a Koupelny se skládají ze sekcí po místnostech (1.–3. ložnice s lůžky, koupelna v přízemí a v podkroví), první ložnice zatím s placeholderem místo fotky.

## Opraveno
-

## Breaking
- Nastavení → Roubenka: pole Klíče a Parkování zmizela, jejich obsah je teď pevný text e-mailu s informacemi k příjezdu. Případné uložené hodnoty se už nepoužijí a při dalším uložení Nastavení zmizí.
- Prostor Stodola (`/ubytovani/stodola` a jeho jazykové varianty) je z webu pryč, než k němu budou fotky; adresa vrátí 404. Z galerie zmizely fotky vejměnku a ložnice s vikýřem (07-loznice-1).
