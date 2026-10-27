// Astrolab — Welcome scene (three.js isometric campus film shown before login).
// Loaded with a dynamic import from pages/welcome.jsx, so three.js never enters the main bundle.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export async function createWelcomeScene({ canvas, pane, ui, lowPower = false }) {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COL = {
    bg: 0xEAF3F5, ground: 0xE2EDF0, plaza: 0xF1F6F7, floor: 0xF7FBFB, wall: 0xFBFDFD,
    cap: 0x088395, deep: 0x09637E, soft: 0x7AB2B2, ink: 0x0E2A33,
    wood: 0xE8DAC4, woodDark: 0xC9B59A, navy: 0x26364F, white: 0xF5F7F8,
    glass: 0x3E6E7B, metal: 0xB8C6CA, dark: 0x1C2A30, road: 0x55666C,
    skin: [0xC99A76, 0xB4825D, 0xDDB08B], hair: 0x2A2420,
  };
  const STEPS = 7;

  // Canvas textures carry text, so wait for the webfonts before drawing any of them.
  try { await Promise.race([
    Promise.all(['800 48px "Plus Jakarta Sans"', '700 48px "Plus Jakarta Sans"', '500 24px "DM Mono"', '400 24px "DM Mono"'].map(f => document.fonts.load(f))),
    new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* system fonts as fallback */ }

  /* ---------------- renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  scene.fog = new THREE.Fog(COL.bg, 170, 290);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 600);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe2e6, 1.55));
  const sun = new THREE.DirectionalLight(0xfff8ee, 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
  scene.add(sun, sun.target);

  /* ---------------- helpers ---------------- */
  const matCache = new Map();
  function mat(color, o = {}) {
    const key = color + '|' + JSON.stringify(o);
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: o.r ?? 0.85, metalness: o.m ?? 0, flatShading: !!o.flat,
      transparent: o.op != null, opacity: o.op ?? 1, side: o.ds ? THREE.DoubleSide : THREE.FrontSide,
      emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    }));
    return matCache.get(key);
  }
  const geoCache = new Map();
  function rbox(w, h, d, r = 0.04) {
    r = Math.max(0, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
    const k = [w, h, d, r].map(v => v.toFixed(3)).join(',');
    if (!geoCache.has(k)) geoCache.set(k, r > 0.01 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d));
    return geoCache.get(k);
  }
  function put(mesh, parent, cast = true, recv = true) { mesh.castShadow = cast; mesh.receiveShadow = recv; (parent || scene).add(mesh); return mesh; }
  function box(w, h, d, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(rbox(w, h, d, o.rad ?? 0.04), o.material || mat(color, o));
    m.position.set(x, y + h / 2, z); if (o.ry) m.rotation.y = o.ry;
    return put(m, o.parent, o.cast !== false, o.recv !== false);
  }
  function cyl(rt, rb, h, color, x, y, z, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 20), o.material || mat(color, o));
    m.position.set(x, y + h / 2, z);
    return put(m, o.parent, o.cast !== false, o.recv !== false);
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  function screen(w, h, tex, x, y, z, ry = 0, o = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !!o.transparent, toneMapped: false, fog: o.fog !== false }));
    m.position.set(x, y, z); m.rotation.y = ry; if (o.rx) m.rotation.x = o.rx;
    (o.parent || scene).add(m); return m;
  }
  const FD = '"Plus Jakarta Sans", system-ui, sans-serif', FM = '"DM Mono", ui-monospace, monospace';
  const HEX = { ink: '#0E2A33', ink2: '#43606A', ink3: '#7D959D', teal9: '#09637E', teal7: '#088395', teal3: '#7AB2B2', teal0: '#EBF4F6', line: '#D3E3E7', warn: '#B45309' };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function diamond(g, cx, cy, r, fill) { g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.fillStyle = fill; g.fill(); }
  // Same geometry as LogoBold in components/visual.jsx (viewBox 32, origin at 16,17).
  function drawLogo(g, cx, cy, s) {
    const k = s / 32, poly = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(cx + x * k, cy + y * k) : g.moveTo(cx + x * k, cy + y * k)); g.closePath(); g.fillStyle = fill; g.fill(); };
    poly([[0, -11], [5.5, -3.5], [0, 1], [-5.5, -3.5]], HEX.teal9);
    poly([[-5.5, -3.5], [-2, 3.5], [-8, 9], [-11.5, 2]], HEX.teal7);
    poly([[5.5, -3.5], [11.5, 2], [8, 9], [2, 3.5]], HEX.teal7);
    g.fillStyle = HEX.teal3; rr(g, cx - 3.5 * k, cy + 1 * k, 7 * k, 2.2 * k, 0.5 * k); g.fill();
  }
  const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- people ---------------- */
  const people = [];
  function person(o = {}) {
    const g = new THREE.Group();
    const hip = 0.8, shirt = o.shirt ?? COL.white, pants = o.pants ?? COL.navy, skin = o.skin ?? COL.skin[0];
    const mkLeg = x => {
      const p = new THREE.Group(); p.position.set(x, hip, 0);
      const m = new THREE.Mesh(rbox(0.22, 0.78, 0.24, 0.08), mat(pants)); m.position.y = -0.39; put(m, p);
      const s = new THREE.Mesh(rbox(0.24, 0.12, 0.34, 0.05), mat(COL.dark)); s.position.set(0, -0.76, 0.05); put(s, p);
      g.add(p); return p;
    };
    const legL = mkLeg(-0.13), legR = mkLeg(0.13);
    const body = new THREE.Group(); g.add(body);
    if (o.skirt) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.4, 0.74, 18), mat(pants)); sk.position.y = hip - 0.3; put(sk, body); }
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 6, 14), mat(shirt));
    torso.position.y = hip + 0.42; torso.scale.set(1, 1, 0.74); put(torso, body);
    const mkArm = x => {
      const p = new THREE.Group(); p.position.set(x, hip + 0.74, 0);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.5, 4, 8), mat(o.sleeve ?? shirt)); m.position.y = -0.32; put(m, p);
      const hnd = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mat(skin)); hnd.position.y = -0.64; put(hnd, p);
      body.add(p); return p;
    };
    const armL = mkArm(-0.39), armR = mkArm(0.39);
    const headY = hip + 1.1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), mat(skin)); head.position.y = headY; put(head, body);
    if (o.hijab) {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.29, 22, 14, Math.PI / 2 + 0.72, Math.PI * 2 - 1.44, 0, Math.PI * 0.74), mat(o.hijab, { ds: true }));
      hood.position.y = headY + 0.01; put(hood, body);
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.43, 0.44, 22), mat(o.hijab)); drape.position.y = headY - 0.36; put(drape, body);
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.266, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(o.hair ?? COL.hair));
      hair.position.set(0, headY + 0.015, -0.025); hair.rotation.x = -0.42; put(hair, body);
    }
    if (o.bag) { const b = new THREE.Mesh(rbox(0.46, 0.54, 0.22, 0.08), mat(o.bag)); b.position.set(0, hip + 0.46, -0.3); put(b, body);
      const flap = new THREE.Mesh(rbox(0.4, 0.2, 0.06, 0.03), mat(COL.deep)); flap.position.set(0, hip + 0.62, -0.42); put(flap, body); }
    const P = { g, legL, legR, armL, armR, body, hip };
    scene.add(g); people.push(P); return P;
  }
  function walkPose(P, phase, amp) {
    const s = Math.sin(phase);
    P.legL.rotation.x = s * 0.55 * amp; P.legR.rotation.x = -s * 0.55 * amp;
    P.armL.rotation.x = -s * 0.45 * amp; P.armR.rotation.x = s * 0.45 * amp;
    P.body.position.y = Math.abs(Math.cos(phase)) * 0.05 * amp;
  }
  function sitAt(P, x, z, ry, seatY = 0.48) {
    P.g.position.set(x, seatY - P.hip, z); P.g.rotation.y = ry;
    P.legL.rotation.x = P.legR.rotation.x = -Math.PI / 2;
    P.armL.rotation.x = P.armR.rotation.x = -0.95;
  }
  function standAt(P, x, z, ry, y = 0) { P.g.position.set(x, y, z); P.g.rotation.y = ry; }
  const kid = (i, o = {}) => person({ hijab: i % 2 ? 0xFFFFFF : null, skirt: i % 2 === 1, skin: COL.skin[i % 3], ...o });

  /* ---------------- ground ---------------- */
  function gridTex(size, bg, line, w = 2) {
    const t = canvasTex(size, size, (g) => { g.fillStyle = bg; g.fillRect(0, 0, size, size); g.fillStyle = line; g.fillRect(0, 0, size, w); g.fillRect(0, 0, w, size); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  {
    const t = gridTex(128, '#E2EDF0', '#D7E6EA', 2); t.repeat.set(150, 150);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
    g.rotation.x = -Math.PI / 2; g.position.set(30, -0.01, 14); g.receiveShadow = true; scene.add(g);
  }
  const floorTex = gridTex(128, '#F7FBFB', '#E7F0F2', 2); floorTex.repeat.set(7, 7);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 });

  /* ---------------- school building (hero) ---------------- */
  function windowBand(x0, x1, y, z, face) { // face: 'z' (normal +z at z) or 'x' (normal +x at x=z param)
    const len = Math.abs(x1 - x0), mid = (x0 + x1) / 2;
    if (face === 'z') { box(len, 0.95, 0.08, COL.glass, mid, y, z, { r: 0.35, rad: 0.02 });
      for (let x = Math.min(x0, x1) + 0.9; x < Math.max(x0, x1) - 0.2; x += 0.9) box(0.08, 0.95, 0.12, COL.white, x, y, z + 0.01, { rad: 0, cast: false }); }
    else { box(0.08, 0.95, len, COL.glass, z, y, mid, { r: 0.35, rad: 0.02 });
      for (let zz = Math.min(x0, x1) + 0.9; zz < Math.max(x0, x1) - 0.2; zz += 0.9) box(0.12, 0.95, 0.08, COL.white, z + 0.01, y, zz, { rad: 0, cast: false }); }
  }
  {
    // tower
    box(6, 12.2, 8, COL.wall, -2, 0, 0, { rad: 0.12 });
    for (let y = 1.4; y < 9.9; y += 1.75) windowBand(-4.6, 0.6, y, 4.03, 'z');
    // parapet + rooftop units
    box(6.1, 0.35, 8.1, COL.cap, -2, 12.2, 0, { rad: 0.05 });
    box(1.4, 0.8, 1.2, COL.metal, -3.4, 12.55, -1.8, { rad: 0.08 }); box(1.0, 0.6, 1.0, COL.metal, -1.6, 12.55, -2.4, { rad: 0.08 });
    // teal fin with logo
    box(1.1, 13.6, 6.2, COL.deep, 1.5, 0, -0.6, { rad: 0.1 });
    const logo = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; rr(g, 18, 18, 220, 220, 40); g.fill(); drawLogo(g, 128, 124, 210); });
    screen(2.0, 2.0, logo, 2.06, 10.8, -0.6, Math.PI / 2);
    // wordmark on tower +z face
    const word = canvasTex(1024, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = HEX.teal9; g.font = `800 170px ${FD}`; g.textBaseline = 'middle'; g.fillText('astrolab', 24, 128); });
    screen(4.8, 1.2, word, -2.1, 10.9, 4.06, 0, { transparent: true });
    // annex (lobby)
    box(6.2, 3.8, 5.4, COL.wall, 4.6, 0, 1.4, { rad: 0.1 });
    box(6.3, 0.25, 5.5, COL.cap, 4.6, 3.8, 1.4, { rad: 0.04 });
    windowBand(2.2, 7.3, 2.1, 4.13, 'z');
    windowBand(-1.0, 0.6, 2.1, 7.73, 'x');
    // planters on annex roof
    for (let i = 0; i < 3; i++) { box(1.3, 0.35, 1.0, COL.white, 3.2 + i * 1.6, 4.05, 2.6, { rad: 0.06 });
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat([COL.soft, 0x6AA6A8, 0x8FC0BF][i], { flat: true })); b.position.set(3.2 + i * 1.6, 4.65, 2.6); put(b); }
    // entrance on +x face of annex
    box(0.1, 2.3, 2.0, COL.glass, 7.72, 0, 2.6, { r: 0.3, rad: 0.02 });
    box(1.4, 0.18, 2.8, COL.cap, 8.3, 2.55, 2.6, { rad: 0.05 });
    box(0.5, 0.12, 2.6, COL.white, 7.95, 0, 2.6, { rad: 0.03 });
    // plaza to the classroom block
    box(13.6, 0.04, 5.2, COL.plaza, 14.6, 0, 1.6, { rad: 0, cast: false });
  }
  // Indonesian flag at the school yard
  const flag = (() => {
    cyl(0.07, 0.09, 7.6, COL.metal, 12.2, 0, -3.6, { m: 0.4, r: 0.4 });
    cyl(0.5, 0.6, 0.25, COL.white, 12.2, 0, -3.6);
    const mk = (color, y) => { const geo = new THREE.PlaneGeometry(1.8, 0.55, 12, 1); geo.translate(0.9, 0, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }));
      m.position.set(12.25, y, -3.6); put(m); return m; };
    const red = mk(0xD62828, 7.15), white = mk(0xF8F8F8, 6.6);
    const base = red.geometry.attributes.position.array.slice();
    return { parts: [red, white], base };
  })();

  /* ---------------- trees, plants ---------------- */
  function tree(x, z, s = 1) {
    cyl(0.11 * s, 0.15 * s, 1.5 * s, 0x8D7A66, x, 0, z);
    [[0, 2.2, 0, 1.05, COL.soft], [0.5, 1.75, 0.25, 0.72, 0x6AA6A8], [-0.45, 1.85, -0.2, 0.78, 0x8FC0BF]].forEach(([dx, dy, dz, r, c]) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), mat(c, { flat: true })); b.position.set(x + dx * s, dy * s, z + dz * s); put(b);
    });
  }
  function plant(x, z, s = 1) {
    cyl(0.28 * s, 0.22 * s, 0.5 * s, COL.white, x, 0, z);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 * s, 1), mat(0x6AA6A8, { flat: true })); b.position.set(x, 0.85 * s, z); put(b);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 * s, 1), mat(COL.soft, { flat: true })); c.position.set(x + 0.2 * s, 1.15 * s, z - 0.1 * s); put(c);
  }
  [[-7.5, 6.5, 1.1], [-7, -6.5, 1.2], [9.8, 7.4, 0.9], [17.5, -4.6, 1], [16.2, -6.4, 0.8], [24, 11, 1], [30, 13.5, 1.1], [15, 22.5, 1], [31, 26, 1.2], [44.5, 25, 1], [67, 10, 1.1], [67, 30, 1], [-4, 14.2, 0.9], [27.5, 31, 0.9]].forEach(a => tree(...a));

  /* ---------------- road + minibus ---------------- */
  function ribbonGeo(curve, width, n) {
    const pos = new Float32Array((n + 1) * 6), nor = new Float32Array((n + 1) * 6), idx = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      let nx = -t.z, nz = t.x; const l = Math.hypot(nx, nz) || 1; nx *= width / 2 / l; nz *= width / 2 / l;
      pos.set([p.x + nx, 0, p.z + nz, p.x - nx, 0, p.z - nz], i * 6); nor.set([0, 1, 0, 0, 1, 0], i * 6);
      if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx); return g;
  }
  const road = new THREE.CatmullRomCurve3([[-40, 0, 9.5], [-10, 0, 10], [6, 0, 10.6], [15, 0, 13.5], [20, 0, 22], [24, 0, 36], [30, 0, 60]].map(a => new THREE.Vector3(...a)), false, 'centripetal');
  {
    const m = new THREE.Mesh(ribbonGeo(road, 3.4, 300), new THREE.MeshStandardMaterial({ color: COL.road, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.position.y = 0.012; m.receiveShadow = true; scene.add(m);
    const kerb = new THREE.Mesh(ribbonGeo(road, 4.0, 300), new THREE.MeshStandardMaterial({ color: 0xF4F8F9, roughness: 1, side: THREE.DoubleSide }));
    kerb.position.y = 0.006; kerb.receiveShadow = true; scene.add(kerb);
    const L = road.getLength();
    for (let d = 2; d < L; d += 2.4) { const u = d / L, p = road.getPointAt(u), t = road.getTangentAt(u);
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.1), new THREE.MeshBasicMaterial({ color: 0xF2F5F6 }));
      dash.rotation.x = -Math.PI / 2; dash.rotation.z = Math.atan2(-t.x, -t.z); dash.position.set(p.x, 0.02, p.z); scene.add(dash); }
  }
  const bus = (() => {
    const g = new THREE.Group();
    box(1.4, 1.0, 3.0, COL.white, 0, 0.32, 0, { parent: g, rad: 0.18 });
    box(1.42, 0.38, 3.02, COL.cap, 0, 0.62, 0, { parent: g, rad: 0.06 });
    box(1.3, 0.55, 2.2, COL.glass, 0, 1.1, -0.2, { parent: g, rad: 0.12, r: 0.3 });
    box(1.36, 0.1, 2.3, COL.white, 0, 1.65, -0.2, { parent: g, rad: 0.05 });
    [[-0.65, 0.95], [0.65, 0.95], [-0.65, -0.95], [0.65, -0.95]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 16), mat(COL.dark)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); put(w, g); });
    scene.add(g); return g;
  })();

  /* ---------------- rooms ---------------- */
  const WALL_H = 2.6;
  function wallSeg(x1, z1, x2, z2, h) {
    const horiz = Math.abs(z1 - z2) < 1e-6, len = horiz ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    if (len < 0.05) return;
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, th = 0.4, w = horiz ? len + th : th, d = horiz ? th : len + th;
    box(w, h, d, COL.wall, cx, 0, cz, { rad: 0.02 });
    box(w + 0.04, 0.12, d + 0.04, COL.cap, cx, h, cz, { rad: 0.02 });
  }
  function wall(x1, z1, x2, z2, h = WALL_H, door = null, gap = 1.35) {
    if (door == null) return wallSeg(x1, z1, x2, z2, h);
    if (Math.abs(z1 - z2) < 1e-6) { const a = Math.min(x1, x2), b = Math.max(x1, x2); wallSeg(a, z1, door - gap, z1, h); wallSeg(door + gap, z1, b, z1, h); }
    else { const a = Math.min(z1, z2), b = Math.max(z1, z2); wallSeg(x1, a, x1, door - gap, h); wallSeg(x1, door + gap, x1, b, h); }
  }
  function floor(cx, cz) { const m = new THREE.Mesh(new THREE.BoxGeometry(14, 0.04, 14), floorMat); m.position.set(cx, 0.02, cz); m.receiveShadow = true; scene.add(m); }
  // R1 Kelas (21..35, -7..7)  R2 Kuis (35..49, -7..7)  R3 Lab (35..49, 7..21)  R4 Level (49..63, 7..21)  R5 Guru (49..63, 21..35)
  [[28, 0], [42, 0], [42, 14], [56, 14], [56, 28]].forEach(([x, z]) => floor(x, z));
  wall(21, -7, 21, 7, WALL_H, 0); wall(21, -7, 35, -7); wall(21, 7, 35, 7, 0.55);
  wall(35, -7, 35, 7, WALL_H, 0); wall(35, -7, 49, -7); wall(49, -7, 49, 7, 0.55);
  wall(35, 7, 35, 21); wall(35, 7, 49, 7, WALL_H, 42); wall(35, 21, 49, 21, 0.55);
  wall(49, 7, 49, 21, WALL_H, 14); wall(49, 7, 63, 7); wall(63, 7, 63, 21, 0.55);
  wall(49, 21, 49, 35); wall(49, 21, 63, 21, WALL_H, 56); wall(63, 21, 63, 35, 0.55); wall(49, 35, 63, 35, 0.55);

  /* furniture */
  function desk(x, z, w = 1.6, d = 0.9, h = 0.76, color = COL.wood) {
    box(w, 0.07, d, color, x, h - 0.07, z, { rad: 0.03 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(0.07, h - 0.07, 0.07, COL.metal, x + sx * (w / 2 - 0.08), 0, z + sz * (d / 2 - 0.08), { rad: 0 }));
  }
  function chair(x, z, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    box(0.56, 0.07, 0.5, COL.deep, 0, 0.42, 0, { parent: g, rad: 0.03 });
    box(0.56, 0.55, 0.06, COL.deep, 0, 0.5, -0.24, { parent: g, rad: 0.03 });
    [[-0.24, -0.2], [0.24, -0.2], [-0.24, 0.2], [0.24, 0.2]].forEach(([a, b]) => box(0.05, 0.42, 0.05, COL.metal, a, 0, b, { parent: g, rad: 0 }));
    return g;
  }
  function monitor(x, y, z, ry, tex, w = 1.05, h = 0.62) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
    box(0.3, 0.04, 0.22, COL.dark, 0, 0, 0, { parent: g, rad: 0.01 });
    box(0.06, 0.32, 0.05, COL.dark, 0, 0, -0.03, { parent: g, rad: 0 });
    box(w + 0.06, h + 0.06, 0.05, COL.dark, 0, 0.3, -0.03, { parent: g, rad: 0.02 });
    if (tex) screen(w, h, tex, 0, 0.33 + h / 2, 0.0, 0, { parent: g });
    return g;
  }

  /* textures for screens */
  const T = {};
  T.board = canvasTex(1024, 420, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = HEX.teal7; g.font = `500 26px ${FM}`; g.fillText('TUGAS MINGGU INI  ·  IPA VII', 48, 64);
    const rows = [['Pengukuran Panjang', 'Kuis', 'Hari ini', true], ['Besaran & Satuan', 'LKPD 2', '2 hari lagi'], ['Massa Jenis', 'Praktikum', '5 hari lagi']];
    rows.forEach(([a, b, c, warn], i) => { const y = 112 + i * 98;
      g.strokeStyle = HEX.line; g.lineWidth = 2; g.beginPath(); g.moveTo(48, y - 14); g.lineTo(w - 48, y - 14); g.stroke();
      g.strokeStyle = HEX.teal7; g.lineWidth = 4; rr(g, 48, y + 14, 34, 34, 8); g.stroke();
      g.fillStyle = HEX.ink; g.font = `700 36px ${FD}`; g.fillText(a, 104, y + 42);
      g.fillStyle = HEX.ink3; g.font = `400 22px ${FM}`; g.fillText(b, 104, y + 74);
      g.font = `500 22px ${FM}`; const tw = g.measureText(c).width + 36;
      g.fillStyle = warn ? '#FDF1E3' : HEX.teal0; rr(g, w - 48 - tw, y + 16, tw, 40, 20); g.fill();
      g.fillStyle = warn ? HEX.warn : HEX.teal9; g.fillText(c, w - 48 - tw + 18, y + 43); });
  });
  T.quizIdle = (seed) => canvasTex(320, 190, (g, w, h) => {
    g.fillStyle = '#12313A'; g.fillRect(0, 0, w, h);
    g.fillStyle = HEX.teal3; g.font = `500 14px ${FM}`; g.fillText(`SOAL ${seed}/20`, 18, 28);
    g.fillStyle = '#E8F1F3'; rr(g, 18, 42, 250, 12, 6); g.fill(); rr(g, 18, 62, 180, 12, 6); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i === seed % 4 ? HEX.teal7 : '#23454F'; rr(g, 18 + (i % 2) * 146, 92 + Math.floor(i / 2) * 44, 136, 34, 8); g.fill(); }
  });
  T.quizScore = canvasTex(320, 190, (g, w, h) => {
    g.fillStyle = '#12313A'; g.fillRect(0, 0, w, h);
    g.fillStyle = HEX.teal3; g.font = `500 14px ${FM}`; g.fillText('KUIS PENGUKURAN', 18, 28);
    g.fillStyle = '#fff'; g.font = `800 92px ${FD}`; g.fillText('90', 16, 124);
    g.fillStyle = HEX.teal3; g.font = `500 15px ${FM}`; g.fillText('18 / 20 benar', 20, 160);
    g.strokeStyle = HEX.teal7; g.lineWidth = 9; g.beginPath(); g.arc(250, 98, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.9); g.stroke();
  });
  T.classAvg = canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = HEX.teal7; g.font = `500 20px ${FM}`; g.fillText('RATA-RATA KELAS', 28, 46);
    g.fillStyle = HEX.ink; g.font = `800 96px ${FD}`; g.fillText('84', 26, 150);
    const v = [62, 78, 84, 90, 71, 88, 95]; v.forEach((n, i) => { const bh = n * 1.1; g.fillStyle = n >= 70 ? HEX.teal7 : HEX.warn; rr(g, 230 + i * 36, 250 - bh, 24, bh, 5); g.fill(); });
    g.fillStyle = HEX.ink3; g.font = `400 16px ${FM}`; g.fillText('per kelompok soal', 28, 250);
  });
  T.graph = canvasTex(400, 250, (g, w, h) => {
    g.fillStyle = '#12313A'; g.fillRect(0, 0, w, h);
    g.fillStyle = HEX.teal3; g.font = `500 15px ${FM}`; g.fillText('T (s) terhadap L (cm)', 18, 28);
    const X = l => 40 + l / 110 * 330, Y = t => 222 - t / 2.3 * 170;
    g.strokeStyle = '#2C525C'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 52); g.lineTo(40, 222); g.lineTo(380, 222); g.stroke();
    g.strokeStyle = HEX.teal7; g.lineWidth = 3; g.beginPath();
    for (let l = 2; l <= 108; l += 2) { const t = 2 * Math.PI * Math.sqrt(l / 100 / 9.8); l === 2 ? g.moveTo(X(l), Y(t)) : g.lineTo(X(l), Y(t)); } g.stroke();
    [[25, 1.00], [50, 1.42], [75, 1.74], [100, 2.01]].forEach(([l, t]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(X(l), Y(t), 6, 0, 7); g.fill(); });
  });
  T.poster = canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = HEX.teal9; g.fillRect(0, 0, w, 12);
    g.fillStyle = HEX.teal7; g.font = `500 20px ${FM}`; g.fillText('BANDUL SEDERHANA', 32, 58);
    g.fillStyle = HEX.ink; g.font = `800 64px ${FD}`; g.fillText('T = 2π√(L/g)', 30, 150);
    g.fillStyle = HEX.ink2; g.font = `400 22px ${FM}`; g.fillText('L  panjang tali (m)', 34, 214); g.fillText('g  9,8 m/s²', 34, 252);
  });
  T.board5 = canvasTex(768, 300, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = HEX.teal7; g.font = `500 22px ${FM}`; g.fillText('PAPAN PERINGKAT  ·  VII', 32, 46);
    [['Cut Nadia', 'Astronot I', '2.640'], ['T. Rizki', 'Planet III', '1.910'], ['Aulia', 'Planet II', '1.520'], ['M. Fajri', 'Planet I', '1.180']].forEach(([n, l, x], i) => {
      const y = 74 + i * 54; g.fillStyle = i === 2 ? HEX.teal0 : '#fff'; rr(g, 24, y, w - 48, 46, 10); g.fill();
      g.fillStyle = HEX.teal9; g.font = `500 22px ${FM}`; g.fillText(String(i + 1).padStart(2, '0'), 42, y + 31);
      g.fillStyle = HEX.ink; g.font = `700 26px ${FD}`; g.fillText(n, 96, y + 32);
      g.fillStyle = HEX.ink3; g.font = `400 20px ${FM}`; g.fillText(l, 340, y + 31);
      g.fillStyle = HEX.ink; g.font = `500 22px ${FM}`; g.textAlign = 'right'; g.fillText(x + ' XP', w - 44, y + 31); g.textAlign = 'left';
    });
  });
  T.rekap = canvasTex(640, 360, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = HEX.teal7; g.font = `500 22px ${FM}`; g.fillText('REKAP NILAI  ·  VII', 32, 48);
    const data = [['Besaran', 84], ['Ukur', 79], ['Zat', 76], ['Suhu', 82], ['Kalor', 88]];
    const base = 300, scale = 2.2; g.strokeStyle = HEX.warn; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(32, base - 70 * scale); g.lineTo(w - 32, base - 70 * scale); g.stroke(); g.setLineDash([]);
    g.fillStyle = HEX.warn; g.font = `500 16px ${FM}`; g.fillText('KKTP 70', w - 110, base - 70 * scale - 8);
    data.forEach(([l, v], i) => { const x = 48 + i * 116, bh = v * scale; g.fillStyle = HEX.teal7; rr(g, x, base - bh, 64, bh, 8); g.fill();
      g.fillStyle = HEX.ink; g.font = `700 20px ${FD}`; g.fillText(v, x + 10, base - bh - 10); g.fillStyle = HEX.ink3; g.font = `400 16px ${FM}`; g.fillText(l, x, base + 26); });
  });
  T.paper = canvasTex(128, 176, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = HEX.teal7; g.fillRect(12, 14, 70, 8);
    g.fillStyle = '#C9D9DD'; for (let i = 0; i < 8; i++) g.fillRect(12, 36 + i * 15, i % 3 === 2 ? 70 : 104, 5);
  });
  T.podium = n => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = HEX.teal9; g.font = `800 84px ${FD}`; g.textAlign = 'center'; g.fillText(n, 64, 98); });
  function pill(title, sub) {
    return canvasTex(640, 220, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.shadowColor = 'rgba(14,42,51,.2)'; g.shadowBlur = 22; g.shadowOffsetY = 8;
      g.fillStyle = '#fff'; rr(g, 18, 14, w - 36, h - 50, 42); g.fill(); g.shadowColor = 'transparent';
      g.beginPath(); g.moveTo(w / 2 - 18, h - 37); g.lineTo(w / 2, h - 14); g.lineTo(w / 2 + 18, h - 37); g.fill();
      diamond(g, 76, 98, 26, HEX.teal7);
      g.fillStyle = HEX.ink; g.font = `800 58px ${FD}`; g.fillText(title, 122, 94);
      g.fillStyle = HEX.ink2; g.font = `500 31px ${FM}`; g.fillText(sub, 124, 140);
    });
  }

  /* R1 — Kelas */
  screen(5.2, 2.13, T.board, 28, 1.75, -6.77);
  box(5.4, 0.08, 0.16, COL.metal, 28, 0.62, -6.72, { rad: 0.02 });
  box(0.5, 1.7, 2.6, COL.wood, 21.45, 0, -4.4, { rad: 0.04 });
  for (let i = 0; i < 4; i++) box(0.3, 0.26, 2.3, [COL.cap, COL.soft, COL.deep, COL.white][i], 21.85, 0.22 + i * 0.38, -4.4, { rad: 0.02 });
  plant(22.3, 5.8); plant(34, -6, 0.9);
  { let k = 0;
    [-3.9, -1.1].forEach((z, row) => [24.8, 28, 31.2].forEach((x, col) => {
      desk(x, z); chair(x, z + 0.78, Math.PI);
      const p = kid(k++, { }); sitAt(p, x, z + 0.8, Math.PI);
    })); }

  /* R2 — Kuis */
  const quizDesks = [37.6, 40.9, 44.2, 47.3];
  quizDesks.forEach((x, i) => {
    desk(x, -5.6, 2.2, 1.0, 0.76, COL.white);
    monitor(x, 0.76, -5.75, 0, i === 1 ? T.quizScore : T.quizIdle(i * 5 + 3));
    if (i !== 1) { chair(x, -4.75, Math.PI); const p = kid(i + 3); sitAt(p, x, -4.7, Math.PI); }
  });
  chair(42.4, -4.2, Math.PI - 0.5);
  screen(2.9, 1.7, T.classAvg, 35.22, 1.75, -4.4, Math.PI / 2);
  plant(47.9, 5.6);

  /* R3 — Lab */
  box(1.5, 0.84, 7.2, COL.white, 37.1, 0, 14, { rad: 0.05 });
  box(1.6, 0.08, 7.3, COL.dark, 37.1, 0.84, 14, { rad: 0.03, r: 0.5 });
  function beaker(x, z, liquid, h = 0.42, r = 0.17) {
    cyl(r * 0.92, r * 0.92, h * 0.55, liquid, x, 0.92, z, { op: 0.9 });
    cyl(r, r, h, 0xFFFFFF, x, 0.92, z, { op: 0.35, r: 0.1, cast: false });
  }
  beaker(37.0, 11.0, COL.soft); beaker(37.3, 11.5, 0xF2B84B, 0.34, 0.14); beaker(36.9, 12.0, COL.cap, 0.5, 0.15); beaker(37.2, 16.0, COL.soft, 0.3, 0.2);
  // pendulum stand: real period 1,42 s for L = 50 cm
  box(0.7, 0.06, 0.5, COL.metal, 37.0, 0.92, 13.6, { rad: 0.02 });
  cyl(0.03, 0.03, 1.9, COL.metal, 36.75, 0.92, 13.6, { m: 0.4 });
  box(0.04, 0.04, 0.9, COL.metal, 36.75, 2.8, 13.6 + 0.0, { rad: 0, ry: 0 });
  const pend = new THREE.Group(); pend.position.set(36.75, 2.8, 13.6 + 0.42); scene.add(pend);
  { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.35, 6), mat(COL.ink)); s.position.y = -0.675; put(s, pend, false);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), mat(COL.cap, { m: 0.2, r: 0.4 })); b.position.y = -1.38; put(b, pend); }
  monitor(37.05, 0.92, 16.4, Math.PI / 2, T.graph, 1.2, 0.75);
  screen(2.6, 1.62, T.poster, 38.2, 1.75, 7.22);
  desk(45.5, 18.2, 2.6, 1.3, 0.84, COL.white);
  beaker(45.0, 18.0, COL.cap, 0.36, 0.16); beaker(45.6, 18.3, 0xF2B84B, 0.42, 0.14); beaker(46.2, 17.9, COL.soft, 0.3, 0.18);
  { const p = kid(1); standAt(p, 45.4, 19.4, Math.PI); p.armL.rotation.x = p.armR.rotation.x = -0.7; }
  { const p = kid(0, { skin: COL.skin[2] }); standAt(p, 47.6, 18.0, -Math.PI / 2); p.armR.rotation.x = -0.6; }
  plant(47.9, 8.4, 0.9);

  /* R4 — Level */
  const PODIUM = { x: 56.5, z: 12.4, h: 1.1 };
  [[PODIUM.x, PODIUM.h, '1'], [PODIUM.x - 1.95, 0.78, '2'], [PODIUM.x + 1.95, 0.55, '3']].forEach(([x, h, n]) => {
    box(1.9, h, 1.9, COL.white, x, 0, PODIUM.z, { rad: 0.06 });
    box(1.94, 0.1, 1.94, COL.cap, x, h, PODIUM.z, { rad: 0.03 });
    const sz = Math.min(0.8, h * 0.78); screen(sz, sz, T.podium(n), x, h / 2, PODIUM.z + 0.96);
  });
  screen(6.0, 2.34, T.board5, 56.5, 1.75, 7.22);
  { const a = kid(0); standAt(a, PODIUM.x - 1.95, PODIUM.z, Math.PI / 4, 0.88); a.armL.rotation.z = -2.6; a.armR.rotation.z = -0.3;
    const b = kid(1); standAt(b, PODIUM.x + 1.95, PODIUM.z, Math.PI / 4, 0.65);
    [[52.2, 17.6, 2.4], [60.6, 17.8, -2.3], [53.6, 19.3, 2.7], [59.2, 19.6, -2.6]].forEach(([x, z, r], i) => { const p = kid(i + 2); standAt(p, x, z, r); p.armL.rotation.x = p.armR.rotation.x = -1.6; }); }
  const tier = new THREE.Group(); tier.position.set(PODIUM.x, 5.1, PODIUM.z); scene.add(tier);
  { const pl = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 20), mat(0x14A0A8, { r: 0.4 })); put(pl, tier, true, false);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 10, 48), mat(0xFFF1CF, { r: 0.5 })); ring.rotation.x = Math.PI / 2 - 0.35; put(ring, tier, true, false); }
  const sparks = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), mat([COL.deep, COL.cap, COL.soft][i], { flat: true })); m.scale.y = 1.4; scene.add(m); return m; });
  plant(62, 8.2); plant(50, 20, 0.9);

  /* R5 — Guru */
  desk(58, 29.9, 2.8, 1.2, 0.78, COL.wood);
  box(2.7, 0.6, 0.06, COL.woodDark, 58, 0.12, 30.45, { rad: 0.02 });
  monitor(58.3, 0.78, 29.7, Math.PI, null, 1.0, 0.6);
  box(0.9, 0.05, 0.4, COL.dark, 57.3, 0.78, 30.1, { rad: 0.02 });
  chair(58, 28.6, 0);
  const teacher = person({ shirt: 0x5D9C9F, pants: COL.dark, skin: COL.skin[1], sleeve: 0x5D9C9F });
  sitAt(teacher, 58, 28.75, 0); teacher.armL.rotation.x = teacher.armR.rotation.x = -1.1;
  screen(3.6, 2.03, T.rekap, 60.2, 1.7, 21.22);
  box(0.5, 2.0, 4.2, COL.wood, 49.45, 0, 28, { rad: 0.04 });
  for (let i = 0; i < 12; i++) box(0.36, 0.5, 0.16, [COL.cap, COL.deep, COL.soft, COL.white][i % 4], 49.85, 0.15 + Math.floor(i / 6) * 0.95, 26.3 + (i % 6) * 0.36 + Math.floor(i / 6) * 0.1, { rad: 0.02 });
  desk(61.6, 26.4, 1.4, 1.0, 0.7, COL.white);
  box(0.9, 0.34, 0.7, COL.metal, 61.6, 0.7, 26.3, { rad: 0.06 });
  box(0.7, 0.04, 0.3, COL.dark, 61.6, 1.04, 26.3, { rad: 0.01 });
  const paper = screen(0.42, 0.58, T.paper, 61.6, 0.9, 26.7, 0, { rx: -Math.PI / 2 });
  plant(62, 33.6); plant(50.2, 34, 0.95);

  /* ---------------- path + protagonist ---------------- */
  const PTS = [
    [8.6, 2.6], [11, 3.0], [15.5, 2.4], [19, 0.6], [21, 0], [23.5, 2.6], [28, 3.6], [31.5, 3.0], [33.7, 1.2], [35, 0],
    [37.3, -1.2], [40.9, -3.25], [43.3, -1.3], [42.6, 3.2], [42, 7], [41.2, 10.2], [39.0, 13.0], [41.6, 14.8], [45.5, 14.6], [49, 14],
    [52.5, 15.6], [55.6, 15.3], [56.5, 12.4], [57.3, 15.8], [56.4, 19], [56, 21], [55.3, 24.5], [55.4, 28.6], [56.6, 31.6], [58, 31.75],
  ];
  const STOP_PTS = [0, 6, 11, 16, 22, 29];
  const path = new THREE.CatmullRomCurve3(PTS.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', 0.5);
  const PATH_N = 900;
  const stopU = (() => { const samples = 3000, arr = []; for (let i = 0; i <= samples; i++) arr.push(path.getPointAt(i / samples));
    return STOP_PTS.map(k => { const [x, z] = PTS[k]; let best = 0, bd = 1e9; arr.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } }); return best / samples; }); })();
  stopU.push(stopU[stopU.length - 1]);
  const ghost = new THREE.Mesh(ribbonGeo(path, 0.5, PATH_N), new THREE.MeshStandardMaterial({ color: 0xBFDCDD, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  ghost.position.y = 0.05; ghost.receiveShadow = true; scene.add(ghost);
  const trail = new THREE.Mesh(ribbonGeo(path, 0.5, PATH_N), new THREE.MeshStandardMaterial({ color: COL.cap, roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }));
  trail.position.y = 0.06; trail.receiveShadow = true; scene.add(trail);
  const markers = STOP_PTS.map(k => { const p = path.getPointAt(stopU[STOP_PTS.indexOf(k)]);
    const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 32), new THREE.MeshBasicMaterial({ color: COL.cap, transparent: true, opacity: 0.9 }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.075, p.z); scene.add(m); return m; });
  const hero = person({ hijab: 0xFFFFFF, skirt: true, skin: COL.skin[0], bag: COL.cap });
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.78, 40), new THREE.MeshBasicMaterial({ color: COL.cap, transparent: true, opacity: 0.6 }));
  halo.rotation.x = -Math.PI / 2; scene.add(halo);

  const labels = [null, pill('Tugas baru', '3 tugas · IPA VII'), pill('Nilai 90', 'dinilai otomatis'), pill('T = 1,42 s', 'L = 50 cm'), pill('Planet II', '1.520 XP'), pill('Laporan siap', 'VII · 31 siswa'), null]
    .map(t => { if (!t) return null; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, toneMapped: false, fog: false })); s.renderOrder = 20; s.scale.set(0, 0, 1); scene.add(s); return s; });

  /* hero-area walkers */
  const walkers = [
    { P: kid(1), a: [9.5, 5.2], b: [19.5, 5.4], speed: 1.1, t: 0.2 },
    { P: kid(0, { skin: COL.skin[1] }), a: [-9, 7.4], b: [8, 7.6], speed: 1.0, t: 0.65 },
    { P: kid(3), a: [13.5, -1.4], b: [13.5, -6.0], speed: 0.8, t: 0.4 },
  ];

  /* ---------------- camera stations ---------------- */
  const ST = [
    { t: [2.8, 3.6, 2.4], H: 29, dir: [1, 0.82, 1.08], face: Math.PI / 4 },
    { t: [28.2, 0.6, 0.3], H: 16, dir: [1, 1.3, 1], face: Math.PI },
    { t: [42.0, 0.6, -1.4], H: 16, dir: [1, 1.3, 1], face: Math.PI },
    { t: [41.3, 0.6, 14.0], H: 16, dir: [1, 1.3, 1], face: -Math.PI / 2 },
    { t: [56.3, 1.4, 14.0], H: 16, dir: [1, 1.3, 1], face: Math.PI / 4 },
    { t: [57.4, 0.6, 28.6], H: 16, dir: [1, 1.3, 1], face: Math.PI },
    { t: [37.5, 0.0, 15.5], H: 58, dir: [1, 1.22, 1], face: Math.PI / 4 },
  ];
  const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3(), dA = new THREE.Vector3(), dB = new THREE.Vector3();
  let VW = 1, VH = 1, layout = 'copy', layoutK = 0; // layoutK eases 0 (copy panel at left) -> 1 (login card floating at right)
  const CARD_RESERVE = 464; // login card width + gutters on the right (keep in sync with welcome.css)
  function frame3(target, dir, H) {
    const a = VW / VH;
    if (layout === 'portrait') {
      const h = H * Math.max(1, 0.95 / a), w = h * a;
      camera.left = -w / 2; camera.right = w / 2; camera.top = h * 0.34; camera.bottom = -h * 0.66;
    } else {
      const free = Math.max(0.45, (VW - CARD_RESERVE) / VW); // share of the width left of the card
      const h = H * lerp(1, Math.max(1, 1.1 / (a * free)), layoutK), w = h * a, fx = lerp(0.6, free / 2, layoutK);
      camera.left = -w * fx; camera.right = w * (1 - fx); camera.top = h * 0.5; camera.bottom = -h * 0.5;
    }
    camera.updateProjectionMatrix();
    camera.position.copy(target).addScaledVector(dir, 160); camera.lookAt(target);
    const s = Math.max(16, (camera.top - camera.bottom) * 0.78);
    const sc = sun.shadow.camera; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.updateProjectionMatrix();
    sun.position.set(target.x - 20, target.y + 34, target.z + 12); sun.target.position.copy(target); sun.target.updateMatrixWorld();
  }

  /* ---------------- copy panels + step nav ---------------- */
  const panels = ui.panels.filter(Boolean), navItems = ui.navItems.filter(Boolean), fills = ui.fills.filter(Boolean);
  let lastOn = -1;
  function updateDom(e) {
    panels.forEach((p, j) => {
      const d = e - j, op = clamp(1 - Math.abs(d) * 2.4);
      p.style.opacity = op.toFixed(3);
      p.classList.toggle('is-on', op > 0.01);
      p.style.translate = `0 ${(-d * 26).toFixed(1)}px`;
      p.setAttribute('aria-hidden', op < 0.5 ? 'true' : 'false');
    });
    const on = Math.round(e);
    fills.forEach((f, j) => f.style.width = (clamp(e - j + 1) * 100).toFixed(1) + '%');
    if (on !== lastOn) { navItems.forEach((li, j) => li.classList.toggle('on', j === on)); lastOn = on; }
  }

  /* ---------------- state ---------------- */
  let raw = 0, heroDist = 0, prevU = 0, walkAmp = 0;
  // Film timeline: intro hold, then for each station a 3.6 s move and a hold long enough to read the panel.
  const INTRO = 3.0, MOVE = 3.6, HOLD = 2.6, CH = MOVE + HOLD;
  const SEGS = [[INTRO, 0, 0]];
  for (let i = 0; i < STEPS - 1; i++) { SEGS.push([MOVE, i, i + 1]); SEGS.push([i === STEPS - 2 ? HOLD + 2.4 : HOLD, i + 1, i + 1]); }
  const TOTAL = SEGS.reduce((a, s) => a + s[0], 0);
  function rawAt(t) { for (const [d, a, b] of SEGS) { if (t <= d) return a + (b - a) * (t / d); t -= d; } return STEPS - 1; }
  const chapStart = j => j === 0 ? 0 : INTRO + (j - 1) * CH;
  const chapEnd = j => j === STEPS - 1 ? TOTAL : INTRO + j * CH;
  const seekTo = j => j === 0 ? 0 : chapStart(j) + MOVE * 0.84;
  let playhead = 0, playing = !REDUCED, dirty = true, suspended = false;
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function chapterNow() { let j = 0; while (j < STEPS - 1 && playhead >= chapStart(j + 1)) j++; return j; }
  function updatePlayerUi() {
    fills.forEach((f, j) => f.style.width = (clamp((playhead - chapStart(j)) / (chapEnd(j) - chapStart(j))) * 100).toFixed(1) + '%');
    if (ui.tc) ui.tc.textContent = `${fmt(playhead)} / ${fmt(TOTAL)}`;
  }

  function update(time, dt) {
    const i = Math.min(STEPS - 2, Math.floor(raw)), f = raw - i;
    const k = ease(clamp((f - 0.18) / 0.64));
    const e = i + k;
    const A = ST[i], B = ST[i + 1];
    tA.set(...A.t); tB.set(...B.t); tmpV.lerpVectors(tA, tB, k);
    dA.set(...A.dir).normalize(); dB.set(...B.dir).normalize(); tmpD.lerpVectors(dA, dB, k).normalize();
    const H = Math.exp(lerp(Math.log(A.H), Math.log(B.H), k)) + Math.sin(Math.PI * k) * (i === 0 ? 5 : 2.6);
    frame3(tmpV, tmpD, H);

    // protagonist
    const u = lerp(stopU[i], stopU[i + 1], k);
    const p = path.getPointAt(Math.min(u, 0.99999));
    const du = u - prevU; prevU = u;
    heroDist += Math.abs(du) * path.getLength();
    const moving = Math.abs(du) > 1e-5;
    walkAmp = lerp(walkAmp, moving ? 1 : 0, clamp(dt * 8));
    const dx = Math.max(Math.abs(p.x - PODIUM.x), Math.abs(p.z - PODIUM.z));
    const lift = PODIUM.h * ease(clamp(1 - (dx - 0.95) / 0.7));
    hero.g.position.set(p.x, lift, p.z);
    const tg = path.getTangentAt(Math.min(u, 0.99999));
    const moveAng = Math.atan2(tg.x * Math.sign(du || 1), tg.z * Math.sign(du || 1));
    const stationAng = (k < 0.5 ? A : B).face;
    const wgt = Math.sin(Math.PI * k);
    const targetAng = wgt > 0.15 ? moveAng : stationAng;
    let diff = targetAng - hero.g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    hero.g.rotation.y += diff * clamp(dt * 9);
    walkPose(hero, heroDist * 2.4, REDUCED ? 0 : walkAmp);
    if (e > 3.6 && e < 4.4 && walkAmp < 0.2) { hero.armL.rotation.z = -2.7 * clamp(1 - Math.abs(e - 4) * 2.5); hero.armR.rotation.z = 0; } else { hero.armL.rotation.z = 0; }
    halo.position.set(p.x, lift + 0.08, p.z);
    const pulse = REDUCED ? 1 : 1 + Math.sin(time * 3.2) * 0.08; halo.scale.setScalar(pulse);
    trail.geometry.setDrawRange(0, Math.floor(clamp(u) * PATH_N) * 6);
    markers.forEach((m, j) => { const reached = stopU[j] <= u + 1e-4; m.material.color.setHex(reached ? COL.cap : 0xA8CBCC); m.scale.setScalar(reached ? 1 : 0.85); });

    // floating labels
    labels.forEach((s, j) => { if (!s) return;
      const a = clamp(1 - Math.abs(e - j) * 3.2), sc = a <= 0 ? 0 : 1 - Math.pow(1 - a, 3);
      const sx = 4.6 * sc * (H / 16), sy = sx * 220 / 640;
      s.scale.set(sx, sy, 1);
      const hp = path.getPointAt(stopU[j]); const up = j === 4 ? 3.9 : 0;
      s.position.set(hp.x, up + 2.75 + sy * 0.5 + (REDUCED ? 0 : Math.sin(time * 2 + j) * 0.06), hp.z); });

    // ambient motion
    if (!REDUCED) {
      const [red, white] = flag.parts;
      [red, white].forEach((m, idx) => { const arr = m.geometry.attributes.position.array;
        for (let v = 0; v < arr.length; v += 3) { const x = flag.base[v]; arr[v + 2] = Math.sin(x * 3.2 - time * 4 + idx * 0.3) * 0.12 * (x / 1.8); }
        m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals(); });
      pend.rotation.x = Math.sin(time * 2 * Math.PI / 1.42) * 0.32;
      tier.rotation.y = time * 0.7; tier.position.y = 5.1 + Math.sin(time * 1.6) * 0.15;
      sparks.forEach((m, j) => { const a = time * 0.9 + j * 2.094; m.position.set(PODIUM.x + Math.cos(a) * 1.7, 5.1 + Math.sin(a * 1.3) * 0.4, PODIUM.z + Math.sin(a) * 1.7); m.rotation.y = time * 2; });
      const pz = (time * 0.35) % 1; paper.position.set(61.6, 0.93 - pz * 0.1, 26.6 + pz * 0.55);
      const bu = (time * 0.018) % 1; const bp = road.getPointAt(bu), bt = road.getTangentAt(bu);
      bus.position.set(bp.x + bt.z * -0.85, 0.02, bp.z + bt.x * 0.85); bus.rotation.y = Math.atan2(bt.x, bt.z);
      walkers.forEach(W => { const L = Math.hypot(W.b[0] - W.a[0], W.b[1] - W.a[1]); const cyc = (time * W.speed / L + W.t) % 2; const fwd = cyc < 1, s = fwd ? cyc : 2 - cyc;
        const x = lerp(W.a[0], W.b[0], ease(s)), z = lerp(W.a[1], W.b[1], ease(s));
        W.P.g.position.set(x, 0, z); const dir = fwd ? 1 : -1; W.P.g.rotation.y = Math.atan2((W.b[0] - W.a[0]) * dir, (W.b[1] - W.a[1]) * dir);
        walkPose(W.P, time * 7 + W.t * 10, Math.min(1, Math.sin(Math.PI * s) * 3)); });
    } else {
      bus.position.set(-4, 0.02, 9.2); bus.rotation.y = Math.PI / 2;
      walkers.forEach(W => standAt(W.P, W.a[0], W.a[1], Math.PI / 4));
    }
    updateDom(e);
  }


  /* ---------------- sizing + loop ---------------- */
  function resize() {
    VW = pane.clientWidth || 1; VH = pane.clientHeight || 1;
    renderer.setSize(VW, VH, false); dirty = true;
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(pane);
  let layoutTarget = 0, raf = 0, last = performance.now(), disposed = false;
  function loop(now) {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (suspended || document.hidden) return;
    if (Math.abs(layoutK - layoutTarget) > 1e-3) { layoutK = lerp(layoutK, layoutTarget, clamp(dt * 4)); dirty = true; } else layoutK = layoutTarget;
    if (playing) { playhead += dt; if (playhead >= TOTAL) playhead = 0; }
    if (playing || dirty) {
      raw = rawAt(playhead);
      update(playhead, playing ? dt : 1);
      updatePlayerUi(); renderer.render(scene, camera); dirty = false;
    }
  }
  raf = requestAnimationFrame(t => { last = t; loop(t); });

  return {
    setLayout(l) { layout = l === 'portrait' ? 'portrait' : 'landscape'; layoutTarget = l === 'login' ? 1 : 0; if (layout === 'portrait') layoutK = 0; dirty = true; },
    setPlaying(v) { playing = !!v; dirty = true; },
    setSuspended(v) { suspended = !!v; dirty = true; },
    seek(j) { playhead = j === 0 ? 0 : chapStart(j) + MOVE * 0.84; dirty = true; },
    step(dir) { const j = chapterNow(); const to = dir > 0 ? Math.min(STEPS - 1, j + 1) : (playhead - (j === 0 ? 0 : chapStart(j) + MOVE * 0.84) > 1 ? j : Math.max(0, j - 1)); this.seek(to); },
    reducedMotion: REDUCED,
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      });
      renderer.dispose();
    },
  };
}
