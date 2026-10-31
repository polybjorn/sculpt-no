// Scan days from Ester's calendar feed (#15): the parser the deploy's fetch
// step runs, and the selection and formatting the page build runs. Pure, so
// test/scan-days.test.mjs runs it under node against a fixture feed.

const ZONE = 'Europe/Oslo';

// The longest all-day event read as a run of scan days. Past it the event is
// more likely a holiday or a blocked-out week left in the calendar.
const MAX_SPAN_DAYS = 7;

const unescape = (v) => v.replace(/\\([\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));

// NAME;PARAM=a;PARAM="b:c":VALUE. The colon that ends the name and params is
// the first one outside quotes.
function splitLine(line) {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) {
      const [name, ...params] = line.slice(0, i).split(';');
      return { name: name.toUpperCase(), params: params.map((p) => p.toUpperCase()), value: line.slice(i + 1) };
    }
  }
  return null;
}

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const osloParts = (instant) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(instant).map((p) => [p.type, p.value]),
);

// A date-time in UTC is moved to Norwegian time. One with a TZID, or none, is
// read as the wall-clock time it states: every scan day is in Norway, and
// Outlook names zones in its own words ("W. Europe Standard Time") that no
// date library resolves.
function readTime({ params, value }) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, utc] = m;
  if (h === undefined || params.includes('VALUE=DATE')) return { date: isoDate(y, mo, d), time: null };
  if (!utc) return { date: isoDate(y, mo, d), time: `${h}:${mi}` };
  const p = osloParts(new Date(Date.UTC(+y, mo - 1, +d, +h, +mi)));
  return { date: isoDate(p.year, p.month, p.day), time: `${p.hour}:${p.minute}` };
}

// Events as { date, start, end, title, location }, one per day, plus the
// problems a person should look at: a scan day the page could show wrongly is
// reported rather than guessed at. Descriptions, attendees and notes are never
// read, so nothing but the title, place and time can reach the page.
export function parseIcs(text) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events = [];
  const problems = [];
  let ev = null;
  let depth = 0;
  for (const line of lines) {
    const prop = splitLine(line);
    if (!prop) continue;
    if (prop.name === 'BEGIN') {
      if (prop.value.toUpperCase() === 'VEVENT' && !ev) { ev = {}; depth = 0; } else if (ev) depth++;
      continue;
    }
    if (prop.name === 'END') {
      if (!ev) continue;
      if (depth > 0) { depth--; continue; }
      if (prop.value.toUpperCase() === 'VEVENT') { collect(ev, events, problems); ev = null; }
      continue;
    }
    // A reminder inside the event has a description of its own.
    if (ev && depth === 0) ev[prop.name] = prop;
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''));
  return { events, problems };
}

function collect(ev, events, problems) {
  if (ev.STATUS?.value.toUpperCase() === 'CANCELLED') return;
  // Marked private in her calendar: kept off a public page whatever the
  // calendar's sharing setting lets through.
  if (/^(PRIVATE|CONFIDENTIAL)$/i.test(ev.CLASS?.value ?? '')) return;
  const title = unescape(ev.SUMMARY?.value ?? '').trim();
  const start = ev.DTSTART && readTime(ev.DTSTART);
  if (!start) { problems.push(`"${title || '(no title)'}" has no start date the page can read`); return; }
  if (!title) { problems.push(`an event on ${start.date} has no title, so no city`); return; }
  if (ev.RRULE || ev.RDATE) problems.push(`"${title}" repeats; only its first day, ${start.date}, is shown`);
  const location = unescape(ev.LOCATION?.value ?? '').trim();
  const end = ev.DTEND && readTime(ev.DTEND);
  if (start.time === null) {
    // An all-day event ends the morning after its last day.
    let days = end && end.time === null ? Math.round((Date.parse(end.date) - Date.parse(start.date)) / 864e5) : 1;
    if (days > MAX_SPAN_DAYS) {
      problems.push(`"${title}" runs ${days} days from ${start.date}; only its first day is shown`);
      days = 1;
    }
    for (let i = 0; i < Math.max(days, 1); i++) events.push({ date: addDays(start.date, i), start: null, end: null, title, location });
    return;
  }
  events.push({ date: start.date, start: start.time, end: end && end.date === start.date ? end.time : null, title, location });
}

// Today's date in Norway, which is when a scan day has passed for a visitor.
export function osloToday(now = new Date()) {
  const p = osloParts(now);
  return isoDate(p.year, p.month, p.day);
}

export const upcoming = (events, today, limit = Infinity) =>
  events.filter((e) => e.date >= today).slice(0, limit);

// The title is the city, typed by hand, so "oslo" or "Skanning i Oslo" still
// finds Oslo's row.
export const inCity = (events, city) => {
  const word = new RegExp(`(^|[^\\p{L}])${city}($|[^\\p{L}])`, 'iu');
  return events.filter((e) => word.test(e.title));
};

// Weekday and month names from Intl, the day number set by hand: ICU builds
// differ on whether "3. november" keeps its full stop.
const name = (date, part) => new Intl.DateTimeFormat('nb-NO', { timeZone: 'UTC', [part]: 'long' }).format(new Date(`${date}T00:00:00Z`));
const dayMonth = (date) => `${Number(date.slice(8))}. ${name(date, 'month')}`;
// Norwegian writes clock times with a full stop, 10.00.
const clock = (t) => t.replace(':', '.');
const hours = (e) => (e.start ? `kl. ${clock(e.start)}${e.end ? `-${clock(e.end)}` : ''}` : null);

// Parts rather than one string, so the page can set each on its own line or
// keep a time from breaking; time is null for an all-day event.
export const longDate = (e) => ({ weekday: name(e.date, 'weekday'), date: dayMonth(e.date), time: hours(e) });
export const shortDate = (e) => ({ date: dayMonth(e.date), time: hours(e) });

// The location field often holds the full address after the venue's name: the
// name is shown, the whole of it is what the map searches for.
export const venue = (e) => {
  if (!e.location) return null;
  return {
    name: e.location.split(',')[0].trim(),
    map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`,
  };
};
