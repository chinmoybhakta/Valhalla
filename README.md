# Operation: Valhalla Journey — Low-Poly Edition

Your retro pixel game, rebuilt with three.js (r128) in a low-poly, stylized look.
Game rules, timers, penalties and story are unchanged — only presentation and feel were rebuilt.

## Run
Open `index.html` in a browser (works from `file://`). Needs internet once for three.js and Google Fonts (CDN).
Offline: download https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js to `vendor/three.min.js`
and change the `<script src=...>` in `index.html` to `vendor/three.min.js`.

## Files
- `app/models.js`     low-poly astronaut, probe, planets, ship exterior, particles, noise helpers
- `app/world.js`      3D interior map, stations, space background (orbit physics), follow camera, FX
- `app/cinematics.js` probe landing, drone sample collection, menu hero scene
- `app/app.js`        your original game logic + smooth physics + hooks into the 3D layer
- `style/style.css`   faceted low-poly UI

## What changed
1. Astronaut: detailed articulated suit (pelvis, knees, elbows, gloves, helmet with visor and lamps, life-support pack with hoses, boots) with a full walking gait and work pose.
2. Interior: 3D rooms with walls, windows to space, instanced floor tiles, 17 modelled stations, status beacons, hull + solar arrays.
3. Smooth physics: accelerated/damped movement, wall sliding, smoothed turning, spring camera with look-ahead, wheel zoom.
4. Space background: Earth and Kepler-186f shift with mission progress; moons, satellite and rocks orbit under real gravity; parallax debris; debris emergency sends rocks past.
5. Landing: Day 10 probe descends through the sky; each good burn drops it a stage, a miss throws it back up; legs deploy, dust on touchdown.
6. Collecting data: a drone scans sectors (beam, ring, data stream), drills crystals, carries samples to the probe, seals them and uplinks to a relay satellite.
Extras: particles/juice on every task, alarm lighting, synthesized sound (toggle with the ♪ button), 3D menu backdrop, click sectors directly in the 3D scan view.
