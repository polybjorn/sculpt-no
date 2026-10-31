import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Sizes picked per component drifted into fourteen near-duplicates before the
// scale existed (DESIGN.md, Type); this keeps a new rule from starting that again.
const files = ['src/styles/global.css', 'src/styles/no-script.css'];
const css = files.map((f) => [f, readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')]);
const root = css[0][1].match(/:root\s*\{([^}]*)\}/)[1];
const scale = new Set([...root.matchAll(/--(fs-[\w-]+):/g)].map((m) => m[1]));

test('the scale is declared on :root', () => {
  assert.ok(scale.size >= 5, `found ${[...scale].join(', ')}`);
});

test('every font size names a step of the scale', () => {
  const off = [];
  for (const [file, text] of css) {
    for (const m of text.replace(/:root\s*\{[^}]*\}/, '').matchAll(/(font-size|font)\s*:\s*([^;}]+)/g)) {
      const [, prop, value] = m;
      if (value.trim() === 'inherit') continue;
      const step = value.match(/var\(--(fs-[\w-]+)\)/);
      if (!step || !scale.has(step[1])) off.push(`${file}: ${prop}: ${value.trim()}`);
    }
  }
  assert.deepEqual(off, []);
});
