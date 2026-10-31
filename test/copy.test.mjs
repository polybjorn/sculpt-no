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
  // Repeats of the steps above them or of each other, cut with her review asked
  // (text-changes.yaml, Prosessen). The scan paragraph returns without one
  // sentence (ADDED).
  omskulpturen: [
    'Skulpturene lages gjennom en kombinasjon av en rask 3D-skanning av kroppen, digital bearbeiding, 3D-printing og håndarbeid i etterbehandlingen.',
    'Hver skulptur starter med en personlig skanning av kroppen med en håndholdt 3D-skanner. Skanningen kan sammenlignes med at det tas tusenvis av “bilder” av kroppen din fra alle vinkler, som i løpet av kort tid settes sammen til en nøyaktig 3D-modell. Prosessen er helt ufarlig og ikke-invasiv, og du utsettes ikke for stråling eller andre belastninger. Denne modellen bearbeides deretter digitalt for å sikre form, uttrykk og balanse før den printes i 3D og videre ferdigstilles for hånd. Det er i håndarbeidet skulpturen virkelig får sitt unike uttrykk utover de personlige kroppslige detaljene i printen. Her kombineres kundens ønsker med en forståelse og kjennskap til personen gjennom skanneavtalen, slik at kunstneren kan bruke dette i den videre kunstneriske utformingen av skulpturen.',
    'Gjennom digital bearbeiding, håndarbeid og individuelt tilpasset finish forvandles grunnmaterialet til et personlig kunstverk med sitt eget særpreg.',
    'Hver skulptur bearbeides derfor individuelt, med stor omtanke for både detaljene og det ferdige kunstneriske uttrykket.',
    'Skulpturene kan lages i ulike positurer, uttrykk og overflateutførelser, avhengig av kundens valg og ønsket estetikk.',
    'Alle skulpturer er custom made og unike.',
  ],
  // Newsletter signup, left out until Ester decides whether to keep it.
  index: [
    // The artist's full story is on om-oss; the front page keeps its opening.
    '— Kunstner og daglig leder',
    'For meg ble skulpturen en måte å bevare et øyeblikk som ellers bare eksisterer i minner og bilder. Den minner meg fortsatt om en helt unik periode.',
    'Denne opplevelsen inspirerte meg til å starte Sculpt. Jeg ønsket å gi flere gravide i Norge muligheten til å bevare denne tiden på en vakker og personlig måte, som et kunstverk de kan ha med seg resten av livet.”',
    // The intro and each step's text are on prosessen; the front page keeps the step names.
    'Å få laget en personlig skulptur er en helt unik opplevelse, og mange lurer på hvordan det faktisk foregår. Derfor har jeg gjort prosessen så trygg, enkel og forutsigbar som mulig. Hos Sculpt blir du fulgt opp gjennom hvert steg – fra første samtale til ferdig skulptur – slik at du alltid vet hva som skjer, og kan føle deg komfortabel hele veien.',
    'Her er en oversikt over hele prosessen, og hva du kan forvente fra første møte til skulpturen står klar i hendene dine.',
    'Vi starter med en personlig samtale om dine ønsker og hva du ser for deg med skulpturen. Sammen går vi gjennom prosessen og planlegger selve skanningen, samt eventuelle justeringer som kan gjøres digitalt i etterkant.',
    'Kroppen skannes i en trygg og rolig setting. Skanningen er helt ufarlig for både deg og barnet og tar vanligvis ikke mer enn to minutter. For ekstra presisjon kan vi bruke et elektrisk snurrebord og stativ (valgfritt). Kun kunstneren har tilgang til skanningen. Du skannes naken eller med sømløs truse for best mulig detaljbevaring.',
    'Etter skanningen bearbeides modellen digitalt for å sikre høy presisjon og kvalitet. Noen justeringer gjøres mens du er til stede, slik at du selv kan være med og bestemme hvordan resultatet skal bli. Vi kan også myke opp eller fjerne små detaljer dersom du ønsker det.',
    'Basert på skanningen lages en nøyaktig 3D-modell av kroppen din. Her finjusteres form og detaljer slik at skulpturen gjengir uttrykket på en naturlig og vakker måte.',
    'Skulpturen 3D-printes. Deretter fylles den og bearbeides for hånd før overflate og utførelse tilpasses nøye etter dine ønsker.',
    'Når skulpturen er ferdig, pakkes den trygt og sendes til deg. Hver skulptur behandles med stor omtanke, slik at du mottar et varig minne med høy kvalitet og personlig preg.',
    // One step with Digital behandling, as on prosessen.
    '3D-modellering',
    'Få oppdateringer fra Sculpt',
    'Meld deg på for inspirasjon, nyheter og informasjon om skulpturer og kommende tilgjengelige skanninger.',
  ],
  // The places are on tid-og-sted, and named only three of five here.
  'om-oss': ['Jeg tilbyr skanning i Flekkefjord, Kristiansand og Oslo.'],
  // Its text is now the first half of the Digital behandling step.
  prosessen: ['3D-modellering'],
  kontakt: [
    'Monthly Dispatch',
    'Sign up to receive news and updates.',
  ],
  // The same blurb under both price models, now once above them (ADDED).
  priser: [PRICE_BLURB],
  // Typed dates, now read from Ester's calendar (data-feed below).
  'tid-og-sted': ['25 Oktober', '29 November', '20 Desember', '3 November', '8 Desember', '4 November', '9 Desember'],
  // The page, dropped: its plans are what a customer takes for granted. The
  // banner's words were each a top-level heading on sculpt.no. Its last line
  // is on kontakt (ADDED).
  'under-utvikling': [
    'Sculpt i utvikling',
    'Sculpt er et kunstforetak i kontinuerlig utvikling, med fokus på å forbedre og videreutvikle både produkter og opplevelse. Vi arbeider løpende med nye satsingsområder for å utvide uttrykket og mulighetene innen personlig skulpturkunst.',
    'I tillegg til å etablere flere lokasjoner for å gjøre personlige skulpturer tilgjengelig for flere, utforsker vi også nye elementer for å stadig gjøre produktet bedre, som spesialdesignede sokler og muligheten for metallisering av skulpturene. Dette er løsninger som kan løfte uttrykket ytterligere og gi hvert kunstverk en enda mer eksklusiv og helhetlig fremtoning.',
    'Det er viktig for oss å samarbeide med leverandører og partnere som forstår kvaliteten og det kunstneriske uttrykket i Sculpt, slik at alle tilleggselementer holder samme standard som selve skulpturene.',
    'Dessuten kan vi også tilby bedrifter, kunstnere og idrett samarbeid innenfor vår kategori.',
    'Nyskapende kunst✳︎Kreativ utvikling✳︎Tidløs form✳︎Unike uttrykk✳︎Håndlaget presisjon✳︎Personlig kunst✳︎Innovativt håndverk✳︎Autentisk uttrykk✳︎Nyskapende kunst✳︎Kreativ utvikling✳︎Tidløs form✳︎Unike uttrykk✳︎Håndlaget presisjon✳︎Personlig kunst✳︎Innovativt håndverk✳︎Autentisk uttrykk✳︎',
    'Nyskapende kunst',
    '✳︎',
    'Kreativ utvikling',
    'Tidløs form',
    'Unike uttrykk',
    'Håndlaget presisjon',
    'Personlig kunst',
    'Innovativt håndverk',
    'Autentisk uttrykk',
    'Nyskapende kunst ✳︎ Kreativ utvikling ✳︎ Tidløs form ✳︎ Unike uttrykk ✳︎ Håndlaget presisjon ✳︎ Personlig kunst ✳︎ Innovativt håndverk ✳︎ Autentisk uttrykk ✳︎',
  ],
};

// Craft decisions on sculpt.no's wording, each logged in
// docs/text-changes.yaml, applied to the snapshot in this order: lines
// replaced, a run of lines moved, and lines added after an anchor line (or at
// the end, when `after` is null). Every anchor must be in the snapshot.
const BOOK = 'Bestill din skulptur';
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
  priser: [['Premiummodell – 20 cm', 'Premiummodell 20 cm'], ['Bestill', BOOK]],
  gallerigravidskulpturer: [['Graviditetskulpturer', 'Graviditetsskulpturer']],
  // The front page's step 2 ends with this sentence; that text is now here.
  prosessen: [['Kroppen skannes i en trygg og rolig setting. Skanningen er helt ufarlig for både deg og barnet og tar vanligvis ikke mer enn to minutter. For ekstra presisjon kan vi bruke et elektrisk snurrebord og stativ (valgfritt). Kun kunstneren har tilgang til skanningen.', 'Kroppen skannes i en trygg og rolig setting. Skanningen er helt ufarlig for både deg og barnet og tar vanligvis ikke mer enn to minutter. For ekstra presisjon kan vi bruke et elektrisk snurrebord og stativ (valgfritt). Kun kunstneren har tilgang til skanningen. Du skannes naken eller med sømløs truse for best mulig detaljbevaring.']],
};

const MOVED = {
  // The three reviews above the hero photo, now after the other three.
  index: { first: '⭐️⭐️⭐️⭐️⭐️', last: 'Kristine', before: 'Våre skulpturer' },
  priser: { first: 'Priser', last: BOOK, before: 'Ulike positurer' },
  // The model is made before it is adjusted, so its paragraph comes first.
  prosessen: {
    first: 'Basert på skanningen lages en nøyaktig 3D-modell av kroppen din. Her finjusteres form og detaljer slik at skulpturen gjengir uttrykket på en naturlig og vakker måte.',
    last: 'Basert på skanningen lages en nøyaktig 3D-modell av kroppen din. Her finjusteres form og detaljer slik at skulpturen gjengir uttrykket på en naturlig og vakker måte.',
    before: 'Etter skanningen bearbeides modellen digitalt for å sikre høy presisjon og kvalitet. Justeringene gjøres mens du er til stede, slik at du selv kan være med og bestemme hvordan resultatet skal bli. Vi kan også myke opp eller fjerne små detaljer dersom du ønsker det.',
  },
  // Her home studio first, then the cities nearest it; moves apply in order.
  'tid-og-sted': [
    { first: 'Flekkefjord', last: 'Ta kontakt så finner vi en tid.', before: 'Oslo' },
    { first: 'Kristiansand', last: 'Skanning foregår på Huset i Markens. Markensgate 4A, 4610 Kristiansand', before: 'Oslo' },
    { first: 'Stavanger', last: 'Skanning i “Stavanger tinfabrik”: Ryfylkegata 45, 4014 Stavanger', before: 'Oslo' },
  ],
};

// Pages whose whole text, less its REMOVED lines, now follows another's, ahead
// of that page's added lines, in this order. The folded page is no longer
// built, so its snapshot is held here instead.
const FOLDED = { prosessen: ['omskulpturen'] };

const ADDED = {
  // Both labels of the reviews button, one hidden by CSS, read as one line.
  index: [[BOOK, null], ['Les mer om prosessen', 'Levering'], ['Vis flere omtalerVis færre omtaler', 'Elise Bekkevold'], ['Les mer om meg', '“Ideen til Sculpt oppstod da jeg selv var gravid og oppdaget 3D skulpturer i Danmark. Jeg fikk laget en skulptur før fødselen, og det ble et helt spesielt minne fra en tid i livet som går så fort.”']],
  // Not Ester's words: a draft of where Sculpt is going, for her to approve (#33).
  'om-oss': [['Nå lager jeg også skulpturer av par, barn og familier, og jeg vil fortsette å utvikle Sculpt med nye typer skulpturer.', 'Denne opplevelsen inspirerte meg til å starte Sculpt. Jeg ønsket å gi flere gravide i Norge muligheten til å bevare denne tiden på en vakker og personlig måte, som et kunstverk de kan ha med seg resten av livet.'], ['Se andre skulpturer', 'Nå lager jeg også skulpturer av par, barn og familier, og jeg vil fortsette å utvikle Sculpt med nye typer skulpturer.'], [BOOK, null]],
  prosessen: [
    ['Se tider og steder', CHANGED.prosessen[0][1]], [BOOK, null],
    // Headings for the parts of «Om skulpturen», with the scan paragraph short one sentence.
    ['Fra skanning til skulptur', 'Om skulpturen'], ['Hver skulptur starter med en personlig skanning av kroppen med en håndholdt 3D-skanner. Skanningen kan sammenlignes med at det tas tusenvis av “bilder” av kroppen din fra alle vinkler, som i løpet av kort tid settes sammen til en nøyaktig 3D-modell. Prosessen er helt ufarlig og ikke-invasiv, og du utsettes ikke for stråling eller andre belastninger. Det er i håndarbeidet skulpturen virkelig får sitt unike uttrykk utover de personlige kroppslige detaljene i printen. Her kombineres kundens ønsker med en forståelse og kjennskap til personen gjennom skanneavtalen, slik at kunstneren kan bruke dette i den videre kunstneriske utformingen av skulpturen.', 'Fra skanning til skulptur'],
    ['Materialet', 'Hver skulptur starter med en personlig skanning av kroppen med en håndholdt 3D-skanner. Skanningen kan sammenlignes med at det tas tusenvis av “bilder” av kroppen din fra alle vinkler, som i løpet av kort tid settes sammen til en nøyaktig 3D-modell. Prosessen er helt ufarlig og ikke-invasiv, og du utsettes ikke for stråling eller andre belastninger. Det er i håndarbeidet skulpturen virkelig får sitt unike uttrykk utover de personlige kroppslige detaljene i printen. Her kombineres kundens ønsker med en forståelse og kjennskap til personen gjennom skanneavtalen, slik at kunstneren kan bruke dette i den videre kunstneriske utformingen av skulpturen.'], ['Overflaten', 'Materialet er også valgt med tanke på styrke, holdbarhet og et mer bevisst materialvalg i produksjonen.'],
    ['Størrelse og utførelse', 'For mye sliping kan føre til at nettopp disse detaljene går tapt. Å finne denne balansen er en kunst i seg selv, og noe Sculpt har spesialisert seg på.'], ['Holdbarhet og levering', 'For å ivareta autentisiteten i uttrykket gjøres det ikke justeringer av kroppens grunnleggende proporsjoner. Kroppen gjengis slik den fremkommer i skanningen, uten idealisering eller endring av former. Vi kan likevel gjøre mye med overflater og enten fremheve detaljer eller duse ut detaljer e.l.'],
  ],
  gallerigravidskulpturer: [[BOOK, null]],
  galleriskulpturer: [[BOOK, null]],
  priser: [[PRICE_BLURB, 'Priser']],
  kontakt: [['Dessuten kan vi også tilby bedrifter, kunstnere og idrett samarbeid innenfor vår kategori.', 'Har du spørsmål om skulpturene, prosessen eller booking? Jeg hjelper deg gjerne. Send meg en melding eller en e-post, så svarer jeg så fort jeg kan.'], ['Send SMS', '480 05 508']],
  'tid-og-sted': [['Steder', 'Ser du ikke en dag som passer for deg, ta gjerne kontakt. Noen steder kan det være mulighet for fleksibilitet.'], [BOOK, null]],
};

// Search titles and descriptions that differ from sculpt.no, merged over the
// snapshot's. The layout ends every title in "| Sculpt" (src/content.config.mjs
// says why), so the snapshot's endings disagree with most pages.
const META = {
  'om-oss': { title: 'Om meg: Få et minne, bestill skulptur i dag | Sculpt' },
  prosessen: {
    title: 'Hvordan lages en personlig 3D-skulptur? | Sculpt',
    description: 'Slik foregår det å få laget en personlig skulptur hos Sculpt, fra første samtale og skanning til ferdig skulptur sendt hjem til deg.',
  },
  'tid-og-sted': { title: '3D-skanning og gravidskulptur i Oslo og Stavanger | Sculpt' },
  priser: { title: 'Pris på gravidskulptur og 3D-skulptur | Sculpt' },
  kontakt: { title: 'Kontakt oss for mer informasjon og booking | Sculpt' },
  gallerigravidskulpturer: { title: 'Gravidskulptur av din egen kropp | Sculpt' },
  galleriskulpturer: { title: 'Personlige 3D-skulpturer av mennesker | Sculpt' },
};

const at = (lines, line, name) => {
  const i = lines.indexOf(line);
  if (i < 0) throw new Error(`${name}: "${line}" is not in the snapshot`);
  return i;
};

const expected = (name, lines) => {
  let out = [...lines];
  for (const [from, to] of CHANGED[name] ?? []) out[at(out, from, name)] = to;
  for (const move of [MOVED[name] ?? []].flat()) {
    const first = at(out, move.first, name);
    const run = out.splice(first, at(out, move.last, name) - first + 1);
    out.splice(at(out, move.before, name), 0, ...run);
  }
  for (const other of FOLDED[name] ?? []) {
    const dropped = new Set(REMOVED[other] ?? []);
    out.push(...fixtureLines(other).filter((l) => !dropped.has(l)));
  }
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
    // Scan days come from Ester's calendar and change daily, so they are
    // tested against the feed (scan-days.test.mjs), not the snapshot.
    .replace(/<(h2|ol|ul)\b[^>]*\bdata-feed\b[^>]*>[\s\S]*?<\/\1>/g, '')
    // A block boundary or a <br> is a line in the capture; inline tags are not.
    .replace(/<\/?(h[1-6]|p|li|ul|ol|div|section|blockquote|details|summary)\b[^>]*>|<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, ''))
    .split('\n')
    // The browser collapses runs of spaces when it renders, and the capture
    // took what it rendered. A no-break space is layout the build adds
    // (rehype-heading-dashes.mjs), not a change to the words.
    .map((l) => l.replace(/[ \t\r\u00a0]+/g, ' ').trim())
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
    const meta = { ...JSON.parse(readFileSync(join(FIXTURES, 'meta.json'), 'utf8'))[name], ...META[name] };
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
