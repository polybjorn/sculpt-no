import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Invariants of the built output, as opposed to the copy. Each one answers a
// mutation the build passes: a nav link to a page that was never built, <main>
// deleted out from under the skip link, half of the go-live switch.
const builtPages = () => {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') out.push(p);
    }
  };
  walk('dist');
  return out;
};

const idsIn = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

test('every fragment link lands on an element that exists', () => {
  for (const page of builtPages()) {
    const html = readFileSync(page, 'utf8');
    const ids = idsIn(html);
    for (const [, href] of html.matchAll(/href="#([^"]*)"/g)) {
      assert.ok(ids.has(href), `${page}: #${href} is linked but no element has that id`);
    }
  }
});

test('every internal link lands on a page that was built', () => {
  const base = (process.env.npm_package_config_base ?? '/sculpt-no').replace(/\/$/, '');
  for (const page of builtPages()) {
    const html = readFileSync(page, 'utf8');
    for (const [, href] of html.matchAll(/href="(\/[^"#]*)"/g)) {
      if (!href.startsWith(`${base}/`)) continue;
      const rel = href.slice(base.length + 1);
      const target = rel.endsWith('/') || rel === '' ? join('dist', rel, 'index.html') : join('dist', rel);
      assert.ok(existsSync(target), `${page}: links ${href}, but ${target} was not built`);
    }
    // Content links are relative (src/plugins/remark-page-links.mjs), so they
    // resolve against the page's own folder.
    for (const [, href] of html.matchAll(/href="(\.{0,2}\/?[a-z][^":#]*\/)"/g)) {
      if (href.startsWith('/')) continue;
      const target = join(dirname(page), href, 'index.html');
      assert.ok(existsSync(target), `${page}: links ${href}, but ${target} was not built`);
    }
  }
});

test('the skip link lands on the main landmark', () => {
  for (const page of builtPages()) {
    const html = readFileSync(page, 'utf8');
    const skip = html.match(/<a[^>]*class="skip-link"[^>]*href="#([^"]+)"|<a[^>]*href="#([^"]+)"[^>]*class="skip-link"/);
    assert.ok(skip, `${page}: no skip link`);
    const target = skip[1] ?? skip[2];
    const main = html.match(/<main\b[^>]*>/g) ?? [];
    assert.equal(main.length, 1, `${page}: expected exactly one <main>, found ${main.length}`);
    assert.match(main[0], new RegExp(`id="${target}"`), `${page}: the skip link points at #${target}, which is not the <main>`);
  }
});

test('the preview flags and the base path agree with the domain', () => {
  // Going live is two edits in astro.config.mjs - `site` and `base` - and the
  // noindex meta keys off the first. Half the switch would either publish the
  // live site as noindex or point the preview at sculpt.no.
  for (const page of builtPages()) {
    const html = readFileSync(page, 'utf8');
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical, `${page}: no canonical URL`);
    const live = canonical.includes('sculpt.no');
    assert.equal(/<meta name="robots" content="noindex">/.test(html), !live,
      `${page}: noindex is ${live ? 'still set' : 'missing'} for ${canonical}`);
    assert.equal(canonical.includes('/sculpt-no/'), !live,
      `${page}: the preview base path and the domain disagree in ${canonical}`);
  }
});

test('every FAQ answer sits in one box after its question', () => {
  for (const page of builtPages()) {
    const html = readFileSync(page, 'utf8');
    for (const [block] of html.matchAll(/<details>[\s\S]*?<\/details>/g)) {
      assert.match(block, /^<details>\s*<summary>[\s\S]*?<\/summary>\s*<div class="answer">[\s\S]*<\/div>\s*<\/details>$/,
        `${page}: a <details> without its .answer box, so its CSS cannot slide it open`);
    }
  }
});
