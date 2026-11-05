# Journey mode: the plan (MODULES-394)

John, 2026-11-04: "start journey mode now". Phase 1 is in the solar system only (Earth, the Moon, the planets). Interstellar trips (Proxima, the log-scale route, the 1.61 M g ship) are phase 2 and reuse the same arithmetic, which is written to be relativistic from the start.

Parts: 395 distances and calculations panel, 396 countdown, preheat and ignition, 397 changeable views, 398 deceleration (flip and burn), 399 summary at arrival, 401 wakusei-planets bodies as stops.

Reference pictures: John's twelve pictures for this ticket (kept outside the repository). They are read for style only: dark ground, pale blue lines, amber values, small-caps labels, a route bar with ACCELERATE and DECELERATE brackets, a segmented preheat bar, a ring dial for the ignition count. Nothing is copied.

## 1. The screens

One page, `demo/journey.html`, five states of one screen. Nothing folds open; every choice is a row of buttons.

1. **Picker.** Three rows of buttons: FROM, TO, CRAFT. A fourth row, WHEN, picks the launch date (the next window, the one after, or "now" for craft that need no window). Beside them a verdict line for the chosen trip: "Can do it", "Can do it, estimated", "Flyby only" or "Not rated", each with why. The choice is kept in the address (`?from=earth&to=mars&craft=falcon-heavy&date=2026-11-27`). The page arrives with Earth to Mars chosen, so it opens already showing a trip.
2. **Route.** The route bar under the stage: origin dot, destination dot, HALFWAY mark, brackets (ACCELERATE and DECELERATE for a continuous-thrust craft; BURN, COAST and BRAKE for a ballistic one), and the craft marker moving. Beside it the **map**: the orbits drawn to scale from the date's real positions, the dashed transfer path, both bodies moving while the craft flies.
3. **Flight view.** The stage: starfield, the craft's own line drawing lying on its side, its plume when the engine burns, the big amber value (DECELERATION 0.21 g with its arrow), speed streaks. Views are chosen with buttons in a row: **Side** and **Map** in the first slice; Front, Rear and Cockpit follow in 397.
4. **Panel.** Distances and calculations, live (395). The same panel shows before the start, so a person can read the trip before pressing Play.
5. **Summary.** A card at arrival (399): route, distance, time on board and Earth time, top speed and Lorentz factor, peak g, delta-v and fuel, signal delay home, and what it compares with. A shareable link is the page's address.

Phone: the stage on top, the route bar under it, then the buttons, then the panel as a two-column list. The map and side view share the stage's box. Touch targets are 48 px.

Countdown (396) sits on the stage before the burn: MAIN ENGINE PREHEATING with ten segments and a percent, then IGNITION IN 3, 2, 1 on a ring dial. Before the arrival burn: DECELERATION BURN IN a timer, then DECELERATION COMPLETE IN a countdown. Reduced motion: no ring sweep, numbers only, the playback jumps between phases instead of easing.

## 2. The physics

All of it is in `src/journey/`, pure (no DOM, no three.js, no dependency), exported as `@johnmorrisdotca/uchusen-rockets/journey`. Units: metres, seconds, kilograms inside; kilometres and AU only at the edges.

### 2.1 Two kinds of craft

| | Ballistic (the real rockets) | Continuous thrust (the SPX fleet) |
|---|---|---|
| Trip | Hohmann transfer: one departure burn, a coast along half an ellipse, one braking burn | Constant acceleration to the halfway point, turn round, the same acceleration to brake (flip and burn) |
| Window | Needed. Found from the real positions of the two bodies | Not needed, but the date changes the distance, so the page offers the best date |
| Needs | The craft's published payload to the right kind of orbit, and the payload's own braking engine | The ship's design acceleration, exhaust speed and masses |

### 2.2 Formulas

Every one is pinned by a test against a published value (section 6).

- Circular speed `v = sqrt(mu / r)`; escape from `r` is `sqrt(2 mu / r)`.
- Hohmann between radii `r1` and `r2` about a body with `mu`: `a = (r1 + r2) / 2`, transfer time `t = pi sqrt(a^3 / mu)`, departure speed change `dv1 = sqrt(mu/r1) (sqrt(2 r2 / (r1 + r2)) - 1)`, arrival `dv2 = sqrt(mu/r2) (1 - sqrt(2 r1 / (r1 + r2)))`. Speed along the path from the vis-viva equation `v^2 = mu (2/r - 1/a)`; position from Kepler's equation (solved by Newton's method).
- **Leaving or entering a well (patched conics).** Heliocentric `dv1` is the speed at infinity `v_inf` at the origin planet. From a circular parking orbit of radius `r_p` the burn is `sqrt(v_inf^2 + 2 mu_p / r_p) - sqrt(mu_p / r_p)`. Capture into a circular orbit at the destination is the same expression with that body's `mu`. Parking orbits: 185 km above the Earth (Apollo's), 100 km above the Moon, 200 km above any other planet's surface, stated on the panel.
- **Synodic period** `S = 1 / |1/T1 - 1/T2|`. The Earth and Mars: 779.9 days.
- **Launch windows from real positions.** A ballistic trip leaving at `t0` reaches the destination if the destination's longitude at `t0 + t_h` equals the origin's longitude at `t0` plus 180 degrees. So the window function is `f(t0) = wrap(L_dest(t0 + t_h) - L_origin(t0) - pi)`, with `t_h` worked from the true radii (`r1` at `t0`, `r2` at `t0 + t_h`, two passes). Scan day by day over two synodic periods, find each sign change that is not a wrap jump, and bisect to the minute. Longitudes and radii come from `heliocentric()` of wakusei-planets (JPL's approximate elements, good to about an arc minute, 1800 to 2050). The result is a list of windows, each with date, flight time, both burns and the angle the destination leads by. The Moon needs no window (a parking orbit can wait for the right point), so the page asks for a date and shows the Moon's real distance at arrival.
- **Continuous thrust, in-system.** Distance `d` between the origin's place at departure and the destination's place at arrival (found by iterating the arrival time twice, since the destination moves). Flip and burn with relativistic constant proper acceleration `a`: rapidity at the flip `eta = acosh(1 + a d / (2 c^2))`, peak speed `c tanh(eta)`, time on board `2 c eta / a`, time in the frame of both ends `2 c sinh(eta) / a`; at coordinate time `t` in the first half, `x = (c^2 / a)(sqrt(1 + (a t / c)^2) - 1)`, `v = a t / sqrt(1 + (a t / c)^2)`, proper time `(c / a) asinh(a t / c)`, and the second half is the first run backwards. In the solar system the corrections are parts per million and the formulas reduce to `T = 2 sqrt(d / a)`; the code is the same one phase 2 needs. A test holds that it agrees with `src/model/fleet/ship-02/journey.ts` for the Proxima trip.
- The Sun's pull is ignored for continuous-thrust trips (1.5 per cent of a 0.04 g ship's thrust at 1 AU) and the straight path is refused when it passes within 0.1 AU of the Sun; the page then says so and offers the best date.
- **Fuel.** Ballistic: the published capacity is the fuel statement ("43.5 t to the Moon"); the arrival burn is checked against the payload's own delta-v where a source gives it. Continuous thrust: `propellant used = m0 (1 - exp(-dv / ve))`, with `ve` the exhaust speed (relativistic form `exp(2 eta / (ve / c))` in phase 2).
- **Signal delay home** `distance / c`, from the craft's real position at each moment.

### 2.3 Where the numbers come from

- Positions, radii, orbit periods: wakusei-planets (`heliocentric`, `moonGeocentric`, `BODIES`). Sizes and tilts are its.
- Gravitational parameters `mu`: wakusei does not export them yet (ticket MODULES-401 asks for it). Until it does, `src/journey/constants.ts` holds NASA/JPL's values (Sun 1.32712440018e11 km^3/s^2, Earth 398600.4418, Moon 4902.8, Mars 42828.37, and the rest) each with its source, and uses the body's own `muKm3s2` when the body source offers one.
- Craft: the package's own `Figure` records (a value names its source, or is blank; estimates are marked as estimates and shown with "est."). See section 4.
- Constants: c, g0, the AU, the Julian year (exact or IAU).

### 2.4 When a craft cannot make the trip

The picker never hides a craft; it says what would happen, and the verdict decides what Play does.

1. **Rated.** A published payload to this kind of orbit exists. Verdict "Can do it", with the figure and its source.
2. **At least.** No figure for this trip, but one for a higher-energy trip does (Moon <- Mars transfer). Energy order: LEO, GTO, trans-lunar, Mars transfer. A rocket that puts 16.8 t on a Mars transfer puts at least that on a trans-lunar path. Verdict "Can do it (at least 16.8 t)".
3. **Flyby only.** The craft can leave, but the payload's own delta-v (where a source gives it) is less than the arrival burn. Orion's 1,050 m/s cannot brake into a low Mars orbit (2.1 km/s). Play still runs; the craft flies past with the braking burn replaced by a "no capture" note, and the summary says so.
4. **Not rated.** No source covers the trip (Saturn V to Mars). Play is offered, flagged "not rated: no published figure"; the burns are computed from the physics and everything the panel cannot source says "est." or "no source".
5. **Cannot.** A continuous-thrust ship whose fuel is not enough (`propellant used > propellant carried`) is refused with the number, and the page names the farthest it can go.

### 2.5 Time scaling for playback

A trip takes minutes (a burn), days (the Moon) or months (Mars), and nothing real is watchable at one speed. The timeline is a list of phases, each with its **mission time** (real seconds) and a **screen time**; inside a phase the mapping is linear and the panel shows the scale ("x 1 200 000"):

| Phase | Mission time | Screen time (at speed x1) |
|---|---|---|
| Preheat | 10 s | 6 s |
| Ignition count | 3 s | 3 s |
| Departure burn (ballistic) or ACCELERATE (continuous) | burn length, or half the trip | 6 s, or 22 s |
| Coast (ballistic only) | the transit | 22 s |
| Flip | 60 s | 4 s |
| Brake burn or DECELERATE | burn length, or half the trip | 6 s, or 22 s |
| Arrival | 5 s | 2 s |

Speed buttons (x0.5, x1, x2, x4) multiply the screen times. A scrubber seeks; Play, Pause and Restart are buttons. Seeking is a pure function: `frameAt(timeline, playbackSeconds)` returns the whole state (phase, mission time, position, speed, burn flags, countdown), so the page can render any frame without having played the ones before, and tests need no clock.

## 3. How wakusei-planets is used, and no cycle

- The core defines a small interface, `BodySource`: `bodies(): Stop[]` (id, English and Japanese name, kind, parent, radius, gm, orbit period, colour), `positionAu(id, ms)` (heliocentric), `moonKm(ms)` (geocentric). The core imports nothing.
- `demo/journey-bodies.ts` adapts `@johnmorrisdotca/wakusei-planets` to it (`BODIES`, `heliocentric`, `moonGeocentric`). The demo and the tests that need real positions import wakusei; the package's own code never does.
- **dev dependency** `@johnmorrisdotca/wakusei-planets` (^0.15.0) for the demo and tests; **optional peer** for a user who wants the ready adapter (`@johnmorrisdotca/uchusen-rockets/journey/wakusei`, a thin file added in 401). Nothing becomes a runtime dependency, so the core stays dependency-free.
- No cycle: wakusei-planets lists only kazoku-ui as a dependency and chikyu-earth and three as peers, and no file in it names uchusen (checked on origin/main 2026-11-04). It must stay so; if wakusei ever wants a rocket it goes through the same interface, never an import.
- 401 (in wakusei): export a `JOURNEY_STOPS` list of every body with the fields a trip needs (radius, gm, escape speed, orbit elements or a position function) and a test that every body has them; the uchusen picker reads that list, so a new wakusei body becomes a stop with no uchusen change. Until then the adapter builds the list from `BODIES` and the constants table.

## 4. The data each craft needs

One record per craft in `src/journey/crafts.ts`, built on the package's `Figure` (value plus source, or blank):

- `id`, `name`, `kind` (`real` or `fleet`), `drawing` (`rocket` and `variant` ids from `ROCKETS`, so the stage draws it with the package's own line drawing), `drive` (`ballistic` or `continuous`).
- Ballistic: `capacity` by orbit kind (`leo`, `gto`, `tli`, `mars`, kilograms, each a `Figure`), `payload` (name, mass, thrust, specific impulse, delta-v: each a `Figure` or blank), `ascentSeconds` (a `Figure`, or an estimate marked so).
- Continuous: `proper acceleration` (g), `exhaust speed` (fraction of c), `dry`, `payload` and `propellant` masses, `peak speed rating`, each from the ship's design bible through the existing `SPEC` and `DESIGN` tables, never typed twice.
- Slice 1 craft, with their published figures (Wikipedia infoboxes read as wikitext 2026-11-04, added to `SOURCES`): **Saturn V** (LEO 140,000 kg, trans-lunar 43,500 kg; payload Apollo CSM with the SPS, 20,500 lbf, Isp 314 s), **Falcon Heavy** (LEO 63,800 kg expended, Mars 16,800 kg; payload unnamed, so its braking engine is an estimate), **Space Launch System** (trans-lunar 27,000 kg; payload Orion, 26,375 kg, 1,050 m/s, AJ10 26.6 kN), and the fleet's **ISV Kaminari, SPX-207** (0.015 g, exhaust 0.4 c, 1.1 Mt dry, 1.0 Mt payload, 6.35 Mt propellant, from `docs/fleet/ship-02.md`). Miyamoto (0.04 g) and the other fleet ships join as a table row each once their branches land; the record needs no change for them.

## 5. The 3D budget

Slice 1 draws **no WebGL at all**: the starfield, the map and the route are one 2D canvas and SVG, and the craft is the package's own line drawing (`<uchusen-rocket mode="drawing" look="line">`, which never loads three.js) turned on its side with CSS. So the page holds zero contexts, no GPU objects, and nothing to dispose beyond listeners and one animation frame.

When 397 adds the cockpit and the painted 3D side view:
- **One WebGL context for the page**, owned by one module, made when a 3D view is first chosen and let go when the person goes back to a drawing view (`renderer.dispose()`, `forceContextLoss()`, geometries, materials and textures disposed; the freeze test counts live contexts and GPU objects over a run of view changes).
- **Render on demand.** No frame is asked for when nothing moves, when the page is out of sight (IntersectionObserver) or in a hidden tab. While the flight plays, one `requestAnimationFrame` loop at most, throttled to **30 frames a second** (frames closer than 33 ms are skipped), and it stops itself at arrival or on Pause.
- The pixel ratio and canvas size follow `src/pixels.ts` (6 million pixels, 4096 a side at most).
- The Earth background (chikyu-earth, already in the demo) stays optional and off by default; when on it is the page's one context and the cockpit shares its renderer rather than making another.
- The 2D canvas has the same on-demand rule and the same 30 fps cap from the first slice, so the code that decides "draw now" is written once.

## 6. The tests

`test/journey-*.test.ts` (Node's runner) plus one browser test, `e2e/journey.demo.ts`.

- **Physics against published values** (the numbers the sources print, with the tolerance the source's own rounding allows): Earth to Mars Hohmann between the planets' mean orbits 258.8 days (NASA's figure, "about 259 days", 8.5 months); heliocentric burns 2.94 and 2.65 km/s; synodic period of the Earth and Mars 779.9 days (from their sidereal periods 365.256 and 686.98 days); Earth-Moon Hohmann from 185 km 119.5 hours and trans-lunar injection 3.13 km/s; circular speed at 185 km 7.79 km/s; Mars transfer burn from low orbit 3.6 km/s; lunar orbit insertion about 0.82 km/s; Mars capture into low orbit about 2.1 km/s; 1 g flip and burn over 4.37 light years 3.6 years on board and about 6 years in Earth's frame; peak speed 0.95 c; agreement with `ship-02/journey.ts` for the Proxima trip.
- **Real positions** (needs wakusei): the closest approach of Mars on 2003-08-27 is 55.76 million km; the Earth's distance from the Sun at perihelion 0.983 AU; Mars windows fall in November to December 2026 and January 2029 and are 780 days apart give or take 25.
- **Continuous thrust:** reduces to `2 sqrt(d / a)` in-system; position, speed and proper time are continuous at the flip; speed is zero at both ends; the second half mirrors the first.
- **Craft data:** every figure has a source or says it is an estimate; every rated trip names its source; the "at least" rule, the flyby rule and the cannot rule each have a case; nothing a craft record names is missing from `ROCKETS`.
- **Timeline:** phases are in order, mission time is monotonic and continuous at every phase boundary, `frameAt` at 0 and at the end give the start and the arrival, scrubbing back and forth gives the same frame.
- **Countdown:** preheat segments, the percent, the ignition numbers and the burn timers at known moments.
- **Words:** the panel's text for known frames (units, digits near c, "est." marks); a hostile craft or body name is escaped.
- **Browser:** the page opens with a trip shown; the picker rows exist and set the address; Play reaches the summary; no visible control is in the browser's default style (kyogijo's `controls.demo.mjs` pattern); at desk and phone width nothing overflows sideways; no WebGL context is made; the frame loop is idle at rest.

## 7. How 395 to 401 split, and what the first slice holds

| Ticket | What it is | In the first slice | Still to do |
|---|---|---|---|
| 395 | The numbers panel and the physics under it | The physics module and its tests; a panel with distance (km, AU, light-seconds), time, speed, acceleration, delta-v, ship time against Earth time, signal delay | Digits near c (99.999 999 999 99 %), "12 um/s slower than light", the Lorentz factor line for phase 2 |
| 396 | Countdown, preheat, ignition, burn timers | Preheat bar, ignition ring, DECELERATION BURN IN and COMPLETE IN | Sound toggle, if the package grows one |
| 397 | Views | Side and Map, buttons in a row | Front, Rear, Cockpit (aberration, Doppler colour, the destination growing), the kazoku-ui view controls, the painted 3D side view |
| 398 | Flip and burn | The flip, the DECELERATION value and arrow, the plume ahead, speed falling to 0 at the destination | The "no braking" toggle on the log-scale line (phase 2) |
| 399 | Summary | The card with route, distance, times, top speed, peak g, delta-v, fuel, signal delay, one comparison | The reachable-universe view (phase 2), image of the card |
| 401 | Bodies as stops | The `BodySource` interface, the demo adapter, the picker built from it, the Moon as a start (to the Earth and to Mars) | The wakusei export and its test, moons of other planets, stars |
| 394 | Parent | The page, the address state, the craft verdicts | Interstellar, the fictional crew ships, cosmic views |

Slice 1 craft: Saturn V, Space Launch System, Falcon Heavy, ISV Kaminari. Trips: Earth to the Moon and Earth to Mars, the Moon to the Earth and to Mars, plus the other planets as destinations for the fleet ship.

## 8. Risks and how they are held

- **Invented numbers.** Every craft figure is a `Figure` with a source or an explicit estimate; a test fails on a bare number.
- **Wakusei's accuracy.** JPL's approximate elements are good to about an arc minute (about 20,000 km at Mars); the page says "real positions to about an arc minute".
- **A Hohmann to the Moon is 5 days; Apollo took 3.** Apollo used a faster, higher-energy path. The panel says "Hohmann (the cheapest path)"; a faster path is a later option.
- **Page weight.** The journey code is a separate entry loaded by its page only; the root bundle is unchanged. The budget script reports the added bytes.
- **Shared files.** The demo menu and `demo/words.js` get one small edit each (a link and the page's words), rebased often. `src/model/fleet/*` and the comparison page are not touched; the Kaminari numbers are read through their existing exports.
