import es from '../i18n/es.json';
import en from '../i18n/en.json';
import { curLang } from './state.js';

// Textos del agente. El idioma es el de la conversación (lo detecta del cliente) o, si no, el del sitio.
const dict = { es, en };

export function t(key, vars = {}) {
  const value = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict[curLang()]);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
