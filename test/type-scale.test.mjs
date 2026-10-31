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

// A size set on an element kept the leading of that element's own rule, so one
// step read at four leadings (DESIGN.md, Type); each rule now names the pair.
const rules = css.flatMap(([file, text]) =>
  [...text.replace(/:root\s*\{[^}]*\}/, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, sel, body]) => ({ where: `${file}: ${sel.trim().split(/\s+/).join(' ')}`, body })));
const STEP_FREE = new Set(['lh-mark', 'lh-control', 'lh-row']);
const declared = (prefix) => new Set([...root.matchAll(new RegExp(`--(${prefix}-[\\w-]+):`, 'g'))].map((m) => m[1]));

test('every rule that sets a size sets that step\'s leading', () => {
  const leading = declared('lh');
  const off = [];
  for (const { where, body } of rules) {
    const size = body.match(/font(?:-size)?\s*:[^;]*var\(--fs-([\w-]+)\)/);
    const lh = body.match(/line-height\s*:\s*([^;]+)/)?.[1]
      ?? body.match(/font\s*:[^;]*var\(--fs-[\w-]+\)\s*\/\s*(var\([^)]+\)|[\d.]+)/)?.[1];
    if (!size && !lh) continue;
    const token = lh?.match(/^var\(--(lh-[\w-]+)\)$/)?.[1];
    if (!lh) off.push(`${where}: --fs-${size[1]} without a line-height`);
    else if (!token || !leading.has(token)) off.push(`${where}: line-height ${lh.trim()}`);
    else if (!STEP_FREE.has(token) && (!size || token !== `lh-${size[1]}`)) off.push(`${where}: --${token} with ${size ? `--fs-${size[1]}` : 'no size'}`);
  }
  assert.deepEqual(off, []);
});

test('tracking names a role, and the display face carries its own', () => {
  const tracking = declared('ls');
  const off = [];
  for (const { where, body } of rules) {
    const ls = body.match(/letter-spacing\s*:\s*([^;]+)/)?.[1].trim();
    if (ls && ls !== 'inherit' && !tracking.has(ls.match(/^var\(--(ls-[\w-]+)\)$/)?.[1])) off.push(`${where}: letter-spacing ${ls}`);
    // Body tracking is a fixed length, so display text inherits it too tight.
    if (/var\(--font-display\)/.test(body) && ls !== 'var(--ls-display)') off.push(`${where}: display face without --ls-display`);
  }
  assert.deepEqual(off, []);
});
