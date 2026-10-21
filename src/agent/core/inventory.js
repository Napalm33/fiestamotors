import inventory from '../../../data/inventory.json';
import availability from '../../../data/availability.json';

// data/availability.json lo escribe scripts/sync-inventory.mjs a partir del inventario publicado del dealer.
// Una unidad que ya no está publicada no se ofrece ni se describe; precio y km vigentes mandan sobre los del JSON.
const live = (u) => availability.units?.[u.stock];

export const soldUnits = inventory.filter((u) => live(u)?.available === false);

export const units = inventory
  .filter((u) => live(u)?.available !== false) // sin dato de disponibilidad (unidad nueva) se asume disponible
  .map((u) => {
    const l = live(u);
    return l?.available ? { ...u, price: l.price ?? u.price, odometer_km: l.odometer_km ?? u.odometer_km } : u;
  });

export const inventoryCheckedAt = availability.checked_at;

export function getUnit(id) {
  return units.find((u) => u.id === id) || null;
}
