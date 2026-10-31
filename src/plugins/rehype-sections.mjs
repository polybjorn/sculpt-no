// Content files lay out their own sections with wrapper lines on their own,
// blank lines around them so the markdown between still renders:
//
//   <div class="split">
//
//   ## Et øyeblikk du alltid vil huske
//
//   </div>
//
// Markdown passes HTML through as raw strings that only become elements after
// this plugin has run, so the wrappers are built here instead. That keeps the
// text in the content file in reading order and lets the images in a section
// get sizes that fit it.

const OPEN = /^<div class="([a-z][a-z0-9 -]*)">$/;
const CLOSE = /^<\/div>$/;

// What the browser should fetch for an image, by the section it sits in.
// Without sizes Astro offers the full source width for every slot.
const IMAGE_ROLES = {
  'hero-photo': { sizes: '(max-width: 70rem) 100vw, 70rem', widths: [800, 1200, 1600, 2000], loading: 'eager', fetchpriority: 'high' },
  carousel: { sizes: '15rem', widths: [320, 480] },
  // Stacked into the text column below 961px, as global.css stacks them.
  split: { sizes: '(max-width: 960px) min(100vw, 44rem), 34rem', widths: [480, 800, 1200, 1500] },
  feature: { sizes: '(max-width: 760px) 100vw, 44rem', widths: [480, 800, 1200, 1500] },
  // The larger widths are for the lightbox (gallery.js), which reuses the srcset.
  gallery: { sizes: '(max-width: 760px) 50vw, 22rem', widths: [400, 700, 1000, 1500, 2000] },
};
const DEFAULT_ROLE = { sizes: '(max-width: 760px) 100vw, 44rem', widths: [480, 800, 1200] };

const isElement = (node, tag) => node?.type === 'element' && node.tagName === tag;
const blank = (node) => node.type === 'text' && !node.value.trim();
const textOf = (node) => node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');

// Markdown wraps images in a paragraph; a run of them is one paragraph.
// Unwrapped, each image is a grid or flex item of the section.
function unwrapImages(parent) {
  parent.children = parent.children.flatMap((node) => {
    if (!isElement(node, 'p')) return [node];
    const real = node.children.filter((c) => !blank(c));
    return real.length && real.every((c) => isElement(c, 'img')) ? real : [node];
  });
}

// A FAQ answer can run to several paragraphs; one box around them is what
// lets the CSS slide it open as a single grid row (global.css, Motion).
const DETAILS_HEAD = /^<details>\s*<summary>[\s\S]*<\/summary>$/;
const DETAILS_END = /^<\/details>$/;
function wrapAnswers(parent) {
  parent.children = parent.children.flatMap((node) => {
    const raw = node.type === 'raw' ? node.value.trim() : '';
    if (DETAILS_HEAD.test(raw)) return [node, { type: 'raw', value: '<div class="answer">' }];
    if (DETAILS_END.test(raw)) return [{ type: 'raw', value: '</div>' }, node];
    if (node.children) wrapAnswers(node);
    return [node];
  });
}

export function rehypeSections() {
  return (tree, file) => {
    const root = { children: [] };
    const stack = [root];
    for (const node of tree.children) {
      const raw = node.type === 'raw' ? node.value.trim() : '';
      const open = raw.match(OPEN);
      if (open) {
        const section = { type: 'element', tagName: 'div', properties: { className: open[1].split(' ') }, children: [] };
        stack.at(-1).children.push(section);
        stack.push(section);
      } else if (CLOSE.test(raw)) {
        if (stack.length === 1) file.fail('A </div> closes a section that was never opened', node);
        stack.pop();
      } else {
        stack.at(-1).children.push(node);
      }
    }
    if (stack.length > 1) file.fail(`Section "${stack.at(-1).properties.className.join(' ')}" is never closed`);
    tree.children = root.children;

    const sections = (parent) => {
      parent.children.forEach((node, index) => {
        if (!isElement(node, 'div')) return;
        unwrapImages(node);
        // A scrolling row is reachable by keyboard only if it can take focus,
        // and a focusable region needs a name; the heading above it is that.
        if (node.properties.className.includes('carousel')) {
          const heading = parent.children.slice(0, index).reverse().find((c) => /^h[1-6]$/.test(c.tagName ?? ''));
          Object.assign(node.properties, { tabIndex: 0, role: 'region', ariaLabel: heading ? textOf(heading).trim() : undefined });
        }
        sections(node);
      });
    };
    sections(tree);
    wrapAnswers(tree);

    const roleOf = (ancestors) => {
      for (const a of [...ancestors].reverse()) {
        const name = a.properties?.className?.find((c) => c in IMAGE_ROLES);
        if (name) return IMAGE_ROLES[name];
      }
      return DEFAULT_ROLE;
    };
    const walk = (node, ancestors) => {
      if (isElement(node, 'img')) Object.assign(node.properties, roleOf(ancestors));
      for (const child of node.children ?? []) walk(child, [...ancestors, node]);
    };
    walk(tree, []);
  };
}
