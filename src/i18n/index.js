import es from './es.json';
import en from './en.json';
import { state, setState } from '../state.js';

const dict = { es, en };
const STORAGE_KEY = 'fm-lang';

export function initLang() {
  let lang;
  try {
    lang = localStorage.getItem(STORAGE_KEY);
  } catch {}
  if (lang !== 'es' && lang !== 'en') {
    lang = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  }
  setState({ lang });
  document.documentElement.lang = lang;
}

export function setLang(lang) {
  setState({ lang });
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

export function t(key, vars = {}) {
  const value = key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict[state.lang]);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
