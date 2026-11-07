/* Operation: Valhalla Journey — probe landing, sample collection and menu hero scenes */
(() => {
  'use strict';
  const V = window.Valhalla, T = THREE;
  const { clamp, lerp, smooth, damp, rand, box, cyl, ico, cone, octa, glow } = V;

  // Shared base: own renderer bound to a canvas inside the modal, auto-resizing, disposable.
  class Scene3D {
    constructor(canvas, fov = 40) {
      this.canvas = canvas; this.t = 0;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(fov, 16 / 9, .3, 1200);
      this.shake = 0; this.flash = 0;
    }
    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    }
    render(dt) { this.resize(); this.t += dt; this.step(dt); this.renderer.render(this.scene, this.camera); }
    dispose() {
      this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
      this.renderer.dispose(); this.renderer.forceContextLoss?.();
    }
  }

  /* ==================================================================
     LANDING: the probe falls through Kepler's sky, fires three burns
     (one per successful timing hit) and settles on the pad.
  ================================================================== */
  class LandingScene extends Scene3D {
    constructor(canvas, hud) {
      super(canvas, 42); this.hud = hud;
      const s = this.scene; s.fog = new T.Fog('#7b4a73', 70, 260);
      s.add(V.makeSky('#0b0a2e', '#d98a7c'));
      const stars = V.makeStars(500, 380, 2); stars.material.opacity = .8; s.add(stars);
      const sun = V.glowSprite('#ffd9a0', 150, .9); sun.position.set(-160, 70, -240); s.add(sun);
      const moon = ico(18, 1, '#c8b7e6', 150, 120, -300, { emissive: '#4a3a70', emissiveIntensity: .4 }); moon.castShadow = false; s.add(moon);
      const planet = ico(40, 1, '#9ee0e8', -60, 190, -330, { emissive: '#2b6a7a', emissiveIntensity: .35 }); planet.castShadow = false; s.add(planet);
      s.add(new T.HemisphereLight(0xffc9a8, 0x4a2f6a, .9));
      const key = new T.DirectionalLight(0xffe3c0, 1.1); key.position.set(-40, 60, 30); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 160 }); s.add(key);
      this.terrain = V.makeTerrain(300, 300, 60, 9, 12, 3); s.add(this.terrain);
      for (let i = 0; i < 26; i++) {
        const a = rand(0, 6.28), r = rand(16, 100), m = cone(rand(1.5, 4), rand(3, 9), 5, ['#8c4a3a', '#a2574a', '#6f3a4a'][i % 3], Math.cos(a) * r, 0, Math.sin(a) * r);
        m.position.y = m.geometry.parameters.height / 2 - .6; m.rotation.y = rand(0, 3); s.add(m);
      }
      // landing pad with chasing lights
      this.pad = new T.Group(); s.add(this.pad);
      this.pad.add(cyl(6, 6.4, .5, 10, '#3b4268', 0, .15, 0)); this.pad.add(cyl(4.6, 4.6, .55, 10, '#2a3050', 0, .18, 0));
      this.padLights = [];
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, m = glow('#6ff3ea', 1.2); this.pad.add(box(.5, .25, .5, m, Math.cos(a) * 5.4, .5, Math.sin(a) * 5.4)); this.padLights.push(m); }
      this.beaconMat = glow('#ff7a8a', 2); this.pad.add(octa(.4, this.beaconMat, 0, 1.5, 0));
      // the probe
      this.probe = V.makeProbe({ legsOpen: 0, flapsOpen: 0 }); this.probe.group.scale.setScalar(1.35); s.add(this.probe.group);
      this.plasma = V.glowSprite('#ff9a5a', 11, 0); this.probe.inner.add(this.plasma); this.plasma.position.y = 2;
      this.dust = new V.Particles(s, 260, { gravity: -3, groundY: .1, bounce: .15, drag: .6 });
      this.exhaust = new V.Particles(s, 160, { gravity: 0, drag: .2 });
      // flight state
      this.levels = [74, 46, 22]; this.h = 96; this.vy = -3; this.target = this.levels[0];
      this.hits = 0; this.phase = 'descent'; this.land = 0; this.landFrom = 0; this.sway = new T.Vector2(); this.swayV = new T.Vector2();
      this.settle = 0; this.settleV = 0; this.thrust = 0; this.burnPulse = 0; this.camAngle = .6; this.exhT = 0; this.touchdown = false; this.legsT = 0;
      this.hud.innerHTML = '<span>ALT <b id="ld-alt">096</b> m</span><span>V/S <b id="ld-vs">-3.0</b> m/s</span><span>BURNS <b id="ld-burns">0 / 3</b></span><span id="ld-state">FREE FALL</span>';
      this.altEl = this.hud.querySelector('#ld-alt'); this.vsEl = this.hud.querySelector('#ld-vs'); this.burnEl = this.hud.querySelector('#ld-burns'); this.stateEl = this.hud.querySelector('#ld-state');
      this.placeProbe();
    }
    placeProbe() { this.probe.group.position.set(this.sway.x, this.h + 1.15 + this.settle, this.sway.y); }

    burn(hits) {
      this.hits = hits; this.burnPulse = 1; this.flash = .0; this.burnEl.textContent = `${hits} / 3`;
      if (hits < 3) { this.target = this.levels[hits]; this.stateEl.textContent = 'RETRO BURN'; this.vy *= .35; }
      else { this.phase = 'landing'; this.landFrom = this.h; this.land = 0; this.stateEl.textContent = 'FINAL APPROACH'; this.vy = 0; }
    }
    miss() {
      if (this.phase !== 'descent') return;
      this.target = this.levels[0]; this.hits = 0; this.burnEl.textContent = '0 / 3'; this.vy = 4.5; this.shake = 1; this.flash = 1;
      this.swayV.set(rand(-6, 6), rand(-6, 6)); this.burnPulse = 1; this.stateEl.textContent = 'BURN FAILED — REGAIN ALTITUDE';
      this.exhaust.burst(this.probe.group.position.clone().add(new T.Vector3(0, 1, 0)), 14, 7, .6, ['#ff7a8a', '#ffd06b'], .22);
    }
    get landed() { return this.phase === 'landed'; }

    step(dt) {
      const t = this.t, p = this.probe, pos = p.group.position;
      // --- flight dynamics ---
      let accel = 0;
      if (this.phase === 'descent') {
        const k = 2.6, c = 2.3; accel = k * (this.target - this.h) - c * this.vy - 1.1; // 1.1 = weak gravity bias keeps it sinking
        this.vy += accel * dt; this.h += this.vy * dt;
        this.h = Math.max(this.h, this.levels[2] - 6);
        this.thrust = .18 + clamp(accel / 3, 0, .82);
      } else if (this.phase === 'landing') {
        this.land += dt / 2.6; const e = smooth(this.land), prev = this.h;
        this.h = this.landFrom * (1 - e) ; this.vy = (this.h - prev) / Math.max(dt, 1e-4);
        this.thrust = clamp(.9 - e * .3 + Math.sin(t * 8) * .05, 0, 1) * (this.land < 1 ? 1 : 0);
        this.legsT = Math.min(1, this.legsT + dt * 1.3); p.setLegs(smooth(this.legsT));
        if (this.land >= 1) this.doTouchdown();
      } else { this.thrust = damp(this.thrust, 0, 8, dt); this.vy = 0; this.flapT = Math.min(1, (this.flapT || 0) + dt * .8); p.setFlaps(smooth(this.flapT)); }
      this.burnPulse = damp(this.burnPulse, 0, 3, dt);
      const flameT = clamp(this.thrust + this.burnPulse * .8, 0, 1);
      p.setThrust(flameT, t);
      // sway: lightly damped spring around the pad axis
      const sw = this.phase === 'descent' ? 1 : this.phase === 'landing' ? 1 - smooth(this.land) : 0;
      this.swayV.x += (-this.sway.x * 3 - this.swayV.x * 1.6 + Math.sin(t * 1.3) * 1.2 * sw) * dt; this.swayV.y += (-this.sway.y * 3 - this.swayV.y * 1.6 + Math.cos(t * 1.1) * 1.2 * sw) * dt;
      this.sway.x += this.swayV.x * dt; this.sway.y += this.swayV.y * dt;
      this.settleV += (-this.settle * 90 - this.settleV * 9) * dt; this.settle += this.settleV * dt;
      this.placeProbe();
      p.inner.rotation.z = damp(p.inner.rotation.z, -this.swayV.x * .06, 6, dt); p.inner.rotation.x = damp(p.inner.rotation.x, this.swayV.y * .06, 6, dt);
      p.inner.rotation.y += dt * .25 * (this.phase === 'landed' ? 0 : 1);
      // atmosphere plasma glow fades with altitude
      this.plasma.material.opacity = clamp((this.h - 40) / 60, 0, 1) * .8 * (this.phase === 'descent' ? 1 : 0);
      // exhaust + dust
      this.exhT -= dt;
      if (flameT > .15 && this.exhT <= 0) {
        this.exhT = .03; const origin = pos.clone().add(new T.Vector3(0, -.3, 0));
        this.exhaust.emit(origin, new T.Vector3(rand(-1, 1), -rand(5, 9) * flameT, rand(-1, 1)), .5, ['#ffb35a', '#ffe0a0', '#ff8a5a'][(Math.random() * 3) | 0], .35 * flameT + .1);
        if (this.h < 18 && this.phase !== 'landed') {
          const a = rand(0, 6.28), sp = rand(4, 9) * (1 - this.h / 24);
          this.dust.emit(new T.Vector3(pos.x, .3, pos.z), new T.Vector3(Math.cos(a) * sp, rand(.4, 1.5), Math.sin(a) * sp), 1.3, ['#d8905a', '#b86a50', '#f1c88c'][(Math.random() * 3) | 0], rand(.25, .5));
        }
      }
      this.dust.update(dt); this.exhaust.update(dt);
      // pad lights chase; beacon blinks
      this.padLights.forEach((m, i) => { m.emissiveIntensity = .4 + Math.max(0, Math.sin(t * 4 - i * .65)) * 2; });
      this.beaconMat.emissiveIntensity = Math.sin(t * 6) > 0 ? 2.4 : .3;
      // camera: slow orbit that dollies in with altitude, shaking on failure
      this.camAngle += dt * (this.phase === 'landed' ? .08 : .13);
      const near = clamp(this.h / 90, 0, 1), rad = lerp(16, 30, near) + (this.phase === 'landed' ? 4 : 0);
      this.shake *= Math.exp(-4 * dt);
      const cy = lerp(3.4, 10, near) + this.h * .12, ty = lerp(1.2, this.h * .8 + 2, near * .85 + .15);
      this.camera.position.set(Math.cos(this.camAngle) * rad + (Math.random() - .5) * this.shake, cy + (Math.random() - .5) * this.shake, Math.sin(this.camAngle) * rad + (Math.random() - .5) * this.shake);
      this.camera.lookAt(0, ty, 0);
      // HUD
      this.altEl.textContent = String(Math.max(0, Math.round(this.h * 3))).padStart(3, '0');
      this.vsEl.textContent = (this.vy * 1.2).toFixed(1);
      if (this.phase === 'descent' && this.burnPulse < .05 && this.hits < 3 && this.stateEl.textContent.startsWith('RETRO') && Math.abs(this.vy) > 1) this.stateEl.textContent = 'DESCENDING';
    }
    doTouchdown() {
      this.phase = 'landed'; this.h = 0; this.shake = .7; this.stateEl.textContent = 'TOUCHDOWN CONFIRMED ✓';
      const base = new T.Vector3(this.sway.x, .3, this.sway.y);
      this.dust.burst(base, 70, 9, 1.8, ['#d8905a', '#b86a50', '#f1c88c', '#8c4a3a'], .55, { up: .05 });
      this.settleV = -2.2; this.touchdown = true;
    }
  }

  /* ==================================================================
     SCAN: a survey drone sweeps the 4×3 sector grid, scans, drills,
     carries each mineral sample back to the probe and seals it;
     data streams up to a relay satellite.
  ================================================================== */
  const COLS = 4, ROWS = 3, TILE = 3.4;
  class ScanScene extends Scene3D {
    constructor(canvas, hud, opts) {
      super(canvas, 38); this.hud = hud; this.opts = opts; this.deposits = new Set(opts.deposits);
      const s = this.scene; s.fog = new T.Fog('#4a2f64', 24, 90);
      s.add(V.makeSky('#0e0c33', '#c97d86'));
      const st = V.makeStars(400, 380, 2); s.add(st);
      const sun = V.glowSprite('#ffd9a0', 120, .85); sun.position.set(-120, 40, -220); s.add(sun);
      s.add(new T.HemisphereLight(0xffc9a8, 0x4a2f6a, 1));
      const key = new T.DirectionalLight(0xffe3c0, 1.05); key.position.set(-14, 22, 10); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 5, far: 60 }); s.add(key);
      // terrain: gentle low-poly ground, plus tile overlays
      const ground = V.makeTerrain(120, 120, 48, 1.6, 9, 7); ground.position.y = -.1; s.add(ground);
      this.tiles = [];
      const gw = COLS * TILE, gh = ROWS * TILE;
      for (let i = 0; i < COLS * ROWS; i++) {
        const c = i % COLS, r = Math.floor(i / COLS), x = -gw / 2 + (c + .5) * TILE, z = -gh / 2 + (r + .5) * TILE;
        const m = new T.MeshBasicMaterial({ color: '#6ff3ea', transparent: true, opacity: .1, depthWrite: false, side: T.DoubleSide });
        const plane = new T.Mesh(new T.PlaneGeometry(TILE - .18, TILE - .18), m); plane.rotation.x = -Math.PI / 2; plane.position.set(x, .42, z); s.add(plane);
        const edge = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(TILE - .18, TILE - .18)), new T.LineBasicMaterial({ color: '#8ff7ee', transparent: true, opacity: .55 }));
        edge.rotation.x = -Math.PI / 2; edge.position.set(x, .43, z); s.add(edge);
        // buried crystal cluster, hidden until revealed
        const cluster = new T.Group(); cluster.position.set(x, 0, z); cluster.scale.setScalar(.001); cluster.visible = false;
        const cm = glow(['#6ff3ea', '#ffd06b', '#c59bff'][i % 3], 1.5);
        for (let k = 0; k < 5; k++) { const sh = octa(rand(.22, .42), cm, rand(-.5, .5), rand(.3, .6), rand(-.5, .5)); sh.scale.y = rand(1.6, 2.6); sh.rotation.set(rand(-.3, .3), rand(0, 3), rand(-.3, .3)); cluster.add(sh); }
        s.add(cluster);
        this.tiles.push({ x, z, mat: m, edge, cluster, cm, state: 'idle', reveal: 0, mark: null });
      }
      // lander with capsule bay
      this.probe = V.makeProbe({ legsOpen: 1, flapsOpen: 1 }); this.probe.group.scale.setScalar(1.3); this.probe.group.position.set(0, .05, -gh / 2 - 3.6); s.add(this.probe.group);
      this.probe.group.rotation.y = Math.PI; this.bayPos = new T.Vector3(0, 1.6, -gh / 2 - 3.6 + 1.4);
      // relay satellite
      this.relay = new T.Group(); this.relay.position.set(-8, 10, -9); s.add(this.relay);
      this.relay.add(box(1.4, 1, 1, '#e5e8f5', 0, 0, 0)); for (const sd of [-1, 1]) this.relay.add(box(3, .08, 1.2, '#3d6bdc', sd * 2.4, 0, 0));
      this.relay.add(cone(.5, .5, 8, '#c9ccdd', 0, .8, 0)); this.relayLight = glow('#6ff3ea', 2); this.relay.add(octa(.16, this.relayLight, 0, 1.25, 0));
      // drone
      const d = this.drone = { g: new T.Group(), pos: new T.Vector3(0, 4.5, -gh / 2 - 1), vel: new T.Vector3(), target: new T.Vector3(0, 4.5, -gh / 2 - 1), rotors: [], carry: null, bank: new T.Vector2() };
      d.g.add(ico(.42, 1, '#e9e4d8', 0, 0, 0)); d.g.add(box(.7, .16, .5, '#27315f', 0, -.02, 0));
      this.droneEye = glow('#6ff3ea', 2); d.g.add(box(.2, .1, .1, this.droneEye, 0, 0, .38));
      for (const [x, z] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) {
        d.g.add(box(.7, .05, .06, '#9aa6d6', x * .55, 0, z * .55).rotateY(Math.atan2(z, x) + Math.PI / 2)); // arm
        const rot = new T.Group(); rot.position.set(x, .12, z); rot.add(box(.9, .02, .12, '#c9ccdd', 0, 0, 0)); rot.add(box(.12, .02, .9, '#c9ccdd', 0, 0, 0)); d.g.add(rot); d.rotors.push(rot);
      }
      const tether = new T.Mesh(new T.CylinderGeometry(.025, .025, 1, 4), new T.MeshBasicMaterial({ color: '#d9f7ff' })); tether.visible = false; d.g.add(tether); d.tether = tether;
      this.drillMat = glow('#ffd06b', 2); d.drill = ico(.14, 0, this.drillMat, 0, -.5, 0); d.drill.visible = false; d.g.add(d.drill);
      s.add(d.g);
      // scan beam
      this.beam = new T.Mesh(new T.ConeGeometry(1, 1, 14, 1, true), new T.MeshBasicMaterial({ color: '#6ff3ea', transparent: true, opacity: .25, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
      this.beam.visible = false; s.add(this.beam);
      this.scanRing = new T.Mesh(new T.RingGeometry(.9, 1, 32), new T.MeshBasicMaterial({ color: '#6ff3ea', transparent: true, opacity: .9, side: T.DoubleSide, depthWrite: false })); this.scanRing.rotation.x = -Math.PI / 2; this.scanRing.visible = false; s.add(this.scanRing);
      // carried orb
      this.orb = octa(.25, glow('#fff3b0', 2.5), 0, 0, 0); this.orb.visible = false; this.orb.castShadow = false; s.add(this.orb);
      this.fx = new V.Particles(s, 320, { gravity: -4, groundY: .1, bounce: .25, drag: .5 });
      this.data = new V.Particles(s, 220, { gravity: 0, drag: 0 });
      this.uplink = new T.Mesh(new T.CylinderGeometry(.04, .04, 1, 4), new T.MeshBasicMaterial({ color: '#6ff3ea', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); s.add(this.uplink);
      // state
      this.queue = []; this.seq = null; this.active = null; this.progress = 0; this.sealed = 0; this.uplinkT = 0; this.upPct = 0; this.dataT = 0; this.camAngle = 0; this.focusPt = new T.Vector3(0, 0, -1.5);
      this.camPos = new T.Vector3(0, 12, 14); this.lastMsg = '';
      this.hud.innerHTML = '<span>DRONE <b id="sc-state">STANDBY</b></span><span>SECTOR <b id="sc-sector">--</b></span><span>SAMPLES <b id="sc-samples">0 / 3</b></span><span>UPLINK <b id="sc-up">000%</b></span>';
      this.stateEl = this.hud.querySelector('#sc-state'); this.sectorEl = this.hud.querySelector('#sc-sector'); this.samplesEl = this.hud.querySelector('#sc-samples'); this.upEl = this.hud.querySelector('#sc-up');
      // click a sector in the 3D view
      this.ray = new T.Raycaster(); this.ndc = new T.Vector2(); this.plane = new T.Plane(new T.Vector3(0, 1, 0), -.4);
      canvas.addEventListener('pointerdown', e => {
        const b = canvas.getBoundingClientRect(); this.ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
        this.ray.setFromCamera(this.ndc, this.camera); const hit = new T.Vector3();
        if (!this.ray.ray.intersectPlane(this.plane, hit)) return;
        const c = Math.floor((hit.x + gw / 2) / TILE), r = Math.floor((hit.z + gh / 2) / TILE);
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) this.opts.onPick(r * COLS + c);
      });
    }
    get busy() { return !!this.seq || this.active !== null; }

    beginScan(i) { this.active = i; this.progress = 0; this.sectorEl.textContent = String(i + 1).padStart(2, '0'); this.stateEl.textContent = 'SCANNING'; this.tiles[i].state = 'scanning'; }
    setScan(i, p) { if (this.active === i) this.progress = p; }

    // called when the 1.2s scan completes; found => plays the full extraction/collection sequence
    finishScan(i, found, foundCount) {
      const tile = this.tiles[i]; this.active = null;
      if (found) {
        tile.state = 'found'; tile.cluster.visible = true; tile.cluster.scale.setScalar(.001); this.seq = { kind: 'collect', i, t: 0, stage: 0, last: foundCount >= 3 };
        this.fx.burst(new T.Vector3(tile.x, .4, tile.z), 22, 5, .8, ['#fff3b0', '#6ff3ea', '#ffd06b'], .2, { up: .6 });
        this.stateEl.textContent = 'SAMPLE FOUND';
      } else {
        tile.state = 'empty'; this.seq = { kind: 'empty', i, t: 0 }; this.stateEl.textContent = 'NO DEPOSIT';
        this.fx.burst(new T.Vector3(tile.x, .3, tile.z), 14, 3, .8, ['#c9a98a', '#8c6a5a'], .25, { up: .3 });
        const x1 = box(.9, .05, .12, '#8a7a8f', tile.x, .5, tile.z), x2 = box(.9, .05, .12, '#8a7a8f', tile.x, .5, tile.z); x1.rotation.y = .78; x2.rotation.y = -.78; this.scene.add(x1, x2); tile.mark = [x1, x2];
      }
    }

    step(dt) {
      const t = this.t, d = this.drone, home = new T.Vector3(0, 4.6, -ROWS * TILE / 2 - 1.2);
      // ---- drone goal selection ----
      let goal = home, beamOn = false, drilling = false;
      if (this.active !== null) { const tl = this.tiles[this.active]; goal = new T.Vector3(tl.x, 3.4, tl.z); beamOn = true; }
      if (this.seq) {
        const q = this.seq, tl = this.tiles[q.i]; q.t += dt;
        if (q.kind === 'empty') { goal = new T.Vector3(tl.x, 3.6, tl.z); if (q.t > .7) { this.seq = null; this.stateEl.textContent = 'STANDBY'; } }
        else if (q.stage === 0) { goal = new T.Vector3(tl.x, 2.2, tl.z); drilling = true; if (q.t > 1.15) { q.stage = 1; q.t = 0; this.pickup(tl); } }
        else if (q.stage === 1) { goal = new T.Vector3(this.bayPos.x, this.bayPos.y + 1.9, this.bayPos.z + .9); this.stateEl.textContent = 'RETURNING'; if (q.t > .35 && d.pos.distanceTo(goal) < .7 || q.t > 2.2) { q.stage = 2; q.t = 0; } }
        else if (q.stage === 2) { goal = new T.Vector3(this.bayPos.x, this.bayPos.y + 1.2, this.bayPos.z + .8); this.stateEl.textContent = 'SEALING'; if (q.t > .7) { this.seal(q); this.seq = null; this.stateEl.textContent = this.sealed >= 3 ? 'ALL SAMPLES SEALED' : 'STANDBY'; } }
      }
      // ---- drone flight: critically-damped spring with banking ----
      const k = 6, c = 2 * Math.sqrt(k), acc = goal.clone().sub(d.pos).multiplyScalar(k).addScaledVector(d.vel, -c);
      d.vel.addScaledVector(acc, dt); d.pos.addScaledVector(d.vel, dt);
      d.pos.y += Math.sin(t * 3) * .004;
      d.bank.x = damp(d.bank.x, clamp(d.vel.z * .06, -.5, .5), 8, dt); d.bank.y = damp(d.bank.y, clamp(-d.vel.x * .06, -.5, .5), 8, dt);
      d.g.position.copy(d.pos); d.g.rotation.x = d.bank.x; d.g.rotation.z = d.bank.y;
      if (Math.abs(d.vel.x) + Math.abs(d.vel.z) > .8) d.g.rotation.y = damp(d.g.rotation.y, Math.atan2(d.vel.x, d.vel.z), 3, dt);
      d.rotors.forEach((r, i) => { r.rotation.y += dt * (40 + i); });
      this.droneEye.emissiveIntensity = 1.2 + Math.sin(t * 8) * .8;
      // tether + drill
      d.tether.visible = d.drill.visible = drilling;
      if (drilling) { const tl = this.tiles[this.seq.i], len = Math.max(.1, d.pos.y - .6); d.tether.scale.set(1, len, 1); d.tether.position.y = -len / 2; d.drill.position.y = -len; d.drill.rotation.y = t * 25; d.drill.position.x = Math.sin(t * 60) * .03;
        if (Math.random() < dt * 30) this.fx.emit(new T.Vector3(tl.x, .5, tl.z), new T.Vector3(rand(-3, 3), rand(2, 5), rand(-3, 3)), .5, ['#ffd06b', '#fff3b0', '#6ff3ea'][(Math.random() * 3) | 0], .16); this.shake = Math.max(this.shake, .25); this.drillMat.emissiveIntensity = 2 + Math.sin(t * 40); }
      // carried orb
      if (d.carry) { this.orb.visible = true; this.orb.position.set(d.pos.x, d.pos.y - .6, d.pos.z); this.orb.rotation.y = t * 4; this.orb.scale.setScalar(1 + Math.sin(t * 9) * .1); } else this.orb.visible = false;
      // ---- tiles ----
      this.tiles.forEach((tl, i) => {
        const op = { scanning: .38, empty: .05, found: .3, done: .12, idle: .1 }[tl.state];
        tl.mat.opacity = damp(tl.mat.opacity, op, 10, dt);
        const col = tl.state === 'found' || tl.state === 'done' ? '#a9f58f' : tl.state === 'empty' ? '#8a7a8f' : '#6ff3ea'; tl.mat.color.set(col); tl.edge.material.color.set(col);
        if (tl.cluster.visible) {
          const s = damp(tl.cluster.scale.x, tl.state === 'found' ? 1 : 0, tl.state === 'found' ? 7 : 9, dt);
          tl.cluster.scale.setScalar(Math.max(.001, s)); tl.cluster.rotation.y += dt * .6; tl.cm.emissiveIntensity = 1.2 + Math.sin(t * 5 + i) * .6;
          if (tl.state === 'done' && s < .03) tl.cluster.visible = false;
        }
      });
      // ---- scan beam, ring, data stream ----
      this.beam.visible = this.scanRing.visible = beamOn && this.active !== null;
      if (this.beam.visible) {
        const tl = this.tiles[this.active], h = Math.max(.5, d.pos.y - .4), p = this.progress;
        this.beam.position.set(d.pos.x, (d.pos.y + .4) / 2 , d.pos.z); this.beam.scale.set(1.4, h, 1.4); this.beam.rotation.x = Math.PI; this.beam.material.opacity = .18 + Math.sin(t * 20) * .06;
        const ph = (p * 3) % 1; this.scanRing.position.set(tl.x, .46, tl.z); this.scanRing.scale.setScalar(.35 + ph * TILE * .46); this.scanRing.material.opacity = .9 * (1 - ph);
        this.dataT -= dt;
        if (this.dataT <= 0) { this.dataT = .03; const from = new T.Vector3(tl.x + rand(-1.2, 1.2), .5, tl.z + rand(-1.2, 1.2)), v = d.pos.clone().sub(from).normalize().multiplyScalar(rand(4, 6)); this.data.emit(from, v, .55, ['#6ff3ea', '#ffffff', '#8ff7ee'][(Math.random() * 3) | 0], .11, { grow: -1 }); }
      }
      // uplink beam from lander to relay
      this.uplinkT = Math.max(0, this.uplinkT - dt);
      const up = this.uplinkT > 0 ? Math.min(1, this.uplinkT) : 0, from = this.bayPos.clone().add(new T.Vector3(0, 1.4, 0)), to = this.relay.position, dir = to.clone().sub(from), len = dir.length();
      this.uplink.position.copy(from).addScaledVector(dir.normalize(), len / 2); this.uplink.scale.set(1, len, 1); this.uplink.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); this.uplink.material.opacity = up * .7;
      if (up > 0 && Math.random() < dt * 40) this.data.emit(from, dir.clone().multiplyScalar(rand(10, 16)), len / 13, '#ffffff', .16);
      this.upPct = damp(this.upPct, this.sealed / 3 * 100, 3, dt); this.upEl.textContent = `${String(Math.round(this.upPct)).padStart(3, '0')}%`;
      this.relay.rotation.y += dt * .3; this.relayLight.emissiveIntensity = 1 + up * 3 + Math.sin(t * 4) * .4;
      this.fx.update(dt); this.data.update(dt);
      // ---- camera: gentle orbit that leans toward the action ----
      this.camAngle += dt * .12;
      const fp = this.active !== null ? new T.Vector3(this.tiles[this.active].x * .6, 0, this.tiles[this.active].z * .6) : this.seq ? new T.Vector3(d.pos.x * .4, 0, d.pos.z * .4 - 1) : new T.Vector3(0, 0, -1.5);
      this.focusPt.lerp(fp, 1 - Math.exp(-3 * dt)); this.shake *= Math.exp(-6 * dt);
      const goalCam = new T.Vector3(Math.sin(this.camAngle) * 4 + this.focusPt.x * .3, 12.5, 15 + Math.cos(this.camAngle) * 1.5 + this.focusPt.z * .2);
      this.camPos.lerp(goalCam, 1 - Math.exp(-2 * dt));
      this.camera.position.set(this.camPos.x + (Math.random() - .5) * this.shake * .25, this.camPos.y + (Math.random() - .5) * this.shake * .25, this.camPos.z);
      this.camera.lookAt(this.focusPt.x, .8, this.focusPt.z);
    }
    pickup(tl) {
      tl.state = 'done'; this.drone.carry = true; this.fx.burst(new T.Vector3(tl.x, .6, tl.z), 24, 6, .9, ['#fff3b0', '#6ff3ea', '#c59bff'], .22, { up: .6 });
      this.shake = Math.max(this.shake, .5);
    }
    seal(q) {
      this.drone.carry = false; const slot = this.sealed; this.sealed++;
      this.probe.slots[slot]?.color.set('#7bf0d0'); this.probe.slots[slot]?.emissive.set('#7bf0d0'); if (this.probe.slots[slot]) this.probe.slots[slot].emissiveIntensity = 2.4;
      this.samplesEl.textContent = `${this.sealed} / 3`; this.uplinkT = 1.8;
      this.fx.burst(this.bayPos.clone(), 22, 5, .9, ['#7bf0d0', '#ffffff'], .2, { up: .5 });
      if (this.sealed >= 3) { this.uplinkT = 3; this.fx.burst(this.bayPos.clone().add(new T.Vector3(0, 1, 0)), 50, 8, 1.2, ['#7bf0d0', '#ffd06b', '#ffffff'], .28, { up: .6 }); }
    }
  }

  /* ==================================================================
     MENU HERO: the Astrid cruising above Kepler-186f with drifting rocks.
  ================================================================== */
  class LandingHero {
    constructor(canvas) {
      this.canvas = canvas; this.t = 0;
      this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); this.renderer.setClearColor(0x000000, 0);
      this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(36, 1.6, .5, 4000);
      this.scene.add(new T.HemisphereLight(0xb4c4ff, 0x40306a, .9));
      const key = new T.DirectionalLight(0xfff0d8, 1.2); key.position.set(-30, 25, 40); this.scene.add(key);
      this.stars = V.makeStars(1100, 1800, 2); this.scene.add(this.stars);
      this.planet = V.makePlanet(130, 'kepler'); this.planet.position.set(170, -90, -260); this.scene.add(this.planet);
      this.ship = V.makeShipExterior(); this.ship.scale.setScalar(1.15); this.scene.add(this.ship);
      this.rocks = Array.from({ length: 26 }, () => { const m = ico(rand(.4, 1.8), 0, ['#8b7f8f', '#6f6679', '#a39688'][(Math.random() * 3) | 0]); m.position.set(rand(-60, 60), rand(-25, 25), rand(-80, 10)); m.userData.v = new T.Vector3(rand(-.6, -.2), 0, rand(.8, 2.2)); this.scene.add(m); return m; });
      this.exhaust = new V.Particles(this.scene, 120, { gravity: 0, drag: .3 }); this.exT = 0;
    }
    resize() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (!w || !h) return;
      if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    }
    render(dt) {
      this.resize(); this.t += dt; const t = this.t, wide = this.camera.aspect > 1;
      this.planet.rotation.y += dt * .015;
      const sx = wide ? 9 : 2, sy = wide ? 3 : 11;
      this.ship.position.set(sx + Math.sin(t * .4) * 1.5, sy + Math.sin(t * .6) * .8, 0);
      this.ship.rotation.set(Math.sin(t * .5) * .05, -.55 + Math.sin(t * .3) * .08, Math.sin(t * .4) * .04 - .08);
      this.ship.userData.engine.forEach((f, i) => { f.scale.set(1, 1 + Math.sin(t * 22 + i) * .12, 1); });
      this.exT -= dt;
      if (this.exT <= 0) { this.exT = .04; const base = new T.Vector3(-5.2, 0, rand(-1, 1)).applyEuler(this.ship.rotation).multiplyScalar(1.15).add(this.ship.position); this.exhaust.emit(base, new T.Vector3(-4 * Math.cos(.55), 0, -4 * Math.sin(.55)).multiplyScalar(-1).add(new T.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1))), 1.2, '#ffb35a', .5); }
      this.exhaust.update(dt);
      for (const r of this.rocks) { r.position.addScaledVector(r.userData.v, dt * 6); r.rotation.x += dt * .3; r.rotation.y += dt * .2; if (r.position.z > 40) { r.position.z = -90; r.position.x = rand(-60, 60); r.position.y = rand(-25, 25); } }
      this.camera.position.set(Math.sin(t * .1) * 2, 2 + Math.sin(t * .13), 34); this.camera.lookAt(0, 0, 0);
      this.stars.rotation.y += dt * .003;
      this.renderer.render(this.scene, this.camera);
    }
  }

  Object.assign(V, { LandingScene, ScanScene, LandingHero });
})();
