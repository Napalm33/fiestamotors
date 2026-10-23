// Calcomanías dibujadas (frente y trasera) a escala real: faros, parrilla, luces, escapes, insignias.
// Coordenadas en metros: x lateral (centro = 0), y altura. Se proyectan en el eje Z sobre la carrocería.
import * as THREE from 'three';

const canvasTexture = (draw, cw, ch) => {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  draw(c.getContext('2d'), cw, ch);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

function helpers(g, W, Yh, cw, ch) {
  const X = (x) => ((x + W / 2) / W) * cw, Y = (y) => (1 - y / Yh) * ch, S = cw / W, SY = ch / Yh;
  const poly = (pts, fill, stroke, lw = 2) => {
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  };
  const circle = (x, y, r, fill, stroke, lw = 2) => { g.beginPath(); g.ellipse(X(x), Y(y), r * S, r * SY, 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const line = (x1, y1, x2, y2, color, lw, glow) => { g.beginPath(); g.moveTo(X(x1), Y(y1)); g.lineTo(X(x2), Y(y2)); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; if (glow) { g.shadowColor = glow; g.shadowBlur = 12; } g.stroke(); g.shadowBlur = 0; };
  return { X, Y, S, SY, poly, circle, line };
}

function vwBadge(g, h, x, y, r) {
  h.circle(x, y, r, '#0e1a2e', '#d5d9de', 3);
  g.fillStyle = '#e8ecf0'; g.font = `700 ${Math.round(r * h.S * 1.05)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('VW', h.X(x), h.Y(y) + 1);
}

/* Frente del Golf GTI (según las fotos de la unidad): faros LED con firma, línea roja, parrilla de panal y antiniebla. */
export function frontDecal(W) {
  const cw = 1536, ch = 768, Yh = 1.0;
  return canvasTexture((g) => {
    const h = helpers(g, W, Yh, cw, ch);
    // Rejilla superior negra y línea roja del GTI (de faro a faro).
    h.poly([[-0.34, 0.675], [0.34, 0.675], [0.36, 0.585], [-0.36, 0.585]], '#08090b');
    h.line(-0.80, 0.672, 0.80, 0.672, '#e11a27', 9, '#ff3a46');
    // Faros: lente oscura, firma LED y proyectores.
    for (const s of [-1, 1]) {
      const P = (pts) => pts.map(([x, y]) => [s * x, y]);
      h.poly(P([[0.30, 0.745], [0.80, 0.728], [0.86, 0.676], [0.82, 0.615], [0.62, 0.592], [0.30, 0.612]]), '#0a1018', '#1c2630', 3);
      h.line(s * 0.33, 0.724, s * 0.80, 0.710, '#eaf6ff', 6, '#9fd4ff');       // ceja LED superior
      h.line(s * 0.38, 0.625, s * 0.74, 0.628, '#d8ecff', 4, '#9fd4ff');       // ceja inferior
      h.circle(s * 0.50, 0.668, 0.034, '#101a24', '#dff0ff', 3); h.circle(s * 0.50, 0.668, 0.016, '#f4fbff');
      h.circle(s * 0.66, 0.668, 0.028, '#101a24', '#bcd9ee', 2); h.circle(s * 0.66, 0.668, 0.012, '#dff0ff');
      // Intakes laterales negros y antiniebla en el panal.
      h.poly(P([[0.60, 0.50], [0.82, 0.50], [0.78, 0.22], [0.58, 0.20]]), '#0b0c0e');
      h.circle(s * 0.50, 0.34, 0.046, '#cfd6dc', '#2a2e33', 3); h.circle(s * 0.50, 0.34, 0.026, '#f2f8fc'); h.circle(s * 0.50, 0.34, 0.012, '#8fb6d0');
    }
    // Parrilla inferior de panal.
    g.save(); g.beginPath();
    [[-0.60, 0.50], [0.60, 0.50], [0.54, 0.20], [-0.54, 0.20]].forEach(([x, y], i) => (i ? g.lineTo(h.X(x), h.Y(y)) : g.moveTo(h.X(x), h.Y(y)))); g.closePath(); g.clip();
    g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, cw, ch);
    const r = 0.024, hw = Math.sqrt(3) * r, hh = 1.5 * r; g.strokeStyle = '#3d4249'; g.lineWidth = 2;
    for (let row = 0, y = 0.18; y < 0.52; row++, y += hh) for (let x = -0.7 + (row % 2 ? hw / 2 : 0); x < 0.7; x += hw) {
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; g.lineTo(h.X(x + r * 0.9 * Math.cos(a)), h.Y(y + r * 0.9 * Math.sin(a))); } g.closePath(); g.stroke();
    }
    g.restore();
    for (const s of [-1, 1]) { h.circle(s * 0.50, 0.34, 0.046, '#cfd6dc', '#2a2e33', 3); h.circle(s * 0.50, 0.34, 0.026, '#f2f8fc'); h.circle(s * 0.50, 0.34, 0.012, '#8fb6d0'); }
    // Splitter negro y logo VW.
    h.poly([[-0.72, 0.19], [0.72, 0.19], [0.70, 0.14], [-0.70, 0.14]], '#08090a');
    vwBadge(g, h, 0, 0.646, 0.058);
    g.fillStyle = '#d01a26'; g.font = '700 22px Arial'; g.textAlign = 'center'; g.fillText('GTI', h.X(-0.66), h.Y(0.68));
  }, cw, ch);
}

/* Trasera: luces LED, escapes cromados, difusor negro, insignias. */
export function rearDecal(W) {
  const cw = 1536, ch = 1024, Yh = 1.5;
  return canvasTexture((g) => {
    const h = helpers(g, W, Yh, cw, ch);
    for (const s of [-1, 1]) {
      const P = (pts) => pts.map(([x, y]) => [s * x, y]);
      h.poly(P([[0.46, 1.02], [0.88, 0.99], [0.90, 0.88], [0.78, 0.78], [0.46, 0.80]]), '#4a0a10', '#1a0508', 3);
      for (const [y, w] of [[0.97, 6], [0.915, 5], [0.86, 4]]) h.line(s * 0.52, y, s * 0.84, y - 0.02, '#ff2a38', w, '#ff5560');
      // Escapes cromados y reflectores.
      h.circle(s * 0.58, 0.27, 0.06, '#c8ccd2', '#4a4e54', 3); h.circle(s * 0.58, 0.27, 0.042, '#0a0a0b');
      h.poly(P([[0.70, 0.52], [0.86, 0.52], [0.84, 0.46], [0.70, 0.46]]), '#7a0c14');
    }
    h.poly([[-0.68, 0.38], [0.68, 0.38], [0.62, 0.14], [-0.62, 0.14]], '#08090a');   // difusor
    h.line(-0.60, 0.34, 0.60, 0.34, '#c4121e', 4, '#ff3a46');
    vwBadge(g, h, 0, 0.93, 0.056);
    g.fillStyle = '#d01a26'; g.font = '700 30px Arial'; g.textAlign = 'center'; g.fillText('GTI', h.X(0.52), h.Y(0.80));
    h.poly([[-0.17, 0.66], [0.17, 0.66], [0.17, 0.52], [-0.17, 0.52]], '#15181c', '#2a2f36', 2);  // placa en blanco
  }, cw, ch);
}
