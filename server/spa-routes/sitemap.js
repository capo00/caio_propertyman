import fs from "fs";
import path from "path";

// Content of sitemap.xml (caio-server wraps it into XML, adds the site's address and robots.txt).
// The list of pages is the one the 404 already uses: public/spa-routes.json, written by the build
// (client/src/config/seo-files.js, `buildSpaRoutes`) -- the server cannot read client/, which is
// not uploaded to App Engine.

/**
 * Every page in every language, each pointing at all its language versions (`hreflang`,
 * `x-default` = the default language, roubenyraj.cz is in Czech). `routes[language]` lists the
 * same pages in the same order in every language, so an index is one page.
 *
 * @param routes     `spa-routes.json` `routes`: `{ cs: ["", "cenik", ...], de: ["", "preise", ...] }`
 * @param languages  `caio.languages`, first = default; the keys of `routes` without it
 */
export function sitemapEntries(routes, languages = Object.keys(routes)) {
  const [defaultLanguage] = languages;
  const pathOf = (language, route) => (language === defaultLanguage ? `/${route}` : `/${language}/${route}`);
  const count = Math.max(0, ...languages.map((language) => routes[language]?.length ?? 0));

  const entries = [];
  for (let i = 0; i < count; i++) {
    const alternates = {};
    for (const language of languages) {
      const route = routes[language]?.[i];
      if (route != null) alternates[language] = pathOf(language, route);
    }
    for (const language of Object.keys(alternates)) entries.push({ path: alternates[language], alternates });
  }
  return entries;
}

/** `App.init({ seo: { sitemap } })`: reads spa-routes.json on every request (it is small). */
export function createSitemap({ publicPath = path.resolve(process.cwd(), "public") } = {}) {
  const file = path.join(publicPath, "spa-routes.json");
  return async ({ languages }) => {
    const { routes } = JSON.parse(fs.readFileSync(file, "utf8"));
    return sitemapEntries(routes, languages?.length ? languages : Object.keys(routes));
  };
}
