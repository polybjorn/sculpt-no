# Design

The tokens live in `src/styles/global.css` under `:root`. That file is the
source of truth; this one explains the decisions behind it.

The design is sculpt.no's own, ported from the Squarespace site as it stood on
2026-10-29 (screenshots and measured styles in the client folder,
`content-audit/rendered/2026-10-30/`). Ester chose these colours and faces, so
a change here is a change to her look, agreed with her first.

## Palette

Two colours, as on the live site. There is no dark mode: sculpt.no has none,
and the photographs are shot for the warm light ground.

| Token | Value | Used for |
|---|---|---|
| `--ink` | `#36302a` | All text, filled buttons, FAQ rules, focus ring |
| `--ink-hover` | `#4a423a` | Filled button hover |
| `--paper` | `#fff8f5` | Page and header background, label on filled buttons |
| `--line` | `#d9cfc9` | Header and footer hairlines, mobile menu rules. Not on the live site |

`--ink` on `--paper` is 12.4:1 and `--paper` on `--ink-hover` 9.38:1. `--line`
is 1.46:1 and is only ever a decorative rule; anything that marks a control's
edge (the FAQ rules, the ghost button, the menu button) uses `--ink`.

## Type

| Token | Face | Role |
|---|---|---|
| `--font-display` | Cormorant Garamond 400, 700 | Headings, FAQ questions, the "Sculpt" wordmark. 700 is the front page title only |
| `--font-body` | DM Sans 300, 300 italic, 500, 700 | Body, navigation, buttons. 500 is buttons, 700 is `<strong>` |

Both are self-hosted from `src/assets/fonts/` (latin subset, Fontsource builds,
OFL licences beside them), never from a font CDN: the CSP allows only
`font-src 'self'`, and a CDN would tell a third party about every visit.

The live site sets its buttons in Almarai. The rebuild uses DM Sans for them
instead: one face fewer to load, and at button size the two are hard to tell
apart.

Sizes are the live site's scale, measured at 1440px wide, as `--fs-*` tokens
on `:root`, each with one leading as `--lh-*`; `test/type-scale.test.mjs`
fails any font size that names none, and any rule that sets a size without
its step's leading beside it. Before the pairing, a size set on an element
kept the leading of the element's own rule, so one step read at up to four.

| Token | Size | Leading | Used for |
|---|---|---|---|
| `--fs-h1` | 78px, down to 42px | 1.07 | The front page title only |
| `--fs-h2` | 52px, down to 34px | 1.1 | Front page section headings, and the title of every other page |
| `--fs-h3` | 37px, down to 27px | 1.15 | A part of an inner page, like «Om skulpturen» or «Priser», the date in a scan day box |
| `--fs-h4` | 26.4px | 1.2 | Step names on Prosessen, FAQ questions, cities on Tid og sted, contact labels, the wordmark |
| `--fs-h5` | 19.2px | 1.2 | The front page step names in their row; not on the live site, one x1.4 step below h4 |
| `--fs-large` | 19.5px | 1.8 | Running text, as the live site's "large" paragraphs |
| `--fs-body` | 16px | 1.8 | Intro, FAQ answers, menu, buttons |
| `--fs-small` | 14.4px | 1.7 | Reviews, the kicker under the front page title, the footer, scan day boxes |

Three leadings belong to no step: `--lh-mark` (1) for the wordmark and the step
numbers, `--lh-control` (1.2) for button labels, `--lh-row` (1.5) for price
rows. Tracking is a role, not a size: `--ls-display` (.01em) for Cormorant,
`--ls-caps` (.06em) for the uppercase labels, and `--ls-body` (.02rem) for DM
Sans, one length at every size, which the live site's .02em at 16px and
.016em at 19.5px both come to.

Body text wraps with `text-wrap: pretty`, so a paragraph does not end on a
word alone where the browser can avoid it; headings balance instead. Text at
body size runs at `--text-body` (38em), the same 70-odd characters a line that
`--text` gives the large running text.

The first port read the live site's 16px intro paragraph as the body size and
missed that its running text is the large size; the scale corrects that. It
also set the inner page titles at the front page title's size, where the live
site sets them at h2's, so long titles broke over two lines.

Headings on inner pages run three levels: the title, centred above a single
column or left beside a photo; a part of the page, left-aligned with the text
it heads; and a step name. Only the title is centred, since a centred heading
over left-aligned text reads as detached from it.

## Spacing

| Token | Size | Used for |
|---|---|---|
| `--space-3xs` | .25rem | a label tight to its value |
| `--space-2xs` | .5rem | inside rows and menus |
| `--space-xs` | .75rem | header and menu padding |
| `--space-s` | 1rem | small gaps, the intro's top |
| `--space-m` | 1.5rem | box padding, list indents |
| `--space-l` | 2rem | a block in a text column, the buttons |
| `--space-xl` | 3rem | a front page section's padding, a new part's heading |
| `--space-2xl` | 4rem | the page's end, the gap beside a photo |

Every margin, padding and gap in rem names a step, and
`test/spacing.test.mjs` refuses any other. Spacing that belongs to text stays
in em, so it follows the size: a paragraph's 1em, a heading's .5em, a button's
padding.

Where things sit follows a few rules rather than per-section values:

- A front page section keeps `--space-xl` above and below, so two sections
  meet at 6rem wherever they meet. The sections had drifted from 6rem to over
  10rem
- What a heading heads sits at the heading's .5em, whether text, the scan
  days or the steps. A heading that opens a new part after text gets
  `--space-xl` above it, so it reads with what follows rather than with what
  came before
- A block in a text column, like a gallery, the price boxes or a photo, keeps
  `--space-l` from the text around it
- A page that opens or closes on a split meets the page's own padding, so Om
  oss and Kontakt start as high as the other pages

## Layout

- The header is solid paper with a hairline, sticky, logo and wordmark left,
  menu centred, social links right. The live site's translucent bar was the
  Squarespace theme's; on scroll it put the nav over photographs
- Below 760px the menu folds behind a "Meny" button, and the folders open in
  place. The menu starts folded, so the page does not jump when `nav.js`
  loads; a `<noscript>` stylesheet keeps every link listed without the script
- Below 760px the front page shows the heading, the introduction and the
  booking button before the reviews. Only CSS `order` moves them, so screen
  readers and desktop keep sculpt.no's order
- Text runs at `--text` (44rem); review rows, two-column splits, the
  carousel and the next scan days widen to `--measure` (70rem); the carousel row is full bleed, and
  the hero photo too until it reaches `--measure`. The hero keeps one frame,
  every statue whole and the fade on the table under them, so the width sets
  its height. A photo inside a text section fills that column, so its edges
  line up with the heading above and the text below
- A two-column split stacks into one `--text` column below 961px, where side
  by side the text would fall under 40 characters a line. `split-portrait`
  crops a landscape portrait upright (4:5) beside a long text, so the photo
  is about the text's height rather than a strip above blank page; stacked,
  it shows whole. `split-fill` is for a text far taller than any photo, like
  the front page's «Et øyeblikk»: the photo stays in view beside it while the
  text scrolls past. The float it replaced ran the text on under the photo at
  over 110 characters a line
- Content files mark their sections with `<div class="...">` lines, turned into
  wrappers by `src/plugins/rehype-sections.mjs`, which also gives each image
  `sizes` and `srcset` widths that fit its section
- A box, like the price models, takes the buttons' 1px ink border on paper
  rather than a tinted fill, so it needs no colour outside the palette. A list
  inside a section, like the price add-ons, is ruled with `--line`
- Tid og sted puts the next five scan days in boxes on one row, which scrolls
  sideways on a phone rather than wrapping, then a `--line` ruled row per city:
  its name, her text, and its own coming days in a third column when it has
  any
- Steps are numbered circles on one `--line` path, the same on every page:
  across the front page at desktop width, where only the names show, and
  downward wherever the steps carry text or the row would wrap. A step name is
  one size below the page's section headings, so the heading after the last
  step reads as a new part rather than one more step

## Motion

The live site has none (its Squarespace animation setting is off). The
rebuild adds one small movement where something opens: menu folders and the
phone menu fade in and drop about 5px over 0.2s, the FAQ answers slide open and
shut over 0.25s, and their arrows turn. The slide is a grid row going from
`0fr` to `1fr`, since Firefox cannot animate a height to `auto`. There are no
scroll-in effects: they need a script and hold back the first paint.
`prefers-reduced-motion: reduce` turns all of it off.

## Logo

`src/assets/images/logo.webp` is the 466px raster from the live site with the
word "Sculpt" taken out of the coin, since the wordmark beside it says the
same; `public/favicon.ico` and `public/apple-touch-icon.png` are cut from it.
The source PNG is `media-original/logo-new.png` in the client folder. There is
no vector. Ask Ester for the original before it is used larger than the header.
