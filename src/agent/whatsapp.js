import { state } from '../state.js';
import { t } from '../i18n/index.js';
import { getUnit } from '../inventory.js';
import { unitName } from '../format.js';

const NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');

export const whatsappConfigured = Boolean(NUMBER);

export function whatsappUrl() {
  if (!NUMBER) return null;
  const unit = getUnit(state.unitId);
  const text = unit
    ? t('agent.whatsappMsgUnit', { unit: unitName(unit), stock: unit.stock || unit.id })
    : t('agent.whatsappMsgGeneric');
  return `https://wa.me/${NUMBER}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp() {
  const url = whatsappUrl();
  if (!url) return false;
  window.open(url, '_blank', 'noopener');
  return true;
}
