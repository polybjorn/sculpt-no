import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Spacing picked per rule drifted into twenty-odd rem values before the scale
// existed (DESIGN.md, Spacing); this keeps a new rule from starting that again.
const files = ['src/styles/global.css', 'src/styles/no-script.css'];
const css = files.map((f) => [f, readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')]);
const root = css[0][1].match(/:root\s*\{([^}]*)\}/)[1];
const scale = new Set([...root.matchAll(/--(space-[\w-]+):/g)].map((m) => m[1]));
// Lengths that are layout, not spacing: the page edge, the content width, the
// hero photo's width and the step circle a path is drawn from.
const LAYOUT = new Set(['gutter', 'measure', 'hero-width', 'step']);

test('the spacing scale is declared on :root', () => {
  assert.ok(scale.size >= 6, `found ${[...scale].join(', ')}`);
});

test('every margin, padding and gap in rem names a step of the scale', () => {
  const off = [];
  for (const [file, text] of css) {
    const body = text.replace(/:root\s*\{[^}]*\}/, '');
    for (const m of body.matchAll(/(?<![\w-])((?:margin|padding)(?:-[a-z-]+)?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g)) {
      const [, prop, value] = m;
      const tokens = [...value.matchAll(/var\(--([\w-]+)\)/g)].map((t) => t[1]);
      const raw = value.replace(/var\([^)]*\)/g, '').match(/-?\d*\.?\d+(rem|px)\b/);
      const unknown = tokens.filter((t) => !scale.has(t) && !LAYOUT.has(t));
      if (raw || unknown.length) off.push(`${file}: ${prop}: ${value.trim()}`);
    }
  }
  assert.deepEqual(off, []);
});
