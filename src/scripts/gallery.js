// The gallery grid crops every photo to 3:4, so each one opens whole in a
// dialog. The dialog's image reuses the thumbnail's srcset with sizes for the
// dialog's own width, and the browser picks the larger file from it.
const labels = document.body.dataset;

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
  const show = (index) => {
    current = (index + photos.length) % photos.length;
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

  // Close comes first, so it takes the focus when the dialog opens.
  dialog.append(
    button('close', labels.photoClose, () => dialog.close()),
    image,
    count,
    button('prev', labels.photoPrev, () => show(current - 1)),
    button('next', labels.photoNext, () => show(current + 1)),
  );
  document.body.append(dialog);

  // A click on the dark backdrop around the photo closes it, as Escape does.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  let startX = null;
  dialog.addEventListener('touchstart', (e) => { startX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
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
