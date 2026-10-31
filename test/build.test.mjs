import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { glue } from '../src/plugins/rehype-nbsp.mjs';

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

// Astro's redirect stubs (astro.config.mjs) are a bare meta refresh, outside
// the layout, so the page invariants hold only for the rest.
const isRedirect = (html) => /<meta http-equiv="refresh"/.test(html);

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

test('every redirect lands on a built page and an element there', () => {
  const base = (process.env.npm_package_config_base ?? '/sculpt-no').replace(/\/$/, '');
  for (const page of builtPages()) {
    const html = readFileSync(page, 'utf8');
    if (!isRedirect(html)) continue;
    const [, path, id] = html.match(/content="0;url=([^"#]*)#?([^"]*)"/) ?? [];
    assert.ok(path?.startsWith(`${base}/`), `${page}: redirects outside the site`);
    const target = join('dist', path.slice(base.length + 1), 'index.html');
    assert.ok(existsSync(target), `${page}: redirects to ${path}, but ${target} was not built`);
    if (id) assert.ok(idsIn(readFileSync(target, 'utf8')).has(id), `${page}: ${target} has no #${id}`);
  }
});

test('the skip link lands on the main landmark', () => {
  for (const page of builtPages()) {
    const html = readFileSync(page, 'utf8');
    if (isRedirect(html)) continue;
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
    if (isRedirect(html)) continue;
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

test('the no-break rules glue a dash, a price, a phone number and a size', () => {
  assert.equal(glue('cellulitter – og kan dere'), 'cellulitter\u00a0– og kan dere');
  assert.equal(glue('7 800 kr'), '7\u00a0800\u00a0kr');
  assert.equal(glue('480 05 508'), '480\u00a005\u00a0508');
  assert.equal(glue('opptil 25 cm høy, ca 1 måned'), 'opptil 25\u00a0cm høy, ca\u00a01\u00a0måned');
  for (const text of ['Markensgate 4A, 4610 Kristiansand', '2026 kroner', '4 årstider']) assert.equal(glue(text), text);
});

// The rehype pass reaches markdown only; text from a component or a UI string
// reaches the page around it, so the built page is what this reads.
test('no line on a built page can start with a dash or split a number', () => {
  const off = [];
  for (const page of builtPages()) {
    const body = readFileSync(page, 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '';
    const text = body.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '').replace(/&nbsp;|&#160;/g, '\u00a0');
    for (const run of text.split(/<[^>]*>/)) {
      if (glue(run) !== run) off.push(`${page}: "${run.trim()}"`);
    }
  }
  assert.deepEqual(off, []);
});
