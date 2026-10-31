// A line that starts with a dash, or splits a number from its unit, its
// thousands or the rest of a phone number, reads as broken. text-wrap
// (global.css) only picks where lines break, so the glue sits in the text: a
// no-break space before every dash and inside these groups, in every element
// and in the HTML a content file writes by hand, such as the FAQ <summary>.
const RULES = [
  [/ ([–—])/g, ' $1'],
  [/(\d) (?=\d)/g, '$1 '],
  [/(\d) (?=(?:kr|cm|mm|minutter|måneder|måned|år)(?![\wæøå]))/g, '$1 '],
  [/\b(ca\.?) (?=\d)/g, '$1 '],
];
const RAW = new Set(['code', 'pre', 'script', 'style']);

export const glue = (text) => RULES.reduce((s, [from, to]) => s.replace(from, to), text);

export function rehypeNbsp() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === 'text') node.value = glue(node.value);
      if (node.type === 'raw') node.value = node.value.split(/(<[^>]*>)/).map((s, i) => (i % 2 ? s : glue(s))).join('');
      if (node.type === 'element' && RAW.has(node.tagName)) return;
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
