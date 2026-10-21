import { t } from './core/i18n.js';
import { units, soldUnits, catalog } from './core/inventory.js';
import { unitName, fmtPrice, fmtKm } from './core/format.js';

// Modo demostración: el agente como embudo de ventas, sin claves y solo con datos de inventory.json.
// Orden del embudo: necesidad -> tipo de auto y presupuesto -> recomendación y comparativa -> contado o crédito.
// Contado va en línea recta a la compra. Solo si hay financiamiento se pide permiso para la etapa de
// recolección de información. No inventa datos, no promete aprobación y no calcula pagos.
// Rangos pensados con el inventario real: la mitad de los autos cuesta menos de $20,000 y hay desde unos $4,000.
const BAND_MAX = { b1: 10000, b2: 20000, b3: 30000 };
const SENSITIVE = /\b\d{3}[ -]?\d{3}[ -]?\d{3}\b|\b(?:\d[ -]?){13,19}\b/; // posible SIN o tarjeta

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// Las palabras cortas se buscan como palabra completa para no coincidir dentro de otras.
const has = (q, words) => words.some((w) => (w.length <= 3 ? new RegExp(`\\b${w}\\b`).test(q) : q.includes(w)));

const flow = fresh();
function fresh() {
  return { need: null, worry: null, use: null, pref: null, unclear: 0, body: null, band: null, path: null, picks: [], focus: null, stage: null, step: 0, answers: {}, pending: [] };
}
export function resetFlow() {
  Object.assign(flow, fresh());
}

const category = (u) => {
  const b = norm(u.body || '');
  if (b.includes('suv') || b.includes('sport utility')) return 'suv';
  if (b.includes('truck') || b.includes('pickup')) return 'truck';
  if (b.includes('van')) return 'van';
  return 'compact';
};
const band = (u) => (u.price == null ? null : u.price <= BAND_MAX.b1 ? 'b1' : u.price <= BAND_MAX.b2 ? 'b2' : u.price <= BAND_MAX.b3 ? 'b3' : 'b4');
// Para qué lo usará -> carrocerías que le sirven (preferencia, no filtro duro)
const USE_BODY = { city: ['compact', 'suv'], family: ['suv', 'van'], highway: ['compact', 'suv'], work: ['truck', 'van'] };
const priceStats = () => {
  const p = catalog.map((u) => u.price).sort((a, b) => a - b);
  return { min: p[0], median: p[Math.floor(p.length / 2)] };
};

// Preguntas de la etapa de recolección de información (una a la vez, todas se pueden saltar).
const STEPS = [
  { key: 'id', choices: ['yes', 'no', 'pending'] },
  { key: 'history', choices: ['yes', 'no', 'unsure'] },
  { key: 'score', choices: ['unknown', 'lt600', 'm600', 'm700'] },
  { key: 'income', choices: ['lt30', 'm30', 'm50', 'gt80'] },
  { key: 'work', choices: ['employed', 'self', 'other'] },
  { key: 'down', choices: ['none', 'lt2', 'm2', 'gt5'] },
  { key: 'trade', choices: ['yes', 'no'] },
];

const ch = (list) => list.map(([token, label]) => ({ token, label }));
const reply = (text, choices = [], actions = []) => {
  flow.pending = choices;
  return { text, choices: choices.map((c) => c.label), actions };
};
const line = (key, vars) => t(`agent.flow.${key}`, vars);

const needChoices = () => ch(['first', 'change', 'upgrade', 'looking'].map((k) => [`need:${k}`, line(`needChoices.${k}`)]));
const advisorChoice = () => ['act:advisor', line('c.advisor')];

function askBody(intro) {
  flow.stage = 'body';
  const cats = [...new Set(catalog.map(category))];
  return reply(`${intro}${line('askBody')}`, ch([...cats.map((c) => [`body:${c}`, line(`body.${c}`)]), ['body:any', line('c.unsure')]]));
}

// Descubrimiento: primero qué lo frena, luego para qué lo usará, y solo después el presupuesto.
function askWorry(intro) {
  flow.stage = 'worry';
  return reply(`${intro}${line('askWorry')}`, ch(['credit', 'price', 'which', 'process', 'none'].map((k) => [`worry:${k}`, line(`worry.${k}`)])));
}

function askUse(intro) {
  flow.stage = 'use';
  return reply(`${intro}${line('askUse')}`, ch([...['city', 'family', 'highway', 'work'].map((k) => [`use:${k}`, line(`use.${k}`)]), ['use:unknown', line('use.unknown')]]));
}

function askBand(intro = '') {
  flow.stage = 'band';
  return reply(`${intro}${line('askBand')}`, ch([...['b1', 'b2', 'b3', 'b4'].map((k) => [`band:${k}`, line(`band.${k}`)]), ['band:any', line('c.unclear')]]));
}

// Ante un "no sé" en el presupuesto no se asume nada: se pregunta algo más fácil de responder.
function askPref() {
  flow.stage = 'pref';
  return reply(line('askPref'), ch([...['cheap', 'balanced', 'new'].map((k) => [`pref:${k}`, line(`pref.${k}`)]), ['pref:any', line('c.unsure')]]));
}

// Tras varias respuestas sin dato no se llena de opciones al azar: se ofrece ver todo con calma o hablar con una persona.
function tooUnclear() {
  flow.stage = 'done';
  return reply(line('tooUnclear'), ch([['act:inventory', line('c.openInventory')], advisorChoice()]));
}

function recommend() {
  const wantBody = flow.body ? [flow.body] : USE_BODY[flow.use] || null;
  let pool = catalog.filter((u) => !flow.band || band(u) === flow.band);
  if (!flow.band) {
    // Sin presupuesto, la preferencia fija el punto de partida.
    if (flow.pref === 'cheap') pool = catalog.filter((u) => u.price <= 15000);
    else if (flow.pref === 'new') pool = catalog.filter((u) => u.year >= 2021);
    else pool = catalog.filter((u) => u.price > 12000 && u.price <= 25000);
  }
  if (flow.body) {
    const only = pool.filter((u) => category(u) === flow.body);
    if (only.length) pool = only; // si el tipo pedido no existe en el rango, se muestra el rango sin ese filtro
  }
  const fit = (u) => (wantBody && wantBody.includes(category(u)) ? 0 : 1);
  const order = flow.pref === 'new' ? (a, b) => b.year - a.year || (a.odometer_km ?? 1e9) - (b.odometer_km ?? 1e9) : flow.pref === 'cheap' ? (a, b) => a.price - b.price : (a, b) => (a.odometer_km ?? 1e9) - (b.odometer_km ?? 1e9);
  pool = [...pool].sort((a, b) => fit(a) - fit(b) || order(a, b));
  // Hasta tres modelos distintos, para que compare de verdad.
  const seen = new Set();
  flow.picks = [];
  for (const u of pool) {
    const k = `${u.make} ${u.model}`;
    if (!seen.has(k)) { seen.add(k); flow.picks.push(u); }
    if (flow.picks.length === 3) break;
  }
  flow.focus = flow.picks[0] || null;
  const rows = flow.picks.map((u) => line('row', { name: unitName(u), price: fmtPrice(u), km: fmtKm(u) })).join('\n');
  const parts = [];
  if (flow.picks.length > 1) {
    const withKm = flow.picks.filter((u) => u.odometer_km != null);
    parts.push(line('cmpPrice', { name: unitName([...flow.picks].sort((a, b) => a.price - b.price)[0]) }));
    if (withKm.length > 1) parts.push(line('cmpKm', { name: unitName([...withKm].sort((a, b) => a.odometer_km - b.odometer_km)[0]) }));
    parts.push(line('cmpNew', { name: unitName([...flow.picks].sort((a, b) => b.year - a.year)[0]) }));
  }
  const intro = !flow.band && flow.pref ? line('recPref', { what: line(`prefText.${flow.pref}`) }) : flow.use && flow.use !== 'unknown' ? line('recUse', { why: line(`useWhy.${flow.use}`) }) : line('recIntro');
  flow.stage = 'path';
  const text = [intro, rows, parts.join(' '), line('askPath')].filter(Boolean).join('\n\n');
  return reply(text, ch([['path:cash', line('c.cash')], ['path:credit', line('c.credit')], ['path:unsure', line('c.unsure')], ['cmp:start', line('c.otherType')]]));
}

function cashPath() {
  flow.path = 'cash';
  flow.stage = 'done';
  const name = flow.focus ? unitName(flow.focus) : null;
  return reply(line(name ? 'cashUnit' : 'cash', { name }), ch([['act:testdrive', line('c.testDrive')], advisorChoice()]));
}

function creditIntro() {
  flow.path = 'credit';
  flow.stage = 'consent';
  return reply(`${line('creditIntro')}\n\n${line('consent')}`, ch([['consent:yes', line('c.yes')], ['consent:no', line('c.notNow')], advisorChoice()]));
}

function askStep() {
  const s = STEPS[flow.step];
  flow.stage = 'collect';
  const opts = s.choices.map((c) => [`ans:${c}`, line(`a.${s.key}.${c}`)]);
  return reply(line(`q.${s.key}`), ch([...opts, ['ans:skip', line('c.skip')]]));
}

function summary() {
  flow.stage = 'done';
  const rows = STEPS.map((s) => line('sumRow', { label: line(`l.${s.key}`), value: flow.answers[s.key] || line('a.none') })).join('\n');
  return reply(`${line('sumIntro')}\n${rows}\n\n${line('sumOutro')}`, ch([['act:credit', line('c.creditForm')], ['act:advisor', line('c.sendAdvisor')], ['act:testdrive', line('c.testDrive')]]), []);
}

export function summaryText() {
  const rows = STEPS.filter((s) => flow.answers[s.key]).map((s) => `${line(`l.${s.key}`)}: ${flow.answers[s.key]}`);
  return rows.length ? `${line('waIntro')}\n${rows.join('\n')}` : '';
}

function handleToken(token, text) {
  const [kind, a, b] = token.split(':');
  if (kind === 'need') {
    flow.need = a;
    return askWorry(`${line(`need.${a}`)}\n\n`);
  }
  if (kind === 'worry') {
    flow.worry = a;
    const { min, median } = priceStats();
    return askUse(`${line(`worryReply.${a}`, { min: fmtPrice({ price: min }), median: fmtPrice({ price: median }) })}\n\n`);
  }
  if (kind === 'use') {
    flow.use = a;
    if (a === 'unknown') flow.unclear += 1;
    return askBand(a === 'unknown' ? `${line('useUnknown')}\n\n` : '');
  }
  if (kind === 'body') {
    flow.body = a === 'any' ? null : a;
    return flow.band || flow.pref ? recommend() : askBand();
  }
  if (kind === 'band') {
    flow.band = a === 'any' ? null : a;
    if (a !== 'any') return recommend();
    flow.unclear += 1;
    return askPref();
  }
  if (kind === 'pref') {
    flow.pref = a === 'any' ? null : a;
    if (a !== 'any') return recommend();
    flow.unclear += 1;
    return flow.unclear >= 3 ? tooUnclear() : recommend();
  }
  if (kind === 'cmp') return askBody('');
  if (kind === 'path') {
    if (a === 'ask') {
      flow.stage = 'path';
      return reply(line('askPath'), ch([['path:cash', line('c.cash')], ['path:credit', line('c.credit')], ['path:unsure', line('c.unsure')]]));
    }
    if (a === 'cash') return cashPath();
    if (a === 'credit') return creditIntro();
    return reply(line('pathUnsure'), ch([['path:cash', line('c.cash')], ['path:credit', line('c.credit')]]));
  }
  if (kind === 'consent') {
    if (a === 'yes') {
      flow.step = 0;
      flow.answers = {};
      const first = askStep();
      return { ...first, text: `${line('collectStart')}\n\n${first.text}` };
    }
    flow.stage = 'done';
    return reply(line('creditDeclined'), ch([['act:calc', line('c.calc')], advisorChoice()]));
  }
  if (kind === 'ans') {
    const s = STEPS[flow.step];
    if (a !== 'skip') flow.answers[s.key] = text || line(`a.${s.key}.${a}`);
    flow.step += 1;
    return flow.step < STEPS.length ? askStep() : summary();
  }
  if (kind === 'act') {
    if (a === 'testdrive') return { ...reply(line('testDrive')), actions: [{ type: 'open_panel', page: 'test_drive' }] };
    if (a === 'calc') return { ...reply(line('calc')), actions: [{ type: 'open_panel', page: 'calculadora' }] };
    if (a === 'credit') return { ...reply(line('creditForm')), actions: [{ type: 'open_panel', page: 'solicitud_credito' }] };
    if (a === 'inventory') return { ...reply(line('inventory')), actions: [{ type: 'open_panel', page: 'inventario' }] };
    return { ...reply(line('advisor')), actions: [{ type: 'whatsapp', text: summaryText() }] };
  }
  return null;
}

// Interpreta texto libre según la etapa; devuelve un token o null.
function parseStage(q, raw) {
  switch (flow.stage) {
    case 'need':
      return needFromText(q);
    case 'worry':
      if (has(q, ['aprueb', 'credito', 'credit', 'approv', 'financ', 'buro'])) return 'worry:credit';
      if (has(q, ['caro', 'precio', 'dinero', 'expensive', 'afford', 'price', 'cost'])) return 'worry:price';
      if (has(q, ['cual', 'elegir', 'conviene', 'which', 'choose', 'decid'])) return 'worry:which';
      if (has(q, ['proceso', 'complicad', 'tramite', 'process', 'complicated', 'paperwork'])) return 'worry:process';
      return has(q, ['nada', 'ninguna', 'nothing', 'none', 'solo quiero ver', 'just want']) ? 'worry:none' : null;
    case 'use':
      if (has(q, ['familia', 'ninos', 'hijos', 'family', 'kids', 'children'])) return 'use:family';
      if (has(q, ['carretera', 'viaje', 'highway', 'trip', 'travel'])) return 'use:highway';
      if (has(q, ['carga', 'obra', 'camioneta de trabajo', 'work', 'haul', 'tow', 'remolc'])) return 'use:work';
      if (has(q, ['ciudad', 'trabajo', 'diario', 'city', 'commute', 'daily'])) return 'use:city';
      return has(q, ['no se', 'not sure', 'dont know']) ? 'use:unknown' : null;
    case 'pref':
      if (has(q, ['economic', 'barato', 'cheap', 'cheapest', 'lowest price'])) return 'pref:cheap';
      if (has(q, ['nuevo', 'menos kilometraje', 'newer', 'new', 'low mileage'])) return 'pref:new';
      if (has(q, ['equilibrio', 'medio', 'balance', 'balanced', 'middle'])) return 'pref:balanced';
      return has(q, ['no se', 'not sure', 'dont know']) ? 'pref:any' : null;
    case 'body':
      if (has(q, ['suv', 'crossover', 'familiar', 'family'])) return 'body:suv';
      if (has(q, ['camioneta', 'pickup', 'truck', 'troca'])) return 'body:truck';
      if (has(q, ['hatch', 'sedan', 'compacto', 'compact', 'deportivo', 'sport', 'chico', 'small'])) return 'body:compact';
      return has(q, ['no se', 'cualquiera', 'any', 'not sure', 'dont know']) ? 'body:any' : null;
    case 'band': {
      const n = Number((q.match(/\d[\d,.]*/) || [''])[0].replace(/[,.]/g, ''));
      const v = n && n < 1000 ? n * 1000 : n;
      if (v) return v <= BAND_MAX.b1 ? 'band:b1' : v <= BAND_MAX.b2 ? 'band:b2' : v <= BAND_MAX.b3 ? 'band:b3' : 'band:b4';
      return has(q, ['no se', 'no tengo', 'any', 'not sure', 'dont know']) ? 'band:any' : null;
    }
    case 'path':
      if (has(q, ['contado', 'cash', 'de golpe', 'upfront'])) return 'path:cash';
      if (has(q, ['financ', 'credito', 'credit', 'pagos', 'payments', 'mensual', 'monthly', 'loan'])) return 'path:credit';
      return has(q, ['no se', 'not sure', 'dont know', 'aun no', 'not yet']) ? 'path:unsure' : null;
    case 'consent':
      if (has(q, ['asesor', 'advisor', 'persona', 'person'])) return 'act:advisor';
      if (has(q, ['ahora no', 'not now', 'prefiero no', 'no gracias', 'no thanks']) || q === 'no') return 'consent:no';
      return has(q, ['si', 'yes', 'claro', 'adelante', 'ok', 'dale', 'sure', 'go ahead']) ? 'consent:yes' : null;
    case 'collect':
      return has(q, ['saltar', 'skip', 'prefiero no', 'rather not']) ? 'ans:skip' : raw ? `ans:free` : null;
    default:
      return null;
  }
}

function needFromText(q) {
  if (has(q, ['primer auto', 'primer carro', 'primer vehiculo', 'first car', 'first vehicle', 'first time', 'primera vez'])) return 'need:first';
  if (has(q, ['upgrade', 'ya soy cliente', 'ya compre', 'already a customer', 'returning', 'mejorar mi auto'])) return 'need:upgrade';
  if (has(q, ['cambiar mi', 'cambiar de auto', 'dar a cambio', 'trade', 'replace my', 'change my car', 'switch'])) return 'need:change';
  if (has(q, ['mirando', 'viendo', 'looking', 'browsing', 'just looking', 'explorando'])) return 'need:looking';
  return null;
}

const field = (ctx, key, value, label) => {
  const unit = ctx.unidad;
  if (!unit) return reply(line('noUnit'), needChoices());
  if (value === null || value === undefined || value === '') return reply(t('agent.demo.empty', { field: t(`agent.demo.fields.${label}`) }));
  return reply(t(`agent.demo.${key}`, { unit: unitName(unit), value }));
};

// Unidad nombrada en el mensaje (marca y modelo, o solo el modelo).
function findUnit(q) {
  return units.find((u) => q.includes(norm(`${u.make} ${u.model}`)) || q.includes(norm(u.model).split(' ')[0])) || null;
}

// Autos del inventario publicado (no solo los del showroom) que el cliente nombra: marca y modelo, o un modelo de 4 o más letras.
function catalogMatches(q) {
  const showroom = new Set(units.map((u) => u.stock));
  return catalog.filter((u) => {
    if (showroom.has(u.stock)) return false;
    const full = norm(`${u.make} ${u.model}`);
    const token = norm(u.model).split(' ')[0];
    return q.includes(full) || (token.length >= 4 && new RegExp(`\\b${token}\\b`).test(q));
  });
}

function listMatches(list) {
  const sorted = [...list].sort((a, b) => a.price - b.price);
  const top = sorted.slice(0, 3);
  flow.focus = top[0];
  flow.stage = 'path';
  const rows = top.map((u) => line('row', { name: unitName(u), price: fmtPrice(u), km: fmtKm(u) })).join('\n');
  const more = sorted.length > 3 ? line('listMore', { n: sorted.length - 3 }) : '';
  return reply([line('listIntro', { n: sorted.length, model: `${top[0].make} ${top[0].model}` }), rows, more].filter(Boolean).join('\n\n'), ch([['act:testdrive', line('c.testDrive')], ['path:ask', line('c.howPay')], ['cmp:start', line('c.compare')]]));
}

// Unidad ya retirada del inventario publicado que el cliente menciona por nombre.
function findSold(q) {
  return soldUnits.find((u) => q.includes(norm(`${u.make} ${u.model}`)) || q.includes(norm(u.model).split(' ')[0])) || null;
}

function soldReply(u) {
  flow.stage = null;
  return reply(line('sold', { name: unitName(u) }), ch([['cmp:start', line('c.similar')], advisorChoice()]));
}

function unitCard(u) {
  flow.focus = u;
  flow.stage = 'path';
  const bits = [
    u.price != null ? line('uPrice', { price: fmtPrice(u) }) : null,
    u.odometer_km != null ? fmtKm(u) : null,
    u.drivetrain ? line('uDrive', { v: u.drivetrain }) : null,
    u.color ? u.color : null,
  ].filter(Boolean);
  const details = bits.length ? bits.join(' · ') : line('uNone');
  return reply(line('unitCard', { name: unitName(u), details }), ch([['act:testdrive', line('c.testDrive')], ['cmp:start', line('c.compare')], ['path:ask', line('c.howPay')]]));
}

export function demoReply(input, ctx) {
  const raw = input.trim();
  const q = norm(raw);

  // Datos sensibles: nunca se repiten ni se guardan; van al formulario seguro.
  if (SENSITIVE.test(raw)) {
    return reply(line('sensitive'), ch([['act:credit', line('c.creditForm')], advisorChoice()]));
  }

  // 1) Botón tocado (coincide con la etiqueta exacta)
  const hit = flow.pending.find((c) => norm(c.label) === q);
  if (hit) return handleToken(hit.token, null);

  // 2) Texto libre según la etapa del embudo
  const staged = parseStage(q, raw);
  const mentioned = findUnit(q);
  if (!mentioned) {
    const gone = findSold(q);
    if (gone) return soldReply(gone);
  }
  if (!mentioned) {
    const found = catalogMatches(q);
    if (found.length) return listMatches(found);
  }
  if (mentioned) {
    flow.focus = mentioned;
    ctx = { ...ctx, unidad: mentioned };
  }
  const interrupt = has(q, ['asesor', 'advisor', 'whatsapp', 'test drive', 'prueba de manejo']);
  if (staged && !(flow.stage === 'collect' && interrupt)) {
    if (staged === 'ans:free') return handleToken('ans:free', raw.slice(0, 80));
    return handleToken(staged, null);
  }

  // 3) Intenciones generales, en cualquier momento
  if (has(q, ['asesor', 'persona', 'humano', 'advisor', 'human', 'representative'])) return handleToken('act:advisor');
  if (has(q, ['whatsapp'])) return handleToken('act:advisor');
  if (has(q, ['test drive', 'prueba de manejo', 'probar', 'manejar', 'cita', 'appointment'])) return handleToken('act:testdrive');
  const need = needFromText(q);
  if (need) return handleToken(need);
  if (has(q, ['servicio', 'taller', 'mantenimiento', 'service', 'repair', 'maintenance'])) {
    return { ...reply(t('agent.demo.service')), actions: [{ type: 'open_panel', page: 'servicio' }] };
  }
  if (has(q, ['trade', 'dar a cambio', 'mi auto', 'my car', 'my vehicle', 'valuacion', 'appraisal'])) {
    if (!flow.need) flow.need = 'change';
    return { ...reply(t('agent.demo.tradeIn')), actions: [{ type: 'open_panel', page: 'trade_in' }] };
  }
  if (has(q, ['contado', 'cash'])) return cashPath();
  if (has(q, ['financ', 'credito', 'credit', 'loan', 'prestamo', 'a pagos', 'mensualidad', 'monthly payment'])) return creditIntro();
  if (has(q, ['pago', 'payment', 'calcul', 'enganche', 'down payment'])) return handleToken('act:calc');

  if (has(q, ['recomien', 'recommend', 'compar', 'cual me conviene', 'which one', 'que me sugieres', 'ayudame a elegir', 'help me choose'])) {
    flow.stage = 'need';
    return reply(line('needAsk'), needChoices());
  }

  // 4) Datos de una unidad concreta (solo lo que está en el inventario)
  const unit = ctx.unidad;
  if (has(q, ['precio', 'cuesta', 'costo', 'price', 'cost', 'how much'])) return field(ctx, 'price', unit?.price == null ? null : fmtPrice(unit), 'price');
  if (has(q, ['kilometr', 'millas', 'km', 'mileage', 'odometer'])) return field(ctx, 'km', unit?.odometer_km == null ? null : fmtKm(unit), 'km');
  if (has(q, ['dueno', 'owner'])) return field(ctx, 'owners', unit?.owners, 'owners');
  if (has(q, ['condici', 'estado', 'condition', 'accident', 'historial del', 'carfax'])) return field(ctx, 'condition', unit?.condition_notes, 'condition');
  if (has(q, ['horario', 'hora', 'donde', 'direccion', 'address', 'hours', 'where', 'location', 'telefono', 'phone'])) {
    return { ...reply(t('agent.demo.hours')), actions: [{ type: 'open_panel', page: 'contacto' }] };
  }
  if (mentioned) return unitCard(mentioned);
  if (has(q, ['inventario', 'disponible', 'tienen', 'autos', 'carros', 'inventory', 'available', 'cars', 'stock'])) {
    return reply(t('agent.demo.stock', { list: units.map(unitName).join(', ') }), needChoices());
  }
  if (has(q, ['hola', 'buenas', 'hello', 'hey']) || q === 'hi') {
    flow.stage = 'need';
    return reply(`${t('agent.demo.hello')}\n\n${line('needAsk')}`, needChoices());
  }
  flow.stage = 'need';
  return reply(`${t('agent.demo.fallback')}\n\n${line('needAsk')}`, needChoices());
}
