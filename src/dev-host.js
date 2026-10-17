// Anfitrión provisional: sustituye al trailer, showroom y franja final hasta que se construyan.
// Solo alimenta al agente con idioma, unidad seleccionada y sección visible.
import { state, setState } from './state.js';
import { t, setLang } from './i18n/index.js';
import { units } from './inventory.js';
import { unitName } from './format.js';

export function initDevHost() {
  const langBtn = document.querySelector('.host-lang');
  const syncLang = () => (langBtn.textContent = state.lang === 'es' ? 'EN' : 'ES');
  langBtn.addEventListener('click', () => {
    setLang(state.lang === 'es' ? 'en' : 'es');
    syncLang();
  });
  syncLang();

  const box = document.querySelector('.host-units');
  units.forEach((u) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'host-unit';
    b.textContent = unitName(u);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      box.querySelectorAll('.host-unit').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      setState({ unitId: u.id });
    });
    box.append(b);
  });

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && setState({ section: e.target.dataset.section })),
    { threshold: 0.6 },
  );
  document.querySelectorAll('[data-section]').forEach((el) => io.observe(el));
}
