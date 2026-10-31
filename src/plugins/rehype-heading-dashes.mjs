// Headings wrap balanced (global.css), which can start a line with the dash in
// "prosess – steg for steg". A no-break space before every dash in a heading
// keeps it with the word before, so no heading needs a hand-placed break.
const HEADING = /^h[1-6]$/;

const glue = (node) => {
  if (node.type === 'text') node.value = node.value.replace(/ ([–—])/g, ' $1');
  for (const child of node.children ?? []) glue(child);
};

export function rehypeHeadingDashes() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'element' && HEADING.test(node.tagName)) return glue(node);
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
