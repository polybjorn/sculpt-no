import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One folder per language, one file per page: src/content/pages/<lang>/<page>.md
// The file name is the page key from src/i18n/pages.js, not the URL slug, so
// the same file name means the same page in every language.
const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '*/*.md' }),
  schema: z.object({
    // The <title> as sculpt.no has it, whole: its suffixes differ page to page.
    title: z.string(),
    // Two sculpt.no pages have no description, and get none here either.
    description: z.string().optional(),
    // An unreviewed translation. Remove the line once a human has read the
    // page through.
    machineTranslated: z.boolean().default(false),
  }),
});

export const collections = { pages };
