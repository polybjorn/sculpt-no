// The site's pages, in menu order. `slug` is the URL segment used by every
// language except those listed in `slugs`. Norwegian keeps the original
// sculpt.no slugs, so a redirect is never needed at launch.
export const pages = [
  { key: 'home', slug: '', slugs: {} },
  { key: 'about', slug: 'about', slugs: { no: 'om-oss' } },
  { key: 'development', slug: 'development', slugs: { no: 'under-utvikling' } },
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

// Plans and collaborations rather than anything a buyer needs, so the page is
// linked from the footer instead of taking a place in the menu.
export const footerPages = ['development'];

// sculpt.no's /omskulpturen, now the "Om skulpturen" part of /prosessen, so a
// link or bookmark to the old page still lands on its text.
export const redirects = { omskulpturen: 'prosessen/#om-skulpturen' };

// As the contact page writes them (src/content/pages/no/contact.md).
export const contact = {
  email: 'sculptnorge@outlook.com',
  phone: { label: '480 05 508', href: 'tel:+4748005508' },
};

// The public GitHub copy (AGENTS.md, Going public); 404s until it exists.
export const sourceUrl = 'https://github.com/polybjorn/sculpt-no';

export const social = [
  { key: 'instagram', url: 'https://www.instagram.com/sculpt_no/' },
  { key: 'facebook', url: 'https://www.facebook.com/sculpt.no/' },
];
