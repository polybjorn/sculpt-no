// Measures the live site and the rebuild side by side, for the quality and
// SEO table on Ester's client page. Lighthouse is Google's own scoring, the
// engine behind PageSpeed Insights, so she can rerun any number herself; the
// page checks cover what a crawler reads and Lighthouse does not grade.
//
//   node audit.mjs [out dir] [--runs N] [--skip-lighthouse]
//
// The preview is noindex and has no sitemap on purpose, so a launch build
// (LAUNCH_SITE in astro.config.mjs) is made and served here to check what
// Google will find once sculpt.no points to the new site.
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, redirects } from '../../src/i18n/pages.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const today = new Date().toISOString().slice(0, 10);
const out = args[0] && !args[0].startsWith('--') ? args[0]
  : join(homedir(), 'Vault/Clients/Sculpt Svindland/2026-10-29 sculpt.no/site-audit', today);
// Lighthouse scores move between runs on the same page; the median of three
// is what PageSpeed Insights' own docs suggest reading.
const runs = Number(option('--runs', 3));
const repo = fileURLToPath(new URL('../../', import.meta.url));

// Pages both sites have, by the old slug; the new site keeps them all.
const shared = pages.map((p) => p.slugs.no ?? p.slug);
// `home-1-1` stays out of the old addresses: it sits in sculpt.no's sitemap
// and is checked from there, as a duplicate of the front page.
const oldOnly = Object.keys(redirects);

function launchBuild() {
  const dir = mkdtempSync(join(tmpdir(), 'sculpt-launch-'));
  console.error(`Building the launch state into ${dir}`);
  execFileSync('npx', ['astro', 'build', '--outDir', dir], {
    cwd: repo, stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, LAUNCH_SITE: 'https://sculpt.no', PREVIEW_BASE: '/' },
  });
  return dir;
}

// Answers as GitHub Pages does: a folder without its slash is redirected to
// it, and a missing file gets 404.html with a 404 status.
function serve(dir) {
  const types = { '.html': 'text/html; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain',
    '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(dir, path);
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(301, { location: `${path}/` }); return res.end(); }
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) {
      res.writeHead(404, { 'content-type': types['.html'] });
      const page = join(dir, '404.html');
      return res.end(existsSync(page) ? readFileSync(page) : 'Not found');
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// `origin` is where the pages are fetched; `canonical` is the address the
// pages should name as their own, which for the launch build is sculpt.no.
const launchDir = launchBuild();
const server = await serve(launchDir);
const sites = {
  live: { label: 'I dag', origin: 'https://www.sculpt.no', canonical: 'https://www.sculpt.no', slash: false },
  preview: { label: 'Ny side (forhåndsvisning)', origin: 'https://polybjorn.github.io/sculpt-no', canonical: 'https://polybjorn.github.io/sculpt-no', slash: true },
  launch: { label: 'Ny side (ved lansering)', origin: `http://127.0.0.1:${server.address().port}`, canonical: 'https://sculpt.no', slash: true },
};
const pathOf = (site, slug) => (slug ? `/${slug}${site.slash ? '/' : ''}` : '/');

// What a crawler reads off one page, after any redirect, HTTP or meta refresh.
async function inspect(context, url) {
  const page = await context.newPage();
  const res = await page.goto(url, { waitUntil: 'load' });
  // The new site sends an old address on with an instant meta refresh, which
  // Google follows as a redirect; it navigates once the page has loaded.
  await page.waitForLoadState('networkidle');
  let hops = 0;
  for (let r = res.request(); r.redirectedFrom(); r = r.redirectedFrom()) hops++;
  const dom = await page.evaluate(() => {
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
    const types = [];
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const walk = (n) => {
          if (Array.isArray(n)) return n.forEach(walk);
          if (n && typeof n === 'object') {
            if (n['@type']) types.push([].concat(n['@type']).join('/'));
            if (n['@graph']) walk(n['@graph']);
          }
        };
        walk(JSON.parse(s.textContent));
      } catch { types.push('(invalid JSON)'); }
    }
    // A closed lightbox gets its alt text when it opens; it is not content.
    const imgs = [...document.querySelectorAll('img')].filter((i) => !i.closest('dialog, [hidden]'));
    return {
      lang: document.documentElement.lang || null,
      title: document.title,
      description: meta('meta[name="description"]'),
      robots: meta('meta[name="robots"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().replace(/\s+/g, ' ')),
      h2: document.querySelectorAll('h2').length,
      ogTitle: meta('meta[property="og:title"]'),
      ogImage: meta('meta[property="og:image"]'),
      structuredData: types,
      images: imgs.length,
      imagesWithoutAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
      links: [...document.querySelectorAll('a[href]')].map((a) => a.href)
        .filter((h) => h.startsWith(location.origin)).map((h) => h.split('#')[0]),
    };
  });
  const result = { url, status: res.status(), finalUrl: page.url(), httpRedirects: hops, ...dom };
  await page.close();
  return result;
}

// Status without following redirects, so a link to a redirect shows as one.
async function head(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return { status: res.status, location: res.headers.get('location') };
  } catch (e) { return { status: 0, error: e.message }; }
}

// `local` maps an address in a sitemap to where it is served, since the
// launch build names sculpt.no in its own sitemap index.
async function sitemapUrls(url, local, seen = new Set()) {
  if (seen.has(url)) return [];
  seen.add(url);
  const res = await fetch(local(url)).catch(() => null);
  if (!res?.ok) return [];
  const locs = [...(await res.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  const nested = await Promise.all(locs.filter((l) => /sitemap[^/]*\.xml$/.test(l)).map((l) => sitemapUrls(l, local, seen)));
  return [...locs.filter((l) => !/sitemap[^/]*\.xml$/.test(l)), ...nested.flat()];
}

const browser = await chromium.launch();
const context = await browser.newContext();
const report = { date: today, sites: {} };

for (const [key, site] of Object.entries(sites)) {
  console.error(`Page checks: ${site.label}`);
  const toLocal = (u) => u.replace(site.canonical, site.origin);
  const entry = { label: site.label, pages: {}, oldAddresses: {} };
  for (const slug of shared) entry.pages[slug || '/'] = await inspect(context, site.origin + pathOf(site, slug));
  if (key !== 'live') {
    for (const slug of oldOnly) entry.oldAddresses[slug] = await inspect(context, `${site.origin}/${slug}`);
  }

  const robots = await fetch(`${site.origin}/robots.txt`).then(async (r) => ({ status: r.status, text: r.ok ? await r.text() : '' }));
  const blocksGoogle = /User-agent:\s*(\*|Googlebot)\s*\n(?:User-agent:.*\n)*Disallow:\s*\/\s*$/im.test(robots.text);
  const sitemaps = [...robots.text.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  // The preview skips its sitemap, so its robots.txt names one that only
  // exists once the site runs on sculpt.no.
  const listed = key === 'preview' ? [] : (await Promise.all(sitemaps.map((s) => sitemapUrls(s, toLocal)))).flat();
  const sitemap = {};
  for (const loc of listed) {
    const path = new URL(loc).pathname.replace(/^\/|\/$/g, '') || '/';
    const known = entry.pages[path] ?? entry.oldAddresses[path];
    const checked = known ?? await inspect(context, toLocal(loc));
    sitemap[loc] = { status: checked.status, finalUrl: checked.finalUrl, title: checked.title,
      canonical: checked.canonical };
    if (!known) entry.pages[path] = checked;
  }

  const links = [...new Set(Object.values(entry.pages).flatMap((p) => p.links))];
  const broken = {};
  for (const l of links) {
    const r = await head(l);
    if (r.status >= 400 || r.status === 0) broken[l] = r.status;
  }

  // Each page should be one address: titles or descriptions shared between
  // pages are what Google folds together as duplicates.
  const dupes = (field) => Object.entries(Object.groupBy(
    Object.entries(entry.pages).filter(([, p]) => p[field]), ([, p]) => p[field],
  )).filter(([, g]) => g.length > 1).map(([value, g]) => ({ value, pages: g.map(([s]) => s) }));

  const hosts = {};
  if (key === 'live') {
    for (const u of ['http://sculpt.no/', 'https://sculpt.no/', 'http://www.sculpt.no/', 'https://www.sculpt.no/']) hosts[u] = await head(u);
  }

  entry.site = {
    robots: { status: robots.status, blocksGoogle, sitemaps },
    sitemap,
    notFound: (await head(`${site.origin}/denne-siden-finnes-ikke`)).status,
    brokenLinks: broken,
    duplicateTitles: dupes('title'),
    duplicateDescriptions: dupes('description'),
    hosts,
  };
  for (const p of Object.values(entry.pages)) delete p.links;
  for (const p of Object.values(entry.oldAddresses)) delete p.links;
  report.sites[key] = entry;
}
await browser.close();
// Written now and again at the end, so a failure in the long Lighthouse
// stretch still leaves the page checks.
mkdirSync(out, { recursive: true });
const save = () => writeFileSync(join(out, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
save();

if (!flag('--skip-lighthouse')) {
  const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new'] });
  const metrics = {
    lcp: 'largest-contentful-paint', fcp: 'first-contentful-paint', tbt: 'total-blocking-time',
    cls: 'cumulative-layout-shift', speedIndex: 'speed-index', bytes: 'total-byte-weight',
  };
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const lh = {};
  // Real hosting for both sites, run alternately so a slow minute on the
  // network hits both. Indexing is left out of the score: the preview is
  // noindex by choice, and the launch build is scored for SEO below.
  const plans = [];
  for (const form of ['mobile', 'desktop']) {
    for (const slug of shared) {
      for (let i = 0; i < runs; i++) {
        for (const key of ['live', 'preview']) plans.push({ key, form, slug, skip: ['is-crawlable'] });
      }
    }
  }
  for (const slug of shared) plans.push({ key: 'launch', form: 'mobile', slug, only: ['seo'] });
  for (const [n, plan] of plans.entries()) {
    const site = sites[plan.key];
    const url = site.origin + pathOf(site, plan.slug);
    console.error(`Lighthouse ${n + 1}/${plans.length}: ${plan.key} ${plan.form} ${url}`);
    const flags = { port: chrome.port, output: 'json', logLevel: 'error',
      skipAudits: plan.skip, onlyCategories: plan.only };
    // Chrome now and then loses the tab mid-run, which says nothing about
    // the page; a run that fails three times is left out of the median.
    let result;
    for (let attempt = 1; attempt <= 3 && !result; attempt++) {
      try {
        result = await lighthouse(url, flags, plan.form === 'desktop' ? desktopConfig : undefined);
      } catch (e) { console.error(`  attempt ${attempt} failed: ${e.message}`); }
    }
    const slot = ((lh[plan.key] ??= {})[plan.form] ??= {})[plan.slug || '/'] ??= { runs: [] };
    if (!result) { slot.errors = (slot.errors ?? 0) + 1; continue; }
    const { categories, audits } = result.lhr;
    const run = {
      scores: Object.fromEntries(Object.entries(categories).map(([k, c]) => [k, Math.round(c.score * 100)])),
      metrics: Object.fromEntries(Object.entries(metrics).filter(([, id]) => audits[id])
        .map(([k, id]) => [k, audits[id].numericValue])),
      // What pulled the scores down, to explain a difference in words.
      failed: Object.values(categories).filter((c) => c.id !== 'performance')
        .flatMap((c) => c.auditRefs.map((r) => audits[r.id]))
        .filter((a) => a.score !== null && a.score < 0.9 && ['binary', 'numeric'].includes(a.scoreDisplayMode))
        .map((a) => a.title),
    };
    slot.runs.push(run);
  }
  chrome.kill();
  for (const forms of Object.values(lh)) {
    for (const pagesByForm of Object.values(forms)) {
      for (const slot of Object.values(pagesByForm)) {
        if (!slot.runs.length) continue;
        const pick = (get) => median(slot.runs.map(get));
        slot.scores = Object.fromEntries(Object.keys(slot.runs[0].scores).map((k) => [k, pick((r) => r.scores[k])]));
        slot.metrics = Object.fromEntries(Object.keys(slot.runs[0].metrics).map((k) => [k, pick((r) => r.metrics[k])]));
        slot.failed = [...new Set(slot.runs.flatMap((r) => r.failed))];
      }
    }
  }
  report.lighthouse = lh;
}
server.close();

save();
console.error(`Wrote ${join(out, 'audit.json')}`);
