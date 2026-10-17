// Autos 3D esquemáticos (marcador de posición) generados en código a partir de los datos de cada unidad.
// Se reemplazan por los .glb comprados por Alan. Frente del auto hacia +Z.
import * as THREE from 'three';

const PAINT = { red: '#8f1018', black: '#0b0b0d', grey: '#565c64', gray: '#565c64', white: '#d9d8d4', silver: '#a9adb2', blue: '#1d4f9c' };

// [z, y] en metros; frente = +z.
const PROFILES = {
  hatch: {
    L: 4.29, W: 1.79, wb: 2.63, r: 0.33, lift: 0,
    lower: [[-2.145, .3], [-2.145, .72], [-2.0, .98], [-1.2, 1.02], [.6, 1.0], [1.55, .98], [2.05, .82], [2.145, .62], [2.12, .34], [1.5, .26], [-1.5, .26]],
    cabin: [[-1.85, 1.0], [-1.7, 1.38], [-.3, 1.46], [.5, 1.3], [.95, 1.02]],
  },
  suv: {
    L: 4.5, W: 1.84, wb: 2.68, r: 0.36, lift: 0.08,
    lower: [[-2.25, .32], [-2.25, .8], [-2.12, 1.08], [-1.2, 1.12], [.7, 1.1], [1.65, 1.08], [2.15, .92], [2.25, .7], [2.22, .38], [1.6, .3], [-1.6, .3]],
    cabin: [[-1.95, 1.1], [-1.85, 1.58], [-.4, 1.68], [.55, 1.5], [1.05, 1.12]],
  },
  truck: {
    L: 5.89, W: 2.03, wb: 3.66, r: 0.42, lift: 0.1,
    lower: [[-2.95, .42], [-2.95, 1.12], [-.6, 1.14], [0, 1.3], [1.6, 1.3], [2.8, 1.18], [2.95, 1.0], [2.92, .52], [2.2, .38], [-2.2, .38]],
    cabin: [[-.65, 1.2], [-.55, 1.88], [.5, 1.97], [1.05, 1.6], [1.35, 1.3]],
  },
};

export const SIZES = Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, { L: v.L, W: v.W }]));

export const bodyKind = (unit) => {
  const b = (unit.body || '').toLowerCase();
  if (b.includes('pickup') || b.includes('truck')) return 'truck';
  if (b.includes('hatch')) return 'hatch';
  return 'suv';
};

const paintColor = (unit) => new THREE.Color(PAINT[(unit.color || '').toLowerCase()] || '#6a7078');

function extrude(points, width, bevel = 0.07) {
  const curve = new THREE.CatmullRomCurve3(points.map(([z, y]) => new THREE.Vector3(z, y, 0)), true, 'catmullrom', 0.12);
  const shape = new THREE.Shape(curve.getPoints(90).map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 1 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // la forma queda en el plano (z,y) y el ancho sobre x
  return g;
}

export function buildCar(unit) {
  const kind = bodyKind(unit);
  const p = PROFILES[kind];
  const car = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = p.lift;
  car.add(body);

  const paint = new THREE.MeshPhysicalMaterial({ color: paintColor(unit), metalness: 0.45, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#07090c', metalness: 0.1, roughness: 0.04, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.6, metalness: 0.2 });
  const tire = new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.85 });
  const rim = new THREE.MeshStandardMaterial({ color: '#b9bdc2', metalness: 1, roughness: 0.25 });

  const lower = new THREE.Mesh(extrude(p.lower, p.W), paint);
  const cabin = new THREE.Mesh(extrude(p.cabin, p.W * 0.86, 0.05), glass);
  // Techo y pilares en el color de la carrocería.
  const [, a] = [0, p.cabin[1]], b = p.cabin[2];
  const roof = new THREE.Mesh(new THREE.BoxGeometry(p.W * 0.8, 0.07, Math.abs(b[0] - a[0]) + 0.5), paint);
  roof.position.set(0, (a[1] + b[1]) / 2 + 0.005, (a[0] + b[0]) / 2 + 0.05);
  roof.rotation.x = Math.atan2(b[1] - a[1], b[0] - a[0]) * -1;
  const pillar = (z, y0, y1, zt) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, Math.hypot(y1 - y0, zt - z) + 0.04, 0.08), paint); m.position.set(0, (y0 + y1) / 2, (z + zt) / 2); m.rotation.x = Math.atan2(zt - z, y1 - y0); return m; };
  for (const sx of [-1, 1]) {
    const front = pillar(p.cabin[4][0], p.cabin[4][1], p.cabin[3][1], p.cabin[3][0]); front.position.x = sx * p.W * 0.43;
    const rear = pillar(p.cabin[0][0], p.cabin[0][1], p.cabin[1][1], p.cabin[1][0]); rear.position.x = sx * p.W * 0.43;
    body.add(front, rear);
  }
  body.add(lower, cabin, roof);

  // Faros, luces traseras y parrilla.
  const front = p.L / 2, hl = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#dff3ff', emissiveIntensity: 2.2 });
  const tl = new THREE.MeshStandardMaterial({ color: '#400', emissive: '#d00812', emissiveIntensity: 1.8 });
  const yHL = p.lower[7][1] + 0.05;
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.06), hl); h.position.set(s * (p.W / 2 - 0.35), yHL, front - 0.02); body.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.06), tl); t.position.set(s * (p.W / 2 - 0.3), p.lower[1][1] - 0.1, -front + 0.02); body.add(t);
  }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(p.W * 0.46, 0.2, 0.05), dark); grille.position.set(0, yHL - 0.12, front + 0.005); body.add(grille);
  const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(p.W * 0.6, 0.12, 0.05), dark); lowerGrille.position.set(0, p.lower[8][1] + 0.2, front - 0.03); body.add(lowerGrille);

  // Ruedas.
  const wheel = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.25, 32), tire);
  const r = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.66, p.r * 0.66, 0.26, 24), rim);
  wheel.add(t, r); wheel.rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = wheel.clone(); w.position.set(sx * (p.W / 2 - 0.12), p.r, sz * p.wb / 2 + (sz > 0 ? 0.1 : -0.05)); car.add(w);
  }

  car.userData = { kind, length: p.L, width: p.W };
  car.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
  return car;
}
