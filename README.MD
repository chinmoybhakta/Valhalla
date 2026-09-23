# Operation: Valhalla Journey

> **One astronaut. Fifteen days. A whole world to bring home.**

A single-player, 2D top-down space survival game built with **HTML, CSS, and vanilla JavaScript**. Explore the VSS Astrid, maintain its systems, ration supplies, respond to emergencies, and return to Earth with planetary samples.

This README describes the final hackathon build, its complete narrative arc, and how to demonstrate it. The story narration below is a presentation script based on the playable mission; it is not a claim that the game includes voiced dialogue or cinematic cutscenes.

## The hackathon pitch

Most space games ask players to fight what is outside their ship. **Valhalla Journey asks them to keep what is inside alive.**

You have three minutes each day, twelve food portions, twelve water portions, and no other crew member to share the work. Every choice competes for time: maintenance, personal care, waste disposal, emergency response, and scientific exploration. Even repairing the ship has a cost—it immediately consumes one minute of the day.

The mission is simple to understand but requires planning: **reach another world, collect its samples, and survive the journey home.**

## Story and setting

**Year:** 2086  
**Program:** United Earth Deep Space Program  
**Spacecraft:** VSS Astrid  
**Crew:** Astronaut 01, a solo mission specialist  
**Destination:** Kepler–186f  
**Mission duration:** 15 game days

Humanity has sent the Astrid beyond familiar space to recover material from another world. The ship is your transport, laboratory, shelter, and life-support system. Its condition matters as much as your own.

The journey uses fictional, compressed travel times and simplified science-themed puzzles. Its focus is survival decisions and exploration rather than a realistic spaceflight simulation.

## Complete mission story script

### Prologue — One seat occupied

**Presentation narration:**

> Earth falls away behind the observation glass. Inside the Astrid, only one seat is occupied. Fifteen days separate departure from the chance of coming home. Between them lies a distant planet, an untested crossing, and a ship that will need constant care.
>
> You are Astronaut 01. Your orders are to reach Kepler–186f, recover planetary samples, and return alive. There is no second crew member. When a warning sounds, it belongs to you.

**On screen:** The landing page introduces Operation: Valhalla Journey, with Start Mission, About the Mission, and Quit. An active mission also offers Resume.

**Player action:** Start the mission and enter the ship.

### Act I — Learning to live in the void

**Days 1–3: Departure and routine**

> The first days are measured in ordinary things: a meal, a drink of water, a visit to the toilet, a check of the oxygen console. The extraordinary part is where those ordinary things happen.
>
> Outside, there is no help. Inside, there is a checklist.

The player learns the connected command room, crew cabin, and life-support room. Each day requires four ship checks and toilet use. Food, water, and entertainment are decisions rather than daily checklist requirements.

**Central decision:** Spend a ration now, or preserve it for a later day?

**Days 4–6: The cost of neglect**

> A skipped check does not disappear when you sleep. It becomes damage. A full waste bin does not empty itself. It becomes a warning—and then a problem in every room.
>
> The Astrid remembers what you leave unfinished.

Resources persist across days. Neglected maintenance damages the ship, unmet needs weaken the astronaut, and waste can contaminate all three rooms. Random incidents can interrupt the routine.

**Central decision:** Address a developing problem now, or accept the risk while completing another task?

**Days 7–8: Approach**

> The destination is closer. Home is farther away. You begin to count what remains: hull integrity, food, water, and the minutes before sleep.
>
> Reaching the planet will only finish half the mission.

The player continues managing the ship and prepares for the upcoming science objectives. These day groupings describe the story’s pacing; they do not add scripted events beyond the implemented maintenance, survival, and random-emergency systems.

### Act II — Build something that can go farther

**Day 9: Planetary probe construction**

> Kepler approach is confirmed. Before the ship can bring a world home, it needs a way to study that world.
>
> On the workbench, four components wait. Individually, they are spare parts. Together, they will become the mission’s scientific instrument.

**Player action:** Visit the probe lab in the command room and assemble the planetary probe.

| Component | Blueprint mount | Purpose in the game |
| --- | --- | --- |
| RTG power unit | Energy bus | Powers the probe |
| Spectrometer | Science mount | Identifies minerals from surface readings |
| Uplink antenna | Telemetry port | Sends readings back to Astrid |
| Sample capsule | Sealed cargo bay | Stores three mineral samples for the return journey |

Select a component, read its description, and install it in its matching mount. Incorrect placements give feedback without completing the mount. After all four modules are installed, calibrate the sensor to the game’s **42 MHz reference, within ±1 MHz**, and run the flight-readiness test.

> Power verified. Telemetry verified. Science instrument calibrated. Sample capsule ready.
>
> For the first time, the workbench holds more than a collection of parts. It holds a reason to finish the journey.

**Story requirement:** Complete the probe before Day 9 ends. Missing this mission window ends the run.

### Act III — A world beneath you

**Day 10, first objective: Landing**

> The crossing gives way to descent. The ship that kept you alive in the void must now reach the surface intact.
>
> Too early. Too late. Or exactly when the indicator reaches the safe zone.

**Player action:** Use the navigation console and time three successful landing-thruster burns inside the green zone. Missing resets the successful-hit streak.

**Day 10, second objective: Surface sampling**

> Touchdown is confirmed. The probe’s surface link comes alive. Twelve sectors wait to be surveyed. Somewhere among them are the samples that will make this journey matter.

**Player action:** Return to the probe lab and scan sectors through the remote surface interface. Each scan takes 1.2 seconds. Find and secure all three mineral samples.

> Three samples sealed. A fragment of another world rests inside the Astrid.
>
> The mission has changed. You are no longer traveling toward a discovery. You are carrying one home.

Surface exploration is represented by the interactive scanning interface; the current build does not include a separate walkable planet map.

**Story requirement:** Finish both landing and sampling before Day 10 ends.

### Act IV — The return crossing

**Days 11–14: Protect the discovery**

> Earth becomes the destination again. The samples are secure, but the ship and its astronaut still need attention.
>
> A damaged relay does not care that the science mission succeeded. Neither does an empty water reserve.

The same persistent supplies, ship integrity, and personal needs continue through the return trip. Repairs, sanitation, waste control, and emergency response remain necessary.

**Central decision:** Can you keep enough health, integrity, and supplies to survive the remaining days?

### Finale — Bring another world home

**Day 15: Earth arrival**

> The final cycle begins. Earth is no longer a memory at the far end of the route. It is the destination ahead.
>
> Complete what you can. Account for what you cannot. Then bring the Astrid home.

Finish the final cycle by sleeping or reaching the automatic-sleep deadline. Overnight penalties still apply before victory is evaluated.

**Successful ending:** Planetary samples are secured, astronaut health is above zero, and ship integrity is above zero.

> Welcome home, astronaut. Fifteen days beyond the familiar. You brought another world home.

### Failure endings

| Failure | Narrative meaning |
| --- | --- |
| Astronaut health reaches zero | The ship loses its only crew member |
| Ship integrity reaches zero | The Astrid can no longer sustain the mission |
| Day 9 ends without a completed probe | The science preparation window closes |
| Day 10 ends without landing and all samples | The planetary operation remains incomplete |
| Day 15 ends without samples | The return does not fulfill the mission |

A single failed emergency is **not automatically fatal**: it removes 50 ship-health points. The mission ends if that damage reduces integrity to zero.

## Final gameplay rules

### Time, rest, and persistence

- One game day lasts **180 seconds / 3 real-time minutes** of active simulation.
- The mission spans **15 days**. Full-length cycles total 45 minutes before early sleep, repair time advances, and pauses are considered.
- The bed allows voluntary sleep, with a preview of overnight penalties. Required story objectives must be completed first.
- At the deadline, automatic sleep applies the same overnight penalties and advances to a next-day briefing, provided the mission has not failed.
- Unfinished daily checks, optional care, and toilet use are evaluated at the end of each day.
- Ship damage, remaining supplies, waste, contamination, and active hazard countdowns persist across days.
- Healthy sleep restores **12 astronaut-health points** only if the toilet was used, all needs remain above zero after overnight deductions, and no contaminated rooms remain.
- Sleep cannot revive an astronaut or ship that has already reached zero health.
- Pausing, reading the flight manual, returning to the main menu, and next-day briefings suspend the simulation. Switching away from the game also pauses it.

All percentage penalties below are **percentage-point deductions**, not multiplicative reductions. For example, 70 ship health minus 30 becomes 40.

### Compulsory daily tasks

| Task | Location | Consequence if skipped |
| --- | --- | --- |
| Refill fuel node | Command room | −30 ship health |
| Repair wire leakages | Command room | −30 ship health |
| Calibrate comms | Command room | −30 ship health |
| Check oxygen level | Command room | −30 ship health |
| Use toilet | Life-support room | −30 astronaut health |

Maintenance penalties stack: missing two ship checks costs **60 integrity**, and missing all four costs **120**, enough to destroy a fully healthy ship. Ordinary checks use a short hold-to-interact progress bar; the oxygen station is a daily check rather than a separate oxygen-resource simulation.

### Food, water, and mood

| Resource or need | Starting amount | Replenishment | Skipped-day consequence |
| --- | --- | --- | --- |
| Hunger | 87% | Food station: +45, consuming one portion | −30 hunger |
| Thirst | 92% | Water station: +50, consuming one portion | −30 thirst |
| Mood | 82% | TV: +45, without consuming rations | −30 mood |
| Food stock | 12 portions | No restocking in the current build | Persists throughout the journey |
| Water stock | 12 portions | No restocking in the current build | Persists throughout the journey |

Eating, drinking, and entertainment are optional each day. They remain available for repeat use when useful, subject to available stock. Full needs block unnecessary consumption, and all needs are capped at 100%.

There is also gradual active-time depletion: hunger loses 0.015 points per second, thirst 0.02, and mood 0.01.

| Critical condition | Astronaut-health drain |
| --- | --- |
| Hunger at zero | 3 points per second |
| Thirst at zero | 3 points per second |
| Mood at zero | 0.5 points per second |
| Any room remains contaminated | 2 points per second total |

These drains stack when multiple conditions are active.

### Waste and contamination

Waste accumulates through active time and daily activities:

| Source | Waste added |
| --- | --- |
| Passage of time | 0.06 points per second |
| Eating | 12 points |
| Drinking | 6 points |
| Toilet use | 22 points |

At **80% waste**, a **30-second countdown** begins. Reach the waste chute and finish dumping before it expires.

If the timer expires, the bin spills into all three rooms. Marked trash piles appear in the command room, crew cabin, and life-support room. Clean each pile individually with a four-second interaction. Health drains until every room is clean. Emptying the chute does not clean existing room contamination.

### Random emergencies

Each day schedules **0, 1, or 2 random incidents**. Their timing and type vary. Incidents become active during the day; early sleep can end a day before a scheduled incident starts. An already-active incident carries across sleep.

| Incident | Station | Minigame |
| --- | --- | --- |
| Electrical cascade | Wiring panel | Connect four matching letter/color terminals |
| Reactor overpressure | Fuel node | Hit the moving indicator in the green zone three times |
| Debris collision course | Navigation console | Steer through a 10-second debris field |

An active emergency gives **60–120 seconds** to respond. Missing its deadline costs **50 ship-health points**. Debris impacts additionally cost 5 astronaut-health points and restart the dodge run.

The mission clock, survival drains, and hazard timers continue during minigames. Leaving a minigame forfeits its puzzle progress.

### Ship repair: diagnose, choose, restore

The command-room repair bay opens a dedicated damage-control interface with compartment status, fault descriptions, tools, and a projected integrity result.

| Damaged system | Diagnosis | Correct tool |
| --- | --- | --- |
| Port hull | Fracture causing pressure loss | Sealant patch |
| Coolant manifold | Overheating from interrupted cooling | Coolant flush |
| Power-distribution relay | Short circuit | Isolate and reroute |

Inspect each amber sector and choose the matching procedure. Wrong tools produce feedback and do not repair the sector. Completing all three restores **up to 50 ship-health points**, capped at 100.

**Repair time is a strategic cost:** starting a repair immediately advances the simulation by **60 seconds**, including vital drain and hazard countdowns. At least 65 seconds must remain when the repair begins. Solving the subsequent interface also takes normal active time. Cancelling does not refund the committed minute or grant partial integrity recovery.

## Ship layout

| Room | Interactive facilities |
| --- | --- |
| Command room | Fuel node, wiring panel, communications, oxygen monitor, repair bay, navigation console, probe lab |
| Crew cabin | Bed, entertainment TV, storage fixture |
| Life-support room | Toilet, water dispenser, food station, waste chute |

Hallways connect the rooms. The astronaut collides with walls and solid fixtures. After contamination, each room receives a separate cleanup target. The storage fixture is informational; supplies are tracked in the HUD rather than a separate inventory screen.

## Controls and menus

| Input or menu | Action |
| --- | --- |
| WASD / arrow keys | Move the astronaut |
| Hold E near a station | Interact while standing still |
| Escape while exploring | Pause or resume |
| Escape in a minigame | Return to the ship |
| Mouse / touch | Operate puzzle controls |
| A / D or left / right arrows | Steer during debris avoidance |
| Drag on the debris radar | Touch/pointer steering |
| On-screen directional buttons | Move on small screens |
| Hold E touch button | Interact on small screens |
| Tasks button | Open the checklist drawer on small screens |
| Help | Read the flight manual with simulation paused |
| Menu | Pause the mission and return to the landing page |

The landing page offers **Start Mission**, **About the Mission**, and **Quit**. **Resume** appears while a mission is active. Starting a new mission during an existing run asks before replacing its progress.

Quit opens a stopped standby screen. It does not force-close the browser tab. Current progress remains available through Resume until the page is reloaded or a new mission is started.

## Visual design and final interface

- Retro 8-bit-inspired ship fixtures, astronaut sprite, and space scenery.
- Color-coded rooms and high-contrast labels rendered in an HTML layer over the canvas.
- A dedicated title screen containing the game identity and mission introduction.
- A compact gameplay HUD for ship integrity, stocks, waste, astronaut vitals, daily checks, mission objectives, and the latest transmission.
- Distinct visual interfaces for probe assembly, calibration, damage diagnostics, wire repair, pressure control, landing, scanning, and debris avoidance.
- A **1920 × 951 target gameplay layout**, constrained to the available viewport on smaller screens.
- Responsive touch controls, a following map view, and a task drawer on small screens.

The earlier compact desktop layout was also checked at 1080 × 800. The final size setting expands the available gameplay area to 1920 × 951. Long help dialogs and small-screen minigames can scroll inside their dialogs when necessary.

## Run the game

1. Keep the three game files in the structure below.
2. Open `index.html` in a modern browser, or serve the folder using an editor extension such as Live Server.
3. Select **Start Mission**.

No package installation, build command, account, or backend is required. The stylesheet requests optional Google Fonts; fallback fonts are provided if they are unavailable.

```text
space game/
├── index.html
├── README.MD
├── app/
│   └── app.js
└── style/
    └── style.css
```

## Technical implementation

| Technology | Responsibility |
| --- | --- |
| HTML | Landing page, HUD, controls, dialog structure |
| CSS | Retro theme, responsive layout, blueprint panels, minigame styling |
| JavaScript | Mission state, interaction logic, simulation, rendering, and puzzles |
| Canvas 2D | Ship, fixtures, astronaut, space background, debris radar |
| `requestAnimationFrame` | Continuous rendering and active-time updates |
| `ResizeObserver` | Canvas resizing and display-density handling |
| Keyboard and Pointer Events | Desktop and touch input |

The JavaScript is organized into functions for state, daily progression, survival rules, interactions, minigames, menus, and rendering. It uses a single mission state and tracks task completion and contamination with sets. Collision checks combine connected floor areas with solid fixture boundaries; movement uses small substeps to reduce tunneling through obstacles.

The game does not use a game engine or third-party JavaScript framework. Ship art and gameplay visuals are drawn with code, CSS, and native SVG rather than a required external image pack.

## Hackathon presentation script

### Opening — approximately 20 seconds

> “This is Operation: Valhalla Journey, a solo space-survival game built with vanilla web technologies. You have fifteen days to reach another planet and bring its samples home. But your biggest challenge is keeping one astronaut and one ship alive with limited resources.”

### Show the gameplay loop — approximately 45 seconds

> “Every day lasts three minutes. These four ship checks protect hull integrity, while sanitation protects the astronaut. Food, water, and entertainment are optional decisions. We start with twelve food and twelve water portions for a fifteen-day mission, so the player has to choose when to consume them.”

**Demonstrate:** Start a mission, move through the command room, hold E to finish a check, and point out the resource HUD.

### Explain pressure and consequences — approximately 30 seconds

> “Skipping a check costs thirty ship-health points. A failed emergency costs fifty. Waste can spill into every room, forcing separate cleanup while health drains. Repairing damage is possible, but starting a repair spends a full minute of your day.”

**Demonstrate when available:** Show the sleep-penalty preview, a waste warning, or the repair diagram after the ship has taken damage.

### Show the science mission — approximately 40 seconds

> “On Day 9, the probe is built from modules with different purposes. You match them to the blueprint, then calibrate the sensor. On Day 10, you time the landing burns and scan the planet for three samples. The remaining days are about protecting that discovery on the way home.”

**Demo preparation:** These milestones unlock through normal play. The build has no public day-skip or debug menu; prepare a recording of later objectives if the judging slot is too short for the full journey.

### Close — approximately 15 seconds

> “The project combines a readable retro interface with persistent consequences and several distinct minigames. It runs directly in a browser without a game engine or backend. The question at the heart of the game is: can you bring another world home without losing yourself—or your ship—along the way?”

## Validation performed during development

Browser-driven checks covered:

- Reachability of stations and cleanup locations, plus wall and fixture collision.
- Stacking maintenance penalties, sanitation penalties, optional-care deductions, and supply consumption.
- Automatic sleep, hazard persistence, waste overflow, cleanup, and health drain.
- Repair time advancement, integrity recovery, and cancellation behavior.
- Emergency minigames and failed-emergency damage.
- Probe component matching, incorrect placement rejection, and required calibration.
- Landing, sampling, mission deadlines, and the successful Day 15 ending.
- Landing-menu pause, resume, and standby behavior.
- Compact desktop layout and mobile horizontal-overflow checks.

JavaScript syntax checks were also run. These development checks are not a committed automated test suite or a claim of exhaustive browser compatibility.

## Current scope

The final build is a complete single-player browser prototype with a playable 15-day mission. Progress is kept in memory: **reloading the page resets the mission**. It does not include persistent saves, multiplayer, a server, voiced narration, or a separate walkable planet environment.

Potential future extensions include save/resume across sessions, additional mission routes, more varied emergency patterns, audio, and expanded surface exploration. These are future ideas, not features claimed for this submission.

---

**Operation: Valhalla Journey — the void is vast. Keep going.**
