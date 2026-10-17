import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { buildCar, bodyKind, SIZES } from './cars.js';

const SP = 3.4; // separación entre bahías (m)
const FOV = 32;
const VIEWS = { three: [0.62, 1.36], front: [0, 1.44], side: [Math.PI / 2, 1.44], rear: [Math.PI, 1.44], top: [0, 0.14] };

const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const hexPath = (g, cx, cy, r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } g.closePath(); };
const hexGrid = (g, x0, y0, x1, y1, r) => {
  const w = Math.sqrt(3) * r, h = 1.5 * r;
  for (let row = 0, y = y0; y < y1 + r; row++, y += h) for (let x = x0 + (row % 2 ? w / 2 : 0); x < x1 + w; x += w) { hexPath(g, x, y, r * 0.96); g.stroke(); }
};

export class Showroom {
  constructor({ canvas, veil, units, hooks, reduceMotion, force }) {
    Object.assign(this, { canvas, veil, units, hooks, reduce: reduceMotion, force });
    this.n = units.length; this.focus = 0; this.mode = 'garage'; this.running = false;
    this.fpsLow = 0; this.frames = 0; this.t0 = performance.now(); this.warm = 0; this.lastInteract = 0;
    this.cam = { x: 0, d: 16, y: 1.5 };

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d0b0a');
    scene.fog = new THREE.Fog('#0d0b0a', 22, 46);
    scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);

    this.buildGarage(); this.buildViewer();
    this.viewer.visible = false;

    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enablePan: false, enableDamping: true, dampingFactor: 0.06, rotateSpeed: 0.7, minPolarAngle: 0.08, maxPolarAngle: 1.52, enabled: false, autoRotateSpeed: 1.1 });
    this.controls.addEventListener('start', () => { this.lastInteract = performance.now(); this.controls.autoRotate = false; });
    this.controls.addEventListener('end', () => { this.lastInteract = performance.now(); });

    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
    this.applyGarageCamera(true);
    this.loadModels();
  }

  /* ---------- Modelos GLB (si existen; si no, se usa el auto esquemático) ---------- */
  loadModels() {
    const draco = new DRACOLoader().setDecoderPath(new URL('./draco/', document.baseURI).href);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    this.models = {};
    this.units.forEach((u, i) => {
      if (!u.model3d) return;
      loader.loadAsync(new URL(u.model3d, document.baseURI).href).then((gltf) => {
        this.models[i] = this.fitModel(gltf.scene, u);
        // Reemplaza el auto esquemático del garaje por el modelo real.
        const old = this.cars[i]; if (!old) return;
        const car = this.cloneModel(i); car.position.copy(old.position); car.userData.index = i;
        this.garage.remove(old); this.garage.add(car); this.cars[i] = car;
        if (this.mode === 'viewer' && this.focus === i) { this.loadViewerCar(i); }
        this.hooks.onModelLoaded?.(i);
      }).catch((e) => console.warn('Modelo 3D no disponible, se usa el esquemático:', u.model3d, e?.message || e));
    });
  }
  fitModel(root, u) {
    // Normaliza: largo real del auto, centrado, apoyado en el piso, de frente hacia +Z.
    const L = SIZES[bodyKind(u)].L, car = new THREE.Group(), pivot = new THREE.Group();
    pivot.add(root); car.add(pivot);
    pivot.rotation.y = THREE.MathUtils.degToRad(u.model3d_rot_y || 0);
    const box = new THREE.Box3().setFromObject(pivot), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const k = L / Math.max(size.x, size.z);
    pivot.scale.setScalar(k); pivot.position.set(-c.x * k, -box.min.y * k, -c.z * k);
    root.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material; if (!m) return;
      m.envMapIntensity = 1.1;
      // Los modelos generados con IA traen relieve ruidoso: se suaviza la pintura.
      if (u.model3d_smooth !== false) { m.normalMap = null; m.roughness = Math.min(1, Math.max(m.roughness ?? 0.5, 0.38)); }
      m.needsUpdate = true;
    });
    car.userData = { kind: bodyKind(u), length: size.z * k, width: size.x * k, glb: true };
    return car;
  }
  cloneModel(i) {
    const base = this.models[i], car = base.clone(true);
    car.userData = { ...base.userData };
    car.add(this.contactShadow(car.userData.length, car.userData.width));
    return car;
  }

  /* ---------- Garaje ---------- */
  buildGarage() {
    const g = this.garage = new THREE.Group(); this.scene.add(g);
    const n = this.n;

    // Piso con hexágonos y bahías numeradas.
    const PX = 64, FW = 26, FD = 16;
    const floorTex = canvasTex(FW * PX, FD * PX, (c, w, h) => {
      c.fillStyle = '#0d0b0a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 2; hexGrid(c, 0, 0, w, h, 44);
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 4;
      const X = (x) => (x + FW / 2) * PX, Z = (z) => (z + 7) * PX;
      for (let k = 0; k <= n; k++) { const x = X((k - n / 2) * SP); c.beginPath(); c.moveTo(x, Z(-2.6)); c.lineTo(x, Z(2.7)); c.stroke(); }
      c.beginPath(); c.moveTo(X(-n / 2 * SP), Z(2.7)); c.lineTo(X(n / 2 * SP), Z(2.7)); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '700 40px Arial'; c.textAlign = 'center';
      for (let i = 0; i < n; i++) c.fillText(String(i + 1).padStart(2, '0'), X((i - (n - 1) / 2) * SP), Z(3.4));
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7, metalness: 0.1, color: '#9a9490' }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1); g.add(floor);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshStandardMaterial({ color: '#040404', roughness: 0.9, metalness: 0 }));
    apron.rotation.x = -Math.PI / 2; apron.position.set(0, -0.005, 30); g.add(apron);

    // Pared de fondo con rótulo y luces hexagonales.
    const wallTex = canvasTex(2400, 720, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#201c1a'); gr.addColorStop(1, '#0d0b0a');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.save(); c.beginPath(); c.rect(0, 0, w, h * 0.34); c.clip();
      c.strokeStyle = 'rgba(220,230,245,.85)'; c.lineWidth = 5; c.shadowColor = 'rgba(190,210,255,.9)'; c.shadowBlur = 18; hexGrid(c, 0, 0, w, h * 0.34, 74); c.restore();
      c.textAlign = 'center'; c.fillStyle = 'rgba(235,226,216,.9)'; c.font = '900 64px "Arial Black", Arial';
      c.fillText('F I E S T A   M O T O R S', w / 2, h * 0.64);
      c.fillStyle = '#c8141e'; c.fillRect(w / 2 - 110, h * 0.7, 220, 5);
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshBasicMaterial({ map: wallTex, fog: false }));
    wall.position.set(0, 6, -7); g.add(wall);

    // Autos.
    this.cars = this.units.map((u, i) => {
      const car = buildCar(u);
      car.position.set((i - (n - 1) / 2) * SP, 0, 0);
      car.userData.index = i; car.userData.baseZ = 0;
      car.add(this.contactShadow(car.userData.length, car.userData.width));
      g.add(car); return car;
    });

    // Luces.
    g.add(new THREE.HemisphereLight('#9fb0c8', '#0d0b0a', 0.35));
    const key = new THREE.DirectionalLight('#ffffff', 1.1); key.position.set(-4, 9, 8); g.add(key);
    this.spot = new THREE.SpotLight('#fff3e6', 420, 26, 0.5, 0.85, 1.2);
    this.spot.position.set(0, 8.5, 5); g.add(this.spot, this.spot.target);
  }

  contactShadow(L, W) {
    const t = canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.5, L * 1.25), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.015; return m;
  }

  /* ---------- Visor (plataforma de estudio) ---------- */
  buildViewer() {
    const v = this.viewer = new THREE.Group(); this.scene.add(v);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.14, 96), new THREE.MeshStandardMaterial({ color: '#141110', roughness: 0.35, metalness: 0.8 }));
    plat.position.y = -0.07; v.add(plat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.62, 0.02, 8, 160), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#f4e6d8', emissiveIntensity: 1.6 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; v.add(ring);
    v.add(new THREE.HemisphereLight('#9fb0c8', '#0d0b0a', 0.3));
    const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(-5, 7, 6); v.add(key);
    const rim = new THREE.DirectionalLight('#ffd9c2', 1.0); rim.position.set(5, 3, -6); v.add(rim);
    this.viewerSlot = new THREE.Group(); v.add(this.viewerSlot);
  }

  /* ---------- Cámara ---------- */
  resize() {
    const p = this.canvas.parentElement, w = p.clientWidth || 1, h = p.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
    if (this.mode === 'garage') this.applyGarageCamera(true); else this.fitViewer(true);
  }
  garageTarget(i = this.focus) {
    const a = this.w / this.h, tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const x = (i - (this.n - 1) / 2) * SP;
    if (a >= 1.15) { const need = (this.n - 1) * SP + 6; return { x: x * 0.18, d: need / 2 / (tan * a), y: 1.6 }; }
    return { x, d: 6.4 / 2 / (tan * a), y: 1.5 };
  }
  applyGarageCamera(snap) {
    const t = this.garageTarget();
    if (snap || this.reduce) Object.assign(this.cam, t); else gsap.to(this.cam, { ...t, duration: 0.8, ease: 'power2.inOut' });
  }
  placeGarageCamera() {
    const { x, d, y } = this.cam;
    this.camera.position.set(x, y, d); this.camera.lookAt(x, 0.95, 0);
  }
  fitViewer() {
    const car = this.viewerCar; if (!car) return;
    const a = this.w / this.h, tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const panel = a > 1.1 ? Math.min(424, this.w * 0.34) + 16 : 0, sheet = a > 1.1 ? 0 : this.h * 0.42;
    const usable = (this.w - panel) / this.h;
    const d = Math.max(6.5, (car.userData.length * 0.66) / (tan * usable));
    this.d0 = d;
    this.controls.minDistance = d / 1.6; this.controls.maxDistance = d / 0.7;
    this.controls.target.set(0, 0.75, 0);
    if (panel || sheet) this.camera.setViewOffset(this.w, this.h, panel / 2, sheet / 2, this.w, this.h); else this.camera.clearViewOffset();
    if (!this.viewerPositioned) { this.setAngles(...VIEWS.three, d); this.viewerPositioned = true; }
  }
  setAngles(theta, phi, d = this.camera.position.distanceTo(this.controls.target)) {
    const t = this.controls.target;
    this.camera.position.set(t.x + d * Math.sin(phi) * Math.sin(theta), t.y + d * Math.cos(phi), t.z + d * Math.sin(phi) * Math.cos(theta));
    this.camera.lookAt(t);
  }
  setView(name) {
    const to = VIEWS[name]; if (!to || this.mode !== 'viewer') return;
    const off = this.camera.position.clone().sub(this.controls.target), d = off.length();
    const from = { theta: Math.atan2(off.x, off.z), phi: Math.acos(off.y / d) };
    let dt = to[0] - from.theta; dt = Math.atan2(Math.sin(dt), Math.cos(dt));
    this.controls.autoRotate = false; this.lastInteract = performance.now();
    const o = { k: 0 };
    if (this.reduce) return this.setAngles(to[0], to[1], d);
    gsap.to(o, { k: 1, duration: 0.8, ease: 'power2.inOut', onUpdate: () => this.setAngles(from.theta + dt * o.k, from.phi + (to[1] - from.phi) * o.k, d) });
  }

  /* ---------- Estados ---------- */
  setFocus(i) {
    this.focus = (i + this.n) % this.n;
    this.applyGarageCamera();
    this.hooks.onFocus?.(this.focus);
  }
  next() { this.mode === 'garage' ? this.setFocus(this.focus + 1) : this.switchUnit(this.focus + 1); }
  prev() { this.mode === 'garage' ? this.setFocus(this.focus - 1) : this.switchUnit(this.focus - 1); }

  fade(mid) {
    if (this.reduce) { mid(); return Promise.resolve(); }
    return new Promise((res) => {
      gsap.timeline({ onComplete: res })
        .to(this.veil, { opacity: 1, duration: 0.4, ease: 'power1.in' })
        .add(mid)
        .to(this.veil, { opacity: 0, duration: 0.6, ease: 'power1.out' });
    });
  }
  loadViewerCar(i) {
    this.viewerSlot.clear();
    if (this.models?.[i]) this.viewerCar = this.cloneModel(i);
    else { this.viewerCar = buildCar(this.units[i]); this.viewerCar.add(this.contactShadow(this.viewerCar.userData.length, this.viewerCar.userData.width)); }
    this.viewerSlot.add(this.viewerCar);
  }
  open(i = this.focus) {
    if (this.mode !== 'garage') return;
    this.focus = i;
    return this.fade(() => {
      this.mode = 'viewer'; this.garage.visible = false; this.viewer.visible = true;
      this.scene.fog.near = 30;
      this.loadViewerCar(i); this.viewerPositioned = false; this.fitViewer();
      this.controls.enabled = true; this.lastInteract = performance.now();
      this.hooks.onMode?.('viewer', i);
    });
  }
  close() {
    if (this.mode !== 'viewer') return;
    return this.fade(() => {
      this.mode = 'garage'; this.viewer.visible = false; this.garage.visible = true;
      this.controls.enabled = false; this.controls.autoRotate = false; this.camera.clearViewOffset();
      this.applyGarageCamera(true);
      this.hooks.onMode?.('garage', this.focus);
    });
  }
  switchUnit(i) {
    this.focus = (i + this.n) % this.n;
    return this.fade(() => {
      this.loadViewerCar(this.focus); this.viewerPositioned = false; this.fitViewer();
      this.hooks.onFocus?.(this.focus); this.hooks.onMode?.('viewer', this.focus);
    });
  }
  intro() {
    if (this.introDone || this.reduce) return; this.introDone = true;
    const t = this.garageTarget(); const from = { x: t.x, d: t.d * 1.35, y: t.y + 2.2 };
    Object.assign(this.cam, from); gsap.to(this.cam, { ...t, duration: 1.6, ease: 'power3.out' });
  }

  /* ---------- Interacción en el garaje ---------- */
  bindPointer() {
    const c = this.canvas; let down = null;
    const pick = (e) => {
      const r = c.getBoundingClientRect();
      this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.ptr, this.camera);
      const hit = this.ray.intersectObjects(this.cars, true)[0];
      let o = hit?.object; while (o && o.userData.index === undefined) o = o.parent;
      return o ? o.userData.index : -1;
    };
    c.addEventListener('pointerdown', (e) => { if (this.mode === 'garage') down = { x: e.clientX, y: e.clientY }; });
    c.addEventListener('pointerup', (e) => {
      if (this.mode !== 'garage' || !down) return;
      const dx = e.clientX - down.x, moved = Math.hypot(dx, e.clientY - down.y); down = null;
      if (moved > 50 && Math.abs(dx) > 50) return dx < 0 ? this.next() : this.prev();
      if (moved < 10) { const i = pick(e); if (i >= 0) (i === this.focus ? this.open(i) : this.setFocus(i)); }
    });
    c.addEventListener('pointermove', (e) => { if (this.mode === 'garage' && e.pointerType === 'mouse') c.style.cursor = pick(e) >= 0 ? 'pointer' : 'default'; });
  }

  /* ---------- Bucle ---------- */
  start() { if (this.running) return; this.running = true; this.t0 = performance.now(); this.frames = 0; this.warm = 0; this.loop(); }
  stop() { this.running = false; }
  loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const now = performance.now();

    if (this.mode === 'garage') {
      this.placeGarageCamera();
      const f = this.cars[this.focus]; this.spot.target.position.set(f.position.x, 0.8, 0);
      this.spot.position.x += (f.position.x - this.spot.position.x) * 0.1;
    } else {
      this.controls.autoRotate = !this.reduce && now - this.lastInteract > 4000;
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);

    // Plan B: menos de 30 fps sostenidos.
    this.frames++;
    if (now - this.t0 >= 1000) {
      const fps = (this.frames * 1000) / (now - this.t0); this.frames = 0; this.t0 = now; this.warm++;
      if (!this.force && this.warm > 2) { this.fpsLow = fps < 30 ? this.fpsLow + 1 : 0; if (this.fpsLow >= 3) { this.stop(); this.hooks.onFallback?.(); } }
    }
  };
}
