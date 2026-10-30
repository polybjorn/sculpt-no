import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { pages } from '../src/i18n/pages.js';

// The rebuild's whole point is that the copy is Ester's, unchanged. This pins
// it: the text of each built page's <main> against the text sculpt.no showed
// at desktop width on 2026-10-29, in reading order. A rewrite that reads
// perfectly well still fails here, which is the case a human reviewer is worst
// at catching. Smart punctuation is caught here too: the first review on the
// front page is typed with straight quotes, the second with curly ones.
//
// Reads dist/, so it needs a build first - `pretest` does that.
const FIXTURES = 'test/fixtures/original-2026-10-29';

// Lines the original shows that the rebuild leaves out, each logged in
// docs/text-changes.yaml. The test below holds every one to still being in its
// fixture, so an entry here never pardons a line that was never there.
const PRICE_BLURB = 'Dine egne former, foreviget i et personlig kunstverk. Et minne du kan glede deg over resten av livet, og som kan leve videre i generasjoner.';

const REMOVED = {
  // Newsletter signup, left out until Ester decides whether to keep it.
  index: [
    // The artist's full story is on om-oss; the front page keeps its opening.
    '— Kunstner og daglig leder',
    'For meg ble skulpturen en måte å bevare et øyeblikk som ellers bare eksisterer i minner og bilder. Den minner meg fortsatt om en helt unik periode.',
    'Denne opplevelsen inspirerte meg til å starte Sculpt. Jeg ønsket å gi flere gravide i Norge muligheten til å bevare denne tiden på en vakker og personlig måte, som et kunstverk de kan ha med seg resten av livet.”',
    'Få oppdateringer fra Sculpt',
    'Meld deg på for inspirasjon, nyheter og informasjon om skulpturer og kommende tilgjengelige skanninger.',
  ],
  kontakt: [
    'Monthly Dispatch',
    'Sign up to receive news and updates.',
  ],
  // The same blurb under both price models, now once above them (ADDED).
  priser: [PRICE_BLURB],
  // The scrolling banner repeats its words as one run-together line and as a
  // spaced one besides the list; the rebuild shows the list once.
  'under-utvikling': [
    'Nyskapende kunst✳︎Kreativ utvikling✳︎Tidløs form✳︎Unike uttrykk✳︎Håndlaget presisjon✳︎Personlig kunst✳︎Innovativt håndverk✳︎Autentisk uttrykk✳︎Nyskapende kunst✳︎Kreativ utvikling✳︎Tidløs form✳︎Unike uttrykk✳︎Håndlaget presisjon✳︎Personlig kunst✳︎Innovativt håndverk✳︎Autentisk uttrykk✳︎',
    'Nyskapende kunst ✳︎ Kreativ utvikling ✳︎ Tidløs form ✳︎ Unike uttrykk ✳︎ Håndlaget presisjon ✳︎ Personlig kunst ✳︎ Innovativt håndverk ✳︎ Autentisk uttrykk ✳︎',
  ],
};

// Craft decisions on sculpt.no's wording, each logged in
// docs/text-changes.yaml, applied to the snapshot in this order: lines
// replaced, a run of lines moved, and lines added after an anchor line (or at
// the end, when `after` is null). Every anchor must be in the snapshot.
const CHANGED = {
  index: [
    ['Item description', 'Les flere anmeldelser på Google'],
    ['“Ideen til Sculpt oppstod da jeg selv var gravid og oppdaget 3D skulpturer i Danmark. Jeg fikk laget en skulptur før fødselen, og det ble et helt spesielt minne fra en tid i livet som går så fort.', '“Ideen til Sculpt oppstod da jeg selv var gravid og oppdaget 3D skulpturer i Danmark. Jeg fikk laget en skulptur før fødselen, og det ble et helt spesielt minne fra en tid i livet som går så fort.”'],
    // Quote marks the other reviews never had.
    ['"Jeg får ikke anbefalt dette nok.', 'Jeg får ikke anbefalt dette nok.'],
    ['Gravidkroppen er midlertidig og magisk!!"', 'Gravidkroppen er midlertidig og magisk!!'],
    ['“Kjempefornøyd med skulpturen og hele prosessen!”', 'Kjempefornøyd med skulpturen og hele prosessen!'],
    ['“Utrolig glad jeg oppdaget dette mens jeg gikk gravid, et fint minne om en koselig tid. Kjempefornøyd med skulpturen! “',
      'Utrolig glad jeg oppdaget dette mens jeg gikk gravid, et fint minne om en koselig tid. Kjempefornøyd med skulpturen!'],
  ],
  priser: [['Premiummodell – 20 cm', 'Premiummodell 20 cm']],
};

const MOVED = {
  // The three reviews above the hero photo, now after the other three.
  index: { first: '⭐️⭐️⭐️⭐️⭐️', last: 'Kristine', before: 'Våre skulpturer' },
  priser: { first: 'Priser', last: 'Bestill', before: 'Ulike positurer' },
};

// Pages whose whole text now follows another's, ahead of that page's added
// lines, in this order. The folded page is no longer built, so its snapshot is
// held here instead.
const FOLDED = { prosessen: ['omskulpturen'] };

const BOOK = 'Bestill din skulptur';
const ADDED = {
  // Both labels of the reviews button, one hidden by CSS, read as one line.
  index: [[BOOK, null], ['Vis flere omtalerVis færre omtaler', 'Elise Bekkevold'], ['Les mer om meg', '“Ideen til Sculpt oppstod da jeg selv var gravid og oppdaget 3D skulpturer i Danmark. Jeg fikk laget en skulptur før fødselen, og det ble et helt spesielt minne fra en tid i livet som går så fort.”']],
  'om-oss': [[BOOK, null]],
  prosessen: [[BOOK, null]],
  gallerigravidskulpturer: [[BOOK, null]],
  galleriskulpturer: [[BOOK, null]],
  priser: [[PRICE_BLURB, 'Priser']],
  kontakt: [['Send SMS', '480 05 508']],
};

// Search titles and descriptions written where sculpt.no had a placeholder
// or none.
const META = {
  prosessen: {
    title: 'Prosessen — Sculpt',
    description: 'Slik foregår det å få laget en personlig skulptur hos Sculpt, fra første samtale og skanning til ferdig skulptur sendt hjem til deg.',
  },
  'under-utvikling': {
    title: 'Sculpt i utvikling — Sculpt',
    description: 'Sculpt arbeider med flere steder å skanne, spesialdesignede sokler og metallisering av skulpturene, og tilbyr samarbeid med bedrifter, kunstnere og idrett.',
  },
};

const at = (lines, line, name) => {
  const i = lines.indexOf(line);
  if (i < 0) throw new Error(`${name}: "${line}" is not in the snapshot`);
  return i;
};

const expected = (name, lines) => {
  let out = [...lines];
  for (const [from, to] of CHANGED[name] ?? []) out[at(out, from, name)] = to;
  const move = MOVED[name];
  if (move) {
    const first = at(out, move.first, name);
    const run = out.splice(first, at(out, move.last, name) - first + 1);
    out.splice(at(out, move.before, name), 0, ...run);
  }
  for (const other of FOLDED[name] ?? []) out.push(...fixtureLines(other));
  for (const [line, after] of ADDED[name] ?? []) {
    if (after === null) out.push(line);
    else out.splice(at(out, after, name) + 1, 0, line);
  }
  return out;
};

const fixtureName = (page) => page.slugs.no ?? (page.slug || 'index');
const builtPath = (page) => join('dist', page.slugs.no ?? page.slug, 'index.html');
const fixtureLines = (name) => readFileSync(join(FIXTURES, `${name}.txt`), 'utf8')
  .split('\n').filter(Boolean);

const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(Number(e[1] === 'x' ? `0${e.slice(1)}` : e.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e] ?? m;
});

const mainText = (html) => {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  return decode(main
    // A block boundary or a <br> is a line in the capture; inline tags are not.
    .replace(/<\/?(h[1-6]|p|li|ul|ol|div|section|blockquote|details|summary)\b[^>]*>|<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, ''))
    .split('\n')
    // The browser collapses runs of spaces when it renders, and the capture
    // took what it rendered.
    .map((l) => l.replace(/[ \t\r]+/g, ' ').trim())
    .filter(Boolean);
};

for (const page of pages) {
  const name = fixtureName(page);
  test(`${name}: page copy matches the 2026-10-29 snapshot`, () => {
    const built = mainText(readFileSync(builtPath(page), 'utf8'));
    const removed = new Set(REMOVED[name] ?? []);
    const original = expected(name, fixtureLines(name).filter((l) => !removed.has(l)));
    // Line by line first, so a failure names the line that drifted instead of
    // printing both documents.
    const n = Math.max(built.length, original.length);
    for (let i = 0; i < n; i += 1) {
      assert.equal(built[i], original[i], `line ${i + 1} differs from the snapshot`);
    }
  });

  test(`${name}: title and description match the snapshot`, () => {
    const meta = META[name] ?? JSON.parse(readFileSync(join(FIXTURES, 'meta.json'), 'utf8'))[name];
    const html = readFileSync(builtPath(page), 'utf8');
    assert.equal(decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''), meta.title);
    assert.equal(decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '') || undefined,
      meta.description);
  });
}

test('every removed line is still in its snapshot', () => {
  for (const [name, lines] of Object.entries(REMOVED)) {
    const original = new Set(fixtureLines(name));
    for (const line of lines) assert.ok(original.has(line), `${name}: "${line}" is not in the snapshot`);
  }
});
