import { state, curLang } from './core/state.js';
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

// Variables dinámicas de ElevenLabs: el prompt del agente las usa como {{idioma}}, {{unidad}}, etc.
export function dynamicVariables(ctx) {
  return {
    idioma: ctx.idioma,
    canal: ctx.canal,
    seccion: ctx.seccion,
    panel_sitio: ctx.panel_sitio || 'ninguno',
    unidad: ctx.unidad ? JSON.stringify(ctx.unidad) : 'ninguna',
  };
}
