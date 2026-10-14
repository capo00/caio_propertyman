// Routy appky, které nejsou veřejnou stránkou ze `seo.js`: přesměrování a obrazovky adminu.
// Jen data, žádné komponenty -- čte je `router.jsx` (sestaví z nich routeMap) i build
// (`seo-files.js` z nich a z `seo.js` zapíše `public/spa-routes.json`, podle kterého server
// pozná neznámou adresu a vrátí 404, viz docs/proposal-seo-404.md). Router a server se
// tak nemůžou rozejít.

// Stará routa -> nová. Server na ně odpovídá 301, klient je přesměruje sám (odkaz uvnitř
// appky, historie prohlížeče). `home` je tatáž stránka jako `/`, kanonická je `/`.
export const REDIRECTS = {
  home: "",
  admin: "admin/reservations",
};

// Obrazovky adminu, routa `admin/<screen>`. Detail rezervace je routa s query parametrem
// (`admin/reservation?id=`) -- dynamický segment router neumí.
export const ADMIN_SCREENS = ["reservations", "reservation", "reviews", "ical"];
