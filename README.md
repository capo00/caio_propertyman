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
| [docs/decisions.md](./docs/decisions.md) | co je rozhodnuto a proč |
| [docs/wip.md](./docs/wip.md) | co je rozdělané a co blokuje |
| `ux/` | screenshoty vizuální předlohy |

## Rozjetí

Prerekvizity: Node.js (cíl je 24, viz `docs/wip.md`), běžící MongoDB, přístup do registry
`repo.plus4u.net` (`.npmrc` už na ni míří).

`caio-server`, `caio-ui` a `caio-devkit` nejsou publikované, takže se instalují z lokálních
tarballů — cesty v `package.json` a `client/package.json` míří do sousedního repa
`../caio-architecture/*/dist/*.tgz`. Když se v nich něco změní, je potřeba je **přebalit**:

```bash
cd ../caio-architecture/caio-server && npm run package
cd ../caio-ui                       && npm pack --pack-destination dist
cd ../caio-devkit                   && npm pack -w caio-devkit -w caio-create-app --pack-destination dist
```

Pak:

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
