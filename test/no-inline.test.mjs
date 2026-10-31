import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The CSP in Layout.astro is `script-src 'self'` and `style-src 'self'`, with no
// 'unsafe-inline' in either, so an inline script, an on*= handler, a <style>
// block or a style="" attribute is refused by the browser on the live page
// and fails nothing at build time. Astro produces each of them quietly: it
// inlines small bundles, `define:vars` always renders inline, and an Image
// with a style prop writes the attribute. Ported from polybjorn's
// tests/no-inline-script.test.mjs, with regexes in place of its jsdom.
const pages = readdirSync('dist', { recursive: true })
  .filter((name) => name.endsWith('.html'))
  .map((name) => join('dist', name));

const tags = (html) => [...html.matchAll(/<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)];

test('there are built pages to check', () => {
  assert.ok(pages.length >= 1, `only ${pages.length} pages in dist`);
});

for (const page of pages) {
  const html = readFileSync(page, 'utf8');

  test(`${page}: no inline script`, () => {
    const inline = tags(html)
      // A JSON-LD block is data the browser never runs, so the CSP lets it be.
      .filter(([, name, attrs]) => name.toLowerCase() === 'script' && !/\ssrc\s*=/i.test(attrs)
        && !/\stype="application\/ld\+json"/i.test(attrs))
      .map(([tag]) => tag);
    assert.deepEqual(inline, []);
  });

  test(`${page}: no inline style block`, () => {
    const inline = tags(html).filter(([, name]) => name.toLowerCase() === 'style').map(([tag]) => tag);
    assert.deepEqual(inline, []);
  });

  test(`${page}: no style or on* attribute`, () => {
    const found = tags(html).flatMap(([, name, attrs]) =>
      [...attrs.matchAll(/\s(style|on[a-z]+)\s*=/gi)].map((m) => `<${name} ${m[1]}>`));
    assert.deepEqual(found, []);
  });
}
