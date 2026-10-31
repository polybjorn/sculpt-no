// The gallery grid crops every photo to 3:4, so each one opens whole in a
// dialog. The dialog's image reuses the thumbnail's srcset with sizes for the
// dialog's own width, and the browser picks the larger file from it.
const labels = document.body.dataset;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const gallery of document.querySelectorAll('.gallery')) {
  const photos = [...gallery.querySelectorAll('img')];
  if (!photos.length) continue;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  const image = document.createElement('img');
  image.decoding = 'async';
  const count = document.createElement('p');
  count.setAttribute('aria-live', 'polite');
  const button = (className, label, action) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', action);
    return b;
  };

  let current = 0;
  const render = () => {
    const photo = photos[current];
    const ratio = photo.naturalWidth / photo.naturalHeight || 3 / 4;
    const room = Math.min(innerWidth, innerHeight * ratio);
    image.removeAttribute('src');
    image.sizes = `${Math.ceil(room)}px`;
    image.srcset = photo.srcset;
    image.src = photo.currentSrc || photo.src;
    image.alt = photo.alt;
    count.textContent = labels.photoCount.replace('{{n}}', current + 1).replace('{{total}}', photos.length);
  };
  // Bumping `run` tells a slide still waiting on its file that it is stale.
  let run = 0;
  const settle = () => {
    run += 1;
    for (const a of image.getAnimations()) a.cancel();
    image.style.translate = '';
  };
  const show = (index) => {
    settle();
    current = index;
    render();
  };

  // The photo slides out the way it is going and the next one in from the
  // other side; `from` is where a finger has already dragged it. A step taken
  // mid-slide cancels the slide, so `current` always counts every step.
  const step = (dir, from = 0) => {
    settle();
    current = (current + dir + photos.length) % photos.length;
    if (still()) return render();
    const id = run;
    const far = innerWidth / 3;
    const out = image.animate(
      [{ translate: `${from}px 0`, opacity: 1 }, { translate: `${-dir * far}px 0`, opacity: 0 }],
      { duration: 150, easing: 'ease-in', fill: 'forwards' },
    );
    out.finished.then(async () => {
      render();
      // A slow file would otherwise slide in as an empty box.
      await Promise.race([image.decode().catch(() => {}), new Promise((done) => setTimeout(done, 400))]);
      if (id !== run) return;
      out.cancel();
      image.animate(
        [{ translate: `${dir * far}px 0`, opacity: 0 }, { translate: '0 0', opacity: 1 }],
        { duration: 200, easing: 'ease-out' },
      );
    }, () => {});
  };

  // Close comes first, so it takes the focus when the dialog opens.
  dialog.append(
    button('close', labels.photoClose, () => dialog.close()),
    image,
    count,
    button('prev', labels.photoPrev, () => step(-1)),
    button('next', labels.photoNext, () => step(1)),
  );
  document.body.append(dialog);

  // A click on the dark backdrop around the photo closes it, as Escape does.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  // The photo follows the finger; a short drag springs back instead of stepping.
  let startX = null;
  let dx = 0;
  dialog.addEventListener('touchstart', (e) => {
    startX = e.touches.length === 1 ? e.touches[0].clientX : null;
    dx = 0;
  }, { passive: true });
  dialog.addEventListener('touchmove', (e) => {
    if (startX === null || e.touches.length !== 1) return;
    if (!dx) settle();
    dx = e.touches[0].clientX - startX;
    if (!still()) image.style.translate = `${dx}px 0`;
  }, { passive: true });
  dialog.addEventListener('touchend', () => {
    if (startX === null) return;
    startX = null;
    if (Math.abs(dx) > 50) return step(dx < 0 ? 1 : -1, still() ? 0 : dx);
    settle();
    if (dx && !still()) image.animate([{ translate: `${dx}px 0` }, { translate: '0 0' }], { duration: 150, easing: 'ease-out' });
  });

  // A button around each photo makes it reachable by keyboard and named by its alt text.
  photos.forEach((photo, index) => {
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'gallery-open';
    open.setAttribute('aria-label', `${labels.photoOpen}: ${photo.alt}`);
    photo.replaceWith(open);
    open.append(photo);
    open.addEventListener('click', () => {
      show(index);
      dialog.showModal();
    });
  });
}
