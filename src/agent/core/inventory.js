import inventory from '../../../data/inventory.json';
import availability from '../../../data/availability.json';
import snapshot from '../../../data/inventory-snapshot.json';

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

// Catálogo completo del inventario publicado (todas las unidades, no solo las del showroom), de data/inventory-snapshot.json.
// Las unidades del showroom conservan sus datos completos. Sirve para recomendar con precios y kilometrajes reales.
const showroomByStock = new Map(units.map((u) => [String(u.stock), u]));
export const catalog = snapshot.units
  .filter((u) => u.price != null)
  .map(
    (u) =>
      showroomByStock.get(String(u.stock)) || {
        id: u.stock, stock: u.stock, vin: u.vin, year: u.year, make: u.make, model: u.model, trim: u.trim,
        body: u.body || '', drivetrain: u.drivetrain || '', fuel_type: u.fuel_type || '', price: u.price,
        odometer_km: u.odometer_km, color: '', owners: null, condition_notes: '', detail_url: u.url,
      },
  );
