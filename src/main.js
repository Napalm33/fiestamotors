import inventory from '../data/inventory.json';
import es from './i18n/es.json';
import en from './i18n/en.json';
import { Showroom } from './showroom/showroom.js';
import './styles/agent.css';
import { initAgent } from './agent/index.js';
import { openSitePage } from './agent/sitePanel.js';
import { setState as setAgentState } from './agent/core/state.js';

const dicts = { es, en };
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const force3d = /[?&]force3d/.test(location.search);

let lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
let selected = 0;
let sr = null; // instancia del showroom 3D

const t = (path) => path.split('.').reduce((o, k) => o?.[k], dicts[lang]) ?? path;
const money = (n) => (n == null ? t('units.consult') : new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'es-MX', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n));
const km = (n) => (n == null ? t('units.consult') : `${new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'es-MX').format(n)} km`);
const val = (v) => (v === null || v === undefined || v === '' ? t('units.consult') : v);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const specRows = (u) => {
  const spec = (k, v) => `<div><dt>${t('units.' + k)}</dt><dd>${esc(v)}</dd></div>`;
  return spec('km', km(u.odometer_km)) + spec('owners', val(u.owners)) + spec('color', val(u.color)) + spec('engine', val(u.engine)) + spec('trans', val(u.transmission)) + spec('drive', val(u.drivetrain)) + spec('condition', val(u.condition_notes));
};
const actions = () => `
  <div class="actions">
    <a class="btn btn--red" data-open-page="test_drive" href="https://woodbridge.fiestamotors.ca/book-a-test-drive/" target="_blank" rel="noopener">${t('units.testdrive')}</a>
    <a class="btn btn--ghost" data-open-page="calculadora" href="https://woodbridge.fiestamotors.ca/payment-calculator/" target="_blank" rel="noopener">${t('units.payment')}</a>
    <a class="btn btn--ghost" data-agent-open href="#showroom">${t('units.ask')}</a>
  </div>`;

/* ---------- Textos y plan B (franja HTML sin 3D) ---------- */
function applyStatic() {
  document.documentElement.lang = lang;
  setAgentState({ lang });
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $('#lang').textContent = lang === 'es' ? 'EN' : 'ES';
  const n = inventory.length, word = t('showroom.nums')[n] ?? n;
  $('#sr-title').innerHTML = `${esc(word)} ${t(n === 1 ? 'showroom.car' : 'showroom.cars')}.<em>${t('showroom.pick')}</em>`;
}
function renderStrip() {
  $('#strip').innerHTML = inventory.map((u, i) => `
    <button class="card" role="option" type="button" data-i="${i}" aria-selected="${i === selected}">
      <div class="card__year">${u.year}</div>
      <div class="card__name">${esc(u.make)} ${esc(u.model)}</div>
      <div class="card__price">${money(u.price)}</div>
    </button>`).join('');
}
function renderDetail() {
  const u = inventory[selected];
  $('#detail').innerHTML = `
    <div>
      <div class="detail__photo">${t('units.photo')}</div>
      ${u.model3d_illustrative ? `<span class="tag">${t(u.photo_cutout ? 'units.illustrativePhoto' : 'units.illustrative')}</span>` : ''}
    </div>
    <div>
      <h3 class="detail__title">${u.year} ${esc(u.make)} ${esc(u.model)}</h3>
      <p class="detail__trim">${esc(u.trim)}</p>
      <p class="detail__price">${money(u.price)}</p>
      <p class="detail__tax">${u.price == null ? '' : t('units.tax')}</p>
      <dl class="specs">${specRows(u)}</dl>
      ${actions()}
    </div>`;
}
function selectFallback(i) { selected = (i + inventory.length) % inventory.length; setAgentState({ unitId: inventory[selected].id }); renderStrip(); renderDetail(); }
function enableFallback() {
  sr?.stop(); $('#showroom').hidden = true; $('#units').hidden = false;
  setAgentState({ unitId: inventory[selected].id });
  renderStrip(); renderDetail();
}
$('#strip').addEventListener('click', (e) => { const b = e.target.closest('.card'); if (b) selectFallback(+b.dataset.i); });
$('#strip').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); selectFallback(selected + 1); $('.card[aria-selected="true"]').focus(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); selectFallback(selected - 1); $('.card[aria-selected="true"]').focus(); }
});

/* ---------- Showroom 3D ---------- */
function renderGarageUI() {
  const u = inventory[sr.focus];
  $('#sr-count').textContent = `${String(sr.focus + 1).padStart(2, '0')} / ${String(inventory.length).padStart(2, '0')}`;
  $('#sr-card').innerHTML = `
    <h3>${u.year} ${esc(u.make)} ${esc(u.model)}</h3>
    <p class="k">${esc(u.trim)}</p>
    <div class="row"><span>${money(u.price)}</span><span>${km(u.odometer_km)}</span></div>
    <button class="btn btn--red" type="button" id="sr-open">${t('showroom.open')}</button>`;
}
function renderViewerUI() {
  const u = inventory[sr.focus];
  $('#sr-panel').innerHTML = `
    <label for="sr-switch">${t('showroom.switch')}</label>
    <select id="sr-switch">${inventory.map((x, i) => `<option value="${i}" ${i === sr.focus ? 'selected' : ''}>${x.year} ${esc(x.make)} ${esc(x.model)}</option>`).join('')}</select>
    <h3>${u.year} ${esc(u.make)} ${esc(u.model)}</h3>
    <p class="detail__trim">${esc(u.trim)}</p>
    <p class="detail__price">${money(u.price)}</p>
    <p class="detail__tax">${u.price == null ? '' : t('units.tax')}</p>
    <dl class="specs">${specRows(u)}</dl>
    ${actions()}
    ${u.model3d_illustrative ? `<p class="tag">${t(u.photo_cutout ? 'units.illustrativePhoto' : 'units.illustrative')}</p>` : ''}`;
  $('#sr-views').innerHTML = Object.keys(t('showroom.v')).map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${t('showroom.v.' + k)}</button>`).join('');
}
function refreshShowroomUI() { if (!sr) return; setAgentState({ unitId: inventory[sr.focus]?.id ?? null }); renderGarageUI(); if (sr.mode === 'viewer') renderViewerUI(); }

function initShowroom() {
  try {
    sr = new Showroom({
      canvas: $('#sr-canvas'), veil: $('#sr-veil'), units: inventory, reduceMotion: reduce, force: force3d,
      hooks: {
        onFocus: () => refreshShowroomUI(),
        onMode: (mode, i) => { $('#sr-views').hidden = $('.sr__drag').hidden = !!inventory[i]?.photo_cutout; $('#sr-garage').hidden = mode === 'viewer'; $('#sr-viewer').hidden = mode !== 'viewer'; refreshShowroomUI(); },
        onFallback: enableFallback,
      },
    });
  } catch (err) { console.warn('WebGL no disponible, usando plan B', err); return enableFallback(); }
  if (force3d) window.__sr = sr; // solo para pruebas (?force3d)
  refreshShowroomUI();

  $('#sr-prev').addEventListener('click', () => sr.prev());
  $('#sr-next').addEventListener('click', () => sr.next());
  $('#sr-back').addEventListener('click', () => sr.close());
  $('#sr-garage').addEventListener('click', (e) => { if (e.target.closest('#sr-open')) sr.open(); });
  $('#sr-views').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sr.setView(b.dataset.v); $('#sr-views').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('#sr-panel').addEventListener('change', (e) => { if (e.target.id === 'sr-switch') sr.switchUnit(+e.target.value); });
    addEventListener('keydown', (e) => {
    const r = $('#showroom').getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || e.target.matches('select, input') || e.target.closest('.fm-agent, .fm-site-panel')) return;
    if (e.key === 'ArrowRight') sr.next(); else if (e.key === 'ArrowLeft') sr.prev();
    else if (e.key === 'Enter' && sr.mode === 'garage' && !e.target.closest('a, button')) sr.open();
    else if (e.key === 'Escape') sr.close();
  });

  // Solo se dibuja cuando el showroom está en pantalla; la cámara entra al llegar con el scroll.
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) { sr.start(); if (en.intersectionRatio > 0.35) sr.intro(); } else sr.stop();
  }, { threshold: [0, 0.35] }).observe($('#showroom'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) sr.stop(); });
}

$('#lang').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; applyStatic(); refreshShowroomUI(); if (!$('#units').hidden) { renderStrip(); renderDetail(); } });

/* ---------- Video de fondo (9:16 en vertical, 16:9 en horizontal) ---------- */
const video = $('#hero-video'), play = $('#hero-play');
const heroSrc = () => (matchMedia('(orientation: portrait)').matches ? 'video/hero-9x16.mp4' : 'video/hero-16x9.mp4');
let heroCurrent = '';
function loadHero() {
  const src = heroSrc(); if (src === heroCurrent) return;
  heroCurrent = src; video.src = new URL(src, document.baseURI).href; video.load();
  if (!reduce) video.play().catch(showPlay);
}
const showPlay = () => { play.hidden = false; play.addEventListener('click', () => { video.play(); play.hidden = true; }, { once: true }); };
video.addEventListener('error', () => { video.hidden = true; }); // si el video falla, queda el póster
matchMedia('(orientation: portrait)').addEventListener('change', loadHero);
loadHero();
if (reduce) { video.pause(); showPlay(); } // con "reducir movimiento" no se reproduce solo

const bar = $('.bar');
addEventListener('scroll', () => bar.classList.toggle('solid', scrollY > 40), { passive: true });

applyStatic();
initShowroom();

/* ---------- Agente ---------- */
const agent = initAgent();
// Las páginas del sitio original se abren dentro del sitio; sin JS siguen siendo enlaces normales.
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-open-page], [data-agent-open]');
  if (!link) return;
  e.preventDefault();
  if (link.dataset.openPage) openSitePage(link.dataset.openPage); else agent.open();
});
// Sección visible, para el contexto del agente.
const sectionIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => en.isIntersecting && setAgentState({ section: en.target.dataset.section }));
}, { threshold: 0.5 });
[['.hero', 'hero'], ['#showroom', 'showroom'], ['#units', 'units'], ['.contact', 'contact']].forEach(([sel, name]) => {
  const el = $(sel); if (el) { el.dataset.section = name; sectionIO.observe(el); }
});
