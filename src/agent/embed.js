// Paquete independiente del agente para insertarlo en un HTML ya publicado (Artifact) cuyo código fuente
// no está en este repo. Reemplaza cualquier instancia anterior del agente y se engancha leyendo la página:
// idioma (<html lang>), unidad que se está viendo (#inv-card) y sección visible.
import '../styles/agent.css';
import { initAgent } from './index.js';
import { setState } from './core/state.js';
import { units } from './core/inventory.js';
import { openSitePage } from './sitePanel.js';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const SECTIONS = [['.hero', 'hero'], ['#inv', 'inv'], ['#showroom', 'showroom'], ['#units', 'units'], ['.contact', 'contact']];

function boot() {
  // Retira la instancia anterior (y su panel de páginas) para no duplicar botón ni panel.
  document.querySelectorAll('.fm-agent, .fm-site-panel').forEach((n) => n.remove());
  document.body.classList.remove('has-site-panel');

  const syncLang = () => setState({ lang: document.documentElement.lang === 'en' ? 'en' : 'es' });
  syncLang();
  new MutationObserver(syncLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  const agent = initAgent();

  // El botón del agente abre SIEMPRE el panel del agente. Algunas versiones del sitio le ponían encima un menú
  // propio que atrapaba el clic (y dejaba sin abrir el panel al elegir una unidad). En captura sobre window
  // llega antes que cualquier otro manejador; las aperturas programáticas del sitio (fab.click()) también pasan por aquí.
  window.addEventListener('click', (e) => {
    const fab = e.target.closest?.('.fm-agent__fab');
    if (!fab) return;
    e.preventDefault();
    e.stopPropagation();
    const panel = document.querySelector('#fm-agent-panel');
    if (panel && panel.hidden) agent.open(); else agent.close();
  }, true);
  const style = document.createElement('style');
  style.textContent = '#inv-dock{display:none!important}'; // menú propio del sitio: el agente trae su propio inicio
  document.head.append(style);
  // Un botón de llamada del sitio no debe prometer voz si el agente no la tiene activa (modo demostración).
  if (document.querySelector('.fm-agent__call')?.disabled) style.textContent += '.inv-call{display:none!important}';

  // Los botones de la ficha abren la página dentro del sitio o el asistente. En captura, para que el
  // manejador de la instancia anterior (que sigue escuchando en document) no los procese también.
  window.addEventListener('click', (e) => {
    const link = e.target.closest?.('[data-open-page], [data-agent-open]');
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    if (link.dataset.openPage) openSitePage(link.dataset.openPage); else agent.open();
  }, true);

  // Unidad que se está viendo: se deduce del texto de la tarjeta de la sección nueva.
  const card = document.querySelector('#inv-card');
  if (card) {
    const detect = () => {
      const text = norm(card.textContent);
      const hit = units.find((u) => text.includes(norm(`${u.make} ${u.model}`)));
      if (hit) setState({ unitId: hit.id });
    };
    new MutationObserver(detect).observe(card, { childList: true, subtree: true, characterData: true });
    detect();
  }

  // Sección visible
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.isIntersecting && setState({ section: en.target.dataset.fmSection }));
  }, { threshold: 0.5 });
  SECTIONS.forEach(([sel, name]) => {
    const el = document.querySelector(sel);
    if (el) { el.dataset.fmSection = name; io.observe(el); }
  });
  window.__fmAgent = agent;
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
