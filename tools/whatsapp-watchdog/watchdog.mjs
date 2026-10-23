// Watchdog: escucha un canal de ntfy (donde Make publica cada lead nuevo) y envía el texto al grupo de WhatsApp Web.
// Sin sondeo de la hoja y sin LLM. Uso: node watchdog.mjs [--dry-run]
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry-run');
const cfgPath = join(DIR, 'config.json');
const cfg = { ntfyServer: 'https://ntfy.sh', group: 'Fiesta Motors Testing', maxPerMinute: 4, ...(existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {}) };
if (process.env.NTFY_TOPIC) cfg.topic = process.env.NTFY_TOPIC;
if (!cfg.topic || cfg.topic.length < 16) { console.error('Falta "topic" (largo, aleatorio) en config.json o NTFY_TOPIC.'); process.exit(1); }

const statePath = join(DIR, 'state.json');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { lastId: null, sent: [] };
const save = () => writeFileSync(statePath, JSON.stringify({ lastId: state.lastId, sent: state.sent.slice(-200) }));
mkdirSync(join(DIR, 'logs'), { recursive: true });
const log = (...a) => { const l = `${new Date().toISOString()} ${a.join(' ')}`; console.log(l); appendFileSync(join(DIR, 'logs', 'watchdog.log'), l + '\n'); };

// ---------- WhatsApp Web (Playwright, perfil persistente: el QR se escanea una sola vez) ----------
let ctx, page;
async function whatsapp() {
  if (page && !page.isClosed()) return page;
  const { chromium } = await import('playwright');
  ctx = await chromium.launchPersistentContext(join(DIR, 'wa-profile'), { headless: false, viewport: { width: 1100, height: 800 } });
  page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });
  log('WhatsApp Web abierto. Si aparece un código QR, escanéalo con el teléfono (WhatsApp > Dispositivos vinculados).');
  await page.waitForSelector('#pane-side', { timeout: 10 * 60 * 1000 });
  return page;
}

async function sendToGroup(text) {
  const p = await whatsapp();
  const search = p.locator('#side [contenteditable="true"]').first();
  await search.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
  await p.keyboard.insertText(cfg.group);
  const hit = p.locator(`#pane-side span[title="${cfg.group}"]`).first();
  await hit.waitFor({ timeout: 15000 }).catch(() => { throw new Error(`No encontré el grupo "${cfg.group}"`); });
  await hit.click();
  const box = p.locator('footer [contenteditable="true"]').first();
  await box.waitFor({ timeout: 15000 });
  await box.click();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) await p.keyboard.insertText(lines[i]);
    if (i < lines.length - 1) await p.keyboard.press('Shift+Enter');   // Enter solo enviaría el mensaje a medias
  }
  await p.keyboard.press('Enter');
  const first = lines.find((l) => l.trim()) || '';
  await p.locator('div.message-out').last().getByText(first.slice(0, 25), { exact: false }).waitFor({ timeout: 15000 });
}

// ---------- Cola: un mensaje a la vez, con tope por minuto ----------
const queue = []; let working = false; const stamps = [];
async function pump() {
  if (working) return; working = true;
  while (queue.length) {
    const m = queue[0];
    if (state.sent.includes(m.id)) { queue.shift(); continue; }
    const recent = stamps.filter((t) => Date.now() - t < 60000);
    if (recent.length >= cfg.maxPerMinute) { await new Promise((r) => setTimeout(r, 5000)); continue; }
    try {
      if (DRY) log('[prueba] enviaría al grupo:', JSON.stringify(m.text));
      else { await sendToGroup(m.text); log('Enviado:', m.id); }
      stamps.push(Date.now()); state.sent.push(m.id); state.lastId = m.id; save(); queue.shift();
    } catch (e) { log('Error al enviar, reintento en 30 s:', e.message); await new Promise((r) => setTimeout(r, 30000)); }
  }
  working = false;
}

// ---------- Suscripción a ntfy (se reconecta sola; al volver recupera lo que llegó mientras estaba apagado) ----------
async function listen() {
  for (let wait = 2000; ; wait = Math.min(wait * 2, 60000)) {
    try {
      // Primera vez: solo mensajes nuevos. Después: desde el último enviado, para no perder lo que llegó con la PC apagada.
      const q = state.lastId ? `?since=${state.lastId}` : '';
      const res = await fetch(`${cfg.ntfyServer}/${cfg.topic}/json${q}`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      log('Conectado a ntfy. Esperando leads…'); wait = 2000;
      const dec = new TextDecoder(); let buf = '';
      for await (const chunk of res.body) {
        buf += dec.decode(chunk, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line) continue;
          let ev; try { ev = JSON.parse(line); } catch { continue; }
          if (ev.event === 'message' && ev.message) { queue.push({ id: ev.id, text: ev.message }); pump(); }
        }
      }
    } catch (e) { log('Conexión perdida:', e.message, `(reintento en ${wait / 1000} s)`); }
    await new Promise((r) => setTimeout(r, wait));
  }
}
log(DRY ? 'Modo prueba: no se abre WhatsApp.' : `Destino: grupo "${cfg.group}"`);
listen();
