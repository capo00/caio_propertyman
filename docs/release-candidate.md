# Release candidate

## Přidáno
- Kalendář obsazenosti (home, `/rezervace`, ceník) i kalendář v poli termínu ukazují den příjezdu a odjezdu cizí rezervace jako půlku dne, rozdělenou úhlopříčkou. Den odjezdu jde vybrat jako začátek termínu, den příjezdu jako konec. Pole termínu odmítne termín přes obsazené dny už v prohlížeči.
- Kresba roubenky je černá v obou režimech: na načítací obrazovce i v Kontaktu. V tmavém režimu leží na světlém „papíru“ (nová role palety `paper`). Potřebuje caio-devkit 0.5.1.
- Nový favicon a obrázek pro sdílení (og image).
- Dočasně uu5g05, uu5g05-elements a uu5g05-forms 1.54.0-alpha-react19.2 (tarbally z dev CDN) a React 19.1.9 (UMD v `client/src/assets/vendor/`), viz `docs/decisions.md`.
- Dokumentace: flow rezervace v jednom diagramu (`docs/flow-rezervace.md`).

## Opraveno
-

## Breaking
-
