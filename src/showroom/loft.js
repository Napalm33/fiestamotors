// Modelador de carrocerías por cortes: sigue el contorno lateral real y genera una superficie lisa.
// Los costados proyectan la foto real de la unidad; ruedas, faros y detalles se arman encima.
// Frente del auto hacia +Z. Medidas en metros.
import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const blur = (arr, passes) => { let a = arr.slice(); for (let p = 0; p < passes; p++) a = a.map((v, i) => (a[Math.max(0, i - 1)] + v * 2 + a[Math.min(a.length - 1, i + 1)]) / 4); return a; };
import { frontDecal, rearDecal } from './decals.js';
const tex = (url, onLoad) => { const t = new THREE.TextureLoader().load(new URL(url, document.baseURI).href, onLoad); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

export function buildLoftCar(spec, color) {
  const { L, W, belt, clear, wheelR, wheelW, photo } = spec;
  const top0 = blur(spec.top, 4), topHood = blur(spec.top, 16);
  const at = (a, t) => { const f = Math.min(1, Math.max(0, t)) * (a.length - 1), i = Math.min(a.length - 2, Math.floor(f)); return lerp(a[i], a[i + 1], f - i); };
  // El capó se suaviza más (la silueta de la foto trae ruido); techo y trasera conservan la forma.
  const topAt = (t) => lerp(at(topHood, t), at(top0, t), smooth(0.26, 0.34, t));

  // Zonas del contorno (parabrisas, techo, luneta).
  const maxTop = Math.max(...top0), n = top0.length - 1;
  const first = (pred, from = 0) => { for (let i = Math.floor(from * n); i <= n; i++) if (pred(top0[i])) return i / n; return 1; };
  const hoodLevel = [...top0.slice(Math.floor(n * 0.2), Math.floor(n * 0.3))].sort((a, b) => a - b)[3];
  const tWF = first((v) => v > hoodLevel + 0.04, 0.25), tRoofF = first((v) => v >= maxTop - 0.06, 0.25);
  let tRoofR = tRoofF; for (let i = 0; i <= n; i++) if (top0[i] >= maxTop - 0.06) tRoofR = i / n;
  const tRearEnd = first((v) => v < belt + 0.04, tRoofR), tB = lerp(tWF, tRearEnd, 0.5);

  const wheelZ = spec.wheelT.map((t) => L / 2 - t * L), Ra = wheelR + 0.06;
  const M = 320, NP = 36, rings = [], zs = [];
  for (let j = 0; j < M; j++) {
    const t = 0.5 - 0.5 * Math.cos(Math.PI * (j / (M - 1))), z = L / 2 - t * L;
    const h = Math.max(clear + 0.25, topAt(t));
    const w = W * lerp(0.8, 1, smooth(0, 0.07, t)) * lerp(0.8, 1, smooth(0, 0.07, 1 - t));
    const k = smooth(0, 0.22, h - belt), hb = Math.min(belt, h - 0.03), wc = w * (1 - 0.17 * k);
    let lift = 0; for (const zc of wheelZ) { const dz = z - zc; if (Math.abs(dz) < Ra) lift = Math.max(lift, wheelR + Math.sqrt(Ra * Ra - dz * dz) - clear); }
    const b = clear, cr = 0.03;
    const half = [
      [0, b], [w / 2 * 0.76, b], [w / 2 * 0.93, b + 0.05 + lift * 0.5], [w / 2, b + 0.18 + lift * 0.85],
      [w / 2, hb - 0.13], [w / 2 - 0.012, hb], [lerp(w / 2 - 0.03, wc / 2 + 0.02, k), hb + 0.03 + 0.02 * k],
      [wc / 2, hb + (h - hb) * 0.4], [wc / 2 * 0.92, hb + (h - hb) * 0.86], [wc / 2 * 0.62, h - cr * 0.6], [0, h],
    ];
    for (const pt of half) { const f = 1 - 0.30 * (1 - k) * Math.pow(smooth(h - 0.17, h, pt[1]), 1.4); pt[0] *= f; }   // capó y cajuela redondeados
    const pts = new THREE.CatmullRomCurve3(half.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getPoints(NP);
    rings.push([...pts.map((p) => [p.x, p.y]), ...pts.slice(1, -1).reverse().map((p) => [-p.x, p.y])]); zs.push(z);
  }
  const R = rings[0].length;

  // Vértices y UV (proyección lateral de la foto).
  const pos = [], uv = [];
  const sx = L / (photo.x1 - photo.x0);
  for (let j = 0; j < M; j++) for (let i = 0; i < R; i++) {
    const [x, y] = rings[j][i], z = zs[j], t = 0.5 - z / L;
    pos.push(x, y, z);
    uv.push((photo.x0 + t * (photo.x1 - photo.x0)) / photo.w, 1 - (photo.yg - y / photo.sy) / photo.h);
  }
  const V = (j, i) => j * R + (i % R);
  const groups = [[], [], [], [], [], [], []]; // 0 pintura, 1 cristal, 2 oscuro, 3 faros, 4 tira roja, 5 luz trasera, 6 costado (foto)
  const classify = (cx, cy, cz, nx, ny) => {
    const t = 0.5 - cz / L, ax = Math.abs(cx);
    if (ny < -0.45) return 2;
    if (cy > belt + 0.03) {
      const wc = W * 0.83;
      if (t > tWF && t < tRoofF) return ax < wc * 0.43 ? 1 : 0;
      if (t > tRoofR && t < tRearEnd) return ax < wc * 0.41 ? 1 : 0;
      if (t > tWF + 0.01 && t < tRearEnd - 0.01 && ax > wc * 0.25 && Math.abs(t - tB) > 0.012 && cy < topAt(t) - 0.05) return 1;
    }
    if (Math.abs(nx) > 0.35 && t > 0.06 && t < 0.94 && cy > clear + 0.03) return 6; // costado con la foto
    return 0;
  };
  for (let j = 0; j < M - 1; j++) for (let i = 0; i < R; i++) {
    const a = V(j, i), b = V(j, i + 1), c = V(j + 1, i), d = V(j + 1, i + 1);
    for (const tri of [[a, c, b], [b, c, d]]) {
      const [p, q, r] = tri.map((v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]);
      const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
      const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const len = Math.hypot(nx, ny, nz) || 1;
      groups[classify((p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3, (p[2] + q[2] + r[2]) / 3, nx / len, ny / len)].push(...tri);
    }
  }
  const cap = (j, flip) => { const c = pos.length / 3; let cx = 0, cy = 0; for (let i = 0; i < R; i++) { cx += pos[V(j, i) * 3]; cy += pos[V(j, i) * 3 + 1]; } pos.push(cx / R, cy / R, zs[j]); uv.push(0, 0); for (let i = 0; i < R; i++) groups[0].push(...(flip ? [c, V(j, i + 1), V(j, i)] : [c, V(j, i), V(j, i + 1)])); };
  cap(0, false); cap(M - 1, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const index = []; let start = 0; const used = [];
  groups.forEach((g, gi) => { if (!g.length) return; geo.addGroup(start, g.length, used.length); used.push(gi); index.push(...g); start += g.length; });
  geo.setIndex(index); geo.computeVertexNormals();

  // Calcomanías de frente y trasera: triángulos que miran hacia delante/atrás, proyectados en Z.
  const decalMesh = (test, texture, W2) => {
    const P = [], U = [], idx = geo.getIndex().array, p = geo.getAttribute('position');
    for (let k = 0; k < idx.length; k += 3) {
      const v = [0, 1, 2].map((q) => [p.getX(idx[k + q]), p.getY(idx[k + q]), p.getZ(idx[k + q])]);
      const e1 = v[1].map((x, i) => x - v[0][i]), e2 = v[2].map((x, i) => x - v[0][i]);
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...n) || 1;
      const cz = (v[0][2] + v[1][2] + v[2][2]) / 3;
      if (!test(0.5 - cz / L, n[2] / l)) continue;
      v.forEach((q) => { P.push(q[0] + n[0] / l * 0.004, q[1] + n[1] / l * 0.004, q[2] + n[2] / l * 0.004); U.push(q[0] / W2.w + 0.5, q[1] / W2.h); });
    }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g2.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 0.9, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.4, metalness: 0.1 });
    return new THREE.Mesh(g2, m);
  };
  const decals = [decalMesh((t, nz) => t < 0.14 && nz > 0.3, frontDecal(W), { w: W, h: 1.0 }), decalMesh((t, nz) => t > 0.86 && nz < -0.3, rearDecal(W), { w: W, h: 1.5 })];

  const sideTex = tex(photo.url);
  const mats = {
    0: new THREE.MeshPhysicalMaterial({ color, metalness: 0.3, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.18, envMapIntensity: 0.32 }),
    1: new THREE.MeshPhysicalMaterial({ color: '#06080b', metalness: 0.2, roughness: 0.03, clearcoat: 1 }),
    2: new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.7, metalness: 0.1 }),
    3: new THREE.MeshStandardMaterial({ color: '#eaf4ff', emissive: '#cfe6ff', emissiveIntensity: 2.2 }),
    4: new THREE.MeshStandardMaterial({ color: '#2a0508', emissive: '#e01824', emissiveIntensity: 1.8 }),
    5: new THREE.MeshStandardMaterial({ color: '#400', emissive: '#d00812', emissiveIntensity: 1.5 }),
    // La foto ya trae su iluminación: se muestra casi sin iluminar y con un poco de reflejo del estudio.
    6: new THREE.MeshStandardMaterial({ map: sideTex, color: '#9a9a9a', emissive: '#ffffff', emissiveMap: sideTex, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.15 }),
  };
  const body = new THREE.Mesh(geo, used.map((g) => mats[g]));
  const car = new THREE.Group(); car.add(body, ...decals);

  // Ruedas: llanta 3D + cara con la foto real del rin (patrón, frenos y centro VW).
  const tire = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.85 });
  const wellMat = new THREE.MeshBasicMaterial({ color: '#040404', side: THREE.BackSide });
  spec.wheelT.forEach((t, wi) => {
    const zc = L / 2 - t * L, wTex = tex(spec.wheelTex[wi]);
    for (const sxn of [-1, 1]) {
      const gx = sxn * (W / 2 - 0.16);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 48), tire); tr.rotation.z = Math.PI / 2; tr.position.set(gx, wheelR, zc); car.add(tr);
      const face = new THREE.Mesh(new THREE.CircleGeometry(wheelR * 1.0, 48), new THREE.MeshBasicMaterial({ map: wTex, transparent: true }));
      face.rotation.y = sxn * Math.PI / 2; face.position.set(gx + sxn * (wheelW / 2 + 0.002), wheelR, zc); car.add(face);
      const well = new THREE.Mesh(new THREE.CylinderGeometry(Ra, Ra, 0.55, 32, 1, true), wellMat); well.rotation.z = Math.PI / 2; well.position.set(sxn * (W / 2 - 0.32), wheelR, zc); car.add(well);
    }
  });
  // Retrovisores (negros, como en la unidad).
  const blackGloss = new THREE.MeshPhysicalMaterial({ color: '#0b0b0d', roughness: 0.25, clearcoat: 1 });
  for (const sxn of [-1, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), blackGloss); m.scale.set(0.55, 0.55, 1.05); m.position.set(sxn * (W / 2 + 0.035), spec.mirror.y, spec.mirror.z); car.add(m); }
  // Alerón negro sobre la luneta.
  const tSp = first((v) => v < maxTop - 0.1, tRoofR), sp = new THREE.Mesh(new THREE.BoxGeometry(W * 0.74, 0.04, 0.2), blackGloss); sp.position.set(0, topAt(tSp) + 0.015, L / 2 - tSp * L); sp.rotation.x = 0.12; car.add(sp);

  car.userData = { kind: 'loft', length: L, width: W, glb: true };
  return car;
}
