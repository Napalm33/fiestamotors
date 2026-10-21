import { state, setState } from './core/state.js';
import { t } from './core/i18n.js';
import { SITE_PAGES } from './sitePages.js';

let root;
let frame;
let titleEl;
let tabLink;
let loader;
let note;
let returnFocus;

function build() {
  root = document.createElement('div');
  root.className = 'fm-site-panel';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'false');
  root.innerHTML = `
    <div class="fm-site-panel__bar">
      <h2 class="fm-site-panel__title"></h2>
      <a class="fm-site-panel__tab" target="_blank" rel="noopener"></a>
      <button type="button" class="fm-site-panel__close"></button>
    </div>
    <div class="fm-site-panel__body">
      <p class="fm-site-panel__loader"></p>
      <iframe class="fm-site-panel__frame" title="" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="fm-site-panel__note" hidden>
        <p></p>
        <a class="fm-site-panel__go" target="_blank" rel="noopener"></a>
      </div>
    </div>`;
  titleEl = root.querySelector('.fm-site-panel__title');
  tabLink = root.querySelector('.fm-site-panel__tab');
  loader = root.querySelector('.fm-site-panel__loader');
  note = root.querySelector('.fm-site-panel__note');
  frame = root.querySelector('iframe');
  frame.addEventListener('load', () => (loader.hidden = true));
  root.querySelector('.fm-site-panel__close').addEventListener('click', closeSitePage);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden && !document.querySelector('.fm-agent[data-open="true"] :focus')) closeSitePage();
  });
  document.body.append(root);
}

export function openSitePage(key) {
  const page = SITE_PAGES[key];
  if (!page) return false;
  if (!root) build();
  returnFocus = document.activeElement;
  const label = t(`pages.${key}`);
  titleEl.textContent = label;
  frame.title = label;
  tabLink.href = page.url;
  tabLink.textContent = t('sitePanel.openTab');
  root.querySelector('.fm-site-panel__close').textContent = t('common.close');
  loader.textContent = t('sitePanel.loading');
  // Algunos entornos (la vista previa en Artifact) y páginas que no se pueden incrustar:
  // en vez del iframe se ofrece un enlace real, que funciona en cualquier visor.
  const inline = page.embeddable && import.meta.env.MODE !== 'artifact';
  loader.hidden = !inline;
  note.hidden = inline;
  frame.hidden = !inline;
  if (inline) {
    frame.src = page.url;
  } else {
    frame.src = 'about:blank';
    note.querySelector('p').textContent = t('sitePanel.noEmbed');
    const go = note.querySelector('a');
    go.href = page.url;
    go.textContent = t('sitePanel.go', { page: label });
  }
  root.hidden = false;
  document.body.classList.add('has-site-panel');
  root.querySelector('.fm-site-panel__close').focus();
  setState({ sitePage: key });
  return true;
}

export function closeSitePage() {
  if (!root || root.hidden) return;
  root.hidden = true;
  frame.src = 'about:blank';
  document.body.classList.remove('has-site-panel');
  setState({ sitePage: null });
  returnFocus?.focus?.();
}

export function isSitePageOpen() {
  return Boolean(state.sitePage);
}
