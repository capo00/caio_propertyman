import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import spaces from "../components/accommodation/content.js";
import {
  PAGES,
  languagePaths,
  listPages,
  localizedPath,
  pageRoute,
  parseRoute,
  redirectsFor,
  translatePath,
} from "./routes.js";

// Jazyky webu jsou jen v package.json (`caio.languages`), tabulka slugů je v routes.js.
// Testy hlídají, že se ty dvě věci nerozešly a že žádná adresa nevede na dvě stránky.
const LANGUAGES = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).caio.languages;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

test("každá stránka a každý prostor mají slug v každém jazyce webu, bez diakritiky", () => {
  for (const [code, slugs] of Object.entries(PAGES)) {
    for (const language of LANGUAGES) {
      const slug = slugs[language];
      assert.equal(typeof slug, "string", `${code}: chybí ${language}`);
      if (code !== "home") assert.match(slug, SLUG, `${code}.${language}`);
    }
  }
  for (const space of spaces) {
    for (const language of LANGUAGES) assert.match(space.slug?.[language] ?? "", SLUG, `${space.code}.${language}`);
  }
});

test("routy jsou v každém jazyce unikátní a parseRoute je opak pageRoute", () => {
  for (const language of LANGUAGES) {
    const routes = listPages().map((page) => pageRoute(language, page));
    assert.equal(new Set(routes).size, routes.length, language);
    for (const page of listPages()) assert.deepEqual(parseRoute(language, pageRoute(language, page)), page);
  }
});

test("adresy: výchozí jazyk bez prefixu, ostatní s ním, kořen jazyka s lomítkem", () => {
  assert.equal(localizedPath("cs", { code: "home" }, "cs"), "/");
  assert.equal(localizedPath("cs", { code: "pricing" }, "cs"), "/cenik");
  assert.equal(localizedPath("de", { code: "home" }, "cs"), "/de/");
  assert.equal(localizedPath("de", { code: "pricing" }, "cs"), "/de/preise");
  assert.equal(localizedPath("en", { code: "accommodation", space: "dvorek" }, "cs"), "/en/accommodation/yard");
  assert.equal(localizedPath("en", { code: "nesmysl" }, "cs"), null);
});

test("přesměrování: slug jiného jazyka a home, nikdy vlastní stránka", () => {
  for (const language of LANGUAGES) {
    const redirects = redirectsFor(language, LANGUAGES);
    const own = new Set(listPages().map((page) => pageRoute(language, page)));
    for (const [from, to] of Object.entries(redirects)) {
      assert.ok(!own.has(from), `${language}: ${from} je stránka i přesměrování`);
      assert.ok(own.has(to), `${language}: ${from} -> ${to}, cíl není stránka`);
    }
    assert.equal(redirects.home, "");
  }
  assert.equal(redirectsFor("de", LANGUAGES).cenik, "preise");
  assert.equal(redirectsFor("cs", LANGUAGES).preise, "cenik");
  assert.equal(redirectsFor("de", LANGUAGES)["ubytovani/stodola"], "unterkunft/scheune");
});

test("mapa cest pro přesměrovací skript: z výchozího jazyka do ostatních", () => {
  const paths = languagePaths(LANGUAGES);
  assert.deepEqual(Object.keys(paths), LANGUAGES.slice(1));
  assert.equal(paths.en[""], "");
  assert.equal(paths.en.cenik, "prices");
  assert.equal(paths.de["ubytovani/stodola"], "unterkunft/scheune");
});

test("přepínač: tatáž stránka v jiném jazyce, query zůstává, 404 vede na kořen", () => {
  const to = (pathname, from, target, search) => translatePath({ pathname, search }, { from, to: target, languages: LANGUAGES });
  assert.equal(to("/cenik", "cs", "de", "?prostor=kuchyne"), "/de/preise?prostor=kuchyne");
  assert.equal(to("/de/preise", "de", "cs"), "/cenik");
  assert.equal(to("/", "cs", "en"), "/en/");
  assert.equal(to("/cs/ubytovani/stodola", "cs", "pl"), "/pl/zakwaterowanie/stodola");
  assert.equal(to("/en/accommodation/yard", "en", "sk"), "/sk/ubytovanie/dvor");
  assert.equal(to("/en/nesmysl", "en", "de", "?x=1"), "/de/");
});
