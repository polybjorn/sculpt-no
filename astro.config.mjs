// @ts-check
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { locales, defaultLocale } from './src/i18n/locales.js';
import { remarkPageLinks, pagesDigest } from './src/plugins/remark-page-links.mjs';
import { rehypeSections } from './src/plugins/rehype-sections.mjs';
import { rehypeNbsp } from './src/plugins/rehype-nbsp.mjs';
import { redirects } from './src/i18n/pages.js';

// Preview deployment on GitHub Pages. At launch: site back to
// 'https://sculpt.no' and drop `base`. Preview builds also skip the sitemap
// and carry a noindex meta (Layout.astro), both keyed on this check, so the
// preview never competes with the live Squarespace site.
// LAUNCH_SITE builds the launch state ahead of time, so tools/site-audit can
// check the sitemap and indexing the preview leaves out.
const site = process.env.LAUNCH_SITE ?? 'https://polybjorn.github.io';
const isPreview = !site.includes('sculpt.no');
const base = process.env.PREVIEW_BASE ?? '/sculpt-no';

// Astro caches rendered markdown by the markdown alone, so a plugin edit needs
// a changed config to reach the pages; a digest of their source is that change.
const plugins = new URL('./src/plugins/', import.meta.url);
const pluginsDigest = createHash('sha256')
  .update(readdirSync(plugins).sort().map((f) => readFileSync(new URL(f, plugins), 'utf8')).join('\0'))
  .digest('hex');

export default defineConfig({
  site,
  // A branch preview on the fleet's site-preview server lands on a subpath of
  // its own; scripts/build-preview.mjs sets this to match.
  base,
  redirects: Object.fromEntries(Object.entries(redirects)
    .map(([from, to]) => [`/${from}`, `${base.replace(/\/$/, '')}/${to}`])),
  integrations: isPreview ? [] : [
    sitemap({
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((l) => [l.code, l.intl])),
      },
    }),
  ],
  markdown: {
    // Page copy is Ester's own text, kept verbatim. Leave its punctuation
    // alone rather than letting smart quotes rewrite it.
    smartypants: false,
    remarkPlugins: [[remarkPageLinks, { digest: pagesDigest() }]],
    rehypePlugins: [rehypeSections, [rehypeNbsp, { digest: pluginsDigest }]],
  },
  compressHTML: true,
  vite: {
    // Astro inlines small hoisted scripts into the HTML, which the CSP in
    // Layout.astro (script-src 'self') then blocks. Keep every script an
    // external file.
    build: { assetsInlineLimit: 0 },
  },
});
