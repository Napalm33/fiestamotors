import { state, curLang } from './core/state.js';
import { t } from './core/i18n.js';
import { getUnit } from './core/inventory.js';

// Contexto que recibe el agente: idioma, canal, unidad (todos sus campos), sección y panel abierto.
export function buildContext(channel) {
  return {
    idioma: curLang(),
    canal: channel,
    seccion: state.section,
    panel_sitio: state.sitePage,
    unidad: getUnit(state.unitId),
  };
}

export function contextText(ctx) {
  return `Contexto del sitio (actualización, no es un mensaje del cliente): ${JSON.stringify(ctx)}`;
}

// Historial de la visita: cuando se abre una sesión nueva (por ejemplo al pasar de texto a llamada, o tras un corte),
// el agente recibe lo que ya se habló y no vuelve a preguntar lo mismo.
const HISTORY_KEY = 'fm-agent-history';
let history = [];
try { history = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); } catch { history = []; }

export function noteMessage(role, text) {
  history.push({ role, text: String(text).replace(/\s+/g, ' ').slice(0, 400) });
  history = history.slice(-16);
  try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* sin almacenamiento */ }
}

function previousConversation() {
  if (!history.some((m) => m.role === 'user')) return 'ninguna';
  return history.map((m) => `${m.role === 'user' ? 'Cliente' : 'Sofía'}: ${m.text}`).join('\n').slice(-1800);
}

// Identificador anónimo del visitante, estable entre conversaciones (texto y llamada) en el mismo navegador.
// Llega en el webhook post-llamada y permite unir varias conversaciones de una misma persona en un solo reporte.
function visitorId() {
  const key = 'fm-agent-visitor';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'sin-id';
  }
}

// Variables dinámicas de ElevenLabs: el prompt del agente las usa como {{idioma}}, {{unidad}}, etc.
export function dynamicVariables(ctx) {
  return {
    visitor_id: visitorId(),
    conversacion_previa: previousConversation(),
    idioma: ctx.idioma,
    canal: ctx.canal,
    seccion: ctx.seccion,
    panel_sitio: ctx.panel_sitio || 'ninguno',
    // Primer mensaje del agente en voz: el agente de ElevenLabs lo usa como {{primer_mensaje}}.
    primer_mensaje: t('agent.voiceGreeting'),
    unidad: ctx.unidad ? JSON.stringify(ctx.unidad) : 'ninguna',
  };
}
