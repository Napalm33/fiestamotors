import { t } from './core/i18n.js';
import { units } from './core/inventory.js';
import { unitName, fmtPrice, fmtKm } from './core/format.js';

// Respuestas del modo demostración: solo salen de data/inventory.json y de los datos del negocio.
// No calcula pagos, no promete aprobaciones, no inventa campos vacíos.
const has = (text, words) => words.some((w) => text.includes(w));

function field(ctx, key, value, label) {
  const unit = ctx.unidad;
  if (!unit) return { text: t('agent.demo.noUnit') };
  if (value === null || value === undefined || value === '') {
    return { text: t('agent.demo.empty', { field: t(`agent.demo.fields.${label}`) }) };
  }
  return { text: t(`agent.demo.${key}`, { unit: unitName(unit), value }) };
}

export function demoReply(input, ctx) {
  const q = input.toLowerCase();
  const unit = ctx.unidad;

  if (has(q, ['asesor', 'persona', 'humano', 'advisor', 'human', 'agent', 'representative'])) {
    return { text: t('agent.demo.advisor'), actions: [{ type: 'whatsapp' }] };
  }
  if (has(q, ['whatsapp'])) return { text: t('agent.demo.whatsapp'), actions: [{ type: 'whatsapp' }] };
  if (has(q, ['test drive', 'prueba de manejo', 'probar', 'manejar', 'cita', 'appointment'])) {
    return { text: t('agent.demo.testDrive'), actions: [{ type: 'open_panel', page: 'test_drive' }] };
  }
  if (has(q, ['servicio', 'taller', 'mantenimiento', 'service', 'repair', 'maintenance'])) {
    return { text: t('agent.demo.service'), actions: [{ type: 'open_panel', page: 'servicio' }] };
  }
  if (has(q, ['trade', 'dar a cambio', 'mi auto', 'my car', 'my vehicle'])) {
    return { text: t('agent.demo.tradeIn'), actions: [{ type: 'open_panel', page: 'trade_in' }] };
  }
  if (has(q, ['crédito', 'credito', 'credit', 'financ', 'loan', 'préstamo', 'prestamo'])) {
    return { text: t('agent.demo.credit'), actions: [] };
  }
  if (has(q, ['pago', 'mensualidad', 'payment', 'calcul', 'monthly', 'enganche', 'down payment'])) {
    return { text: t('agent.demo.payment'), actions: [{ type: 'open_panel', page: 'calculadora' }] };
  }
  if (has(q, ['precio', 'cuesta', 'costo', 'price', 'cost', 'how much'])) {
    return unit?.price == null ? field(ctx, 'price', null, 'price') : field(ctx, 'price', fmtPrice(unit), 'price');
  }
  if (has(q, ['kilometr', 'millas', 'km', 'mileage', 'odometer'])) {
    return unit?.odometer_km == null ? field(ctx, 'km', null, 'km') : field(ctx, 'km', fmtKm(unit), 'km');
  }
  if (has(q, ['dueño', 'dueno', 'owner'])) return field(ctx, 'owners', unit?.owners, 'owners');
  if (has(q, ['condici', 'estado', 'condition', 'accident', 'accidente', 'historial'])) {
    return field(ctx, 'condition', unit?.condition_notes, 'condition');
  }
  if (has(q, ['horario', 'hora', 'dónde', 'donde', 'dirección', 'direccion', 'address', 'hours', 'where', 'location', 'teléfono', 'telefono', 'phone'])) {
    return { text: t('agent.demo.hours'), actions: [{ type: 'open_panel', page: 'contacto' }] };
  }
  if (has(q, ['contacto', 'contact'])) {
    return { text: t('agent.demo.contact'), actions: [{ type: 'open_panel', page: 'contacto' }] };
  }
  if (has(q, ['inventario', 'disponible', 'tienen', 'autos', 'carros', 'inventory', 'available', 'cars', 'stock'])) {
    return { text: t('agent.demo.stock', { list: units.map(unitName).join(', ') }) };
  }
  if (has(q, ['hola', 'buenas', 'hello', 'hi ', 'hey']) || q.trim() === 'hi') return { text: t('agent.demo.hello') };
  return { text: t('agent.demo.fallback') };
}
