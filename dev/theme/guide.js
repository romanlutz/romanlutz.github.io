(() => {
  'use strict';

  const printButton = document.querySelector('[data-print-guide]');
  if (printButton) {
    printButton.hidden = false;
    printButton.addEventListener('click', () => window.print());
  }

  const links = Array.from(document.querySelectorAll('.guide-sidebar nav a'));
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  if (!('IntersectionObserver' in window)) return;

  const visible = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    const active = sections.find(section => visible.has(section));
    if (!active) return;
    for (let index = 0; index < links.length; index += 1) {
      if (sections[index] === active) links[index].setAttribute('aria-current', 'location');
      else links[index].removeAttribute('aria-current');
    }
  }, { rootMargin: '0px 0px -35% 0px' });
  sections.filter(Boolean).forEach(section => observer.observe(section));
})();
