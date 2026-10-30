// A trackpad or mouse has no sideways swipe a visitor can count on, so the
// strip gets buttons; the CSS shows them only for a fine pointer, and a phone
// keeps swiping.
const labels = document.body.dataset;
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

for (const strip of document.querySelectorAll('.carousel')) {
  const button = (dir, label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `carousel-step ${dir < 0 ? 'prev' : 'next'}`;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', () => strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: smooth() }));
    return b;
  };
  const prev = button(-1, labels.carouselPrev);
  const next = button(1, labels.carouselNext);
  const update = () => {
    prev.disabled = strip.scrollLeft <= 1;
    next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
  };
  // The frame holds the buttons beside the strip, since inside it they would scroll away.
  const frame = document.createElement('div');
  frame.className = 'carousel-frame';
  strip.replaceWith(frame);
  frame.append(prev, strip, next);
  strip.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}
