import { existsSync, readFileSync } from 'node:fs';

// Written by scripts/scan-days-fetch.mjs in the GitHub Pages deploy only; a
// build without it has no scan days to show.
const FILE = 'src/data/scan-days.json';

/** @typedef {{ date: string, start: string | null, end: string | null, title: string, location: string | null }} ScanDay */

/** @returns {{ source: string, read: string | null, events: ScanDay[] }} */
export const readScanDays = () =>
  existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { source: 'none', read: null, events: [] };
