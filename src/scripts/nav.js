const nav = document.querySelector('.nav');
const toggle = nav?.querySelector('.menu-toggle');
const links = nav?.querySelector('.nav-links');

if (nav && toggle && links) {
  const groups = [...nav.querySelectorAll('.menu-group')];

  const closeMenu = () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  const closeGroups = (except) => {
    for (const g of groups) if (g !== except) g.open = false;
  };

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  for (const g of groups) {
    g.addEventListener('toggle', () => { if (g.open) closeGroups(g); });
  }
  document.addEventListener('click', (e) => {
    if (nav.contains(e.target)) return;
    closeGroups();
    closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = groups.find((g) => g.open);
    if (open) {
      open.open = false;
      open.querySelector('summary').focus();
    } else if (links.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
}
