# caio_propertyman

Web pro pronájem nemovitostí (krátkodobé pronájmy). Provozně zatím jedna nemovitost —
roubenka v Libošovicích v Českém ráji.

Postaveno na [`caio-architecture`](../caio-architecture/README.md): `caio-devkit` (scaffold,
dev/build/deploy), `caio-server` (Express + MongoDB), `caio-ui` (React nad `uu5g05`).

## Dokumentace

| Kde | Co |
|---|---|
| [design.md](./design.md) | cílový stav — produktové zadání, datový model, API, etapy |
| [design-v1.md](./design-v1.md) | zadání první verze (rozsah, co v ní není a proč) |
| [docs/impl-plan-v1.md](./docs/impl-plan-v1.md) | **implementační plán v1** — 11 etap krok za krokem |
| [docs/ux-design-system.md](./docs/ux-design-system.md) | barvy, typografie a sekce vytěžené z předlohy (`ux/`) |
| [docs/component-tree.md](./docs/component-tree.md) | strom komponent každé sekce (diagramy) + co z toho má být z uu5 |
| [docs/decisions.md](./docs/decisions.md) | co je rozhodnuto a proč |
| [docs/wip.md](./docs/wip.md) | co je rozdělané a co blokuje |
| [docs/release.md](./docs/release.md) | **vydání do produkce** — prerekvizity, postup, co po nasazení |
| `ux/` | screenshoty vizuální předlohy |

## Rozjetí

Prerekvizity: Node.js (cíl je 24, viz `docs/wip.md`), běžící MongoDB, přístup do registry
`repo.plus4u.net` (`.npmrc` už na ni míří) a proměnná prostředí `NPM_TOKEN` — klasický
GitHub PAT se scope `read:packages`.

`caio-server`, `caio-ui` a `caio-devkit` se berou z GitHub Packages jako `@capo00/*`;
`.npmrc` v kořeni i v `client/` mapuje ten scope na `npm.pkg.github.com` a token si bere
z `${NPM_TOKEN}`. V `package.json` jsou pod nescopovaným jménem přes alias
(`npm:@capo00/caio-server@^0.2.2`), protože v `node_modules` musí ležet jako
`caio-server`/`caio-ui`/`caio-devkit`. Přebalování tarballů z vedlejšího repa už není
potřeba — nová verze knihovny je normální `npm install` / `npm update`.

Piny k 2026-09-25: `caio-server` ^0.2.2, `caio-ui` ^0.2.3, `caio-devkit` ^0.3.0. Caret na
`0.x` nepřekročí minor, takže po minor bumpu kterékoli z nich je potřeba pin zvednout ručně.

Rozjetí:

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

**Otevírá se `http://localhost:8080` — serverový port, ne 3000.** `caio-devkit start`
nespouští Vite dev server: staví klienta ve watch režimu rovnou do `public/` a servíruje ho
express, takže API i frontend jsou same-origin. **Není HMR** — po uložení je nutný refresh.

## Skripty

| | |
|---|---|
| `npm run dev` | nodemon nad `server/` + `vite build --watch` do `public/` |
| `npm run build` | build klienta do `public/` |
| `npm run deploy` | build + `gcloud app deploy` |
| `npm start` | jen server (`node server/index.js`), pro ověření produkčního buildu |
| `npm run sync` | podstrčí appce lokální klony stacku (viz níž) |

### Práce proti rozdělanému stacku

Appka má `caio-ui`, `caio-server` i `caio-devkit` z GitHub Packages, takže běží proti
**vydanému** kódu. Když je zrovna měníš v klonu pod `caio-architecture/`, podstrč je appce:

```bash
npm run sync -- --ui          # jen caio-ui
npm run sync                  # celý stack
npm run sync -- --status      # co je lokální a co publikované
npm run sync -- --restore     # zpátky na publikované
```

Dev server přitom může běžet — skript na konci šťouchne do vstupních `index.html`, takže si
rebuild vynutí sám. `package.json` nechává být, takže **každý `npm install` lokální kopii
přepíše**; pak `sync` spusť znovu. Podrobnosti: `caio-devkit` README, *Vyvíjená appka proti
lokálnímu stacku*.

### Nasazení

Celý postup i to, co musí být hotové předtím, je v [docs/release.md](./docs/release.md).
Ve zkratce: cíl deploye je `caio.deploy.project` v `package.json` (bez něj se `npm run
deploy` zastaví), strop instancí je v `app.yaml`, serverovou konfiguraci drží produkční
`.env` (klíče popisuje release.md § 1.4; předloha vedle něj schválně není)
a `GOOGLE_MAPS_API_KEY` musí být v prostředí, kde build běží — do bundlu se zapéká,
za běhu se nečte.

## Struktura

```
server/     backend — App.init({ api }), jedna složka na entitu ({dao,crud,api}.js)
client/     frontend — Vite + uu5; client/public/ se kopíruje do buildu 1:1
public/     BUILD OUTPUT — devkit ho maže a přepisuje, nic sem neukládat ručně
docs/       poznámky, plán a rozhodnutí
ux/         vizuální předloha
```
