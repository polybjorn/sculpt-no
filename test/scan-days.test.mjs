import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseIcs, osloToday, upcoming, inCity, longDate, shortDate, venue } from '../src/lib/scan-days.mjs';

// The fixture is shaped like an Outlook feed: Windows zone names, escaped
// commas, folded lines, a reminder inside an event.
const { events, problems } = parseIcs(readFileSync('test/fixtures/scan-days.ics', 'utf8'));
const days = events.map((e) => `${e.date} ${e.title}`);

test('reads all-day, zoned and UTC events, in date order', () => {
  assert.deepEqual(days, [
    '2026-10-25 Oslo',
    '2026-11-03 Stavanger',
    '2026-11-04 Kristiansand',
    '2026-11-29 Skanning i Oslo',
    '2026-11-30 Skanning i Oslo',
    '2026-12-01 Bergen',
    '2026-12-08 Stavanger',
  ]);
  const [, stavanger, kristiansand] = events;
  assert.deepEqual([stavanger.start, stavanger.end], ['10:00', '16:00']);
  // 09:00 UTC in November is 10:00 in Norway.
  assert.deepEqual([kristiansand.start, kristiansand.end], ['10:00', '16:00']);
  assert.equal(events.at(-1).location, 'Stavanger tinfabrik');
});

test('leaves out cancelled and private events, and never reads a description', () => {
  assert.ok(!days.some((d) => d.startsWith('2026-11-15') || d.includes('Tannlege')));
  assert.ok(!JSON.stringify(events).includes('Ring Berit'));
});

test('reports what the page cannot show as entered', () => {
  assert.equal(problems.length, 3);
  assert.match(problems.join('\n'), /"Bergen" runs 20 days/);
  assert.match(problems.join('\n'), /"Stavanger" repeats/);
  assert.match(problems.join('\n'), /2026-12-10 has no title/);
});

test('today is the Norwegian date, and a scan day counts until it ends', () => {
  // 23:30 UTC on 31 October is already 1 November in Norway.
  assert.equal(osloToday(new Date('2026-10-31T23:30:00Z')), '2026-11-01');
  assert.deepEqual(upcoming(events, '2026-11-03', 2).map((e) => e.title), ['Stavanger', 'Kristiansand']);
});

test('a city finds its days by name, whatever else the title says', () => {
  assert.deepEqual(inCity(events, 'Oslo').map((e) => e.date), ['2026-10-25', '2026-11-29', '2026-11-30']);
  assert.deepEqual(inCity([{ title: 'Oslofjorden' }], 'Oslo'), []);
});

test('dates, times and venues as the page writes them', () => {
  assert.deepEqual(longDate(events[1]), { weekday: 'tirsdag', date: '3. november', time: 'kl. 10.00-16.00' });
  assert.deepEqual(shortDate(events[3]), { date: '29. november', time: null });
  assert.deepEqual(venue(events[2]), {
    name: 'Huset i Markens',
    map: 'https://www.google.com/maps/search/?api=1&query=Huset%20i%20Markens%2C%20Markensgate%204A%2C%204610%20Kristiansand',
  });
  assert.equal(venue({ location: '' }), null);
});
