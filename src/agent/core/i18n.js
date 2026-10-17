import es from '../i18n/es.json';
import en from '../i18n/en.json';
import { state } from './state.js';

// Textos del agente. El idioma lo decide el sitio (main.js) y llega por state.lang.
const dict = { es, en };

export function t(key, vars = {}) {
  const value = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict[state.lang]);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
