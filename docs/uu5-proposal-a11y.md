# Návrh pro uu5 tým: přístupnost v `uu5g05-elements` a `uu5g05-forms`

Zadání pro tým, který spravuje `uu5g05-elements` a `uu5g05-forms`. Appka `caio_propertyman`
si to sama opravit nemůže (`uu5g05*` je platforma, ne stack v `caio-architecture`) a vzhled
uu5 komponent nepřestylovává. Tenhle dokument je jen návrh, žádná implementace k němu
nevznikla.

Zdroj: Lighthouse 13 (axe-core), mobil, `http://localhost:8080/#faq` (celá home včetně
rezervace, kalendáře, FAQ a kontaktu), 2026-10-15. Verze: `uu5g05`, `uu5g05-elements`
a `uu5g05-forms` 1.52.2. Po opravách na straně appky (A8, `docs/decisions.md`) zůstává
přístupnost 86/100 a všechny zbylé nálezy kromě jednoho (§ 7) jsou v těchto knihovnách.

---

## 1. `Accordion` — `aria-expanded` na prvku bez role (`aria-allowed-attr`)

```html
<div aria-expanded="true" class="uuelements-1oj34hd" data-testid="panel-0">
```

Každý panel `Uu5Elements.Accordion` nese `aria-expanded` na obyčejném `div`. ARIA ho na
prvku bez role nedovoluje, takže ho čtečka ignoruje a stav rozbalení neohlásí.

**Návrh:** `aria-expanded` (a `aria-controls` s `id` obsahu) dát na tlačítko v záhlaví
panelu, které rozbalení přepíná (vzor *WAI-ARIA Accordion*).

## 2. `FormDateRange` — atributy comboboxu na prvku bez role (`aria-allowed-attr`)

```html
<div aria-live="polite" aria-haspopup="listbox" aria-expanded="false"
     aria-controls="…-picker" tabindex="0" aria-required="true" name="dateRange" class="uuforms-toieg5 …">
```

Prvek se chová jako combobox (otevírá výběr termínu), ale nemá roli, takže
`aria-expanded` a `aria-required` jsou nepovolené a čtečka je neohlásí.

**Návrh:** doplnit `role="combobox"` (nebo `role="button"` s `aria-haspopup="dialog"`, podle
toho, co výběr skutečně je) a `aria-haspopup` sladit s tím, co se otevírá (kalendář není
`listbox`).

## 3. `FormDateRange` — ikona kalendáře jako tlačítko bez názvu (`aria-command-name`)

```html
<span class="… uugds uugds-calendar" data-testid="icon-left" role="button" style="…">
```

Ikona vlevo v poli má `role="button"`, ale žádný přístupný název. Čtečka ohlásí jen
„tlačítko“.

**Návrh:** `aria-label` z LSI („Vybrat termín“), nebo, pokud ikona nic samostatného nedělá,
`role="button"` odebrat a dát `aria-hidden="true"`.

## 4. `uu5g05-forms` — barva labelu polí (`color-contrast`)

```html
<label class="uuelements-jyp7ob uuforms-kmnzss" for="…">Termín pobytu</label>
```

Label má výchozí `#808080`. Na světlém podkladu karty `#fffdf9` je kontrast **3,88 : 1**,
WCAG AA chce 4,5 : 1 (text 16 px, normální řez). Týká se všech polí formuláře.

**Návrh:** tmavší výchozí barva labelu (pro AA na bílé stačí `#757575`, s rezervou `#666`).

## 5. `Calendar` — hlavička dnů v týdnu a víkendové dny (`color-contrast`)

- Hlavička „Po … Ne“ (`<span class="uuelements-17kx17n …">`): `#7a7977` na `#fffdf9`,
  **4,28 : 1** (12 px).
- Víkendové dny (`<span class="uuelements-au40mv …">`): `#e53935` na `#f4f2ee`,
  **3,78 : 1** (14 px).

**Návrh:** tmavší šedá hlavičky a tmavší odstín víkendové červené (např. `#c62828`, na
`#f4f2ee` ~5 : 1).

## 6. `TouchButton` s `imageSrc` a `href` — odkaz s `role="img"` (`aria-allowed-role`)

```html
<a role="img" data-name="Uu5Elements.TouchButton" href="…" target="_self"></a>
```

`<a href>` s rolí `img` přestane být pro čtečky odkazem. Appka mu dává název přes `tooltip`
(→ `title`), ale role zůstává nevhodná.

**Návrh:** u varianty s `href` ponechat roli odkazu a obrázek vykreslit jako `<img alt>`
(nebo `role="img"` s `aria-label`) **uvnitř** odkazu.

## 7. Vědomě ponecháno v appce (pro úplnost)

- `InfoGroup` — `subtitle` má výchozí `#777671`, na krémovém podkladu sekce (`#f9f5e8`)
  kontrast 4,17 : 1. Majitel webu ho v appce měnit nechce. Na bílém podkladu by prošel.
- Odkazy v textu rozlišené jen barvou (`link-in-text-block`) — rozhodnutí appky
  (bez podtržení), ne chyba uu5.
