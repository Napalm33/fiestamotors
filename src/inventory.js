import inventory from '../data/inventory.json';

export const units = inventory;

export function getUnit(id) {
  return units.find((u) => u.id === id) || null;
}
