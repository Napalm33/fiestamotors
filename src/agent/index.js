import { state, setState, curLang, subscribe } from './core/state.js';
import { detectLang } from './core/lang.js';
import { t } from './core/i18n.js';
import { getUnit } from './core/inventory.js';
import { unitName } from './core/format.js';
import { buildContext } from './context.js';
import { createConnection } from './connection.js';
import { openSitePage } from './sitePanel.js';
import { openWhatsApp, whatsappConfigured } from './whatsapp.js';

const ICON_CHAT = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>';
const ICON_PHONE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

export function initAgent() {
  const root = document.createElement('div');
  root.className = 'fm-agent';
  root.dataset.open = 'false';
  root.innerHTML = `
    <button type="button" class="fm-agent__fab" aria-expanded="false" aria-controls="fm-agent-panel">${ICON_CHAT}</button>
    <section class="fm-agent__panel" id="fm-agent-panel" role="dialog" aria-modal="false" hidden>
      <header class="fm-agent__head">
        <div class="fm-agent__id">
          <h2 class="fm-agent__title"></h2>
          <p class="fm-agent__sub"></p>
        </div>
        <span class="fm-agent__badge" hidden></span>
        <button type="button" class="fm-agent__call">${ICON_PHONE}<span></span></button>
        <button type="button" class="fm-agent__x" aria-label="">×</button>
      </header>
      <div class="fm-agent__voice" hidden>
        <p class="fm-agent__voice-state" aria-live="polite"></p>
        <button type="button" class="fm-agent__mute"></button>
        <button type="button" class="fm-agent__hang"></button>
      </div>
      <div class="fm-agent__log" role="log" aria-live="polite"></div>
      <div class="fm-agent__chips"></div>
      <form class="fm-agent__form">
        <input class="fm-agent__input" type="text" autocomplete="off" enterkeyhint="send">
        <button type="submit" class="fm-agent__send"></button>
      </form>
    </section>`;
  document.body.append(root);

  const $ = (s) => root.querySelector(s);
  const fab = $('.fm-agent__fab');
  const panel = $('.fm-agent__panel');
  const log = $('.fm-agent__log');
  const input = $('.fm-agent__input');
  const callBtn = $('.fm-agent__call');
  const voiceBar = $('.fm-agent__voice');
  const voiceState = $('.fm-agent__voice-state');
  const muteBtn = $('.fm-agent__mute');
  const badge = $('.fm-agent__badge');

  let thinkingEl = null;
  let greeted = false;
  let connected = false;
  let inVoice = false;
  let muted = false;
  let syncTimer;

  const channel = () => (inVoice ? 'web_voz' : 'web_texto');

  // `choices`: respuestas rápidas bajo el mensaje. Al tocar una se envía su texto y los botones se retiran.
  function addMessage(role, text, choices = [], { sticky = false } = {}) {
    removeThinking();
    // Las respuestas rápidas se retiran con el siguiente mensaje; las "persistentes" (invitaciones del agente) solo
    // las retira el cliente al tocarlas o al escribir.
    log.querySelectorAll(role === 'user' ? '.fm-choices' : '.fm-choices:not([data-sticky])').forEach((n) => n.remove());
    const el = document.createElement('p');
    el.className = `fm-msg fm-msg--${role}`;
    el.textContent = text;
    log.append(el);
    if (choices.length) {
      const row = document.createElement('div');
      row.className = 'fm-choices';
      if (sticky) row.dataset.sticky = '1';
      choices.forEach((choice) => {
        const { label, run } = typeof choice === 'string' ? { label: choice } : choice;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fm-chip';
        b.textContent = label;
        b.addEventListener('click', () => {
          row.remove();
          if (run) run(); else sendUser(label);
        });
        row.append(b);
      });
      log.append(row);
    }
    log.scrollTop = log.scrollHeight;
  }

  function setThinking(on) {
    if (!on) return removeThinking();
    if (thinkingEl) return;
    thinkingEl = document.createElement('p');
    thinkingEl.className = 'fm-msg fm-msg--agent fm-msg--thinking';
    thinkingEl.setAttribute('aria-label', t('agent.thinking'));
    thinkingEl.innerHTML = '<span></span><span></span><span></span>';
    log.append(thinkingEl);
    log.scrollTop = log.scrollHeight;
  }

  function removeThinking() {
    thinkingEl?.remove();
    thinkingEl = null;
  }

  function renderStatic() {
    fab.setAttribute('aria-label', t(root.dataset.open === 'true' ? 'agent.close' : 'agent.open'));
    panel.setAttribute('aria-label', t('agent.title'));
    $('.fm-agent__title').textContent = t('agent.title');
    $('.fm-agent__sub').textContent = t('agent.subtitle');
    $('.fm-agent__x').setAttribute('aria-label', t('agent.close'));
    $('.fm-agent__call span').textContent = t('agent.call');
    muteBtn.textContent = t(muted ? 'agent.unmute' : 'agent.mute');
    $('.fm-agent__hang').textContent = t('agent.hangup');
    input.setAttribute('aria-label', t('agent.inputLabel'));
    input.placeholder = t('agent.inputPlaceholder');
    $('.fm-agent__send').textContent = t('agent.send');
    badge.textContent = t('agent.demoBadge');
    badge.hidden = conn.kind !== 'demo';
    callBtn.disabled = !conn.supportsVoice;
    callBtn.title = conn.supportsVoice ? '' : t('agent.callUnavailable');
    renderChips();
  }

  function renderChips() {
    const chips = [
      ['testDrive', () => sendUser(t('agent.userMsg.testDrive'))],
      ['payment', () => sendUser(t('agent.userMsg.payment'))],
      ['advisor', () => sendUser(t('agent.userMsg.advisor'))],
      ['whatsapp', () => runAction({ type: 'whatsapp' }, { direct: true })],
    ];
    const box = $('.fm-agent__chips');
    box.replaceChildren(
      ...chips.map(([key, fn]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'fm-chip';
        b.textContent = t(`agent.quick.${key}`);
        b.addEventListener('click', fn);
        return b;
      }),
    );
  }

  // Devuelve si la acción se pudo cumplir: así el agente recibe una respuesta honesta de la herramienta.
  // `direct`: viene de un toque del cliente. Sin él (la orden llegó del agente o de una respuesta tardía) el navegador
  // bloquearía window.open, así que WhatsApp se ofrece como un botón que el cliente toca.
  function runAction(action, { direct = false } = {}) {
    if (action.type === 'offer_call') {
      // Solo se ofrece si la voz está disponible; sin ella no se promete.
      if (!conn.supportsVoice || inVoice) return false;
      addMessage('agent', t('agent.offerCall'), [
        { label: t('agent.offerCallYes'), run: startVoice },
        { label: t('agent.offerCallNo'), run: () => sendUser(t('agent.offerCallNoMsg')) },
      ], { sticky: true });
      return true;
    }
    if (action.type === 'open_panel') return openSitePage(action.page);
    if (action.type === 'whatsapp') {
      if (!whatsappConfigured) {
        addMessage('system', t('agent.whatsappMissing'));
        return false;
      }
      if (direct) return openWhatsApp(action.text);
      addMessage('agent', t('agent.whatsappPrompt'), [{ label: t('agent.whatsappGo'), run: () => openWhatsApp(action.text) }], { sticky: true });
      return true;
    }
    return false;
  }

  function handleStatus(status) {
    if (status === 'connecting') {
      connected = false;
      voiceState.textContent = inVoice ? t('agent.connecting') : '';
    } else if (status === 'ready') {
      connected = true;
    } else if (status === 'voice-listening' || status === 'voice-speaking') {
      connected = true;
      voiceState.textContent = t(status === 'voice-listening' ? 'agent.listening' : 'agent.speaking');
    } else if (status === 'ended' || status === 'disconnected') {
      connected = false;
      if (inVoice) leaveVoiceUi();
      if (status === 'disconnected') addMessage('system', t('agent.disconnected'));
    }
  }

  const conn = createConnection({
    onMessage: ({ role, text, choices }) => addMessage(role, text, choices),
    onThinking: setThinking,
    onStatus: handleStatus,
    onAction: runAction,
    onError: (msg) => {
      console.warn('[agent]', msg);
      setThinking(false);
      addMessage('system', /permission|denied|NotAllowed/i.test(msg || '') ? t('agent.micDenied') : t('agent.error'));
    },
  });

  async function ensureConnected() {
    if (connected && conn.isOpen()) return;
    await conn.connect(buildContext(channel()));
  }

  async function sendUser(text) {
    text = text.trim();
    if (!text) return;
    // Si el cliente escribe en otro idioma, toda la conversación (respuestas, botones y panel) pasa a ese idioma.
    const detected = detectLang(text);
    if (detected && detected !== curLang()) setState({ convLang: detected === state.lang ? null : detected });
    addMessage('user', text);
    try {
      await ensureConnected();
      await conn.send(text, buildContext(channel()));
    } catch (err) {
      console.warn('[agent]', err);
      setThinking(false);
      addMessage('system', t('agent.error'));
    }
  }

  function leaveVoiceUi() {
    inVoice = false;
    voiceBar.hidden = true;
    callBtn.hidden = false;
    muted = false;
    muteBtn.textContent = t('agent.mute');
  }

  async function startVoice() {
    if (!conn.supportsVoice || inVoice) return;
    inVoice = true;
    callBtn.hidden = true;
    voiceBar.hidden = false;
    voiceState.textContent = t('agent.connecting');
    try {
      await conn.startVoice(buildContext('web_voz'));
    } catch (err) {
      leaveVoiceUi();
      addMessage('system', /permission|denied|NotAllowed/i.test(String(err?.message || err)) ? t('agent.micDenied') : t('agent.error'));
      await ensureConnected().catch(() => {});
    }
  }

  async function stopVoice() {
    if (!inVoice) return;
    leaveVoiceUi();
    addMessage('system', t('agent.voiceEnded'));
    await conn.stopVoice(buildContext('web_texto')).catch(() => {});
  }

  async function openPanel({ focus = true } = {}) {
    root.dataset.open = 'true';
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', t('agent.close'));
    if (!greeted) {
      greeted = true;
      // Solo se nombra la unidad si el cliente está en el showroom o en la franja de unidades.
      const unit = ['showroom', 'units'].includes(state.section) ? getUnit(state.unitId) : null;
      addMessage('agent', unit ? t('agent.greetingUnit', { unit: unitName(unit) }) : t('agent.greeting'));
      // El embudo arranca por la necesidad del cliente, no por el catálogo.
      addMessage('agent', t('agent.flow.needAsk'), ['first', 'change', 'upgrade', 'looking'].map((k) => t(`agent.flow.needChoices.${k}`)));
      ensureConnected().catch(() => addMessage('system', t('agent.error')));
    }
    // Una apertura automática no enfoca el campo: en celular abriría el teclado sin que el cliente lo pidiera.
    if (focus) input.focus();
  }

  function closePanel() {
    root.dataset.open = 'false';
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', t('agent.open'));
    fab.focus();
  }

  // El sitio avisa con el evento `fm:site-end` (en window o en document) que el cliente llegó al final:
  // el panel se abre una sola vez por visita (por pestaña; si el almacenamiento no está disponible, por carga de página).
  const SITE_END_KEY = 'fm-agent-site-end';
  let siteEndHandled = false;
  const siteEndSeen = () => {
    try {
      return sessionStorage.getItem(SITE_END_KEY) === '1';
    } catch {
      return false;
    }
  };
  function onSiteEnd() {
    if (siteEndHandled || siteEndSeen()) return;
    siteEndHandled = true;
    try {
      sessionStorage.setItem(SITE_END_KEY, '1');
    } catch {}
    if (root.dataset.open !== 'true') openPanel({ focus: false });
  }
  window.addEventListener('fm:site-end', onSiteEnd);
  document.addEventListener('fm:site-end', onSiteEnd);

  fab.addEventListener('click', () => (root.dataset.open === 'true' ? closePanel() : openPanel()));
  $('.fm-agent__x').addEventListener('click', closePanel);
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePanel();
    }
  });
  $('.fm-agent__form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    sendUser(text);
  });
  callBtn.addEventListener('click', startVoice);
  $('.fm-agent__hang').addEventListener('click', stopVoice);
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    conn.setMicMuted?.(muted);
    muteBtn.textContent = t(muted ? 'agent.unmute' : 'agent.mute');
  });

  // Cualquier cambio de idioma, unidad, sección o panel del sitio se avisa al agente.
  subscribe((_, changed) => {
    // Si el cliente cambia el idioma del sitio, la conversación vuelve a seguirlo.
    if ('lang' in changed && state.convLang) {
      setState({ convLang: null });
      return;
    }
    if ('lang' in changed || 'convLang' in changed) renderStatic();
    if (!greeted) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => conn.updateContext(buildContext(channel())), 400);
  });

  renderStatic();
  return { open: openPanel, close: closePanel };
}
