/* Operation: Valhalla Journey — low-poly model library (three.js r128 classic build) */
(() => {
  'use strict';
  const V = (window.Valhalla = window.Valhalla || {});
  const T = THREE;

  /* ---------- small helpers ---------- */
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  Object.assign(V, { clamp, lerp, smooth, damp, rand, angleDelta });

  const matCache = new Map();
  function mat(color, o = {}) {
    const key = color + JSON.stringify(o);
    if (!matCache.has(key)) matCache.set(key, new T.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: .78, metalness: .04 }, o)));
    return matCache.get(key);
  }
  // Unique (animatable) emissive material.
  function glow(color, intensity = 1, o = {}) {
    return new T.MeshStandardMaterial(Object.assign({ color, emissive: color, emissiveIntensity: intensity, flatShading: true, roughness: .5 }, o));
  }
  const M = (c, o) => (typeof c === 'string' ? mat(c, o) : c);
  function mesh(geo, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const box = (w, h, d, c, x, y, z, o) => mesh(new T.BoxGeometry(w, h, d), M(c, o), x, y, z);
  const cyl = (rt, rb, h, seg, c, x, y, z, o) => mesh(new T.CylinderGeometry(rt, rb, h, seg), M(c, o), x, y, z);
  const ico = (r, d, c, x, y, z, o) => mesh(new T.IcosahedronGeometry(r, d), M(c, o), x, y, z);
  const cone = (r, h, seg, c, x, y, z, o) => mesh(new T.ConeGeometry(r, h, seg), M(c, o), x, y, z);
  const octa = (r, c, x, y, z, o) => mesh(new T.OctahedronGeometry(r, 0), M(c, o), x, y, z);
  Object.assign(V, { mat, glow, mesh, box, cyl, ico, cone, octa });

  /* ---------- value noise ---------- */
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    let r = 0;
    for (let i = 0; i < 8; i++) {
      const dx = i & 1, dy = (i >> 1) & 1, dz = (i >> 2) & 1;
      r += hash(xi + dx, yi + dy, zi + dz) * (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    }
    return r;
  }
  function fbm(x, y, z, oct = 4) {
    let a = .5, f = 1, s = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); a *= .5; f *= 2.03; }
    return s;
  }
  Object.assign(V, { vnoise, fbm });

  // Convert a geometry into flat-shaded faces, each with one colour from colorFn(color, cx, cy, cz).
  function lowPoly(geo, colorFn) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new T.Color();
    for (let i = 0; i < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      colorFn(c, cx, cy, cz);
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  V.lowPoly = lowPoly;
  const vcMat = (o = {}) => new T.MeshStandardMaterial(Object.assign({ vertexColors: true, flatShading: true, roughness: .92, metalness: 0 }, o));
  V.vcMat = vcMat;

  /* ---------- textures & sprites ---------- */
  let glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.35, 'rgba(255,255,255,.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    glowTex = new T.CanvasTexture(c);
    return glowTex;
  }
  function glowSprite(color, size, opacity = 1) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending }));
    s.scale.set(size, size, 1);
    return s;
  }
  V.glowSprite = glowSprite;

  let windowTex = null;
  function windowTexture() {
    if (windowTex) return windowTex;
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#0d1240'); grad.addColorStop(1, '#2b2f78');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${rand(.3, 1)})`; const s = Math.random() < .2 ? 2 : 1; g.fillRect(rand(0, 126), rand(0, 62), s, s); }
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(0, 64); g.lineTo(40, 0); g.lineTo(62, 0); g.lineTo(22, 64); g.fill();
    windowTex = new T.CanvasTexture(c);
    return windowTex;
  }
  V.windowTexture = windowTexture;

  function makeStars(count, radius, size = 2) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), c = new T.Color();
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(a) * s * radius, u * radius, Math.sin(a) * s * radius], i * 3);
      c.setHSL(rand(.52, .72), rand(.2, .7), rand(.65, .95));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const p = new T.Points(g, new T.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
    p.frustumCulled = false;
    return p;
  }
  V.makeStars = makeStars;

  /* ---------- planets ---------- */
  function makePlanet(radius, kind) {
    const earth = kind === 'earth';
    const seed = earth ? 3.1 : 11.7;
    const base = new T.IcosahedronGeometry(radius, 3);
    const pos = base.attributes.position, v = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const h = fbm(v.x * 1.7 + seed, v.y * 1.7 + seed, v.z * 1.7 + seed, 4);
      const lift = h > .5 ? (h - .5) * .16 : 0;
      v.multiplyScalar(radius * (1 + lift)); pos.setXYZ(i, v.x, v.y, v.z);
    }
    const geo = lowPoly(base, (c, x, y, z) => {
      const n = new T.Vector3(x, y, z), len = n.length(); n.divideScalar(len);
      const h = fbm(n.x * 1.7 + seed, n.y * 1.7 + seed, n.z * 1.7 + seed, 4);
      if (Math.abs(n.y) > .86) return c.set(earth ? '#eef6ff' : '#e4d6ff');
      if (h < .5) return c.set(earth ? (h < .42 ? '#1f55b8' : '#2f78d6') : (h < .42 ? '#1e8a96' : '#2fb0b0'));
      if (h < .54) return c.set(earth ? '#e1d391' : '#e8b676');
      return c.set(earth ? (h > .62 ? '#7f6b4d' : '#4fa65a') : (h > .62 ? '#8c4a3a' : '#c9663f'));
    });
    const g = new T.Group();
    const body = new T.Mesh(geo, vcMat({ roughness: .85 })); body.receiveShadow = false;
    g.add(body);
    const atm = new T.Mesh(new T.IcosahedronGeometry(radius * 1.07, 2), new T.MeshBasicMaterial({ color: earth ? '#6fb4ff' : '#c59bff', transparent: true, opacity: .16, side: T.BackSide, depthWrite: false }));
    g.add(atm);
    if (earth) {
      const cloudGeo = lowPoly(new T.IcosahedronGeometry(radius * 1.035, 1), (c, x, y, z) => c.set(fbm(x * .05 + 9, y * .05, z * .05, 2) > .5 ? '#ffffff' : '#dfe9ff'));
      const clouds = new T.Mesh(cloudGeo, vcMat({ transparent: true, opacity: .55, roughness: 1 }));
      g.add(clouds); g.userData.clouds = clouds;
    }
    g.userData.body = body;
    return g;
  }
  V.makePlanet = makePlanet;

  /* ---------- particles (instanced, velocity + gravity + optional ground bounce) ---------- */
  class Particles {
    constructor(parent, count = 300, o = {}) {
      this.n = count; this.gravity = o.gravity ?? -6; this.groundY = o.groundY; this.bounce = o.bounce ?? .3; this.drag = o.drag ?? .4;
      const geo = o.geometry || new T.TetrahedronGeometry(1, 0);
      this.mesh = new T.InstancedMesh(geo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: o.transparent !== false, opacity: o.opacity ?? 1, depthWrite: false }), count);
      this.mesh.frustumCulled = false;
      this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      this.mesh.setColorAt(0, new T.Color(1, 1, 1));
      this.p = Array.from({ length: count }, () => ({ life: 0, max: 1, pos: new T.Vector3(), vel: new T.Vector3(), size: 0, grow: 0, g: 1, spin: 0 }));
      this.next = 0; this.dummy = new T.Object3D(); this.color = new T.Color();
      for (let i = 0; i < count; i++) { this.dummy.scale.setScalar(0); this.dummy.updateMatrix(); this.mesh.setMatrixAt(i, this.dummy.matrix); }
      parent.add(this.mesh);
    }
    emit(pos, vel, life, color, size, o = {}) {
      const idx = this.next, q = this.p[idx]; this.next = (this.next + 1) % this.n;
      q.life = q.max = life; q.pos.copy(pos); q.vel.copy(vel); q.size = size; q.grow = o.grow ?? -1; q.g = o.g ?? 1; q.spin = rand(0, 6);
      this.mesh.setColorAt(idx, this.color.set(color));
      this.mesh.instanceColor.needsUpdate = true;
    }
    burst(pos, n, speed, life, color, size, o = {}) {
      const v = new T.Vector3();
      for (let i = 0; i < n; i++) {
        v.set(rand(-1, 1), rand(o.up ?? .2, 1.2), rand(-1, 1)).normalize().multiplyScalar(speed * rand(.4, 1));
        this.emit(pos, v, life * rand(.6, 1.1), Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color, size * rand(.6, 1.2), o);
      }
    }
    update(dt) {
      const d = this.dummy;
      for (let i = 0; i < this.n; i++) {
        const q = this.p[i];
        if (q.life <= 0) continue;
        q.life -= dt;
        if (q.life <= 0) { d.scale.setScalar(0); d.updateMatrix(); this.mesh.setMatrixAt(i, d.matrix); continue; }
        q.vel.y += this.gravity * q.g * dt;
        q.vel.multiplyScalar(Math.max(0, 1 - this.drag * dt));
        q.pos.addScaledVector(q.vel, dt);
        if (this.groundY !== undefined && q.pos.y < this.groundY) { q.pos.y = this.groundY; q.vel.y *= -this.bounce; q.vel.x *= .7; q.vel.z *= .7; }
        const k = q.life / q.max;
        const s = q.size * (q.grow < 0 ? k : (1 + (1 - k) * q.grow));
        d.position.copy(q.pos); d.rotation.set(q.spin + q.life * 3, q.spin, q.life * 2); d.scale.setScalar(Math.max(.0001, s));
        d.updateMatrix(); this.mesh.setMatrixAt(i, d.matrix);
      }
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
  }
  V.Particles = Particles;

  /* ---------- the astronaut ---------- */
  const SUIT = '#f4efe6', SUIT_SHADE = '#cfd3e6', ORANGE = '#ff8f5a', NAVY = '#27315f', TEAL = '#6ff3ea';
  function makeAstronaut() {
    const root = new T.Group(), body = new T.Group(); root.add(body); body.scale.setScalar(.9);
    const SUIT2 = '#e6e1d6', DARK = '#262b4a', GOLD = '#d9a441', GLOVE = '#39406e', METAL = '#9aa3c4';
    const metal = { metalness: .55, roughness: .35 };
    const lights = [];
    const led = (c, i = 1.4) => { const m = glow(c, i); lights.push(m); return m; };

    /* ---- pelvis, belt, legs ---- */
    const hips = new T.Group(); hips.position.y = 1.0; body.add(hips);
    hips.add(cyl(.34, .3, .26, 8, SUIT, 0, 0, 0));
    hips.add(cyl(.36, .36, .07, 8, DARK, 0, .1, 0));
    hips.add(box(.13, .09, .05, GOLD, 0, .1, .355, metal));
    for (const s of [-1, 1]) {
      hips.add(box(.1, .17, .2, '#4b5380', s * .37, -.01, .12));
      hips.add(box(.08, .04, .14, ORANGE, s * .37, .09, .12));
    }
    const legs = [];
    for (const s of [-1, 1]) {
      const thigh = new T.Group(); thigh.position.set(s * .19, -.08, 0); hips.add(thigh);
      thigh.add(cyl(.17, .145, .5, 8, SUIT, 0, -.24, 0));
      thigh.add(box(.03, .36, .1, ORANGE, s * .165, -.24, 0));
      const knee = new T.Group(); knee.position.y = -.5; thigh.add(knee);
      knee.add(ico(.15, 1, SUIT_SHADE, 0, 0, 0));
      knee.add(box(.2, .15, .1, DARK, 0, .0, .12));
      knee.add(cyl(.14, .115, .34, 8, SUIT, 0, -.17, 0));
      knee.add(cyl(.13, .13, .06, 8, ORANGE, 0, -.31, 0));
      knee.add(box(.28, .16, .4, GLOVE, 0, -.34, .07));          // boot
      knee.add(box(.3, .05, .43, DARK, 0, -.42, .07));             // sole
      for (let k = 0; k < 3; k++) knee.add(box(.28, .02, .03, '#4c557f', 0, -.455, -.05 + k * .12)); // treads
      knee.add(box(.26, .1, .1, ORANGE, 0, -.35, .27));            // toe cap
      legs.push({ thigh, knee });
    }

    /* ---- torso ---- */
    const torso = new T.Group(); torso.position.y = .1; hips.add(torso);
    torso.add(cyl(.42, .36, .62, 8, SUIT, 0, .32, 0));
    torso.add(box(.52, .34, .12, SUIT_SHADE, 0, .4, .32));
    torso.add(cyl(.5, .45, .16, 8, SUIT, 0, .66, 0));
    torso.add(cyl(.24, .27, .1, 10, METAL, 0, .76, 0, metal));
    const unit = box(.38, .25, .09, DARK, 0, .42, .4); torso.add(unit);
    const display = glow(TEAL, 1.6); torso.add(box(.25, .08, .02, display, 0, .48, .452));
    [['#ff7a8a', -.12], ['#ffd06b', -.04], ['#6ff3ea', .04], ['#a9f58f', .12]].forEach(([c, x]) => torso.add(box(.05, .05, .03, led(c), x, .37, .452)));
    torso.add(box(.17, .07, .02, '#f4f0e8', .22, .58, .385));
    torso.add(box(.1, .015, .025, '#3a4170', .22, .58, .397));
    for (const s of [-1, 1]) {  // umbilical hoses chest -> pack
      torso.add(cyl(.045, .045, .09, 6, s < 0 ? ORANGE : '#6fa8ff', s * .2, .5, .42).rotateX(Math.PI / 2));
      const curve = new T.CatmullRomCurve3([new T.Vector3(s * .2, .5, .46), new T.Vector3(s * .5, .5, .3), new T.Vector3(s * .52, .46, -.1), new T.Vector3(s * .36, .5, -.4)]);
      torso.add(mesh(new T.TubeGeometry(curve, 12, .03, 6, false), mat('#3a4060', { roughness: .6 })));
    }
    // life-support pack
    const pack = new T.Group(); pack.position.set(0, .34, -.46); torso.add(pack);
    pack.add(box(.74, .84, .32, '#cfd5ea', 0, .1, 0));
    pack.add(box(.78, .1, .36, METAL, 0, .56, 0, metal));
    for (const s of [-1, 1]) {
      pack.add(cyl(.13, .13, .72, 8, SUIT2, s * .2, .12, -.25));
      pack.add(cyl(.09, .13, .07, 8, ORANGE, s * .2, .5, -.25));
      pack.add(cyl(.045, .045, .12, 6, METAL, s * .2, .59, -.25, metal));
    }
    for (let k = 0; k < 3; k++) pack.add(box(.5, .04, .02, DARK, 0, -.18 + k * .08, -.17));
    const packLight = glow(TEAL, 1.2); pack.add(box(.42, .07, .04, packLight, 0, .38, .17));
    pack.add(box(.05, .05, .03, led('#ff7a8a'), -.28, .38, .17));
    pack.add(cyl(.02, .02, .4, 4, METAL, .3, .75, -.05, metal));

    /* ---- arms ---- */
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(s * .56, .62, 0); torso.add(sh);
      sh.add(ico(.19, 1, SUIT_SHADE, 0, 0, 0));
      sh.add(cyl(.145, .125, .34, 8, SUIT, 0, -.2, 0));
      const ring = cyl(.1, .1, .015, 10, ORANGE, s * .15, -.12, 0); ring.rotation.z = Math.PI / 2; sh.add(ring);
      const patch = cyl(.075, .075, .02, 10, s < 0 ? TEAL : '#f4f0e8', s * .16, -.12, 0); patch.rotation.z = Math.PI / 2; sh.add(patch);
      const elbow = new T.Group(); elbow.position.y = -.38; sh.add(elbow);
      elbow.add(ico(.13, 1, SUIT_SHADE, 0, 0, 0));
      elbow.add(cyl(.12, .1, .3, 8, SUIT, 0, -.17, 0));
      elbow.add(cyl(.115, .115, .05, 8, ORANGE, 0, -.33, 0));
      const hand = new T.Group(); hand.position.y = -.4; elbow.add(hand);
      hand.add(ico(.115, 1, GLOVE, 0, -.04, 0));
      hand.add(box(.13, .1, .09, GLOVE, 0, -.14, .01));
      hand.add(box(.13, .03, .09, '#4c557f', 0, -.17, .01));
      hand.add(box(.045, .09, .05, GLOVE, -s * .09, -.08, .04).rotateZ(s * .4));
      arms.push({ sh, elbow, hand, s });
    }

    /* ---- head & helmet ---- */
    const head = new T.Group(); head.position.set(0, .88, 0); torso.add(head);
    head.add(ico(.4, 2, SUIT, 0, 0, 0));
    head.add(cyl(.3, .33, .1, 10, METAL, 0, -.36, 0, metal));
    const visor = ico(.33, 2, '#2b2f5e', 0, -.01, .2, { metalness: .35, roughness: .15, emissive: '#1d3f8f', emissiveIntensity: .5 });
    visor.scale.set(1.02, .86, .7); head.add(visor);
    const rim = mesh(new T.TorusGeometry(.31, .022, 6, 20), mat(GOLD, metal), 0, -.01, .26); rim.scale.set(1.02, .86, 1); head.add(rim);
    head.add(box(.17, .03, .02, glow('#bfe9ff', 1.2, { transparent: true, opacity: .55 }), .1, .1, .47).rotateZ(-.5));
    head.add(box(.08, .02, .02, glow('#bfe9ff', 1, { transparent: true, opacity: .4 }), .02, .03, .48).rotateZ(-.5));
    for (const s of [-1, 1]) {
      const ear = cyl(.09, .09, .06, 8, DARK, s * .4, 0, 0); ear.rotation.z = Math.PI / 2; head.add(ear);
      head.add(box(.07, .05, .06, led('#ffffff', 1.8), s * .2, .3, .28));
    }
    head.add(box(.2, .06, .12, METAL, 0, .4, -.02, metal));
    const ant = new T.Group(); ant.position.set(.34, .25, -.08); head.add(ant);
    ant.add(cyl(.02, .028, .38, 4, METAL, 0, .19, 0));
    const antTip = ico(.055, 0, glow('#ff7a8a', 1.6), 0, .4, 0); ant.add(antTip);

    // handheld tool glow (shown while working)
    const tool = glow(TEAL, 2.2, { transparent: true, opacity: 0 });
    const toolSpark = new T.Mesh(new T.OctahedronGeometry(.13, 0), tool); toolSpark.position.set(0, .55, .78); toolSpark.castShadow = false;
    root.add(toolSpark);
    const light = new T.PointLight(0x7df7ee, .5, 9, 2); light.position.set(0, 1.6, .5); root.add(light);

    const rig = { group: root, phase: 0, heading: 0, work: 0, lean: 0, t: 0, light, toolSpark };
    rig.update = (dt, s) => {
      rig.t += dt;
      const t = rig.t, speed = s.speed, moving = speed > 8;
      rig.heading += angleDelta(rig.heading, s.heading) * (1 - Math.exp(-(moving ? 14 : 6) * dt));
      root.rotation.y = rig.heading;
      rig.phase += dt * (3 + speed * .055);
      rig.work = damp(rig.work, s.working ? 1 : 0, 9, dt);
      rig.lean = damp(rig.lean, Math.min(1, speed / 175), 8, dt);
      const L = rig.lean, W = rig.work, ph = rig.phase, breath = Math.sin(t * 2) * .012;
      // gait: thigh swing, knee flexion while the leg swings through, opposite arm swing
      legs.forEach((lg, i) => {
        const p = ph + i * Math.PI;
        lg.thigh.rotation.x = -Math.sin(p) * .75 * L - (1 - L) * .02;
        lg.knee.rotation.x = (Math.max(0, Math.cos(p)) * .95 + .05) * L + .03 * (1 - L);
      });
      body.position.y = Math.abs(Math.sin(ph)) * .07 * L + breath * .5;
      hips.rotation.y = Math.sin(ph) * .14 * L;
      hips.position.x = Math.sin(ph) * .025 * L;
      torso.rotation.y = -Math.sin(ph) * .18 * L;
      torso.rotation.x = L * .16 + W * .12;
      torso.rotation.z = Math.sin(ph) * .04 * L;
      torso.scale.y = 1 + breath;
      arms.forEach((a, i) => {
        const p = ph + i * Math.PI, sn = Math.sin(p), idle = Math.sin(t * 1.7 + i * 2) * .03;
        const wob = Math.sin(t * 16 + i) * .08;
        a.sh.rotation.x = lerp(sn * .65 * L + idle, -1.25 + wob, W);
        a.sh.rotation.z = a.s * lerp(.1 + L * .03, .2, W);
        a.elbow.rotation.x = lerp(-(.3 + Math.max(0, -sn) * .4) * L - .1, -.55 + wob * .6, W);
        a.hand.rotation.x = lerp(0, -.3, W);
      });
      head.rotation.x = -torso.rotation.x * .75 - L * .04;
      head.rotation.y = -torso.rotation.y * .8 + Math.sin(t * .5) * .09 * (1 - L);
      ant.rotation.z = -L * .5 + Math.sin(t * 2.2) * .06; ant.rotation.x = -L * .15;
      antTip.material.emissiveIntensity = 1 + Math.sin(t * 5) * .8;
      packLight.emissiveIntensity = moving ? 1.6 + Math.sin(t * 14) * .8 : 1;
      display.emissiveIntensity = 1.3 + Math.sin(t * 3) * .5 + W * .8;
      lights.forEach((m, i) => { m.emissiveIntensity = 1.1 + Math.sin(t * 3 + i * 1.7) * .6; });
      tool.opacity = W * (.7 + Math.sin(t * 30) * .3);
      toolSpark.scale.setScalar(.6 + W * .8 + Math.sin(t * 25) * .15);
      toolSpark.rotation.y += dt * 8;
    };
    return rig;
  }
  V.makeAstronaut = makeAstronaut;

  /* ---------- the landing probe ---------- */
  function makeProbe(o = {}) {
    const g = new T.Group(), inner = new T.Group(); g.add(inner);
    inner.add(cyl(.7, .9, 1.5, 7, '#e9e4d8', 0, 1.35, 0));
    inner.add(cyl(.92, .92, .16, 7, ORANGE, 0, 1.0, 0));
    inner.add(cone(.7, .8, 7, '#c9ccdd', 0, 2.5, 0));
    inner.add(cyl(.05, .05, .9, 4, '#a9b0cf', 0, 3.3, 0));
    inner.add(octa(.1, glow('#ff7a8a', 1.8), 0, 3.8, 0));
    inner.add(cyl(.5, .6, .35, 7, '#40486f', 0, .45, 0));
    const nozzle = cone(.36, .5, 8, '#2a3050', 0, .1, 0); nozzle.rotation.x = Math.PI; inner.add(nozzle);
    const win = box(.5, .28, .12, glow(TEAL, 1.2), 0, 1.7, .68); inner.add(win);
    // capsule bay with three sample slots
    const bay = box(.5, .6, .18, '#30375c', 0, 1.1, -.86); inner.add(bay);
    const slots = [0, 1, 2].map(i => { const m = glow('#33405f', 0.2); inner.add(box(.1, .1, .06, m, -.15 + i * .15, 1.1, -.97)); return m; });
    // solar flaps
    const flaps = [-1, 1].map(s => {
      const pivot = new T.Group(); pivot.position.set(s * .88, 1.5, 0);
      pivot.add(box(1.4, .06, .8, '#3d6bdc', s * .7, 0, 0));
      pivot.add(box(1.4, .07, .06, '#9fb8ff', s * .7, 0, 0));
      inner.add(pivot); return pivot;
    });
    // legs
    const legs = [0, 1, 2, 3].map(i => {
      const a = i * Math.PI / 2 + Math.PI / 4, pivot = new T.Group(); pivot.position.set(Math.cos(a) * .6, .7, Math.sin(a) * .6); pivot.rotation.y = -a;
      const strut = new T.Group(); pivot.add(strut);
      strut.add(cyl(.05, .06, 1.5, 5, '#c9ccdd', .45, -.55, 0).rotateZ(.55));
      strut.add(cyl(.2, .24, .08, 6, ORANGE, .93, -1.22, 0));
      inner.add(pivot); return strut;
    });
    // exhaust
    const flameMat = glow('#ffb35a', 2, { transparent: true, opacity: .9 });
    const flame = new T.Mesh(new T.ConeGeometry(.3, 1.6, 7), flameMat); flame.rotation.x = Math.PI; flame.position.y = -.7; flame.castShadow = false; inner.add(flame);
    const flameLight = new T.PointLight(0xffa55a, 0, 24, 2); flameLight.position.y = -.4; inner.add(flameLight);
    const api = { group: g, inner, slots, flaps, legs, flame, flameLight, legsOpen: 0, flapsOpen: 0 };
    api.setLegs = t => { api.legsOpen = t; legs.forEach(s => { s.rotation.z = lerp(.95, -.05, t); }); };
    api.setFlaps = t => { api.flapsOpen = t; flaps.forEach((p, i) => { p.rotation.z = (i ? -1 : 1) * lerp(1.35, 0, t); }); };
    api.setThrust = (t, time = 0) => {
      flame.visible = t > .02;
      flame.scale.set(.6 + t * .6, .3 + t * 1.5 + Math.sin(time * 45) * .12 * t, .6 + t * .6);
      flame.position.y = -.35 - .8 * (.3 + t * 1.5) * .5;
      flameMat.opacity = .5 + t * .5; flameLight.intensity = t * 4;
    };
    api.setLegs(o.legsOpen ?? 1); api.setFlaps(o.flapsOpen ?? 0); api.setThrust(0);
    return api;
  }
  V.makeProbe = makeProbe;

  /* ---------- the Astrid, seen from outside (menu hero) ---------- */
  function makeShipExterior() {
    const g = new T.Group();
    g.add(cyl(1.5, 1.8, 7, 8, '#5b6aa6', 0, 0, 0).rotateZ(Math.PI / 2));
    g.add(cone(1.5, 2.6, 8, '#d7dbea', 4.8, 0, 0).rotateZ(-Math.PI / 2));
    for (const x of [-2, 0, 2]) g.add(cyl(1.95, 1.95, .35, 8, '#8a98c9', x, 0, 0).rotateZ(Math.PI / 2));
    for (const x of [-1, 1.5]) for (const s of [-1, 1]) g.add(box(.5, .35, .08, glow('#ffd18a', 1.2), x, .5, s * 1.78));
    g.add(box(1.8, .5, 1.3, '#2d3560', 1.6, 1.8, 0)); g.add(box(1, .3, .9, glow(TEAL, 1.1), 2.1, 2.05, 0));
    for (const s of [-1, 1]) {
      g.add(box(.25, .25, 3.2, '#9aa6d6', -.5, 0, s * 3));
      g.add(box(2.6, .1, 3, '#3b66d8', -.5, 0, s * 5.2)); g.add(box(2.6, .12, .08, '#a8c0ff', -.5, 0, s * 5.2));
      g.add(box(.08, .12, 3, '#a8c0ff', -.5, 0, s * 5.2));
    }
    const dish = cone(.9, .5, 10, '#e5e8f5', -1.6, -2.1, 0); dish.rotation.z = Math.PI; g.add(dish); g.add(cyl(.05, .05, 1.2, 4, '#9aa6d6', -1.6, -1.6, 0));
    const engine = [];
    for (const z of [-.8, 0, .8]) {
      const n = cone(.45, .8, 8, '#2a3050', -4, 0, z * 1.1).rotateZ(-Math.PI / 2); g.add(n);
      const f = new T.Mesh(new T.ConeGeometry(.35, 3, 7), glow('#ffa25a', 2, { transparent: true, opacity: .85 })); f.rotation.z = Math.PI / 2; f.position.set(-5.7, 0, z * 1.1); f.castShadow = false; g.add(f); engine.push(f);
    }
    g.userData.engine = engine;
    return g;
  }
  V.makeShipExterior = makeShipExterior;

  /* ---------- sky dome for the cinematics ---------- */
  function makeSky(top, horizon) {
    const geo = lowPoly(new T.IcosahedronGeometry(400, 2), (c, x, y, z) => { const t = clamp((y / 400 + .15) / 1.0, 0, 1); c.set(horizon).lerp(new T.Color(top), Math.pow(t, .7)); });
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    m.frustumCulled = false; return m;
  }
  V.makeSky = makeSky;

  // Rough low-poly terrain disc used by both cinematics.
  function makeTerrain(w, d, seg, amp, flatten, seed = 1) {
    const geo = new T.PlaneGeometry(w, d, seg, seg); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z), f = flatten ? smooth((r - flatten) / (flatten * 1.6)) : 1;
      pos.setY(i, (fbm(x * .09 + seed, 0, z * .09 + seed, 4) - .45) * amp * f);
    }
    const lp = lowPoly(geo, (c, x, y, z) => {
      const h = clamp(y / (amp * .5) * .5 + .5, 0, 1);
      c.set('#7a3b46').lerp(new T.Color('#d8905a'), h).lerp(new T.Color('#f1c88c'), Math.max(0, h - .7) * 2.5);
      c.multiplyScalar(.85 + hash(Math.round(x * 3), Math.round(z * 3), 1) * .25);
    });
    const m = new T.Mesh(lp, vcMat()); m.receiveShadow = true; return m;
  }
  V.makeTerrain = makeTerrain;
})();
