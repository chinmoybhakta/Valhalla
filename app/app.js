(() => {
  'use strict';

  // Percent penalties are percentage points; one cycle lasts three real minutes.
  const DAY_SECONDS = 180;
  const WASTE_LIMIT = 80;
  const SPEED = 175;
  const ACCEL = 9, BRAKE = 11; // velocity-chase rates (1/s): quick but never snapping
  const $ = id => document.getElementById(id);
  const V = window.Valhalla;
  const canvas = $('ship-canvas');
  let world = null, hero = null, activeScene = null;
  const keys = new Set();
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const random = (lo, hi) => lo + Math.random() * (hi - lo);
  const shuffle = items => items.slice().sort(() => Math.random() - 0.5);
  const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const rooms = [
    { x: 95, y: 100, w: 515, h: 300, label: '01 / CONTROL ROOM' },
    { x: 665, y: 125, w: 245, h: 235, label: '02 / CREW QUARTERS' },
    { x: 330, y: 465, w: 410, h: 190, label: '03 / LIFE SUPPORT' }
  ];
  const corridors = [{ x: 585, y: 240, w: 110, h: 65 }, { x: 450, y: 375, w: 80, h: 120 }];
  const stations = [
    { id: 'fuel', name: 'Refill fuel node', room: 0, x: 120, y: 275, w: 64, h: 75, type: 'reactor', duration: 3.5 },
    { id: 'wire', name: 'Repair wire leakages', room: 0, x: 120, y: 164, w: 58, h: 62, type: 'wire', duration: 3 },
    { id: 'comms', name: 'Calibrate comms', room: 0, x: 238, y: 123, w: 158, h: 46, type: 'console', duration: 3 },
    { id: 'clean', name: 'Clean room', room: 1, x: 850, y: 285, w: 39, h: 49, type: 'storage', duration: 2.5 },
    { id: 'tv', name: 'Rest / entertainment', room: 1, x: 826, y: 153, w: 57, h: 38, type: 'tv', duration: 3, stat: 'mood', amount: 45 },
    { id: 'toilet', name: 'Use toilet', room: 2, x: 353, y: 566, w: 43, h: 57, type: 'toilet', duration: 2.5 },
    { id: 'water', name: 'Drink water', room: 2, x: 427, y: 586, w: 53, h: 43, type: 'water', duration: 2, stat: 'thirst', amount: 50 },
    { id: 'food', name: 'Eat meal', room: 2, x: 568, y: 586, w: 60, h: 43, type: 'food', duration: 3, stat: 'hunger', amount: 45 },
    { id: 'waste', name: 'Dump waste into chute', room: 2, x: 673, y: 555, w: 43, h: 69, type: 'waste', duration: 3 },
    { id: 'probe', name: 'Probe workbench', room: 0, x: 478, y: 328, w: 101, h: 44, type: 'workbench', duration: 2 },
    { id: 'helm', name: 'Navigation console', room: 0, x: 454, y: 123, w: 122, h: 49, type: 'helm', duration: 2 },
    { id: 'bed', name: 'Sleep / end day', room: 1, x: 689, y: 151, w: 68, h: 88, type: 'bed', duration: 2 },
    { id: 'oxygen', name: 'Check oxygen level', room: 0, x: 210, y: 325, w: 62, h: 42, type: 'oxygen', duration: 2.5 },
    { id: 'repair', name: 'Repair ship (+50 / costs 1 min)', room: 0, x: 340, y: 325, w: 65, h: 42, type: 'repair', duration: 2 },
    { id: 'trash0', name: 'Clean command room', room: 0, x: 355, y: 245, w: 24, h: 24, type: 'trash', duration: 4 },
    { id: 'trash1', name: 'Clean crew cabin', room: 1, x: 775, y: 296, w: 24, h: 24, type: 'trash', duration: 4 },
    { id: 'trash2', name: 'Clean life support', room: 2, x: 520, y: 514, w: 24, h: 24, type: 'trash', duration: 4 }
  ];
  const chairs = [{ x: 278, y: 192, w: 34, h: 37 }, { x: 490, y: 193, w: 34, h: 37 }];
  const shipTasks = ['fuel', 'wire', 'comms', 'oxygen'];
  const daily = stations.filter(s => shipTasks.includes(s.id) || s.id === 'toilet');
  const statDefs = [
    { key: 'health', name: 'Health', icon: '+', color: '#a6d998' },
    { key: 'hunger', name: 'Hunger', icon: '◈', color: '#f6ba76' },
    { key: 'thirst', name: 'Thirst', icon: '◉', color: '#72bcf5' },
    { key: 'mood', name: 'Mood', icon: '✧', color: '#bb9bdd' }
  ];
  let state;
  let mini = null;
  let modalKind = null;
  let previousFocus = null;
  let nearest = null;
  let progress = 0;
  let progressId = null;
  let uiClock = 0;
  let lastFrame = 0;
  let decorativeTime = 0;

  // Tiny synthesized sound kit (WebAudio, no assets). Created on first user gesture.
  const sfx = (() => {
    let ac = null, master = null, muted = false;
    const unlock = () => {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = .22; master.connect(ac.destination);
    };
    const tone = (f, d = .12, type = 'sine', vol = .5, slide = 0, delay = 0) => {
      if (!ac || muted) return;
      const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + .02);
    };
    const noise = (d = .6, cutoff = 800, vol = .5) => {
      if (!ac || muted) return;
      const n = Math.floor(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = vol; src.connect(f); f.connect(g); g.connect(master); src.start();
    };
    return {
      unlock, get muted() { return muted; }, toggle() { muted = !muted; return muted; },
      done() { tone(660, .1, 'triangle', .4); tone(880, .14, 'triangle', .4, 0, .09); tone(1320, .2, 'triangle', .3, 0, .18); },
      thruster() { noise(.8, 700, .7); tone(90, .6, 'sawtooth', .25, -40); },
      fail() { tone(180, .3, 'square', .3, -100); },
      scan(found) { if (found) [880, 1100, 1480].forEach((f, i) => tone(f, .15, 'sine', .35, 0, i * .08)); else tone(300, .18, 'triangle', .25, -80); },
      alarm() { tone(520, .18, 'square', .2); tone(390, .18, 'square', .2, 0, .2); },
      touchdown() { noise(1.3, 450, .9); tone(60, .7, 'sine', .6, -20); }
    };
  })();

  function newState() {
    return { day: 1, elapsed: 0, totalTime: 0, running: false, paused: false, ended: false,
      player: { x: 365, y: 286, radius: 12, facing: -Math.PI / 2, step: 0, vx: 0, vy: 0, speed: 0, moving: false, working: false },
      stats: { health: 100, hunger: 87, thirst: 92, mood: 82 }, tasks: new Set(),
      shipHealth: 100, supplies: { food: 12, water: 12 }, waste: 0, wasteTimer: null, trash: new Set(),
      emergency: null, schedule: [], probeBuilt: false, landed: false, samples: false,
      lateWarned: false, logs: [], emergenciesFixed: 0, daysRested: 0 };
  }

  function initHUD() {
    $('vitals').innerHTML = statDefs.map(s => `<div class="vital" id="vital-${s.key}"><div class="vital-label"><span><span class="vital-icon" style="color:${s.color}">${s.icon}</span>${s.name}</span><span class="vital-value" id="value-${s.key}"></span></div><div class="vital-track"><div id="fill-${s.key}" class="vital-fill" style="background:${s.color};color:${s.color}"></div></div></div>`).join('');
    $('task-list').innerHTML = [{ name: 'SHIP CHECKS · −30 EACH MISSED', room: 0 }, { name: 'SANITATION · −30 HEALTH IF MISSED', room: 2 }].map(group => `<section class="task-group"><h3>${group.name}</h3>${daily.filter(s => s.room === group.room).map(s => `<div id="task-${s.id}" class="task"><span class="task-check"></span><span class="task-label">${s.name}</span></div>`).join('')}</section>`).join('');
  }

  function log(message, warning = false) {
    state.logs.unshift({ time: `D${String(state.day).padStart(2, '0')} ${clock(state.elapsed)}`, message, warning });
    state.logs = state.logs.slice(0, 3);
    $('log-list').replaceChildren(...state.logs.map(entry => {
      const li = document.createElement('li');
      const time = document.createElement('time');
      time.textContent = entry.time;
      li.append(time, document.createTextNode(entry.message));
      if (entry.warning) li.className = 'warning';
      return li;
    }));
  }

  function startGame() {
    closeModal();
    enterFlight();
    state = newState();
    nearest = null;
    world?.snapCamera(state.player);
    state.running = true;
    $('pause-button').disabled = false;
    planEmergencies();
    log('Earth uplink established. Welcome aboard, Astronaut 01.');
    log('Daily checklist uploaded. Hold E at a station to begin.');
    updateHUD();
  }

  function planEmergencies() {
    const count = Math.floor(random(0, 3));
    state.schedule = Array.from({ length: count }, (_, i) => ({ at: random(15 + i * 80, 50 + i * 80), type: Math.floor(random(0, 3)) }));
  }

  function storyComplete() {
    return (state.day !== 9 || state.probeBuilt) && (state.day !== 10 || (state.landed && state.samples));
  }

  function canSleep() { return storyComplete(); }

  function objective() {
    if (state.emergency) return [state.emergency.name, `Proceed to ${state.emergency.location}. Resolve the fault before the countdown expires.`];
    if (state.day === 9 && !state.probeBuilt) return ['Build planetary probe', 'Use the probe lab. Install four science modules and calibrate the spectrometer.'];
    if (state.day === 10 && !state.landed) return ['Descent to Kepler–186f', 'Use the navigation console to time three landing thruster burns.'];
    if (state.day === 10 && !state.samples) return ['Collect planet samples', 'Use the probe workbench to survey the surface and secure three samples.'];
    if (state.day === 15) return ['The last light-year', 'Finish your return checklist, then use the bed to initiate Earth arrival.'];
    if (state.day > 10) return ['Bring them home', 'Samples are secured. Keep the Astrid operational through the return crossing.'];
    if (state.day === 10) return ['Surface operation complete', 'Samples are sealed. Finish maintenance and rest to launch for Earth.'];
    return ['The long crossing', 'Maintain your ship and yourself. Reach Kepler orbit on Day 10.'];
  }

  function updateHUD() {
    for (const def of statDefs) {
      const value = state.stats[def.key];
      $(`value-${def.key}`).textContent = `${Math.ceil(value)}%`;
      $(`fill-${def.key}`).style.width = `${value}%`;
      $(`vital-${def.key}`).classList.toggle('low', value < 25);
    }
    $('day-number').textContent = String(state.day).padStart(2, '0');
    const dayMinute = Math.floor(state.elapsed / DAY_SECONDS * 1440);
    $('ship-time').textContent = `${String(Math.floor(dayMinute / 60)).padStart(2, '0')}:${String(dayMinute % 60).padStart(2, '0')}`;
    $('time-remaining').textContent = `${clock(Math.ceil(Math.max(0, DAY_SECONDS - state.elapsed)))} until automatic sleep`;
    $('phase-label').textContent = state.day < 10 ? 'OUTBOUND TRANSIT' : state.day === 10 ? 'PLANETARY OPERATIONS' : 'HOMEBOUND TRANSIT';
    const routeProgress = state.won ? 100 : ((state.day - 1 + state.elapsed / DAY_SECONDS) / 15) * 100;
    $('route-fill').style.width = `${routeProgress}%`;
    $('route-ship').style.left = `${routeProgress}%`;
    $('mission-distance').textContent = state.day < 10 ? `${10 - state.day} cycles to Kepler orbit.` : state.day === 10 ? 'Kepler–186f · orbital rendezvous.' : `${16 - state.day} cycles to Earth arrival.`;
    $('sample-status').textContent = state.samples ? 'SAMPLES: SECURED ✓' : 'SAMPLES: NOT ACQUIRED';
    $('sample-status').style.color = state.samples ? '#a6d998' : '';
    $('task-count').textContent = `${daily.filter(s => state.tasks.has(s.id)).length} / ${daily.length}`;
    for (const station of daily) {
      const done = state.tasks.has(station.id);
      $(`task-${station.id}`).classList.toggle('done', done);
      $(`task-${station.id}`).firstElementChild.textContent = done ? '✓' : '';
    }
    for (const station of stations) {
      const label = $(`map-label-${station.id}`);
      if (label) {
        label.classList.toggle('is-done', state.tasks.has(station.id));
        label.classList.toggle('is-active', nearest?.id === station.id || state.emergency?.station === station.id);
        label.hidden = station.type === 'trash' && !state.trash.has(station.room);
      }
    }
    const [title, description] = objective();
    $('objective-title').textContent = title;
    $('objective-description').textContent = description;
    const missed = shipTasks.filter(id => !state.tasks.has(id)).length;
    $('sleep-status').textContent = canSleep() ? `Sleep available. Unfinished ship tasks: −${missed * 30} ship health. ${state.tasks.has('toilet') ? 'Toilet complete.' : 'Toilet skipped: −30 health.'}` : 'Complete today’s mission objective before the sleep deadline.';
    $('vital-message').textContent = state.trash.size ? 'Contamination! Clean every marked room.' : state.stats.health < 30 ? 'Health critical. Restore needs and rest.' : Math.min(state.stats.hunger, state.stats.thirst, state.stats.mood) < 25 ? 'Low reserves. Manage your remaining supplies.' : 'All systems nominal. Keep it that way.';
    $('ship-health-value').textContent = `${Math.ceil(state.shipHealth)}%`;
    $('ship-health-fill').style.width = `${state.shipHealth}%`;
    $('ship-health-fill').style.backgroundColor = state.shipHealth <= 30 ? '#ff7187' : '#a6e99b';
    $('food-stock').textContent = `${state.supplies.food} / 12`;
    $('water-stock').textContent = `${state.supplies.water} / 12`;
    $('waste-value').textContent = `${Math.floor(state.waste)}%`;
    $('waste-fill').style.width = `${state.waste}%`;
    $('waste-status').textContent = state.trash.size ? `CONTAMINATED: ${state.trash.size} rooms · −2 health/sec` : state.wasteTimer !== null ? `DUMP WASTE IN ${Math.ceil(state.wasteTimer)}s` : 'Overflow warning at 80% · 30s to respond';
    $('oxygen-status').textContent = state.tasks.has('oxygen') ? 'O₂ CHECKED · 21.0%' : 'O₂ CHECK REQUIRED';
    $('care-status').textContent = ['food', 'water', 'tv'].map((id, i) => `${['Meal', 'Drink', 'TV'][i]}: ${state.tasks.has(id) ? 'done' : 'skipped = −30 overnight'}`).join(' · ');
    $('coordinates').textContent = `X: ${Math.round(state.player.x)} / Y: ${Math.round(state.player.y)}`;
    $('deck-status').textContent = state.emergency ? 'EMERGENCY · IMMEDIATE ACTION' : state.landed && state.day === 10 ? 'LANDED · SURFACE LINK ACTIVE' : 'PRESSURIZED · O₂ STABLE';
    const alerts = [];
    if (state.emergency) alerts.push(`⚠ ${state.emergency.name} · ${Math.ceil(state.emergency.remaining)}s · ${state.emergency.location}`);
    if (state.wasteTimer !== null) alerts.push(`DUMP WASTE: ${Math.ceil(state.wasteTimer)}s`);
    if (state.trash.size) alerts.push(`CLEAN ${state.trash.size} ROOMS · −2 HEALTH/SEC`);
    $('emergency-banner').hidden = !alerts.length;
    $('emergency-banner').textContent = alerts.join(' | ');
    if ($('mini-telemetry')) $('mini-telemetry').textContent = `DAY ${state.day} · ${clock(Math.ceil(Math.max(0, DAY_SECONDS - state.elapsed)))} TO SLEEP · SHIP ${Math.ceil(state.shipHealth)}%` + (state.emergency ? ` · ⚠ ${state.emergency.name}: ${Math.ceil(state.emergency.remaining)}s` : '') + (state.wasteTimer !== null ? ` · WASTE ${Math.ceil(state.wasteTimer)}s` : '') + (state.trash.size ? ` · CONTAMINATION: ${state.trash.size} ROOMS` : '');
    if ($('repair-target')) $('repair-target').textContent = `${Math.min(100, Math.ceil(state.shipHealth) + 50)}%`;
    $('pause-button').innerHTML = state.paused ? '▶ <span>Resume</span>' : 'Ⅱ <span>Pause</span>';
  }

  // Circle collision uses the union of connected floor rectangles and solid fixtures.
  function onFloor(x, y) {
    return [...rooms, ...corridors].some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  }
  function canOccupy(x, y) {
    const radius = state.player.radius;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      if (!onFloor(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)) return false;
    }
    return ![...stations.filter(s => s.type !== 'trash'), ...chairs].some(r => Math.hypot(x - clamp(x, r.x, r.x + r.w), y - clamp(y, r.y, r.y + r.h)) < radius);
  }
  function stationDistance(station) {
    return Math.hypot(state.player.x - clamp(state.player.x, station.x, station.x + station.w), state.player.y - clamp(state.player.y, station.y, station.y + station.h));
  }
  function actionFor(station) {
    if (station.type === 'trash') return { kind: 'cleanup', text: station.name, duration: 4 };
    if (station.id === 'clean') return { kind: 'locked', text: 'Storage · supplies are tracked in the HUD' };
    if (station.id === 'repair') return state.shipHealth >= 100 ? { kind: 'locked', text: 'Ship hull intact · no repair needed' } : DAY_SECONDS - state.elapsed < 65 ? { kind: 'locked', text: 'Repair requires at least 1:05 left in the day' } : { kind: 'repair', text: 'Repair +50 ship · spends 60s immediately', duration: 2 };
    if (station.id === 'waste') return state.waste > 0 ? { kind: 'dump', text: 'Dump accumulated waste', duration: 3 } : { kind: 'locked', text: 'Waste bin empty' };
    if ((station.id === 'food' || station.id === 'water') && state.supplies[station.id] === 0) return { kind: 'locked', text: `No ${station.id} portions remaining` };
    if (station.stat && state.stats[station.stat] >= 100) return { kind: 'locked', text: `${station.stat} full · conserve supplies` };
    if (state.emergency?.station === station.id) return { kind: 'emergency', text: `Repair: ${state.emergency.name}`, duration: 1 };
    if (station.id === 'bed') return canSleep() ? { kind: 'sleep', text: 'Sleep · review overnight penalties', duration: 2 } : { kind: 'locked', text: 'Finish today’s story objective before sleeping' };
    if (station.id === 'probe') {
      if (state.day === 9 && !state.probeBuilt) return { kind: 'probe', text: 'Build planetary probe', duration: 2 };
      if (state.day === 10 && state.landed && !state.samples) return { kind: 'scan', text: 'Collect surface samples', duration: 2 };
      return { kind: 'locked', text: state.probeBuilt ? 'Probe online · awaiting surface link' : 'Probe construction scheduled for Day 9' };
    }
    if (station.id === 'helm') {
      if (state.day === 10 && !state.landed) return { kind: 'land', text: 'Begin planetary descent', duration: 2 };
      return { kind: 'locked', text: 'Autopilot engaged · course stable' };
    }
    if (state.tasks.has(station.id) && !station.stat) return { kind: 'locked', text: `${station.name} · complete` };
    return { kind: 'daily', text: `${station.name}${state.tasks.has(station.id) ? ' · replenish' : ''}`, duration: station.duration };
  }

  function updatePlayer(dt) {
    const p = state.player;
    let ix = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let iy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    const len = Math.hypot(ix, iy);
    if (len) { ix /= len; iy /= len; }
    // Velocity chases the input target with exponential smoothing: quick pick-up, soft glide to a stop.
    const f = 1 - Math.exp(-(len ? ACCEL : BRAKE) * dt);
    p.vx += (ix * SPEED - p.vx) * f;
    p.vy += (iy * SPEED - p.vy) * f;
    if (!len && Math.hypot(p.vx, p.vy) < 4) p.vx = p.vy = 0;
    const mx = p.vx * dt, my = p.vy * dt;
    // Sub-stepped, axis-separated collision: the astronaut slides along walls and furniture instead of sticking.
    const steps = Math.max(1, Math.ceil(Math.hypot(mx, my) / 4));
    for (let i = 0; i < steps; i++) {
      if (canOccupy(p.x + mx / steps, p.y)) p.x += mx / steps; else p.vx *= .15;
      if (canOccupy(p.x, p.y + my / steps)) p.y += my / steps; else p.vy *= .15;
    }
    p.speed = Math.hypot(p.vx, p.vy);
    if (p.speed > 12) p.facing = Math.atan2(p.vy, p.vx);
    p.step += dt * p.speed * .07;
    p.moving = len > 0 || p.speed > 25;
    nearest = stations.filter(s => (s.type !== 'trash' || state.trash.has(s.room)) && stationDistance(s) < 44).sort((a, b) => stationDistance(a) - stationDistance(b))[0] || null;
    $('interaction').hidden = !nearest;
    if (!nearest) { progress = 0; progressId = null; p.working = false; return; }
    const action = actionFor(nearest);
    $('interaction-label').textContent = action.text;
    const actionId = `${nearest.id}:${action.kind}`;
    if (progressId !== actionId) progress = 0;
    progressId = actionId;
    if (keys.has('e') && action.kind !== 'locked' && !p.moving) {
      progress += dt;
      if (progress >= action.duration) {
        const station = nearest;
        progress = 0;
        keys.delete('e');
        interact(station, action.kind);
      }
    } else progress = 0;
    p.working = progress > 0;
    $('interaction-progress').style.width = `${action.duration ? Math.min(100, progress / action.duration * 100) : 0}%`;
  }

  function interact(station, kind) {
    world?.celebrate(station, kind === 'emergency' ? '#ffb0bd' : kind === 'cleanup' ? '#c8f08a' : '#a9f58f'); sfx.done();
    if (kind === 'daily') {
      if (station.id === 'food' || station.id === 'water') {
        if (state.supplies[station.id] <= 0 || state.stats[station.stat] >= 100) return;
        state.supplies[station.id]--;
        addWaste(station.id === 'food' ? 12 : 6);
      }
      if (station.id === 'toilet') addWaste(22);
      state.tasks.add(station.id);
      if (station.stat) state.stats[station.stat] = clamp(state.stats[station.stat] + station.amount, 0, 100);
      log(`${station.name} complete.${station.stat ? ` ${station.stat[0].toUpperCase() + station.stat.slice(1)} restored.` : ''}`);
    } else if (kind === 'sleep') reviewSleep();
    else if (kind === 'repair') openRepair();
    else if (kind === 'dump') { state.waste = 0; state.wasteTimer = null; log('Waste incinerated. Existing room contamination still needs cleaning.'); }
    else if (kind === 'cleanup') { state.trash.delete(station.room); log(`${station.name} complete. ${state.trash.size} contaminated rooms remain.`); }
    else if (kind === 'emergency') openEmergency();
    else if (kind === 'probe') openProbe();
    else if (kind === 'land') openTiming('land');
    else if (kind === 'scan') openScan();
    updateHUD();
  }

  function triggerEmergency(type) {
    const definitions = [
      { name: 'Electrical cascade', station: 'wire', location: 'engineering wiring panel', kind: 'wires' },
      { name: 'Reactor overpressure', station: 'fuel', location: 'reactor / fuel node', kind: 'pressure' },
      { name: 'Debris collision course', station: 'helm', location: 'navigation console', kind: 'dodge' }
    ];
    state.emergency = { ...definitions[type], remaining: Math.floor(random(60, 121)) };
    log(`PRIORITY: ${state.emergency.name}. ${state.emergency.remaining}s to respond.`, true);
    sfx.alarm();
    updateHUD();
  }
  function openEmergency() {
    if (state.emergency.kind === 'wires') openWires('emergency');
    else if (state.emergency.kind === 'pressure') openTiming('pressure');
    else openDodge();
  }
  function resolveEmergency() {
    const name = state.emergency.name;
    state.emergency = null;
    state.emergenciesFixed++;
    closeModal();
    log(`${name} resolved. Astrid systems stabilized.`);
    updateHUD();
  }

  function addWaste(amount) {
    state.waste = clamp(state.waste + amount, 0, 100);
    if (state.waste >= WASTE_LIMIT && state.wasteTimer === null && !state.trash.size) {
      state.wasteTimer = 30;
      log('Waste limit exceeded! Dump it within 30 seconds to prevent contamination.', true);
    }
  }
  function damageShip(amount, reason) {
    state.shipHealth = Math.max(0, state.shipHealth - amount);
    log(`${reason}: −${amount} ship health.`, true);
    if (state.shipHealth <= 0) endGame(false, 'Ship integrity reached zero. The Astrid can no longer sustain the mission.');
  }
  function overnightPenalties() {
    return {
      ship: shipTasks.filter(id => !state.tasks.has(id)).length * 30,
      toilet: state.tasks.has('toilet') ? 0 : 30,
      hunger: state.tasks.has('food') ? 0 : 30,
      thirst: state.tasks.has('water') ? 0 : 30,
      mood: state.tasks.has('tv') ? 0 : 30
    };
  }
  function penaltyMarkup(p) {
    return `<div class="night-report"><span>SHIP INTEGRITY <b>−${p.ship}</b></span><span>SKIPPED TOILET <b>−${p.toilet} health</b></span><span>HUNGER <b>−${p.hunger}</b></span><span>THIRST <b>−${p.thirst}</b></span><span>MOOD <b>−${p.mood}</b></span></div>`;
  }
  function reviewSleep() {
    showModal('sleep', 'END CYCLE / PREVIEW', 'Ready for the next day?', 'Unfinished maintenance costs 30 ship health per task. Skipping the toilet costs 30 health. Active hazard countdowns carry into tomorrow. The clock keeps running while you decide.', penaltyMarkup(overnightPenalties()), [
      { text: 'Sleep now', action: () => finishDay(true) },
      { text: 'Return to ship', quiet: true, action: closeModal }
    ]);
  }
  function finishDay(slept) {
    closeModal();
    if (!storyComplete()) return endGame(false, 'The mission window closed before your planetary objective was complete.');
    const p = overnightPenalties();
    state.daysRested++;
    // Apply lethal penalties before any recovery; sleep cannot revive a dead crew member.
    state.stats.health = Math.max(0, state.stats.health - p.toilet);
    for (const key of ['hunger', 'thirst', 'mood']) state.stats[key] = Math.max(0, state.stats[key] - p[key]);
    if (p.ship) damageShip(p.ship, 'Missed daily maintenance');
    if (state.ended) return;
    if (state.stats.health <= 0) return endGame(false, 'Skipping sanitation exhausted the astronaut’s remaining health.');
    const recovered = !p.toilet && !state.trash.size && Math.min(state.stats.hunger, state.stats.thirst, state.stats.mood) > 0 ? 12 : 0;
    state.stats.health = Math.min(100, state.stats.health + recovered);
    if (state.day === 15) {
      if (!state.samples) return endGame(false, 'You reached Earth without the planetary samples. Mission incomplete.');
      return endGame(true, 'The Astrid made it home with planetary samples, a living astronaut, and a functioning hull. Mission complete.');
    }
    state.day++;
    state.elapsed = 0;
    state.tasks.clear();
    state.lateWarned = false;
    // Active incidents, contamination, resources, and integrity persist across days.
    planEmergencies();
    nearest = null;
    progress = 0;
    log(`Day ${state.day}: ship ${state.shipHealth}%. Food ${state.supplies.food}, water ${state.supplies.water}.`);
    state.paused = true;
    showModal('briefing', `DAY ${String(state.day).padStart(2, '0')} / 15`, slept ? 'A new cycle awaits.' : 'Automatic sleep complete.', `${objective()[1]} Overnight changes are shown below. ${recovered ? 'Healthy rest restored 12 health.' : 'No health recovery: resolve skipped sanitation, empty needs, or contamination.'}`, penaltyMarkup(p), [
      { text: 'Begin 3-minute cycle →', action: () => { state.paused = false; closeModal(); updateHUD(); } }
    ]);
    updateHUD();
  }

  function updateSimulation(dt, timeOnly = false) {
    state.elapsed += dt;
    state.totalTime += dt;
    state.stats.hunger = Math.max(0, state.stats.hunger - dt * .015);
    state.stats.thirst = Math.max(0, state.stats.thirst - dt * .02);
    state.stats.mood = Math.max(0, state.stats.mood - dt * .01);
    const emptyNeeds = ['hunger', 'thirst'].filter(key => state.stats[key] <= 0).length;
    const harm = emptyNeeds * 3 + (state.stats.mood <= 0 ? .5 : 0) + (state.trash.size ? 2 : 0);
    state.stats.health = Math.max(0, state.stats.health - dt * harm);
    if (state.stats.health <= 0) return endGame(false, state.trash.size ? 'Uncleaned waste contamination overwhelmed the astronaut.' : 'Your vital signs went silent. Keep hunger and thirst above zero.');
    addWaste(dt * .06);
    if (state.wasteTimer !== null) {
      state.wasteTimer -= dt;
      if (state.wasteTimer <= 0) {
        state.wasteTimer = null;
        state.trash = new Set([0, 1, 2]);
        state.waste = 0;
        log('Waste overflow! Clean the marked trash in all three rooms. Health draining.', true);
      }
    }
    if (state.emergency) {
      state.emergency.remaining -= dt;
      if (state.emergency.remaining <= 0) {
        const failed = state.emergency.name;
        if (mini && (mini.purpose === 'emergency' || mini.purpose === 'pressure' || mini.type === 'dodge')) closeModal();
        state.emergency = null;
        damageShip(50, `${failed} unresolved`);
        if (state.ended) return;
      }
    }
    if (!state.emergency && state.schedule.length && state.elapsed >= state.schedule[0].at) {
      const event = state.schedule.shift();
      triggerEmergency(event.type);
    }
    if (state.elapsed >= 150 && !state.lateWarned) {
      state.lateWarned = true;
      log('30 seconds until automatic sleep. Check maintenance and overnight penalties.', true);
    }
    if (state.elapsed >= DAY_SECONDS) { finishDay(false); return; }
    if (!timeOnly) {
      if (mini) updateMini(dt);
      else if (!modalKind) updatePlayer(dt);
    }
  }

  function openRepair() {
    if (DAY_SECONDS - state.elapsed < 65 || state.shipHealth >= 100) return;
    keys.clear();
    log('Hull repair started: one minute committed. Inspect damaged sectors and apply the right tools.');
    // Spend the minute through the simulation so incidents and vital drain cannot be bypassed.
    for (let i = 0; i < 600 && !state.ended; i++) updateSimulation(.1, true);
    if (!state.ended) openRepairPanel();
  }

  function showModal(kind, eyebrow, title, description, content, actions) {
    if ($('modal').hidden) previousFocus = document.activeElement;
    modalKind = kind;
    keys.clear();
    progress = 0;
    disposeScene();
    state.player.vx = state.player.vy = 0; state.player.working = false;
    $('modal-eyebrow').textContent = eyebrow;
    $('modal-title').textContent = title;
    $('modal-description').textContent = description;
    $('modal-content').innerHTML = (kind === 'game' || kind === 'sleep' ? '<div id="mini-telemetry" class="modal-stat" role="status"></div>' : '') + content;
    $('modal-actions').replaceChildren(...actions.map(item => {
      const button = document.createElement('button');
      button.className = `button${item.quiet ? ' quiet' : ''}`;
      button.textContent = item.text;
      button.addEventListener('click', item.action);
      return button;
    }));
    $('modal').hidden = false;
    $('modal').querySelector('button')?.focus();
    updateHUD();
  }
  function disposeScene() {
    if (activeScene) { activeScene.dispose(); activeScene = null; }
    $('modal').firstElementChild?.classList.remove('with-scene');
  }
  function startScene(make) {
    $('modal').firstElementChild.classList.add('with-scene');
    try { activeScene = make(); } catch (err) { console.error('3D scene unavailable', err); activeScene = null; $('scene-canvas')?.closest('.scene-frame')?.remove(); }
  }
  function sceneBlock() { return '<div class="scene-frame"><canvas id="scene-canvas" class="scene-canvas"></canvas><div id="scene-hud" class="scene-hud"></div></div>'; }
  function closeModal() {
    disposeScene();
    $('modal').hidden = true;
    mini = null;
    modalKind = null;
    keys.clear();
    progress = 0;
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  function survivalManual() {
    return `<div class="manual-grid"><div><b>180-SECOND DAYS</b>Sleep at the bed or automatically at the deadline. Missing each fuel, wire, comms, or oxygen check costs 30 ship health. Skipping the toilet costs 30 astronaut health.</div><div><b>LIMITED SUPPLIES</b>12 food and 12 water portions for the journey. Meals restore 45 hunger; water restores 50 thirst. Skipping food, drink, or TV costs 30 in that need overnight. Empty hunger/thirst drains 3 health/sec each.</div><div><b>REPAIR / EMERGENCIES</b>0–2 incidents per day. A missed deadline costs 50 ship health. At the repair bay, commit 60 seconds immediately and inspect three damaged sectors to restore 50 integrity. You need 1:05 left to start. Cancelling does not refund time.</div><div><b>WASTE / CLEANUP</b>Waste builds over time and with eating, drinking, and toilet use. At 80%, dump within 30 seconds. Overflow contaminates all three rooms. Clean every marked pile; contamination drains 2 health/sec.</div><div><b>REST AND RECOVERY</b>Healthy sleep restores 12 health if the toilet was used, all needs remain above zero, and rooms are clean. Empty mood drains 0.5 health/sec. Active hazard timers persist across sleep.</div><div><b>THE JOURNEY</b>Day 9: build at the probe lab. Day 10: land at navigation, then collect samples at the lab. Finish Day 15 with samples, a living crew member, and ship integrity above zero.</div></div>`;
  }
  function showWelcome() {
    showLanding();
  }
  function enterFlight() {
    $('landing').hidden = true;
    $('game-shell').hidden = false;
    document.body.classList.remove('on-landing');
    world?.resize();
  }
  function showLanding() {
    closeModal();
    if (state.running) state.paused = true;
    $('game-shell').hidden = true;
    $('landing').hidden = false;
    $('landing-content').hidden = false;
    $('quit-screen').hidden = true;
    document.body.classList.add('on-landing');
    document.body.classList.remove('tasks-open');
    $('tasks-toggle').setAttribute('aria-expanded', 'false');
    $('resume-button').hidden = !state.running;
    $('start-button').textContent = state.running ? 'Start new mission' : 'Start mission →';
    (state.running ? $('resume-button') : $('start-button')).focus();
  }
  function aboutMission() {
    showModal('about', 'OPERATION / VALHALLA JOURNEY', 'Bring another world home.', 'In 2086, the VSS Astrid leaves Earth for Kepler–186f. You are its only astronaut. Build a scientific probe on Day 9, land and recover planetary samples on Day 10, and survive the return crossing by Day 15.', survivalManual(), [{ text: 'Back to main menu', action: closeModal }]);
  }
  function togglePause() {
    if (!state.running || state.ended || !$('landing').hidden) return;
    if (modalKind === 'pause' || modalKind === 'help') {
      state.paused = false;
      closeModal();
    } else if (!modalKind) {
      state.paused = true;
      showModal('pause', 'SIMULATION PAUSED', 'A moment of quiet.', 'The clock and all emergencies are paused. Your journey resumes exactly where you left it.', '', [{ text: 'Resume flight →', action: togglePause }]);
    }
    updateHUD();
  }
  function showHelp() {
    if (modalKind || state.ended) return;
    state.paused = true;
    showModal('help', 'ASTRID / FLIGHT MANUAL', 'Every choice has a cost.', 'Walk near a station, stop moving, and hold E. Optional care is a resource decision. The simulation is paused while reading this manual.', survivalManual() + '<div class="modal-stat">Escape pauses while exploring. Mouse wheel zooms the ship camera. In a minigame, Escape returns to the ship.<br>Switching tabs pauses the simulation. Reloading starts a new mission.</div>', [{ text: 'Return to ship →', action: togglePause }]);
  }
  function endGame(won, reason) {
    state.won = won;
    state.ended = true;
    state.running = false;
    state.paused = false;
    keys.clear();
    mini = null;
    $('pause-button').disabled = true;
    updateHUD();
    if (won) { $('route-fill').style.width = '100%'; $('route-ship').style.left = '100%'; }
    showModal('end', won ? 'MISSION CONTROL / SIGNAL RECEIVED' : 'MISSION CONTROL / SIGNAL LOST', won ? 'Welcome home, astronaut.' : 'The stars fall silent.', reason, `<div class="large-emblem">${won ? '✦' : '◇'}</div><div class="end-score">MISSION DAY ${state.day} / 15<br>EMERGENCIES RESOLVED ${state.emergenciesFixed}<br>REST CYCLES ${state.daysRested}<br>PLANETARY SAMPLES ${state.samples ? 'SECURED' : 'NOT SECURED'}<br>ACTIVE FLIGHT TIME ${clock(state.totalTime)}</div>`, [{ text: 'Launch a new mission →', action: startGame }]);
  }

  // Modal games share the live simulation clock. Closing one forfeits its progress.
  const probeParts = [
    { id: 'power', name: 'RTG power unit', icon: 'ϟ', role: 'ENERGY BUS', detail: 'Supplies steady electrical power when sunlight is weak.', spec: 'OUTPUT / 120 W' },
    { id: 'sensor', name: 'Spectrometer', icon: '◈', role: 'SCIENCE MOUNT', detail: 'Reads reflected light to identify minerals in the surface.', spec: 'BAND / 42 MHz' },
    { id: 'radio', name: 'Uplink antenna', icon: '⌁', role: 'TELEMETRY PORT', detail: 'Sends surface readings and probe status back to Astrid.', spec: 'LINK / S-BAND' },
    { id: 'sample', name: 'Sample capsule', icon: '▣', role: 'SEALED CARGO BAY', detail: 'Keeps three mineral samples sealed during the return flight.', spec: 'CAPACITY / 3 SAMPLES' }
  ];
  function openProbe() {
    showModal('game', 'DAY 09 / SCIENCE WORKSHOP', 'Build the planetary probe.', 'Select a component, read its purpose, then install it in the matching mount on the blueprint. Fit all four modules and calibrate the science sensor.', `<div class="workshop-steps"><span class="active" id="probe-stage-assembly">01 ASSEMBLE</span><span id="probe-stage-calibrate">02 CALIBRATE</span><span>03 FLIGHT READY</span></div><div class="probe-workshop"><div class="component-rack">${shuffle(probeParts).map(p => `<button class="component-card" data-part="${p.id}"><span>${p.icon}</span><b>${p.name}</b><small>${p.spec}</small></button>`).join('')}</div><div class="probe-blueprint"><span class="blueprint-caption">P-01 / REMOTE SCIENCE VEHICLE</span><div class="probe-body" aria-hidden="true"><i></i><b>V</b><i></i></div><div class="probe-mounts">${probeParts.map((p,i) => `<button class="probe-mount" data-mount="${p.id}"><small>0${i+1}</small><strong>${p.role}</strong><span>EMPTY MOUNT</span></button>`).join('')}</div><div class="assembly-meter"><i id="assembly-fill"></i></div><span id="assembly-status">0 / 4 MODULES INSTALLED</span></div></div><div id="component-info" class="component-info">Select a component to inspect its function.</div><div id="probe-calibration" class="probe-calibration" hidden><label for="probe-frequency">SENSOR CALIBRATION <b id="frequency-value">20 MHz</b></label><p>Kepler mineral reference: <strong>42 MHz</strong>. Tune within ±1 MHz for a valid spectrum.</p><input id="probe-frequency" type="range" min="10" max="80" value="20" step="1"><button id="probe-test" class="button">Run flight-readiness test</button></div><div class="game-feedback" id="game-feedback" role="status">Install modules to enable calibration. No supplies are consumed.</div>`, gameActions());
    mini = { type: 'probe', purpose: 'probe', selected: null, installed: new Set() };
    document.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => {
      if (mini?.type !== 'probe') return;
      const part = probeParts.find(p => p.id === button.dataset.part);
      mini.selected = part.id;
      document.querySelectorAll('[data-part]').forEach(b => b.classList.toggle('selected', b === button));
      $('component-info').textContent = `${part.name}: ${part.detail} Install at the ${part.role.toLowerCase()}.`;
    }));
    document.querySelectorAll('[data-mount]').forEach(button => button.addEventListener('click', () => {
      if (mini?.type !== 'probe' || mini.installed.has(button.dataset.mount)) return;
      if (!mini.selected) { $('game-feedback').textContent = 'Choose a component from the rack first.'; return; }
      if (mini.selected !== button.dataset.mount) { $('game-feedback').textContent = 'Mount incompatible. Read the component’s function and choose its matching port.'; return; }
      const part = probeParts.find(p => p.id === mini.selected);
      mini.installed.add(part.id);
      button.classList.add('installed'); button.disabled = true;
      button.querySelector('span').textContent = `${part.icon} ONLINE`;
      const component = document.querySelector(`[data-part="${part.id}"]`);
      component.disabled = true; component.classList.remove('selected');
      mini.selected = null;
      $('assembly-fill').style.width = `${mini.installed.size * 25}%`;
      $('assembly-status').textContent = `${mini.installed.size} / 4 MODULES INSTALLED`;
      $('game-feedback').textContent = `${part.name} installed. ${part.detail}`;
      if (mini.installed.size === 4) {
        $('probe-calibration').hidden = false;
        $('probe-stage-assembly').classList.remove('active');
        $('probe-stage-calibrate').classList.add('active');
        $('game-feedback').textContent = 'Hardware complete. Tune the spectrometer to the Kepler reference and run diagnostics.';
        $('probe-frequency').focus();
      }
    }));
    $('probe-frequency').addEventListener('input', event => { $('frequency-value').textContent = `${event.target.value} MHz`; });
    $('probe-test').addEventListener('click', () => {
      if (mini?.type !== 'probe' || mini.installed.size !== 4) return;
      const error = Math.abs(Number($('probe-frequency').value) - 42);
      if (error > 1) { $('game-feedback').textContent = `Sensor offset: ${error} MHz. Tune closer to 42 MHz and run the test again.`; return; }
      state.probeBuilt = true;
      closeModal();
      log('Probe ready: power, telemetry, science sensor, and sample capsule verified.');
      updateHUD();
    });
  }
  const repairFaults = [
    { id: 'hull', name: 'Port hull fracture', zone: '02', tool: 'patch', status: 'PRESSURE LOSS', detail: 'A split outer plate is leaking cabin pressure. Fit a sealant patch to close the fracture.' },
    { id: 'cooling', name: 'Coolant manifold', zone: '04', tool: 'coolant', status: 'OVERHEATING', detail: 'The thermal loop is running dry. Flush coolant through the manifold to carry heat away.' },
    { id: 'relay', name: 'Power distribution relay', zone: '05', tool: 'isolate', status: 'SHORT CIRCUIT', detail: 'A damaged relay is feeding a short circuit. Isolate the failed branch and reroute power.' }
  ];
  function openRepairPanel() {
    const faults = shuffle(repairFaults);
    showModal('game', 'ENGINEERING / 60 SECONDS COMMITTED', 'Restore ship integrity.', 'One minute has been spent on diagnostics. Inspect each amber compartment, read the fault, and select the matching repair tool. Restore all three for +50 ship health. Cancelling does not refund the minute.', `<div class="repair-summary"><span>CURRENT <b>${Math.ceil(state.shipHealth)}%</b></span><span>AFTER REPAIR <b id="repair-target">${Math.min(100,Math.ceil(state.shipHealth)+50)}%</b></span><span>WORK ORDER <b id="repair-count">0 / 3</b></span></div><div class="repair-workshop"><div class="hull-blueprint"><span class="blueprint-caption">ASTRID / DAMAGE DIAGNOSTICS</span><div class="hull-sections">${Array.from({length:6},(_,i) => { const fault = faults.find(f => Number(f.zone) === i+1); return `<button class="hull-section ${fault ? 'damaged' : 'healthy'}" data-zone="${i+1}" ${fault ? `data-fault="${fault.id}"` : 'disabled'}><small>SECTOR 0${i+1}</small><strong>${fault ? '⚠' : '✓'}</strong><span>${fault ? fault.status : 'NOMINAL'}</span></button>`; }).join('')}</div><div class="repair-key"><span>■ AMBER / FAULT</span><span>■ GREEN / STABLE</span></div></div><div class="repair-inspector"><span class="eyebrow">FAULT INSPECTOR</span><h3 id="fault-title">Select a damaged sector</h3><p id="fault-description">Three faults were detected. Inspect an amber compartment to see its diagnosis and recommended procedure.</p><div class="repair-tools"><button data-tool="patch" disabled><b>▰ Sealant patch</b><small>Closes hull fractures</small></button><button data-tool="coolant" disabled><b>◉ Coolant flush</b><small>Restores thermal circulation</small></button><button data-tool="isolate" disabled><b>ϟ Isolate & reroute</b><small>Bypasses short circuits</small></button></div></div></div><div class="game-feedback" id="game-feedback" role="status">Select a damaged compartment. Hull integrity is restored after all repairs pass inspection.</div>`, gameActions());
    mini = { type: 'repair', purpose: 'repair', selected: null, fixed: new Set() };
    document.querySelectorAll('[data-fault]').forEach(button => button.addEventListener('click', () => {
      if (mini?.type !== 'repair' || mini.fixed.has(button.dataset.fault)) return;
      const fault = repairFaults.find(f => f.id === button.dataset.fault);
      mini.selected = fault.id;
      document.querySelectorAll('[data-fault]').forEach(b => b.classList.toggle('selected', b === button));
      $('fault-title').textContent = fault.name;
      $('fault-description').textContent = fault.detail;
      document.querySelectorAll('[data-tool]').forEach(b => { b.disabled = false; });
      $('game-feedback').textContent = `Sector ${fault.zone}: ${fault.status.toLowerCase()}. Choose the correct procedure.`;
    }));
    document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => {
      if (mini?.type !== 'repair' || !mini.selected) return;
      const fault = repairFaults.find(f => f.id === mini.selected);
      if (button.dataset.tool !== fault.tool) { $('game-feedback').textContent = 'Procedure unsuitable. Review the diagnosis before applying a tool. The clock is still running.'; return; }
      mini.fixed.add(fault.id); mini.selected = null;
      const section = document.querySelector(`[data-fault="${fault.id}"]`);
      section.classList.remove('damaged', 'selected'); section.classList.add('healthy'); section.disabled = true;
      section.querySelector('strong').textContent = '✓'; section.querySelector('span').textContent = 'RESTORED';
      $('repair-count').textContent = `${mini.fixed.size} / 3`;
      $('fault-title').textContent = 'Repair verified';
      $('fault-description').textContent = `${fault.name} is stable. Select the next damaged compartment.`;
      document.querySelectorAll('[data-tool]').forEach(b => { b.disabled = true; });
      $('game-feedback').textContent = `${mini.fixed.size} of 3 faults cleared. Integrity recovery is pending final verification.`;
      if (mini.fixed.size === 3) {
        const restored = Math.min(50, 100 - state.shipHealth);
        state.shipHealth = Math.min(100, state.shipHealth + 50);
        closeModal(); log(`Engineering inspection passed. Ship integrity restored by ${restored} points.`); updateHUD();
      }
    }));
  }
  function gameActions() { return [{ text: 'Return to ship', quiet: true, action: closeModal }]; }
  function openWires(purpose) {
    if (purpose === 'probe') return openProbe();
    if (purpose === 'repair') return openRepairPanel();
    const wires = [{ id: 'A', color: '#67e4e0' }, { id: 'B', color: '#f6ba76' }, { id: 'C', color: '#bb9bdd' }, { id: 'D', color: '#ff839a' }];
    const ports = side => (side === 'left' ? wires : shuffle(wires)).map(w => `<button class="wire-port" data-side="${side}" data-wire="${w.id}" style="--wire:${w.color}">${side === 'left' ? '● ━ ' : ' ━ ● '}${w.id}</button>`).join('');
    showModal('game', purpose === 'repair' ? 'REPAIR BAY / 60 SECONDS COMMITTED' : purpose === 'probe' ? 'DAY 09 / PROBE ASSEMBLY' : 'EMERGENCY / CIRCUIT REPAIR', purpose === 'repair' ? 'Restore the Astrid.' : purpose === 'probe' ? 'Give the probe a heartbeat.' : 'Reconnect the circuits.', `${purpose === 'repair' ? 'One minute has been spent; cancelling does not refund it. Complete all circuits to restore 50 ship health. ' : ''}Select a left terminal, then its matching letter and color on the right. The mission clock is running.`, `<div class="puzzle-legend"><span>INPUT TERMINALS</span><span>OUTPUT TERMINALS</span></div><div class="wire-board"><div class="wire-column">${ports('left')}</div><div class="wire-middle">⌁</div><div class="wire-column">${ports('right')}</div></div><div class="game-feedback" id="game-feedback">0 / 4 circuits connected</div>`, gameActions());
    mini = { type: 'wires', purpose, selected: null, connected: new Set() };
    for (const port of $('modal-content').querySelectorAll('.wire-port')) port.addEventListener('click', () => {
      if (!mini || mini.type !== 'wires') return;
      const id = port.dataset.wire;
      if (mini.connected.has(id)) return;
      if (port.dataset.side === 'left') {
        mini.selected = id;
        document.querySelectorAll('.wire-port').forEach(p => p.classList.toggle('selected', p === port));
      } else if (mini.selected === id) {
        mini.connected.add(id);
        mini.selected = null;
        document.querySelectorAll('.wire-port').forEach(p => { p.classList.remove('selected'); if (p.dataset.wire === id) { p.classList.add('connected'); p.disabled = true; } });
        $('game-feedback').textContent = `${mini.connected.size} / 4 circuits connected`;
        if (mini.connected.size === 4) {
          if (purpose === 'probe') { state.probeBuilt = true; closeModal(); log('Planetary probe assembled. All four circuits nominal.'); updateHUD(); }
          else if (purpose === 'repair') { state.shipHealth = Math.min(100, state.shipHealth + 50); closeModal(); log('Hull repaired: +50 ship integrity.'); updateHUD(); }
          else resolveEmergency();
        }
      } else $('game-feedback').textContent = 'Circuit mismatch. Select a matching left and right terminal.';
    });
  }
  function openTiming(type) {
    const land = type === 'land';
    showModal('game', land ? 'DAY 10 / LANDING SEQUENCE' : 'EMERGENCY / PRESSURE CONTROL', land ? 'Easy on the thrusters.' : 'Vent reactor pressure.', 'Click the action button when the moving indicator is inside the green zone. Three successful hits complete the sequence. A miss resets the streak' + (land ? ' and throws the probe back up.' : '.') + ' The mission clock is running.', (land ? sceneBlock() : '') + '<div class="timing-track"><div class="sweet-spot"></div><div id="timing-marker" class="timing-marker"></div></div><button id="timing-hit" class="button">' + (land ? 'Fire landing thrusters' : 'Release pressure') + '</button><div id="game-feedback" class="game-feedback">0 / 3 successful hits</div>', gameActions());
    mini = { type: 'timing', purpose: type, time: 0, position: 0, hits: 0 };
    if (land) startScene(() => new V.LandingScene($('scene-canvas'), $('scene-hud')));
    $('timing-hit').addEventListener('click', () => {
      if (!mini || mini.type !== 'timing' || mini.finishTimer !== undefined) return;
      if (mini.position >= .4 && mini.position <= .6) {
        mini.hits++;
        $('game-feedback').textContent = `${mini.hits} / 3 successful hits`;
        mini.time = 0;
        mini.position = 0;
        if (land) { activeScene?.burn(mini.hits); sfx.thruster(); }
        if (mini.hits === 3) {
          if (land) {
            state.landed = true; mini.finishTimer = 3.6; setTimeout(() => sfx.touchdown(), 2600);
            $('game-feedback').textContent = 'Touchdown confirmed. Probe stable on Kepler–186f.';
            log('Touchdown confirmed. Use the probe workbench to collect samples.'); updateHUD();
          } else resolveEmergency();
        }
      } else { mini.hits = 0; $('game-feedback').textContent = 'Outside the green zone. Streak reset — try again.'; if (land) activeScene?.miss(); sfx.fail(); }
    });
  }
  function openScan() {
    const deposits = new Set(shuffle(Array.from({ length: 12 }, (_, i) => i)).slice(0, 3));
    showModal('game', 'DAY 10 / REMOTE SURFACE LINK', 'A piece of another world.', 'A survey drone is deployed. Click a sector (on the map or the grid) to scan it for 1.2 seconds; the drone drills each deposit, carries it back to the probe and seals it. Secure three mineral samples. The mission clock is running.', sceneBlock() + `<div class="scan-grid">${Array.from({ length: 12 }, (_, i) => `<button class="scan-cell" data-cell="${i}" aria-label="Scan sector ${i + 1}">◇</button>`).join('')}</div><div id="game-feedback" class="game-feedback">0 / 3 planetary samples secured</div>`, gameActions());
    mini = { type: 'scan', deposits, scanned: new Set(), active: null, progress: 0, found: 0 };
    const pick = i => {
      if (!mini || mini.type !== 'scan' || mini.active !== null || mini.scanned.has(i) || mini.finishTimer !== undefined) return;
      if (activeScene?.busy) { $('game-feedback').textContent = 'Drone is still carrying the last sample. One moment…'; return; }
      mini.active = i; mini.progress = 0;
      document.querySelector(`[data-cell="${i}"]`).textContent = '…';
      activeScene?.beginScan(i);
    };
    startScene(() => new V.ScanScene($('scene-canvas'), $('scene-hud'), { deposits: [...deposits], onPick: pick }));
    document.querySelectorAll('.scan-cell').forEach(button => button.addEventListener('click', () => pick(Number(button.dataset.cell))));
  }
  function openDodge() {
    showModal('game', 'EMERGENCY / MANUAL NAVIGATION', 'Thread the debris field.', 'Survive 10 seconds. Steer with A / D, arrow keys, or drag across the radar. An impact costs 5 health and restarts the run; the emergency timer keeps counting.', '<canvas id="dodge-canvas" class="mini-canvas" width="480" height="260" aria-label="Debris avoidance radar"></canvas><div class="mini-touch"><button id="dodge-left" class="button quiet" aria-label="Steer left">◀ LEFT</button><button id="dodge-right" class="button quiet" aria-label="Steer right">RIGHT ▶</button></div><div id="game-feedback" class="game-feedback">10.0 seconds to clear the field</div>', gameActions());
    mini = { type: 'dodge', time: 0, spawn: .2, x: 240, rocks: [] };
    bindHold($('dodge-left'), 'a');
    bindHold($('dodge-right'), 'd');
    const radar = $('dodge-canvas');
    const steer = event => {
      if (!mini || mini.type !== 'dodge') return;
      const box = radar.getBoundingClientRect();
      mini.x = clamp((event.clientX - box.left) / box.width * 480, 16, 464);
    };
    radar.addEventListener('pointerdown', event => { radar.setPointerCapture(event.pointerId); steer(event); });
    radar.addEventListener('pointermove', event => { if (radar.hasPointerCapture(event.pointerId)) steer(event); });
  }
  function updateMini(dt) {
    if (mini.finishTimer !== undefined) { // victory animation is playing; close when it ends
      mini.finishTimer -= dt;
      if (mini.finishTimer <= 0) { closeModal(); updateHUD(); }
      return;
    }
    if (mini.type === 'timing') {
      mini.time += dt;
      mini.position = (1 - Math.cos(mini.time * (mini.purpose === 'land' ? 3.5 : 4))) / 2;
      $('timing-marker').style.left = `calc(${mini.position * 100}% - ${mini.position * 4}px)`;
    } else if (mini.type === 'scan') {
      if (mini.active === null) return;
      mini.progress += dt;
      activeScene?.setScan(mini.active, Math.min(1, mini.progress / 1.2));
      const button = document.querySelector(`[data-cell="${mini.active}"]`);
      button.textContent = `${Math.min(100, Math.floor(mini.progress / 1.2 * 100))}%`;
      if (mini.progress >= 1.2) {
        const idx = mini.active, found = mini.deposits.has(idx);
        mini.scanned.add(idx);
        mini.active = null;
        button.disabled = true;
        button.classList.add('scanned');
        button.textContent = found ? '✦' : '·';
        if (found) mini.found++;
        activeScene?.finishScan(idx, found, mini.found);
        sfx.scan(found);
        $('game-feedback').textContent = `${mini.found} / 3 planetary samples secured`;
        if (mini.found === 3) { state.samples = true; mini.finishTimer = 3.6; log('Three planetary samples sealed. Humanity has a new story to tell.'); updateHUD(); }
      }
    } else if (mini.type === 'dodge') {
      mini.time += dt;
      mini.spawn -= dt;
      mini.x = clamp(mini.x + (Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'))) * 260 * dt, 16, 464);
      if (mini.spawn <= 0) { mini.rocks.push({ x: random(18, 462), y: -20, r: random(8, 17), speed: random(120, 195) }); mini.spawn = .32; }
      mini.rocks.forEach(rock => { rock.y += rock.speed * dt; });
      if (mini.rocks.some(rock => Math.hypot(rock.x - mini.x, rock.y - 222) < rock.r + 10)) {
        state.stats.health = Math.max(0, state.stats.health - 5);
        mini.time = 0;
        mini.rocks = [];
        $('game-feedback').textContent = 'Impact! −5 health. Run restarted.';
        if (state.stats.health <= 0) return endGame(false, 'Repeated debris impacts breached the Astrid’s hull.');
      } else $('game-feedback').textContent = `${Math.max(0, 10 - mini.time).toFixed(1)} seconds to clear the field`;
      mini.rocks = mini.rocks.filter(rock => rock.y < 290);
      drawDodge();
      if (mini.time >= 10) resolveEmergency();
    }
  }
  function drawDodge() {
    const c = $('dodge-canvas').getContext('2d');
    c.fillStyle = '#07111d'; c.fillRect(0, 0, 480, 260);
    c.strokeStyle = '#142c3c'; c.lineWidth = 1;
    for (let x = 0; x < 480; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 260); c.stroke(); }
    for (let y = 0; y < 260; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(480, y); c.stroke(); }
    c.fillStyle = '#a38f80';
    for (const rock of mini.rocks) { c.beginPath(); c.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#e4b88a'; c.stroke(); }
    c.fillStyle = '#67e4e0'; c.beginPath(); c.moveTo(mini.x, 207); c.lineTo(mini.x - 11, 235); c.lineTo(mini.x, 229); c.lineTo(mini.x + 11, 235); c.closePath(); c.fill();
    c.fillStyle = '#f6ba76'; c.fillRect(mini.x - 3, 233, 6, 8 + Math.sin(decorativeTime * 30) * 4);
  }

  const roomColors = ['#63e6e2', '#c59bff', '#ffc66e'];
  const stationNames = {
    fuel: 'FUEL', wire: 'WIRES', comms: 'COMMS', clean: 'STORAGE', tv: 'TV', toilet: 'TOILET', water: 'WATER', food: 'FOOD', waste: 'WASTE',
    probe: 'PROBE LAB', helm: 'NAVIGATION', bed: 'SLEEP', oxygen: 'OXYGEN', repair: 'REPAIR',
    trash0: 'CLEAN TRASH', trash1: 'CLEAN TRASH', trash2: 'CLEAN TRASH'
  };
  const trashIds = stations.filter(s => s.type === 'trash').map(s => s.id);
  function initMap() {
    const labels = $('map-labels'), roomEls = [], stationEls = {};
    ['01 / COMMAND', '02 / CREW CABIN', '03 / LIFE SUPPORT'].forEach((name, i) => {
      const el = document.createElement('span');
      el.className = 'room-label'; el.textContent = name; el.style.setProperty('--room-color', roomColors[i]);
      labels.append(el); roomEls.push(el);
    });
    for (const s of stations) {
      const el = document.createElement('span');
      el.id = `map-label-${s.id}`; el.className = 'station-label'; el.textContent = stationNames[s.id]; el.style.setProperty('--room-color', roomColors[s.room]);
      labels.append(el); stationEls[s.id] = el;
    }
    try {
      world = new V.ShipWorld(canvas, { rooms, corridors, stations, chairs, roomColors, labels: { rooms: roomEls, stations: stationEls } });
      new ResizeObserver(() => world.resize()).observe($('canvas-wrap'));
      $('canvas-wrap').addEventListener('wheel', event => { event.preventDefault(); world.setZoom(world.zoom * (event.deltaY > 0 ? .92 : 1.08)); }, { passive: false });
    } catch (err) {
      console.error('WebGL unavailable', err);
      $('canvas-wrap').insertAdjacentHTML('beforeend', '<div class="webgl-error">WebGL is unavailable in this browser, so the 3D deck cannot be drawn. Try Chrome, Edge, Firefox or Safari with hardware acceleration enabled.</div>');
    }
    try { hero = new V.LandingHero($('landing-canvas')); } catch (err) { console.error(err); }
  }
  // Everything the 3D scene needs to know about the current game state.
  function renderView() {
    const special = new Set();
    if ((state.day === 9 && !state.probeBuilt) || (state.day === 10 && state.landed && !state.samples)) special.add('probe');
    if (state.day === 10 && !state.landed) special.add('helm');
    return { player: state.player, target: nearest, nearestId: nearest?.id, emergency: state.emergency, special, done: state.tasks, trash: state.trash, trashIds,
      probeBuilt: state.probeBuilt, route: Math.min(1, state.won ? 1 : (state.day - 1 + state.elapsed / DAY_SECONDS) / 15), dayT: state.elapsed / DAY_SECONDS, shipHealth: state.shipHealth };
  }

  function bindHold(element, key) {
    element.addEventListener('pointerdown', event => { event.preventDefault(); element.setPointerCapture(event.pointerId); keys.add(key); });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(event, () => keys.delete(key));
  }
  const controlKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e']);
  window.addEventListener('keydown', event => {
    sfx.unlock();
    const key = event.key.toLowerCase();
    if (controlKeys.has(key)) { event.preventDefault(); if (state.running && !state.paused) keys.add(key); }
    if (key === 'escape' && !event.repeat) { if (['game', 'sleep', 'about', 'restart'].includes(modalKind)) closeModal(); else togglePause(); }
    if (key === 'tab' && !$('modal').hidden) {
      const focusable = [...$('modal').querySelectorAll('button:not(:disabled)')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); if (state.running && !state.paused) { state.paused = true; if (!modalKind) { state.paused = false; togglePause(); } } });
  window.addEventListener('focus', () => { if (state.running && (modalKind === 'game' || modalKind === 'sleep')) state.paused = false; });
  document.addEventListener('visibilitychange', () => {
    keys.clear(); lastFrame = 0;
    if (document.hidden && state.running && !state.paused) { state.paused = true; if (!modalKind) { state.paused = false; togglePause(); } }
    else if (!document.hidden && state.running && (modalKind === 'game' || modalKind === 'sleep') && document.hasFocus()) state.paused = false;
  });
  document.addEventListener('pointerdown', () => sfx.unlock());
  $('sound-button').addEventListener('click', () => { sfx.unlock(); const off = sfx.toggle(); $('sound-button').textContent = off ? '♪ Off' : '♪ On'; });
  $('pause-button').addEventListener('click', togglePause);
  $('help-button').addEventListener('click', showHelp);
  $('start-button').addEventListener('click', () => {
    if (!state.running) return startGame();
    showModal('restart', 'NEW MISSION', 'Launch a fresh journey?', 'Starting again replaces your current mission. Resume from the menu to keep your progress.', '', [{ text: 'Start new mission', action: startGame }, { text: 'Back', quiet: true, action: closeModal }]);
  });
  $('resume-button').addEventListener('click', () => { enterFlight(); state.paused = false; keys.clear(); updateHUD(); $('pause-button').focus(); });
  $('menu-button').addEventListener('click', showLanding);
  $('about-button').addEventListener('click', aboutMission);
  $('quit-button').addEventListener('click', () => {
    state.paused = true;
    keys.clear();
    $('landing-content').hidden = true;
    $('quit-screen').hidden = false;
    $('back-menu-button').focus();
  });
  $('back-menu-button').addEventListener('click', showLanding);
  $('tasks-toggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('tasks-open');
    $('tasks-toggle').setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('[data-move]').forEach(button => bindHold(button, ({ up: 'w', left: 'a', down: 's', right: 'd' })[button.dataset.move]));
  bindHold($('touch-interact'), 'e');

  function frame(timestamp) {
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .1) : 0;
    lastFrame = timestamp;
    decorativeTime += dt;
    if (state.running && !state.paused && !state.ended) updateSimulation(dt);
    if (activeScene) activeScene.render(dt);
    else if (!$('game-shell').hidden && world) { world.update(dt, renderView()); world.render(); }
    else if (!$('landing').hidden && hero) hero.render(dt);
    uiClock += dt;
    if (uiClock > .1) { updateHUD(); uiClock = 0; }
    requestAnimationFrame(frame);
  }
  state = newState();
  initMap();
  initHUD();
  updateHUD();
  showWelcome();
  requestAnimationFrame(frame);
})();
