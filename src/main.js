import inventory from '../data/inventory.json';
import es from './i18n/es.json';
import en from './i18n/en.json';

const dicts = { es, en };
const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
let selected = 0;

const t = (path) => path.split('.').reduce((o, k) => o?.[k], dicts[lang]) ?? path;
const money = (n) => (n == null ? t('units.consult') : new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'es-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n));
const km = (n) => (n == null ? t('units.consult') : `${new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'es-CA').format(n)} km`);
const val = (v) => (v === null || v === undefined || v === '' ? t('units.consult') : v);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $('#lang').textContent = lang === 'es' ? 'EN' : 'ES';
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
  const spec = (k, v) => `<div><dt>${t('units.' + k)}</dt><dd>${esc(v)}</dd></div>`;
  $('#detail').innerHTML = `
    <div>
      <div class="detail__photo">${t('units.photo')}</div>
      ${u.model3d_illustrative ? `<span class="tag">${t('units.illustrative')}</span>` : ''}
    </div>
    <div>
      <h3 class="detail__title">${u.year} ${esc(u.make)} ${esc(u.model)}</h3>
      <p class="detail__trim">${esc(u.trim)}</p>
      <p class="detail__price">${money(u.price)}</p>
      <p class="detail__tax">${u.price == null ? '' : t('units.tax')}</p>
      <dl class="specs">
        ${spec('km', km(u.odometer_km))}
        ${spec('owners', val(u.owners))}
        ${spec('color', val(u.color))}
        ${spec('engine', val(u.engine))}
        ${spec('trans', val(u.transmission))}
        ${spec('drive', val(u.drivetrain))}
        ${spec('condition', val(u.condition_notes))}
      </dl>
      <div class="actions">
        <a class="btn btn--red" href="https://woodbridge.fiestamotors.ca/book-a-test-drive/" target="_blank" rel="noopener">${t('units.testdrive')}</a>
        <a class="btn btn--ghost" aria-disabled="true" href="#units" title="${t('units.askSoon')}">${t('units.payment')}</a>
        <a class="btn btn--ghost" aria-disabled="true" href="#units" title="${t('units.askSoon')}">${t('units.ask')}</a>
      </div>
    </div>`;
}

function select(i) {
  selected = (i + inventory.length) % inventory.length;
  renderStrip();
  renderDetail();
}

$('#strip').addEventListener('click', (e) => {
  const b = e.target.closest('.card');
  if (b) select(+b.dataset.i);
});
$('#strip').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); select(selected + 1); $('.card[aria-selected="true"]').focus(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); select(selected - 1); $('.card[aria-selected="true"]').focus(); }
});
$('#detail').addEventListener('click', (e) => { if (e.target.closest('[aria-disabled="true"]')) e.preventDefault(); });
$('#lang').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; applyStatic(); renderStrip(); renderDetail(); });

// Video de fondo: con "reducir movimiento" no se reproduce solo.
const video = $('#hero-video');
const play = $('#hero-play');
if (reduce) {
  video.removeAttribute('autoplay');
  play.hidden = false;
  play.addEventListener('click', () => { video.play(); play.hidden = true; });
} else {
  video.play().catch(() => { play.hidden = false; play.addEventListener('click', () => { video.play(); play.hidden = true; }); });
}

const bar = $('.bar');
addEventListener('scroll', () => bar.classList.toggle('solid', scrollY > 40), { passive: true });

applyStatic();
renderStrip();
renderDetail();
