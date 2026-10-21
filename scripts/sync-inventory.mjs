// Revisa el inventario publicado de Fiesta Motors y deja al agente al día.
// Fuente: el feed público de ZopDealer que usa el propio sitio del dealer (una sola petición, sin navegador).
// Uso: node scripts/sync-inventory.mjs [--dry]
//
// Escribe:
//   data/availability.json        qué unidades del showroom siguen publicadas y su precio y km vigentes (lo lee el agente)
//   data/inventory-snapshot.json  foto compacta de todo el inventario, para detectar cambios entre corridas
//   docs/inventario-cambios.md    reporte de la última corrida (nuevas, vendidas, cambios de precio)
//   docs/elevenlabs/base-conocimiento.md  solo la sección entre <!--unidades:start--> y <!--unidades:end-->
// No toca data/inventory.json: ese archivo es del sitio. El reporte dice qué debería actualizar allí.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const FEED = 'https://fiestamotors.zopsoftware.com/api/website/inventory?zm_status[]=Instock&paginate=false&column=year&order=DESC';
const root = new URL('../', import.meta.url);
const path = (p) => new URL(p, root);
const read = (p, fallback) => (existsSync(path(p)) ? JSON.parse(readFileSync(path(p), 'utf8')) : fallback);
const write = (p, data) => !DRY && writeFileSync(path(p), typeof data === 'string' ? data : `${JSON.stringify(data, null, 2)}\n`);

async function fetchFeed() {
  const res = await fetch(FEED, { headers: { 'User-Agent': 'FiestaMotorsAgentSync/1.0 (revision diaria del inventario)' }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`El feed respondió ${res.status}`);
  const body = await res.json();
  const list = Array.isArray(body.inventory) ? body.inventory : Object.values(body.inventory || {});
  return list.filter((u) => u.status === 'Instock');
}

// El feed trae `odometer_numeric` en 0 para algunas unidades; `odometer` sí viene bien. Un 0 se toma como "sin dato".
const num = (v) => (v === null || v === undefined || v === '' || Number(v) === 0 ? null : Number(v));
const slim = (u) => ({ stock: String(u.stock_no), site_id: u.inventory_id, vin: u.vin || '', year: Number(u.year), make: u.make, model: u.model, trim: u.trim || '', body: u.body_type || '', drivetrain: u.drivetrain || '', fuel_type: u.fuel_type || '', price: num(u.price), odometer_km: num(u.odometer) ?? num(u.odometer_numeric), sell_alt: num(u.selling_price_numeric), url: u.page_url });
const name = (u) => [u.year, u.make, u.model, u.trim].filter(Boolean).join(' ');
const money = (n) => (n == null ? 'sin precio' : `$${Number(n).toLocaleString('en-CA')}`);

const live = (await fetchFeed()).map(slim);
const prev = read('data/inventory-snapshot.json', null);

// Protección: si el feed viene vacío o con muchas menos unidades que la vez anterior, no se da nada por vendido.
if (live.length < 20 || (prev && live.length < prev.units.length * 0.5)) {
  console.error(`Feed sospechoso (${live.length} unidades, antes ${prev?.units.length ?? 'sin dato'}). No se actualiza nada.`);
  process.exit(2);
}

const byStock = new Map(live.map((u) => [u.stock, u]));
const byVin = new Map(live.filter((u) => u.vin).map((u) => [u.vin, u]));
const now = new Date().toISOString();

// Cambios contra la corrida anterior
const changes = { added: [], removed: [], price: [], first: !prev };
if (prev) {
  const before = new Map(prev.units.map((u) => [u.stock, u]));
  changes.added = live.filter((u) => !before.has(u.stock));
  changes.removed = prev.units.filter((u) => !byStock.has(u.stock));
  changes.price = live.filter((u) => before.has(u.stock) && before.get(u.stock).price !== u.price).map((u) => ({ ...u, was: before.get(u.stock).price }));
}

// Unidades del showroom: se buscan por VIN y, si no hay, por stock.
const showroom = read('data/inventory.json', []);
const availability = { checked_at: now, source: 'ZopDealer feed público', total_in_stock: live.length, units: {} };
const rows = [];
for (const u of showroom) {
  const hit = (u.vin && byVin.get(u.vin)) || byStock.get(String(u.stock));
  availability.units[u.stock] = hit
    ? { available: true, site_id: hit.site_id, price: hit.price, odometer_km: hit.odometer_km, url: hit.url }
    : { available: false };
  rows.push({ u, hit });
}

// Sección de unidades de la base de conocimiento del agente
const block = rows.map(({ u, hit }) => {
  const title = `### ${u.year} ${u.make} ${u.model} ${u.trim}`.trim();
  if (!hit) return `${title}\n- NO DISPONIBLE: ya no aparece en el inventario publicado (revisado ${now.slice(0, 10)}). No la ofrezcas ni la describas; si la piden, un asesor confirma y puedes ofrecer opciones parecidas.\n`;
  const price = hit.price ?? u.price;
  const km = hit.odometer_km ?? u.odometer_km;
  const f = [['Carrocería', u.body], ['Color exterior', u.color], ['Precio publicado (más HST y licencia)', price != null ? `$${Number(price).toLocaleString('en-CA')} CAD` : null], ['Kilometraje', km != null ? `${Number(km).toLocaleString('en-CA')} km` : null], ['Motor', u.engine], ['Transmisión', u.transmission], ['Tracción', u.drivetrain], ['Combustible', u.fuel_type], ['Stock', u.stock]];
  return `${title}\n${f.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n- Dueños anteriores y condición: dato no publicado, lo confirma un asesor\n`;
}).join('\n');
const kbPath = 'docs/elevenlabs/base-conocimiento.md';
if (existsSync(path(kbPath))) {
  const kb = readFileSync(path(kbPath), 'utf8');
  const re = /<!--unidades:start-->[\s\S]*?<!--unidades:end-->/;
  if (re.test(kb)) write(kbPath, kb.replace(re, `<!--unidades:start-->\n${block}\nActualizado automáticamente el ${now.slice(0, 10)} desde el inventario publicado.\n<!--unidades:end-->`));
  else console.warn('La base de conocimiento no tiene los marcadores <!--unidades:start--> y <!--unidades:end-->; no se actualizó.');
}

// Inventario publicado completo (resumen de todas las unidades), para que el agente recomiende con datos reales
const invPath = 'docs/elevenlabs/base-conocimiento.md';
if (existsSync(path(invPath))) {
  const kb2 = readFileSync(path(invPath), 'utf8');
  const re2 = /<!--inventario:start-->[\s\S]*?<!--inventario:end-->/;
  const priced = live.filter((u) => u.price != null).sort((a, b) => a.price - b.price);
  const med = priced[Math.floor(priced.length / 2)]?.price;
  const lines = priced.map((u) => `- ${name(u)} | $${u.price.toLocaleString('en-CA')} | ${u.odometer_km != null ? `${u.odometer_km.toLocaleString('en-CA')} km` : 'km: lo confirma un asesor'}${u.body ? ` | ${u.body}` : ''}${u.drivetrain ? ` | ${u.drivetrain}` : ''} | stock ${u.stock}`);
  const body2 = `<!--inventario:start-->\nTodas las unidades publicadas el ${now.slice(0, 10)} (${priced.length}), de la más económica a la más cara. Precios en CAD, más HST y licencia. Rango: desde $${priced[0].price.toLocaleString('en-CA')} hasta $${priced.at(-1).price.toLocaleString('en-CA')}; la mitad cuesta menos de $${med.toLocaleString('en-CA')}. Dueños anteriores y condición: no publicados, los confirma un asesor.\n\n${lines.join('\n')}\n<!--inventario:end-->`;
  if (re2.test(kb2)) write(invPath, kb2.replace(re2, body2));
  else console.warn('La base de conocimiento no tiene los marcadores <!--inventario:start--> y <!--inventario:end-->; no se actualizó el inventario completo.');
}

// Reporte
const L = [`# Cambios del inventario`, '', `Última revisión: ${now} · ${live.length} unidades publicadas · fuente: feed público de ZopDealer.`, ''];
const sold = rows.filter((r) => !r.hit);
L.push('## Unidades del showroom', '');
for (const { u, hit } of rows) {
  if (!hit) L.push(`- **${name(u)}** (stock ${u.stock}): **ya no está publicada**. El agente dejó de ofrecerla; el sitio debería quitarla del showroom.`);
  else {
    const diffs = [];
    if (hit.price != null && u.price != null && hit.price !== u.price) diffs.push(`precio ${money(u.price)} → ${money(hit.price)}`);
    if (hit.odometer_km != null && u.odometer_km != null && hit.odometer_km !== u.odometer_km) diffs.push(`km ${u.odometer_km} → ${hit.odometer_km}`);
    L.push(`- ${name(u)} (stock ${u.stock}): disponible${diffs.length ? `; el sitio muestra datos viejos (${diffs.join(', ')}); el agente ya usa los vigentes` : '; datos al día'}.`);
    if (hit.sell_alt != null && hit.price != null && hit.sell_alt !== hit.price) L.push(`  - Revisar con el dealer: el feed trae dos precios (publicado ${money(hit.price)} y otro campo ${money(hit.sell_alt)}). El agente usa el publicado.`);
  }
}
L.push('', '## Cambios desde la revisión anterior', '');
if (changes.first) L.push('Primera revisión: no hay corrida anterior con la que comparar.');
else {
  L.push(`- Nuevas: ${changes.added.length}`, ...changes.added.slice(0, 40).map((u) => `  - ${name(u)} (${u.stock}) ${money(u.price)}`));
  L.push(`- Vendidas o retiradas: ${changes.removed.length}`, ...changes.removed.slice(0, 40).map((u) => `  - ${name(u)} (${u.stock})`));
  L.push(`- Cambios de precio: ${changes.price.length}`, ...changes.price.slice(0, 40).map((u) => `  - ${name(u)} (${u.stock}): ${money(u.was)} → ${money(u.price)}`));
}
write('data/availability.json', availability);
write('data/inventory-snapshot.json', { checked_at: now, units: live });
write('docs/inventario-cambios.md', `${L.join('\n')}\n`);
console.log(`${DRY ? '[dry] ' : ''}${live.length} publicadas · showroom: ${rows.length - sold.length} disponibles, ${sold.length} no · nuevas ${changes.added.length}, retiradas ${changes.removed.length}, precios ${changes.price.length}`);
