import { createHash } from 'node:crypto';
import { pages } from '../i18n/pages.js';
import { pageLinks } from '../i18n/routes-core.js';

const pageByKey = Object.fromEntries(pages.map((p) => [p.key, p]));

// For astro.config.mjs. Astro caches rendered markdown by the markdown alone,
// so a changed slug needs a changed config to reach the links.
export function pagesDigest() {
  return createHash('sha256').update(JSON.stringify(pages)).digest('hex');
}

const localeOf = (file) => file?.path?.match(/[/\\]pages[/\\]([^/\\]+)[/\\]/)?.[1];
const pageOf = (file) => file?.path?.match(/[/\\]pages[/\\][^/\\]+[/\\]([^/\\]+)\.md$/)?.[1];

// [Ta kontakt]({{contactPage}}) -> a relative link to the contact page in the
// same language, so content links hold under any base path. An unknown name
// fails the build: left in, it would ship as a dead link.
export function remarkPageLinks() {
  return (tree, file) => {
    const locale = localeOf(file);
    const page = pageOf(file);
    const links = locale && page in pageByKey ? pageLinks(pageByKey, locale, page) : {};
    const walk = (node) => {
      if (node.type === 'link') {
        node.url = node.url.replace(/\{\{(\w+)\}\}/g, (whole, key) => {
          if (key in links) return links[key];
          file.fail(`Unknown page link {{${key}}}`, node);
        });
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
