import { readScanDays } from '../lib/scan-days-data.mjs';

// The dates this build read, published beside the pages so the next deploy
// can fall back to them when the calendar feed fails
// (scripts/scan-days-fetch.mjs). Nothing in it is more than the page shows.
export const GET = () => new Response(JSON.stringify(readScanDays()));
