import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { titleSuffix } from './i18n/pages.js';

// One folder per language, one file per page: src/content/pages/<lang>/<page>.md
// The file name is the page key from src/i18n/pages.js, not the URL slug, so
// the same file name means the same page in every language.
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '*/*.md' }),
  schema: z.object({
    // The page's own words; the layout appends " | Sculpt". sculpt.no's titles
    // ended three ways because each carried its own suffix, so a separator
    // here is refused. The cap keeps the whole title inside what Google shows
    // on a PC before it cuts the title off, about 60 characters.
    title: z.string()
      .refine((t) => !/[|—–]| - |Sculpt$/.test(t), 'title carries a separator or the site name; the layout adds " | Sculpt"')
      .refine((t) => `${t}${titleSuffix}`.length <= 60, 'title is over 60 characters with " | Sculpt"'),
    // Two sculpt.no pages have no description, and get none here either.
    description: z.string().optional(),
    // An unreviewed translation. Remove the line once a human has read the
    // page through.
    machineTranslated: z.boolean().default(false),
    // The next scan days after the page's own text. A page with photos cannot
    // place them with a marker (src/pages/[...slug].astro), so this appends them.
    scanDays: z.boolean().default(false),
  }),
});

export const collections = { pages };
