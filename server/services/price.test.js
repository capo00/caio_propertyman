import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice, listPrices } from "./price.js";
import { easterSunday, isHoliday } from "./holidays.js";

// Očekávané částky jsou spočtené ručně podle zadání majitele (2026-10-12), ne opsané
// z výstupu funkce. Noc patří dni, na který připadá (ráno se odjíždí).
// Listopad 2026: 6. pátek, 7. sobota, 8. neděle, 17. úterý (svátek).

const price = (from, to) => calculatePrice(from, to).totalPrice;

test("ceník na webu: víkend a týden", () => {
  const list = listPrices();
  assert.deepEqual(list.weekend, { nights: 2, totalPrice: 11000 });
  assert.deepEqual(list.week, { nights: 7, totalPrice: 28000 });
});

test("všední noci: standardní cena", () => {
  assert.equal(price("2026-11-09", "2026-11-11"), 9500); // po–st
  assert.equal(price("2026-11-09", "2026-11-12"), 13000); // po–čt
  assert.equal(price("2026-11-09", "2026-11-13"), 16500); // po–pá, noc na pátek je všední
  assert.equal(price("2026-11-08", "2026-11-13"), 20500); // ne–pá, noc na pondělí je všední
});

test("víkend: noci na sobotu a neděli za 120 %", () => {
  assert.equal(price("2026-11-06", "2026-11-08"), 11000); // pá–ne
});

test("noc na pondělí po víkendu je všední", () => {
  // noc na neděli 3800 × 1,2 + noc na pondělí 3800 = 8360 + 1500 → 10 000
  assert.equal(price("2026-11-07", "2026-11-09"), 10000);
});

test("smíšený pobyt: příplatek jen na víkendové noci", () => {
  // čt–ne: noc na pátek 3800, na sobotu 3800 × 1,2, na neděli 3700 × 1,2
  // = 3800 + 4560 + 4440 + 1500 = 14 300 → 14 500
  assert.equal(price("2026-11-05", "2026-11-08"), 14500);

  // st–po (5 nocí): ještě s víkendovou přirážkou -- noci na so a ne za 3700 × 1,2
  // = 3800 + 3800 + 4440 + 4440 + 3700 + 1500 = 21 680 → 22 000
  assert.equal(price("2026-11-11", "2026-11-16"), 22000);
});

test("pobyt delší než 5 nocí: víkend za běžnou cenu, svátek s přirážkou", () => {
  assert.equal(price("2026-11-08", "2026-11-15"), 28000); // ne–ne, 7 nocí přes víkend
  assert.equal(price("2026-11-06", "2026-11-12"), 24000); // pá–čt, 6 nocí přes víkend

  // čt–st (6 nocí): víkend běžně, jen noc na út 17. 11. (svátek, 5. noc) za 3700 × 1,2
  // = 3800 + 3800 + 3700 × 3 + 4440 + 1500 = 24 640 → 25 000
  assert.equal(price("2026-11-12", "2026-11-18"), 25000);
});

test("svátek ve všední den: noc na svátek za 120 %", () => {
  // noc na út 17. 11. (svátek) 3800 × 1,2 + noc na st 3800 = 8360 + 1500 → 10 000
  assert.equal(price("2026-11-16", "2026-11-18"), 10000);
  // noc ZE svátku (na středu) je všední -- svátek je den, na který noc připadá
  assert.equal(price("2026-11-17", "2026-11-19"), 9500);
});

test("Velikonoce: Velký pátek a Velikonoční pondělí jsou svátky", () => {
  assert.equal(easterSunday(2024), "2024-03-31");
  assert.equal(easterSunday(2025), "2025-04-20");
  assert.equal(easterSunday(2026), "2026-04-05");
  assert.equal(easterSunday(2027), "2027-03-28");

  assert.ok(isHoliday("2027-03-26")); // Velký pátek
  assert.ok(isHoliday("2027-03-29")); // Velikonoční pondělí
  assert.ok(!isHoliday("2027-03-30"));

  // st–pá 2027: noc na čtvrtek 3800 + noc na Velký pátek 3800 × 1,2 → 10 000
  assert.equal(price("2027-03-24", "2027-03-26"), 10000);
});

test("Vánoce: noci na 24. a 25. 12. → celý pobyt za 180 %", () => {
  assert.equal(price("2026-12-23", "2026-12-26"), 22000); // 3 noci
  assert.equal(price("2026-12-22", "2026-12-26"), 28500); // 4 noci
  assert.equal(price("2026-12-23", "2026-12-28"), 35500); // 5 nocí, termín může jít i dál za Vánoce
  assert.equal(price("2026-12-20", "2026-12-26"), 42000); // 6 nocí
  assert.equal(price("2026-12-19", "2026-12-26"), 48500); // 7 nocí
  assert.equal(price("2027-12-23", "2027-12-26"), 22000); // jiný rok, jiné dny v týdnu
  assert.equal(calculatePrice("2026-12-23", "2026-12-26").kind, "christmas");
});

test("Vánoce na 2 noci mají cenu (zapíše je jen vlastník, web je odmítne -- stay-rules)", () => {
  // 7600 × 1,8 + 1500 = 15 180 → 15 500
  assert.equal(price("2026-12-23", "2026-12-25"), 15500);
});

test("termín jen s částí Vánoc není vánoční, svátky se počítají po nocích", () => {
  // příjezd 24. -- chybí noc na 24.: noci na 25. (svátek), 26. (svátek, so), 27. (ne)
  // = 3800 × 1,2 + 3800 × 1,2 + 3700 × 1,2 + 1500 = 15 060 → 15 500
  assert.equal(price("2026-12-24", "2026-12-27"), 15500);
  assert.equal(calculatePrice("2026-12-24", "2026-12-27").kind, "standard");

  // odjezd 24. -- chybí noc na 25.: noc na 23. 3800, na 24. (svátek) 3800 × 1,2 → 10 000
  assert.equal(price("2026-12-22", "2026-12-24"), 10000);
});

test("Silvestr: noc na 1. 1. → celý pobyt za 200 %", () => {
  assert.equal(price("2026-12-31", "2027-01-02"), 17000); // 2 noci
  assert.equal(price("2026-12-30", "2027-01-02"), 24500); // 3 noci
  assert.equal(price("2026-12-27", "2027-01-03"), 54000); // 7 nocí
  assert.equal(calculatePrice("2026-12-31", "2027-01-02").kind, "silvester");
});

test("pobyt končící 31. 12. ráno silvestrovský není", () => {
  // noci na st 30. a čt 31. 12. 2026, obě všední
  assert.equal(price("2026-12-29", "2026-12-31"), 9500);
});

test("Vánoce i Silvestr v jednom pobytu: celé za vánoční násobitel", () => {
  // 10 nocí: (7600 + 8 × 3700) × 1,8 + 1500 = 37 200 × 1,8 + 1500 = 68 460 → 68 500
  assert.equal(price("2026-12-23", "2027-01-02"), 68500);
  assert.equal(calculatePrice("2026-12-23", "2027-01-02").kind, "christmas");
});

test("výsledek je vždy celý násobek 500 a nezávisí na plovoucí čárce", () => {
  for (let day = 1; day <= 28; day++) {
    const from = `2026-02-${String(day).padStart(2, "0")}`;
    for (const to of ["2026-03-02", "2026-03-05", "2026-03-10"]) {
      if (from >= to) continue;
      assert.equal(price(from, to) % 500, 0, `${from} → ${to}`);
    }
  }
});
