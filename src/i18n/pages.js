// The site's pages, in menu order. `slug` is the URL segment used by every
// language except those listed in `slugs`. Norwegian keeps the original
// sculpt.no slugs, so a redirect is never needed at launch.
export const pages = [
  { key: 'home', slug: '', slugs: {} },
  { key: 'about', slug: 'about', slugs: { no: 'om-oss' } },
  { key: 'schedule', slug: 'schedule', slugs: { no: 'tid-og-sted' } },
  { key: 'contact', slug: 'contact', slugs: { no: 'kontakt' } },
  { key: 'gallery-pregnancy', slug: 'gallery-pregnancy', slugs: { no: 'gallerigravidskulpturer' } },
  { key: 'gallery-other', slug: 'gallery-other', slugs: { no: 'galleriskulpturer' } },
  { key: 'prices', slug: 'prices', slugs: { no: 'priser' } },
  { key: 'process', slug: 'process', slugs: { no: 'prosessen' } },
];

// In the order a buyer goes: see the work, how it is made, the price, a date
// to scan, then the person and the contact. sculpt.no hid the scan dates in an
// "Om oss" folder, where nobody looking for one would open it. A folder's
// label is `menu.<group>` in the UI catalog.
export const menu = [
  { group: 'galleries', pages: ['gallery-pregnancy', 'gallery-other'] },
  'process',
  'prices',
  'schedule',
  'about',
  'contact',
];

// sculpt.no's pages folded into another or dropped, so a link, bookmark or search result
// for the old address still lands on its text. /home-1-1 was a copy of the
// front page in sculpt.no's sitemap; /gallerier and /informasjon were its menu
// folders and sent a visitor where these do. Each goes once nothing reaches it (#26).
export const redirects = {
  omskulpturen: 'prosessen/#om-skulpturen',
  'under-utvikling': 'om-oss/',
  'home-1-1': '',
  gallerier: 'gallerigravidskulpturer/',
  informasjon: 'om-oss/',
};

export const siteName = 'Sculpt';
// Every <title> ends in this, so no page carries a suffix of its own.
export const titleSuffix = ` | ${siteName}`;

// As the contact page writes them (src/content/pages/no/contact.md).
export const contact = {
  email: 'sculptnorge@outlook.com',
  phone: { label: '480\u00a005\u00a0508', href: 'tel:+4748005508' },
};

// From Brønnøysundregistrene, as the footer (ui `business`) shows them.
export const business = { legalName: 'Sculpt Svindland ENK', locality: 'Flekkefjord' };

// The public GitHub copy (AGENTS.md, Going public); 404s until it exists.
export const sourceUrl = 'https://github.com/polybjorn/sculpt-no';

export const social = [
  { key: 'instagram', url: 'https://www.instagram.com/sculpt_no/' },
  { key: 'facebook', url: 'https://www.facebook.com/sculpt.no/' },
];
