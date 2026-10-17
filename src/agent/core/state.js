const listeners = new Set();

export const state = {
  lang: 'es',
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
