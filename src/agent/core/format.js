import { curLang } from './state.js';
import { t } from './i18n.js';

const locale = () => (curLang() === 'es' ? 'es-MX' : 'en-CA');

export function unitName(u) {
  return [u.year, u.make, u.model, u.trim].filter(Boolean).join(' ');
}

export function fmtPrice(u) {
  if (u.price == null) return t('common.consult');
  return new Intl.NumberFormat(locale(), { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(u.price);
}

export function fmtKm(u) {
  if (u.odometer_km == null) return t('common.consult');
  return `${new Intl.NumberFormat(locale()).format(u.odometer_km)} km`;
}

export function fmtOwners(u) {
  return u.owners == null ? t('common.consult') : String(u.owners);
}
