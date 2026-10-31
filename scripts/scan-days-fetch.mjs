// Reads Ester's scan days from her calendar's published feed into
// src/data/scan-days.json, which the build turns into the upcoming days on
// /tid-og-sted (#15). Run by the GitHub Pages deploy before it builds, daily
// and on every publish, so the forge and a local build never fetch anything:
// without the file the page shows no dates.
//
// The feed link is the SCAN_DAYS_ICS secret on the GitHub repo, never in the
// tree or a log: an Outlook link can carry the account's address.
//
// When the feed fails, the dates the live site was built from are used
// instead, so a passed day still drops off and a publish still goes out; the
// deploy is then marked failed after it lands, which is what sends a mail.
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { parseIcs } from '../src/lib/scan-days.mjs';
import config from '../astro.config.mjs';

const OUT = 'src/data/scan-days.json';
const feed = process.env.SCAN_DAYS_ICS;
const lastGood = new URL(`${config.base.replace(/\/?$/, '/')}scan-days.json`, config.site);

const flag = (reason) => {
  console.log(`::warning::${reason}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `degraded=${reason.replace(/\n/g, ' ')}\n`);
};

async function get(url) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': 'sculpt-no scan days' } });
      if (res.ok) return await res.text();
      error = new Error(`HTTP ${res.status}`);
    } catch (e) {
      error = e;
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  throw error;
}

const write = (data) => {
  mkdirSync('src/data', { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${data.events.length} scan days written (${data.source})`);
};

if (!feed) {
  console.log('SCAN_DAYS_ICS is not set: the page shows no scan days.');
  process.exit(0);
}

try {
  const text = await get(feed);
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('the response is not a calendar');
  const { events, problems } = parseIcs(text);
  write({ source: 'feed', read: new Date().toISOString(), events });
  if (problems.length) flag(`Scan days the page shows differently from the calendar: ${problems.join('; ')}`);
} catch (e) {
  // The message only: an error from fetch can quote the link.
  const why = String(e?.cause?.code ?? e?.message ?? e).replace(feed, '<feed>');
  try {
    const data = JSON.parse(await get(lastGood));
    write({ ...data, source: 'last good' });
    flag(`The calendar feed failed (${why}); the page keeps the dates read ${data.read}.`);
  } catch (e2) {
    console.log(`::error::The calendar feed failed (${why}) and so did the deployed copy at ${lastGood} (${e2.message}); nothing is deployed.`);
    process.exit(1);
  }
}
