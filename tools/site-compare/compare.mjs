// Measures the live site and the rebuild side by side, for the "Målt side ved
// side" table on Ester's client page. The measuring is the shared site-audit
// with --lighthouse (Google's own scoring, the engine behind PageSpeed
// Insights, so she can rerun any number herself); this adds what only
// sculpt.no has: the launch build, the old addresses and the live host names.
//
//   node compare.mjs [out dir] [--runs N]
//
// The preview is noindex and has no sitemap on purpose, so a launch build
// (LAUNCH_SITE in astro.config.mjs) is made and served here to check what
// Google will find once sculpt.no points to the new site. Speed is read from
// the preview, on real hosting; the launch build on localhost would flatter it.
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages, redirects } from '../../src/i18n/pages.js';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const today = new Date().toISOString().slice(0, 10);
const out = args[0] && !args[0].startsWith('--') ? args[0]
  : join(homedir(), 'Vault/Clients/Sculpt Svindland/2026-10-29 sculpt.no/site-audit', today);
// Lighthouse scores move between runs on the same page; the median of three
// is what PageSpeed Insights' own docs suggest reading.
const runs = option('--runs', '3');
const repo = fileURLToPath(new URL('../../', import.meta.url));
// Google cuts a title in its results at about 600 pixels, near 60 characters.
const TITLE_MAX = 60;

// Pages both sites have, by the old slug; the new site keeps them all.
const shared = pages.map((p) => p.slugs.no ?? p.slug);

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

// Asynchronous, so the server above keeps answering while it runs. Exit 1 is
// site-audit reporting findings, which on the live site is the point.
function siteAudit(name, base, extra) {
  const json = join(out, `${name}.json`);
  // Squarespace serves its pages without a trailing slash, the new site with.
  const slash = name === 'live' ? '' : '/';
  const paths = shared.map((slug) => (slug ? `${slug}${slash}` : './'));
  const argv = ['--widths', '390,1280', '--lighthouse', '--json', json, ...extra, base, ...paths];
  console.error(`site-audit: ${name} ${base}`);
  return new Promise((resolve, reject) => {
    const child = spawn('site-audit', argv, { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('exit', (code) => (code === 0 || code === 1 ? resolve(JSON.parse(readFileSync(json, 'utf8')))
      : reject(new Error(`site-audit ${name} exited ${code}`))));
  });
}

async function head(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return { status: res.status, location: res.headers.get('location'), text: res.ok ? await res.text() : '' };
  } catch (e) { return { status: 0, error: e.message }; }
}

mkdirSync(out, { recursive: true });
const server = await serve(launchBuild());
const launchBase = `http://127.0.0.1:${server.address().port}/`;
const audits = {
  live: await siteAudit('live', 'https://www.sculpt.no/', ['--runs', runs]),
  preview: await siteAudit('preview', 'https://polybjorn.github.io/sculpt-no/', ['--runs', runs]),
  launch: await siteAudit('launch', launchBase, ['--runs', '1', '--origin', 'https://sculpt.no']),
};

// The new site sends an old address on with an instant meta refresh, which
// Google follows as a redirect.
const oldAddresses = {};
for (const slug of Object.keys(redirects)) {
  const res = await head(`${launchBase}${slug}/`);
  oldAddresses[slug] = { status: res.status, to: res.text?.match(/http-equiv="refresh" content="0;\s*url=([^"]+)"/i)?.[1] ?? null };
}
const hosts = {};
for (const u of ['http://sculpt.no/', 'https://sculpt.no/', 'http://www.sculpt.no/', 'https://www.sculpt.no/']) {
  const { status, location } = await head(u);
  hosts[u] = { status, location };
}
server.close();

const range = (xs) => (xs.length ? [Math.min(...xs), Math.max(...xs)] : null);
function summary(audit) {
  const list = Object.values(audit.pages).filter((p) => p.lighthouse);
  const lh = (form, pick) => range(list.map((p) => p.lighthouse[form]).filter(Boolean).map(pick));
  const crawl = Object.values(audit.pages).flatMap((p) => p.findings).filter((f) => f.kind === 'crawl').map((f) => f.detail);
  const scored = {};
  for (const form of ['mobile', 'desktop']) {
    scored[form] = {};
    for (const k of ['performance', 'accessibility', 'best-practices', 'seo']) scored[form][k] = lh(form, (r) => r.scores[k]);
    scored[form].lcpSeconds = lh(form, (r) => Math.round(r.metrics.lcp / 100) / 10);
    scored[form].kilobytes = lh(form, (r) => Math.round(r.metrics.bytes / 1024));
  }
  return {
    lighthouse: scored,
    pagesWithOneH1: `${list.filter((p) => !p.findings.some((f) => /h1 headings, needs 1/.test(f.detail))).length} of ${list.length}`,
    titlesOver60: list.filter((p) => (p.title ?? '').length > TITLE_MAX).map((p) => p.title),
    crawl,
  };
}

const report = {
  date: today,
  live: summary(audits.live),
  preview: summary(audits.preview),
  launch: { ...summary(audits.launch), oldAddresses },
  liveHosts: hosts,
};
writeFileSync(join(out, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.error(`Wrote ${out}`);
