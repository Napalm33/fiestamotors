import { state } from './core/state.js';
import { t } from './core/i18n.js';
import { getUnit } from './core/inventory.js';
import { unitName } from './core/format.js';

const NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');

export const whatsappConfigured = Boolean(NUMBER);

export function whatsappUrl(extra = '') {
  if (!NUMBER) return null;
  const unit = getUnit(state.unitId);
  const text = unit
    ? t('agent.whatsappMsgUnit', { unit: unitName(unit), stock: unit.stock || unit.id })
    : t('agent.whatsappMsgGeneric');
  return `https://wa.me/${NUMBER}?text=${encodeURIComponent(extra ? `${text}\n\n${extra}` : text)}`;
}

export function openWhatsApp(extra = '') {
  const url = whatsappUrl(extra);
  if (!url) return false;
  window.open(url, '_blank', 'noopener');
  return true;
}
