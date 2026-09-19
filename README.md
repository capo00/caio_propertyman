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
| `ux/` | screenshoty vizuální předlohy |

## Rozjetí

Prerekvizity: Node.js (cíl je 24, viz `docs/wip.md`), běžící MongoDB, přístup do registry
`repo.plus4u.net` (`.npmrc` už na ni míří) a proměnná prostředí `NPM_TOKEN` — klasický
GitHub PAT se scope `read:packages`.

`caio-server`, `caio-ui` a `caio-devkit` se berou z GitHub Packages jako `@capo00/*`;
`.npmrc` v kořeni i v `client/` mapuje ten scope na `npm.pkg.github.com` a token si bere
z `${NPM_TOKEN}`. V `package.json` jsou pod nescopovaným jménem přes alias
(`npm:@capo00/caio-server@^0.2.0`), protože v `node_modules` musí ležet jako
`caio-server`/`caio-ui`/`caio-devkit`. Přebalování tarballů z vedlejšího repa už není
potřeba — nová verze knihovny je normální `npm install` / `npm update`.

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

## Struktura

```
server/     backend — App.init({ api }), jedna složka na entitu ({dao,crud,api}.js)
client/     frontend — Vite + uu5; client/public/ se kopíruje do buildu 1:1
public/     BUILD OUTPUT — devkit ho maže a přepisuje, nic sem neukládat ručně
docs/       poznámky, plán a rozhodnutí
ux/         vizuální předloha
```
