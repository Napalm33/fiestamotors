const listeners = new Set();

export const state = {
  lang: 'es', // idioma del sitio
  convLang: null, // idioma de la conversación, si el cliente escribió en otro; null = el del sitio
  unitId: null,
  section: 'showroom',
  sitePage: null,
};

export function setState(patch) {
  const changed = {};
  for (const key of Object.keys(patch)) {
    if (state[key] !== patch[key]) {
      state[key] = patch[key];
      changed[key] = patch[key];
    }
  }
  if (Object.keys(changed).length) listeners.forEach((fn) => fn(state, changed));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Idioma con el que habla el agente: el que detectó en el cliente o, si no, el del sitio.
export const curLang = () => state.convLang || state.lang;
