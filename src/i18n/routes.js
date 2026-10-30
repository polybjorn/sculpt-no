// Vite-specific wiring for the route helpers: the content glob and BASE_URL.
// All the logic is in routes-core.js.

import { locales } from './locales.js';
import { pages } from './pages.js';
import * as core from './routes-core.js';

export { pages };

const pageByKey = Object.fromEntries(pages.map((p) => [p.key, p]));

// BASE_URL is "/" at sculpt.no and "/sculpt-no" on the GitHub Pages preview.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// Which languages have a content file for which page. Lazy glob: only the keys
// are read, the markdown is not loaded here.
const contentFiles = import.meta.glob('../content/pages/*/*.md');
const translated = core.translationsFromPaths(Object.keys(contentFiles));

export function localesWithPage(key) {
  return locales.filter((l) => translated[key]?.has(l.code)).map((l) => l.code);
}

export function pathFor(key, code) {
  return core.pathFor(pageByKey, base, key, code);
}

export function resolveRoute(key, code) {
  return core.resolveRoute(pageByKey, base, translated, key, code);
}

export function allRoutes() {
  return core.allRoutes(pages, translated);
}
