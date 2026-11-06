// react/jsx-dev-runtime nad UMD Reactem z import mapy (client/uu5-imports.json).
//
// V dev buildu (`caio-devkit start`) kompiluje Vite JSX na `react/jsx-dev-runtime`. Ten devkit
// neexternalizuje, takže by se do bundlu přibalila vývojová verze z npm Reactu 19 -- a ta volá
// `getOwner()` na vnitřnostech, které produkční UMD React 19 nemá (pád „i.getOwner is not
// a function“ při prvním renderu). Tenhle soubor je totéž co devkitový shim `react/jsx-runtime`
// (caio-devkit src/vite/uu5-libs.js, SHIMS): JSX přes `React.createElement`.
// Dočasné, dokud uu5g05 pro React 19 nevyjde a devkit React 19 neumí sám (docs/decisions.md).
define(["react"], function (React) {
  function jsxDEV(type, config, maybeKey) {
    var props = {}, children;
    for (var k in config) { if (k === "children") children = config[k]; else props[k] = config[k]; }
    if (maybeKey !== undefined) props.key = maybeKey;
    if (children === undefined) return React.createElement(type, props);
    return Array.isArray(children)
      ? React.createElement.apply(null, [type, props].concat(children))
      : React.createElement(type, props, children);
  }
  return { jsxDEV: jsxDEV, Fragment: React.Fragment };
});
