// The site's pages, in menu order. `slug` is the URL segment used by every
// language except those listed in `slugs`. Norwegian keeps the original
// sculpt.no slugs, so a redirect is never needed at launch.
export const pages = [
  { key: 'home', slug: '', slugs: {} },
  { key: 'about', slug: 'about', slugs: { no: 'om-oss' } },
  { key: 'development', slug: 'development', slugs: { no: 'under-utvikling' } },
  { key: 'sculpture', slug: 'sculpture', slugs: { no: 'omskulpturen' } },
  { key: 'schedule', slug: 'schedule', slugs: { no: 'tid-og-sted' } },
  { key: 'contact', slug: 'contact', slugs: { no: 'kontakt' } },
  { key: 'gallery-pregnancy', slug: 'gallery-pregnancy', slugs: { no: 'gallerigravidskulpturer' } },
  { key: 'gallery-other', slug: 'gallery-other', slugs: { no: 'galleriskulpturer' } },
  { key: 'prices', slug: 'prices', slugs: { no: 'priser' } },
  { key: 'process', slug: 'process', slugs: { no: 'prosessen' } },
];

// sculpt.no's menu, except that the scan dates stand on their own instead of
// in the "Om oss" folder, where nobody looking for a date would open it.
// A folder's label is `menu.<group>` in the UI catalog.
export const menu = [
  { group: 'about', pages: ['about', 'development', 'sculpture'] },
  'schedule',
  'contact',
  { group: 'galleries', pages: ['gallery-pregnancy', 'gallery-other'] },
  'prices',
  'process',
];

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
