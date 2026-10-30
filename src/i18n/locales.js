// Single source of truth for languages. Adding a language = one entry here,
// one UI catalog (src/i18n/ui/<code>.json) and one content folder
// (src/content/pages/<code>/). Nothing else in the codebase enumerates
// languages: nav, hreflang, og:locale and the sitemap all derive from this
// list.
//
//   code    URL prefix and `lang` attribute
//   endonym language name in its own language
//   intl    BCP 47 tag for Intl and the sitemap
//   og      Open Graph locale
//   dir     writing direction, 'rtl' for Arabic/Hebrew/Farsi
//   root    true for the language served without a URL prefix (only one)

export const locales = [
  { code: 'no', endonym: 'Norsk', intl: 'nb-NO', og: 'nb_NO', dir: 'ltr', root: true },
];

export const defaultLocale = locales.find((l) => l.root)?.code ?? locales[0].code;

// Untranslated strings and pages fall back along this chain before giving up.
export const fallbackChain = [defaultLocale];

export const localeCodes = locales.map((l) => l.code);

export const localeByCode = Object.fromEntries(locales.map((l) => [l.code, l]));

export function localeInfo(code) {
  return localeByCode[code] ?? localeByCode[defaultLocale];
}

// Locale itself first, then the fallback chain, without duplicates.
export function lookupOrder(code) {
  return [...new Set([code, ...fallbackChain])].filter((c) => c in localeByCode);
}
