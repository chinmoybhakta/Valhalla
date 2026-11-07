/* Operation: Valhalla Journey — interior map, space background and live ship scene */
(() => {
  'use strict';
  const V = window.Valhalla, T = THREE;
  const { clamp, lerp, smooth, damp, rand, box, cyl, ico, cone, octa, glow, mat } = V;

  /* ------------------------------------------------------------------
     Station models. Each builder returns { group, height, update(t, st) }.
     W / D are the footprint in world units.
  ------------------------------------------------------------------ */
  const B = {
    reactor(W, D) {
      const g = new T.Group();
      g.add(box(W, .3, D, '#39456f', 0, .15, 0));
      const glass = glow('#59f0d8', .6, { transparent: true, opacity: .55 });
      g.add(cyl(.95, .95, 2.7, 10, glass, 0, 1.65, 0));
      const coreMat = glow('#a4ffe1', 1.6), core = octa(.55, coreMat, 0, 1.65, 0); g.add(core);
      for (const y of [.5, 2.8]) g.add(cyl(1.12, 1.12, .25, 10, '#2a3358', 0, y, 0));
      for (const s of [-1, 1]) g.add(cyl(.14, .14, 2.3, 5, '#8a98c9', s * (W / 2 - .3), 1.15, -D / 2 + .35));
      g.add(box(W * .6, .1, .3, glow('#ffbf72', 1), 0, .35, D / 2 - .3));
      return { group: g, height: 3.2, update(t, st) {
        core.rotation.y = t * 1.4; core.rotation.x = t * .7;
        const c = st.emergency ? '#ff7187' : '#a4ffe1';
        coreMat.color.set(c); coreMat.emissive.set(c); coreMat.emissiveIntensity = 1.3 + Math.sin(t * (st.emergency ? 14 : 3)) * .6;
        glass.emissive.set(st.emergency ? '#ff4d6a' : '#59f0d8');
        g.position.x = st.emergency ? Math.sin(t * 40) * .03 : 0;
      } };
    },
    wire(W, D) {
      const g = new T.Group();
      g.add(box(W, .3, D, '#39456f', 0, .15, 0));
      g.add(box(W * .86, 2.3, .55, '#25304f', 0, 1.35, -D / 2 + .4));
      const colors = ['#ff887e', '#ffe093', '#72e5e6'];
      colors.forEach((c, i) => {
        const m = glow(c, .9);
        g.add(box(W * .6, .09, .09, m, 0, 1.0 + i * .5, -D / 2 + .72));
        g.add(box(.09, .45, .09, m, -W * .22 + i * .4, 1.2 + i * .5, -D / 2 + .72));
        g.add(ico(.12, 0, '#dee1ec', -W * .3, 1.0 + i * .5, -D / 2 + .72)); g.add(ico(.12, 0, '#dee1ec', W * .3, 1.0 + i * .5, -D / 2 + .72));
      });
      const sparkMat = glow('#ffe093', 0, { transparent: true, opacity: 0 }), spark = octa(.2, sparkMat, 0, 1.9, -D / 2 + .85); g.add(spark);
      g.add(box(W * .5, .5, .5, '#39456f', 0, .55, D / 2 - .5));
      return { group: g, height: 2.7, update(t, st) {
        const on = st.emergency && Math.sin(t * 30) > -.2;
        sparkMat.opacity = on ? 1 : 0; sparkMat.emissiveIntensity = on ? 3 : 0; spark.rotation.y = t * 20;
      } };
    },
    console(W, D, n = 3) {
      const g = new T.Group();
      g.add(box(W, .95, D * .75, '#3a4670', 0, .475, -D * .1));
      g.add(box(W + .1, .1, D * .8, '#5a6aa0', 0, 1.0, -D * .1));
      const mats = [];
      for (let i = 0; i < n; i++) {
        const sw = (W - .6) / n - .15, m = glow('#4fd6e0', 1), x = -W / 2 + .3 + (i + .5) * ((W - .6) / n);
        const scr = box(sw, 1.0, .1, m, x, 1.75, -D * .32); scr.rotation.x = -.28; g.add(scr);
        g.add(box(sw + .12, 1.1, .08, '#161d3a', x, 1.75, -D * .32 - .06).rotateX(-.28));
        g.add(box(sw * .6, .08, .02, '#e9fff9', x - sw * .1, 1.9, -D * .32 + .08).rotateX(-.28));
        mats.push(m);
      }
      for (let i = 0; i < 9; i++) g.add(box(.16, .06, .16, i % 3 ? '#c7d8df' : '#ffcc75', -W * .38 + i * (W * .76 / 8), 1.08, D * .12));
      return { group: g, height: 2.8, update(t, st) {
        mats.forEach((m, i) => {
          const c = st.emergency ? '#ff647f' : st.special ? '#ffcd75' : '#4fd6e0';
          m.color.set(c); m.emissive.set(c); m.emissiveIntensity = .8 + Math.sin(t * 2.4 + i * 1.7) * .35 + (st.emergency ? Math.sin(t * 12) * .5 : 0);
        });
      } };
    },
    storage(W, D) {
      const g = new T.Group();
      g.add(box(W * .92, 2.0, D * .85, '#7d6a9c', 0, 1.0, 0));
      for (let i = 0; i < 3; i++) { g.add(box(W * .8, .52, .06, '#9377aa', 0, .38 + i * .62, D * .43)); g.add(box(.5, .08, .08, glow('#f4dda8', .8), 0, .38 + i * .62, D * .47)); }
      return { group: g, height: 2.2, update() {} };
    },
    tv(W, D) {
      const g = new T.Group();
      g.add(box(W, .75, D, '#3a2e5a', 0, .375, 0));
      const m = glow('#8f6ae0', 1.1); g.add(box(W * .9, 1.25, .12, m, 0, 1.5, 0));
      g.add(box(W * .96, 1.35, .08, '#131c38', 0, 1.5, -.07)); g.add(box(.5, .35, .3, '#c8b9e1', 0, .93, 0));
      return { group: g, height: 2.3, update(t) { const c = new T.Color().setHSL(.72 + Math.sin(t * .8) * .08, .6, .6); m.color.copy(c); m.emissive.copy(c); m.emissiveIntensity = .9 + Math.sin(t * 7) * .15; } };
    },
    toilet(W, D) {
      const g = new T.Group();
      g.add(cyl(.7, .85, .75, 8, '#e4eaf0', 0, .38, .35));
      g.add(cyl(.62, .62, .08, 8, '#54718d', 0, .78, .35));
      g.add(box(1.3, 1.3, .55, '#d0dbe2', 0, .95, -D / 2 + .45)); g.add(box(.3, .1, .1, glow('#6ff3ea', 1), 0, 1.65, -D / 2 + .75));
      return { group: g, height: 1.9, update() {} };
    },
    water(W, D) {
      const g = new T.Group();
      g.add(box(W * .9, 1.15, D * .9, '#c6d9df', 0, .58, 0));
      g.add(cyl(.62, .62, 1.3, 9, glow('#4098c2', .7, { transparent: true, opacity: .75 }), 0, 1.8, -.1));
      g.add(cyl(.25, .25, .15, 6, '#f0edda', 0, 2.5, -.1)); g.add(box(.3, .3, .5, '#7de2ef', 0, .95, D * .38));
      return { group: g, height: 2.7, update() {} };
    },
    food(W, D) {
      const g = new T.Group();
      g.add(box(W * .92, 1.2, D * .9, '#bd805a', 0, .6, 0));
      g.add(box(W * .5, .8, .12, '#342d42', -W * .12, .8, D * .42)); g.add(box(W * .3, .15, .12, glow('#ecb86c', 1), -W * .12, .55, D * .5));
      g.add(ico(.17, 0, glow('#b8f594', 1), W * .32, 1.35, 0)); g.add(ico(.15, 0, glow('#ffcd75', 1), W * .32, 1.35, .35));
      return { group: g, height: 1.8, update() {} };
    },
    waste(W, D) {
      const g = new T.Group();
      g.add(box(W * .95, 2, D * .88, '#202840', 0, 1, 0));
      for (let i = 0; i < 6; i++) g.add(box(W * .95, .16, .06, i % 2 ? '#ffc06b' : '#161c33', 0, .3 + i * .3, D * .44 + .02));
      const hatch = box(W * .6, .9, .16, '#0b1227', 0, 1.35, D * .44); g.add(hatch);
      const m = glow('#ff9d4d', 1.4); g.add(box(W * .5, .08, .1, m, 0, 1.85, D * .46));
      return { group: g, height: 2.3, update(t, st) { m.emissiveIntensity = st.nearest ? 2.5 : 1 + Math.sin(t * 3) * .4; } };
    },
    workbench(W, D) {
      const g = new T.Group();
      g.add(box(W, .9, D, '#9a7a5e', 0, .45, 0)); g.add(box(W + .1, .1, D + .1, '#e7cfa0', 0, .95, 0));
      const probe = V.makeProbe({ legsOpen: 1, flapsOpen: 1 }); probe.group.scale.setScalar(.38); probe.group.position.set(-W * .22, 1.0, 0); g.add(probe.group);
      const status = glow('#ffcd75', 1.5); g.add(box(.5, .14, .14, status, W * .3, 1.08, D * .25));
      g.add(box(.2, .12, .8, '#dde4e9', W * .12, 1.06, -.1)); g.add(box(.9, .1, .5, glow('#65d4d1', .9), W * .38, 1.05, -.1));
      return { group: g, height: 2.8, update(t, st) {
        const c = st.probeBuilt ? '#a7f491' : st.special ? '#ffcd75' : '#7bddda';
        status.color.set(c); status.emissive.set(c); probe.group.rotation.y = t * .5;
        probe.slots.forEach((m, i) => { const on = st.probeBuilt; m.color.set(on ? '#7bf0d0' : '#33405f'); m.emissive.set(on ? '#7bf0d0' : '#33405f'); m.emissiveIntensity = on ? 1.4 : .2; });
      } };
    },
    bed(W, D) {
      const g = new T.Group();
      g.add(box(W, .45, D, '#6c5a9a', 0, .23, 0));
      g.add(box(W * .9, .42, D * .9, '#f4ede4', 0, .65, 0));
      g.add(box(W * .86, .3, D * .5, '#8462b4', 0, .88, D * .22));
      g.add(box(W * .6, .26, .8, '#fff4e4', 0, .92, -D * .33));
      g.add(box(W, 1.3, .2, '#4a3d78', 0, .85, -D / 2));
      return { group: g, height: 1.7, update() {} };
    },
    oxygen(W, D) {
      const g = new T.Group();
      g.add(box(W * .9, .8, D * .9, '#2a4a5a', 0, .4, 0));
      g.add(box(W * .86, 1.1, .2, '#133b4a', 0, 1.35, -D * .2));
      const ringMat = glow('#9ef4ea', 1.2); const ring = mesh(new T.TorusGeometry(.38, .07, 5, 12), ringMat, -W * .2, 1.4, -D * .08); g.add(ring);
      g.add(box(.5, .07, .05, glow('#b8f197', 1), W * .18, 1.6, -D * .08)); g.add(box(.35, .07, .05, glow('#79c9e7', 1), W * .15, 1.4, -D * .08));
      return { group: g, height: 2.1, update(t, st) { ringMat.emissiveIntensity = st.done ? 1.2 : 1.2 + Math.sin(t * 5) * .8; } };
    },
    repair(W, D) {
      const g = new T.Group();
      g.add(box(W * .9, 1.6, D * .85, '#45385a', 0, .8, 0));
      const m = glow('#99f0df', 1.2); g.add(box(.18, .8, .08, m, 0, 1.0, D * .43)); g.add(box(.8, .18, .08, m, 0, 1.0, D * .43));
      g.add(box(W * .8, .12, .1, '#e7bd81', 0, 1.55, D * .43));
      return { group: g, height: 1.9, update() {} };
    },
    trash(W, D) {
      const g = new T.Group();
      const cols = ['#829e65', '#c5ba79', '#b99667', '#2e3f31', '#e1c994'];
      for (let i = 0; i < 7; i++) { const m = i % 2 ? ico(rand(.2, .38), 0, cols[i % 5], rand(-.5, .5), .25 + rand(0, .3), rand(-.5, .5)) : box(rand(.3, .6), rand(.25, .5), rand(.3, .6), cols[i % 5], rand(-.5, .5), .2, rand(-.5, .5)); m.rotation.y = rand(0, 3); g.add(m); }
      g.add(box(1.4, .08, 1.1, glow('#b9bf65', .6), 0, .04, 0));
      return { group: g, height: 1.1, update() {} };
    }
  };
  const mesh = V.mesh;

  function chairModel() {
    const g = new T.Group();
    g.add(box(1.4, .3, 1.4, '#546aa0', 0, .85, 0)); g.add(box(1.3, 1.1, .25, '#899bc6', 0, 1.5, .7));
    g.add(cyl(.12, .12, .65, 5, '#ccd3e5', 0, .5, 0)); g.add(cyl(.7, .7, .1, 5, '#2a3358', 0, .08, 0));
    for (const s of [-1, 1]) g.add(box(.14, .5, .9, '#ccd3e5', s * .72, 1.15, 0));
    return g;
  }

  /* ------------------------------------------------------------------
     Gravity-driven orbit system (symplectic Euler) used for moons,
     rocks and satellites circling the background planets.
  ------------------------------------------------------------------ */
  class OrbitSystem {
    constructor(parent, planetR, GM) { this.GM = GM; this.R = planetR; this.items = []; this.group = new T.Group(); parent.add(this.group); }
    add(object, r, { ecc = 1, incl = .3, tilt = 0, spin = 1, speedSign = 1 } = {}) {
      const a = Math.random() * Math.PI * 2, e = new T.Euler(incl, 0, tilt);
      const pos = new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r).applyEuler(e);
      const vel = new T.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(Math.sqrt(this.GM / r) * ecc * speedSign).applyEuler(e);
      this.group.add(object);
      this.items.push({ object, pos, vel, spin: new T.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(spin) });
    }
    update(dt) {
      const n = 2, h = dt / n;
      for (let s = 0; s < n; s++) for (const it of this.items) {
        const r2 = it.pos.lengthSq(), r = Math.sqrt(r2);
        it.vel.addScaledVector(it.pos, -this.GM / (r2 * r) * h);
        it.pos.addScaledVector(it.vel, h);
        if (r < this.R * 1.03) { const nrm = it.pos.clone().normalize(); it.vel.reflect(nrm).multiplyScalar(.6); it.pos.copy(nrm.multiplyScalar(this.R * 1.04)); }
      }
      for (const it of this.items) { it.object.position.copy(it.pos); it.object.rotation.x += it.spin.x * dt; it.object.rotation.y += it.spin.y * dt; it.object.rotation.z += it.spin.z * dt; }
    }
  }
  const rockMats = ['#8b7f8f', '#6f6679', '#a39688', '#7d7f95'];
  const rock = (r) => { const m = ico(r, 0, rockMats[(Math.random() * rockMats.length) | 0]); m.scale.set(rand(.8, 1.3), rand(.7, 1.1), rand(.8, 1.3)); m.castShadow = false; return m; };
  function satellite() {
    const g = new T.Group();
    g.add(box(1.4, 1, 1, '#e5e8f5', 0, 0, 0));
    for (const s of [-1, 1]) { g.add(box(3, .08, 1.2, '#3d6bdc', s * 2.4, 0, 0)); g.add(box(.1, .1, .1, '#9fb8ff', s * 1, 0, 0)); }
    g.add(cone(.5, .5, 8, '#c9ccdd', 0, .8, 0)); g.add(octa(.14, glow('#ff7a8a', 2), 0, 1.2, 0));
    g.scale.setScalar(1.6); return g;
  }
  const KEYS = {
    earth: [[0, 98], [.3, 520], [.7, 700], [.93, 260], [1, 100]],
    kepler: [[0, 700], [.5, 260], [.6, 112], [.67, 112], [.74, 220], [1, 700]]
  };
  function keyed(list, p) {
    for (let i = 0; i < list.length - 1; i++) {
      const [a, va] = list[i], [b, vb] = list[i + 1];
      if (p >= a && p <= b) return lerp(va, vb, smooth((p - a) / (b - a)));
    }
    return list[list.length - 1][1];
  }

  /* ------------------------------------------------------------------
     ShipWorld
  ------------------------------------------------------------------ */
  class ShipWorld {
    constructor(canvas, cfg) {
      this.cfg = cfg; this.K = .05; this.canvas = canvas; this.t = 0;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.renderer.setClearColor(0x070a1c);
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(32, 1.6, .5, 3000);
      this.focus = new T.Vector3(); this.zoom = 1; this.shake = 0; this.aspect = 1.6;
      this.pulses = []; this.stepAcc = 0; this.sparkT = 0; this.steamT = 0; this.mistT = 0; this.shakeT = 0;
      this.buildLights(); this.buildSpace(); this.buildShip(); this.buildStations(); this.buildPlayer();
      this.fx = new V.Particles(this.scene, 500, { gravity: -5, groundY: .05, bounce: .2 });
      this.fxFloat = new V.Particles(this.scene, 300, { gravity: 0, drag: .6 });
      this.resize();
    }
    wx(px) { return (px - 500) * this.K; }
    wz(py) { return (py - 360) * this.K; }

    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.aspect = w / h; this.camera.aspect = this.aspect; this.camera.updateProjectionMatrix();
    }

    buildLights() {
      const s = this.scene;
      this.hemi = new T.HemisphereLight(0xa9b8ff, 0x3a2f55, .85); s.add(this.hemi);
      const sun = this.sun = new T.DirectionalLight(0xfff1dc, .95);
      sun.position.set(-18, 34, 20); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 24, bottom: -24, near: 5, far: 90 });
      sun.shadow.bias = -.0006; s.add(sun); s.add(sun.target);
      this.roomLights = this.cfg.rooms.map((r, i) => {
        const l = new T.PointLight(this.cfg.roomColors[i], .7, 30, 1.6);
        l.position.set(this.wx(r.x + r.w / 2), 6, this.wz(r.y + r.h / 2)); l.userData.base = new T.Color(this.cfg.roomColors[i]);
        s.add(l); return l;
      });
    }

    buildSpace() {
      const s = this.scene;
      this.stars = V.makeStars(1500, 1500, 2); this.stars2 = V.makeStars(300, 1450, 3.2); s.add(this.stars, this.stars2);
      this.space = new T.Group(); s.add(this.space);
      // distant sun
      const sun = V.glowSprite('#ffe6b0', 260, .9); sun.position.set(-520, 360, 380); this.space.add(sun);
      const disc = new T.Mesh(new T.IcosahedronGeometry(26, 1), new T.MeshBasicMaterial({ color: '#fff4d6' })); disc.position.copy(sun.position); this.space.add(disc);
      this.planets = {};
      for (const kind of ['earth', 'kepler']) {
        const holder = new T.Group(), planet = V.makePlanet(kind === 'earth' ? 72 : 90, kind);
        holder.add(planet); this.space.add(holder);
        const orbit = new OrbitSystem(holder, kind === 'earth' ? 72 : 90, 8400);
        if (kind === 'earth') {
          orbit.add(satellite(), 112, { incl: .35, ecc: 1, spin: .3 });
          const moon = ico(9, 1, '#c9c6d6'); moon.castShadow = false; orbit.add(moon, 230, { incl: .2, ecc: 1, spin: .05 });
          for (let i = 0; i < 12; i++) orbit.add(rock(rand(.4, 1)), rand(120, 150), { incl: rand(.2, .5), tilt: rand(-.3, .3), ecc: rand(.96, 1.04) });
        } else {
          for (const [r, c] of [[26, '#d9b6ff'], [18, '#9ee0e8']]) { const m = ico(r / 2.6, 1, c); m.castShadow = false; orbit.add(m, r * 8.2, { incl: rand(.1, .4), ecc: 1, spin: .05 }); }
          for (let i = 0; i < 34; i++) orbit.add(rock(rand(.6, 2.6)), rand(122, 170), { incl: rand(.2, .45), tilt: rand(-.2, .2), ecc: rand(.95, 1.05) });
        }
        this.planets[kind] = { holder, planet, orbit, dist: 600, xz: kind === 'earth' ? [-48, 34] : [58, -30] };
      }
      // foreground drift rocks — parallax debris that sells the sense of travel
      this.drift = [];
      for (let i = 0; i < 18; i++) this.drift.push(this.makeDrift(rand(.5, 2.2), rand(-80, 80), rand(-26, -9), rand(-95, 95), rand(5, 8)));
      this.threat = [];
      for (let i = 0; i < 9; i++) { const d = this.makeDrift(rand(2.5, 5.5), 0, 0, 0, 0); d.object.visible = false; d.threat = true; this.threat.push(d); }
    }
    makeDrift(r, x, y, z, speed) {
      const object = rock(r); object.position.set(x, y, z); this.space.add(object);
      return { object, vel: new T.Vector3(rand(-.8, .8), 0, speed), spin: new T.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(.6) };
    }

    buildShip() {
      const { rooms, corridors, roomColors } = this.cfg, K = this.K, g = this.ship = new T.Group();
      this.scene.add(g);
      const cx = r => this.wx(r.x + r.w / 2), cz = r => this.wz(r.y + r.h / 2);
      const all = [...rooms, ...corridors];
      const onFloor = (x, y) => all.some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      all.forEach(r => {
        g.add(box(r.w * K + 1.8, 1, r.h * K + 1.8, '#222a52', cx(r), -.95, cz(r)));
        g.add(box(r.w * K, .5, r.h * K, '#2a3560', cx(r), -.25, cz(r)));
      });
      // floor tiles (instanced)
      const tiles = [];
      for (let gy = 72; gy < 700; gy += 24) for (let gx = 72; gx < 940; gx += 24)
        if ([[gx + 1, gy + 1], [gx + 23, gy + 1], [gx + 1, gy + 23], [gx + 23, gy + 23]].every(p => onFloor(p[0], p[1]))) tiles.push([gx + 12, gy + 12, ((gx - 72) / 24 + (gy - 72) / 24) & 1]);
      const tileMesh = new T.InstancedMesh(new T.BoxGeometry(1.1, .08, 1.1), new T.MeshStandardMaterial({ flatShading: true, roughness: .7 }), tiles.length);
      tileMesh.receiveShadow = true; const d = new T.Object3D(), c = new T.Color();
      tiles.forEach(([x, y, alt], i) => {
        d.position.set(this.wx(x), .04, this.wz(y)); d.updateMatrix(); tileMesh.setMatrixAt(i, d.matrix);
        const ri = rooms.findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
        c.set(alt ? '#34456f' : '#3c4e7c').multiplyScalar(.92 + V.vnoise(x * .05, y * .05, 2) * .16);
        if (ri >= 0) c.lerp(new T.Color(roomColors[ri]), .1);
        tileMesh.setColorAt(i, c);
      });
      g.add(tileMesh);
      // walls
      const trims = roomColors.map(col => glow(col, .9));
      const winMat = new T.MeshBasicMaterial({ map: V.windowTexture() });
      const wall = (side, a, b, edge, h, col, ri, windows) => {
        const len = b - a; if (len < 2) return;
        const horiz = side === 'N' || side === 'S', off = side === 'N' || side === 'W' ? -5 : 5, th = 10 * K;
        const mx = horiz ? (a + b) / 2 : edge + off, my = horiz ? edge + off : (a + b) / 2;
        const w = horiz ? len * K : th, dd = horiz ? th : len * K, X = this.wx(mx), Z = this.wz(my);
        g.add(box(w, h, dd, col, X, h / 2, Z));
        g.add(box(w + .02, .14, dd + .02, trims[ri], X, h + .07, Z));
        const innerZ = side === 'N' ? th / 2 + .04 : side === 'S' ? -(th / 2 + .04) : 0;
        const innerX = side === 'W' ? th / 2 + .04 : side === 'E' ? -(th / 2 + .04) : 0;
        g.add(box(horiz ? w : .08, .08, horiz ? .08 : dd, trims[ri], X + innerX, .1, Z + innerZ));
        if (windows && side === 'N') {
          const cnt = Math.max(1, Math.floor(w / 4.6));
          for (let i = 0; i < cnt; i++) {
            const wxp = X - w / 2 + (i + .5) * (w / cnt);
            g.add(box(3.1, 1.45, .14, '#161d3a', wxp, 2.15, Z + th / 2 + .03));
            const gl = new T.Mesh(new T.PlaneGeometry(2.8, 1.2), winMat); gl.position.set(wxp, 2.15, Z + th / 2 + .11); g.add(gl);
          }
        }
      };
      const wallCol = '#3a4676';
      rooms.forEach((r, i) => {
        const gaps = { N: [], S: [], W: [], E: [] };
        for (const c of corridors) {
          if (c.x < r.x + r.w && c.x + c.w > r.x) {
            if (c.y <= r.y && c.y + c.h >= r.y) gaps.N.push([c.x, c.x + c.w]);
            if (c.y <= r.y + r.h && c.y + c.h >= r.y + r.h) gaps.S.push([c.x, c.x + c.w]);
          }
          if (c.y < r.y + r.h && c.y + c.h > r.y) {
            if (c.x <= r.x && c.x + c.w >= r.x) gaps.W.push([c.y, c.y + c.h]);
            if (c.x <= r.x + r.w && c.x + c.w >= r.x + r.w) gaps.E.push([c.y, c.y + c.h]);
          }
        }
        const run = (side, lo, hi, edge, h) => {
          let cur = lo; for (const [ga, gb] of gaps[side].sort((p, q) => p[0] - q[0])) { wall(side, cur, ga, edge, h, wallCol, i, true); cur = gb; }
          wall(side, cur, hi, edge, h, wallCol, i, true);
        };
        run('N', r.x - 10, r.x + r.w + 10, r.y, 3.3); run('S', r.x - 10, r.x + r.w + 10, r.y + r.h, .75);
        run('W', r.y, r.y + r.h, r.x, 1.5); run('E', r.y, r.y + r.h, r.x + r.w, 1.5);
        // corner pillars + blinking beacons
        this.beacons = this.beacons || [];
        for (const [px, py, top] of [[r.x - 5, r.y - 5, 3.6], [r.x + r.w + 5, r.y - 5, 3.6], [r.x - 5, r.y + r.h + 5, 1.1], [r.x + r.w + 5, r.y + r.h + 5, 1.1]]) {
          g.add(box(.95, top, .95, '#5a6aa0', this.wx(px), top / 2, this.wz(py)));
          const m = glow(roomColors[i], 1.5), b = ico(.2, 0, m, this.wx(px), top + .25, this.wz(py)); g.add(b); this.beacons.push(m);
        }
      });
      // corridor side walls (only the stretch between rooms)
      const c0 = corridors[0], c1 = corridors[1];
      wall('N', rooms[0].x + rooms[0].w, rooms[1].x, c0.y, 1.2, wallCol, 0, false); wall('S', rooms[0].x + rooms[0].w, rooms[1].x, c0.y + c0.h, .8, wallCol, 0, false);
      wall('W', rooms[0].y + rooms[0].h, rooms[2].y, c1.x, 1.2, wallCol, 2, false); wall('E', rooms[0].y + rooms[0].h, rooms[2].y, c1.x + c1.w, 1.2, wallCol, 2, false);
      // crew rug + door thresholds
      g.add(cyl(3.2, 3.2, .05, 8, '#5a4285', this.wx(787), .08, this.wz(245)));
      g.add(cyl(2.4, 2.4, .06, 8, '#7a5ab0', this.wx(787), .09, this.wz(245)));
      for (const [x, y, w, h] of [[610, 244, 4, 57], [661, 244, 4, 57], [454, 396, 72, 4], [454, 462, 72, 4]]) g.add(box(w * K, .06, h * K, glow('#ffc66e', .6), this.wx(x + w / 2), .08, this.wz(y + h / 2)));
      // exterior kit: solar arrays, dish and mast
      const solar = (x, y, dir) => {
        g.add(box(4.5, .3, .3, '#9aa6d6', this.wx(x) + dir * 2.4, -.4, this.wz(y)));
        for (const s of [-1, 1]) { const p = box(4.2, .12, 2.5, '#3b66d8', this.wx(x) + dir * 5.2, -.4, this.wz(y) + s * 1.7); g.add(p); g.add(box(4.2, .14, .08, '#a8c0ff', this.wx(x) + dir * 5.2, -.4, this.wz(y) + s * 1.7)); g.add(box(.08, .14, 2.5, '#a8c0ff', this.wx(x) + dir * 5.2, -.4, this.wz(y) + s * 1.7)); }
      };
      solar(330, 530, -1); solar(740, 620, 1);
      const dish = cone(1.1, .6, 10, '#e5e8f5', this.wx(300), 4.4, this.wz(80)); dish.rotation.x = Math.PI * .85; g.add(dish); g.add(cyl(.06, .06, 1.4, 4, '#9aa6d6', this.wx(300), 3.9, this.wz(80)));
      // chairs (physically solid in the game logic)
      this.cfg.chairs.forEach(ch => { const m = chairModel(); m.position.set(this.wx(ch.x + ch.w / 2), 0, this.wz(ch.y + ch.h / 2)); m.rotation.y = 0; g.add(m); });
      // drifting dust motes inside the ship
      const n = 120, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([rand(-24, 24), rand(.5, 5), rand(-16, 16)], i * 3);
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(pos, 3));
      this.dust = new T.Points(dg, new T.PointsMaterial({ color: '#cfe0ff', size: 2, sizeAttenuation: false, transparent: true, opacity: .45, depthWrite: false }));
      this.dust.frustumCulled = false; g.add(this.dust);
    }

    buildStations() {
      const K = this.K, { stations, roomColors } = this.cfg;
      this.stations = new Map();
      for (const s of stations) {
        const W = s.w * K, D = s.h * K;
        const build = s.type === 'console' || s.type === 'helm' ? B.console(W, D, s.type === 'console' ? 3 : 2) : B[s.type](W, D);
        const holder = new T.Group(); holder.position.set(this.wx(s.x + s.w / 2), 0, this.wz(s.y + s.h / 2)); holder.add(build.group);
        const col = roomColors[s.room];
        const ringMat = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .3, side: T.DoubleSide, depthWrite: false });
        const R = Math.max(W, D) / 2 + .9;
        const ring = new T.Mesh(new T.RingGeometry(R - .12, R, 28), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .12; holder.add(ring);
        const beaconMat = new T.MeshBasicMaterial({ color: col });
        const beacon = new T.Mesh(new T.OctahedronGeometry(.3, 0), beaconMat); beacon.position.y = build.height + .9; holder.add(beacon);
        const halo = V.glowSprite(col, 2.2, .8); halo.position.copy(beacon.position); holder.add(halo);
        this.ship.add(holder);
        this.stations.set(s.id, { def: s, holder, build, ring, ringMat, beacon, beaconMat, halo, height: build.height, base: col, pulse: Math.random() * 6 });
        if (s.type === 'trash') holder.position.set(this.wx(s.x + s.w / 2), 0, this.wz(s.y + s.h / 2));
      }
    }

    buildPlayer() {
      this.rig = V.makeAstronaut(); this.scene.add(this.rig.group);
      this.beam = new T.Mesh(new T.CylinderGeometry(.05, .05, 1, 5), new T.MeshBasicMaterial({ color: 0x7df7ee, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false }));
      this.beam.visible = false; this.scene.add(this.beam);
      this.blob = new T.Mesh(new T.CircleGeometry(.62, 12), new T.MeshBasicMaterial({ color: 0x05081a, transparent: true, opacity: .35, depthWrite: false }));
      this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = .1; this.scene.add(this.blob);
    }

    /* ---------- camera ---------- */
    camDist() { return clamp(34 / this.zoom / (2 * Math.tan(this.camera.fov * Math.PI / 360) * this.aspect), 18, 62); }
    snapCamera(p) { this.focus.set(this.wx(p.x), 0, this.wz(p.y)); this.shake = 0; }
    addShake(a) { this.shake = Math.min(1, this.shake + a); }
    setZoom(z) { this.zoom = clamp(z, .65, 1.6); }
    updateCamera(dt, v) {
      const p = v.player, K = this.K;
      const tx = clamp(this.wx(p.x) + p.vx * K * .3, -22, 22), tz = clamp(this.wz(p.y) + p.vy * K * .3, -14, 15);
      const f = 1 - Math.exp(-4.2 * dt);
      this.focus.x += (tx - this.focus.x) * f; this.focus.z += (tz - this.focus.z) * f;
      const dist = this.camDist(), dir = { y: .83, z: .56 };
      this.shake *= Math.exp(-5 * dt);
      const sx = (Math.random() - .5) * this.shake * .7, sy = (Math.random() - .5) * this.shake * .7;
      this.camera.position.set(this.focus.x + sx, this.focus.y + dir.y * dist + sy, this.focus.z + dir.z * dist);
      this.camera.lookAt(this.focus.x + sx, .6, this.focus.z);
      this.camera.updateMatrixWorld();
    }

    /* ---------- per-frame ---------- */
    update(dt, v) {
      this.t += dt; const t = this.t;
      this.updateCamera(dt, v);
      this.updatePlayer(dt, v);
      this.updateStations(dt, v);
      this.updateSpace(dt, v);
      this.updateLights(dt, v);
      this.updateFx(dt, v);
      this.fx.update(dt); this.fxFloat.update(dt);
      this.updateLabels(v);
    }

    updatePlayer(dt, v) {
      const p = v.player, X = this.wx(p.x), Z = this.wz(p.y);
      this.rig.group.position.set(X, 0, Z);
      let heading = Math.atan2(Math.cos(p.facing), Math.sin(p.facing));
      if (p.working && v.target) heading = Math.atan2(this.wx(v.target.x + v.target.w / 2) - X, this.wz(v.target.y + v.target.h / 2) - Z);
      this.rig.update(dt, { speed: p.speed, heading, working: p.working });
      this.blob.position.set(X, .11, Z);
    }

    updateStations(dt, v) {
      const t = this.t;
      for (const [id, st] of this.stations) {
        const s = st.def, isTrash = s.type === 'trash', visible = !isTrash || v.trash.has(s.room);
        st.holder.visible = visible; if (!visible) continue;
        const emergency = v.emergency?.station === id, special = v.special.has(id), done = v.done.has(id), nearest = v.nearestId === id;
        const col = isTrash ? '#ff7187' : emergency ? '#ff647f' : special ? '#ffcd75' : done ? '#a9f58f' : st.base;
        st.beaconMat.color.set(col); st.ringMat.color.set(col); st.halo.material.color.set(col);
        const active = nearest || emergency || special;
        st.ringMat.opacity = active ? .65 + Math.sin(t * (emergency ? 9 : 4) + st.pulse) * .25 : .24;
        st.ring.scale.setScalar(1 + (nearest ? Math.sin(t * 5) * .04 : 0));
        st.beacon.position.y = st.height + .9 + Math.sin(t * 2 + st.pulse) * .12 + (active ? .2 : 0);
        st.beacon.rotation.y = t * 1.6 + st.pulse; st.halo.position.y = st.beacon.position.y;
        st.beacon.scale.setScalar(active ? 1.35 : 1); st.halo.material.opacity = active ? 1 : .45;
        st.build.update(t, { emergency, special, done, nearest, probeBuilt: v.probeBuilt });
      }
    }

    updateSpace(dt, v) {
      this.stars.position.copy(this.camera.position); this.stars2.position.copy(this.camera.position);
      this.stars.rotation.y += dt * .004; this.stars2.rotation.y += dt * .004; this.stars2.material.opacity = .6 + Math.sin(this.t * 1.7) * .3;
      this.space.position.x = this.camera.position.x * .9; this.space.position.z = this.camera.position.z * .9;
      for (const kind in this.planets) {
        const p = this.planets[kind], target = keyed(KEYS[kind], v.route);
        p.dist = damp(p.dist, target, 1.5, dt);
        p.holder.position.set(p.xz[0], -p.dist, p.xz[1]);
        p.holder.visible = p.dist < 680;
        if (p.holder.visible) {
          p.planet.rotation.y += dt * (kind === 'earth' ? .03 : .02);
          if (p.planet.userData.clouds) p.planet.userData.clouds.rotation.y += dt * .012;
          if (p.dist < 480) p.orbit.update(dt);
        }
      }
      const threat = v.emergency?.kind === 'dodge';
      for (const d of this.drift) this.moveDrift(d, dt, 95);
      this.threat.forEach((d, i) => {
        if (!threat) { d.object.visible = false; return; }
        if (!d.object.visible) { d.object.visible = true; d.object.position.set(rand(-40, 40), rand(-14, -3), -100 - i * 12); d.vel.set(rand(-1.5, 1.5), 0, rand(20, 30)); }
        this.moveDrift(d, dt, 100, true);
        if (Math.abs(d.object.position.z) < 6 && !d.warned) { d.warned = true; this.addShake(.5); }
        if (d.object.position.z < -60) d.warned = false;
      });
    }
    moveDrift(d, dt, limit, respawn) {
      d.object.position.addScaledVector(d.vel, dt);
      d.object.rotation.x += d.spin.x * dt; d.object.rotation.y += d.spin.y * dt;
      if (d.object.position.z > limit) { d.object.position.z = -limit; if (respawn) d.object.position.x = rand(-40, 40); }
    }

    updateLights(dt, v) {
      const t = this.t, em = v.emergency, alarm = em ? .5 + Math.sin(t * 7) * .5 : 0;
      const dayWarm = smooth((v.dayT - .6) / .4), red = new T.Color('#ff3b5c');
      this.hemi.intensity = .85 - dayWarm * .15 - (v.shipHealth < 35 ? (Math.random() < .03 ? .4 : 0) : 0);
      this.sun.color.set('#fff1dc').lerp(new T.Color('#ffc58a'), dayWarm);
      this.roomLights.forEach((l, i) => {
        l.color.copy(l.userData.base).lerp(red, alarm * .8);
        l.intensity = .7 + alarm * .8 + (v.shipHealth < 35 ? Math.sin(t * 17 + i) * .15 : 0);
      });
      this.beacons.forEach((m, i) => { m.emissiveIntensity = 1 + Math.sin(t * 2.5 + i * 1.3) * .9; });
      this.dust.rotation.y += dt * .02; this.dust.position.y = Math.sin(t * .3) * .3;
    }

    updateFx(dt, v) {
      const p = v.player, X = this.wx(p.x), Z = this.wz(p.y), tmp = new T.Vector3(), vel = new T.Vector3();
      // footstep puffs
      this.stepAcc += p.speed * dt;
      if (this.stepAcc > 38 && p.speed > 40) {
        this.stepAcc = 0;
        for (let i = 0; i < 2; i++) this.fx.emit(tmp.set(X + rand(-.3, .3), .15, Z + rand(-.3, .3)), vel.set(rand(-.6, .6), rand(.5, 1.2), rand(-.6, .6)), .45, '#aab4d6', .13);
      }
      // work beam + sparks
      const tgt = v.target && p.working ? this.stations.get(v.target.id) : null;
      this.beam.visible = !!tgt;
      if (tgt) {
        const from = new T.Vector3(X, 1.35, Z), to = new T.Vector3().copy(tgt.holder.position); to.y = tgt.height * .6 + .2;
        const dir = to.clone().sub(from), len = dir.length(); dir.normalize();
        this.beam.position.copy(from).addScaledVector(dir, len / 2); this.beam.scale.set(1 + Math.sin(this.t * 30) * .4, len, 1);
        this.beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
        this.beam.material.color.set(tgt.base);
        this.sparkT -= dt;
        if (this.sparkT <= 0) { this.sparkT = .045; this.fx.emit(to, vel.set(rand(-2, 2), rand(2, 4.5), rand(-2, 2)), .6, ['#ffffff', tgt.base, '#ffe093'][(Math.random() * 3) | 0], .16); }
      }
      // emergencies
      const em = v.emergency;
      if (em?.kind === 'pressure') {
        this.steamT -= dt; const st = this.stations.get('fuel');
        if (this.steamT <= 0 && st) { this.steamT = .06; this.fxFloat.emit(tmp.set(st.holder.position.x + rand(-1, 1), 2.2, st.holder.position.z + rand(-1, 1)), vel.set(rand(-.6, .6), rand(1.4, 2.6), rand(-.6, .6)), 1.2, '#e8f3ff', .35, { grow: 2.5 }); }
      }
      if (em?.kind === 'wires') {
        const st = this.stations.get('wire');
        if (st && Math.random() < dt * 14) this.fx.emit(tmp.set(st.holder.position.x + rand(-.8, .8), 1.8, st.holder.position.z), vel.set(rand(-3, 3), rand(1, 4), rand(0, 3)), .5, '#ffe093', .13);
      }
      if (em && Math.random() < dt * .8) this.addShake(.18);
      // contamination mist
      if (v.trash.size) {
        this.mistT -= dt;
        if (this.mistT <= 0) {
          this.mistT = .18;
          for (const id of v.trashIds) { const st = this.stations.get(id); if (st && v.trash.has(st.def.room)) this.fxFloat.emit(tmp.set(st.holder.position.x + rand(-.5, .5), .5, st.holder.position.z + rand(-.5, .5)), vel.set(rand(-.2, .2), rand(.4, .9), rand(-.2, .2)), 1.6, '#9bd36a', .3, { grow: 2 }); }
        }
      }
      // expanding celebration rings
      for (let i = this.pulses.length - 1; i >= 0; i--) {
        const q = this.pulses[i]; q.age += dt; const k = q.age / .9;
        q.mesh.scale.setScalar(1 + k * 5); q.mesh.material.opacity = Math.max(0, .9 * (1 - k));
        if (k >= 1) { this.ship.remove(q.mesh); q.mesh.geometry.dispose(); q.mesh.material.dispose(); this.pulses.splice(i, 1); }
      }
    }

    // A satisfying pop whenever a task completes.
    celebrate(station, color = '#a9f58f') {
      const st = this.stations.get(station.id); if (!st) return;
      const pos = st.holder.position.clone(); pos.y = st.height * .6;
      this.fx.burst(pos, 26, 5, .9, [color, '#ffffff', '#ffe093'], .2, { up: .5 });
      const ring = new T.Mesh(new T.RingGeometry(.7, .9, 28), new T.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: T.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, .15, pos.z); this.ship.add(ring); this.pulses.push({ mesh: ring, age: 0 });
    }

    updateLabels(v) {
      const L = this.cfg.labels; if (!L) return;
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight, p = new T.Vector3();
      const place = (el, x, y, z) => {
        if (!el || el.hidden) return;
        p.set(x, y, z).project(this.camera);
        const on = p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
        el.style.visibility = on ? 'visible' : 'hidden';
        if (on) el.style.transform = `translate(${((p.x * .5 + .5) * w).toFixed(1)}px,${((-p.y * .5 + .5) * h).toFixed(1)}px) translate(-50%,-100%)`;
      };
      for (const [id, st] of this.stations) place(L.stations[id], st.holder.position.x, st.height + 1.7, st.holder.position.z);
      this.cfg.rooms.forEach((r, i) => place(L.rooms[i], this.wx(r.x + r.w / 2), 3.9, this.wz(r.y - 6)));
    }

    render() { this.renderer.render(this.scene, this.camera); }
  }
  V.ShipWorld = ShipWorld;
})();
