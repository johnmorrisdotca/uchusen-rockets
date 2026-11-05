# Motion: the fleet's moving parts

The ships of the fleet move the parts that move. It is one shared module, `src/model/fleet/motion.ts`, and one clock in the viewer; nothing is rebuilt and no geometry is made. A moving part is tagged with a `Move` (a name, a pivot and an axis) where its ship builds it, and `MOTIONS` says what each name does over time.

## The Motion choice

| Attribute | Meaning |
|---|---|
| `motion="off"` (or left out) | Every part stands at rest. This is the element's default. |
| `motion="on"` | The parts move at their stated speed. |
| `motion="fast"` | The same, ten times faster, so a slow part can be watched. |

The demo shows a **Motion** choice (Still, Moving) and a **Speed** choice (Real, x10) for the ships that have motion, keeps them in the address as `?motion=on|fast|off` (on is the demo's default and is not written), and prints the real rate beside them. A reader who asked for reduced motion gets stills whatever the attribute says: every part at rest, and nothing is drawn for it.

The view draws the moving parts at most thirty times a second, only while it is on screen and the tab is shown, and stops when nothing moves. It uses the one context the view already has; `e2e/fleet-motion.demo.ts` holds it to that and `e2e/freeze.demo.ts` still passes.

## What moves

| Ship | Part | What it does | Real ancestor and rate |
|---|---|---|---|
| Hanabusa (`fleet-ship-01`) | The three glazed rings (`spin`) | Turn together at 3.43 rpm, one turn every 17.5 s, real speed | The Stanford torus and von Braun's wheel; the rate is the one that gives the living ring 1.00 g at its 76 m radius. The keel does not turn |
| Hanabusa | The industrial wheel (`spin-wheel`) | Turns at 2.83 rpm (1.00 g at its 112 m rim) | The same |
| Miyamoto and Ariake (`fleet-ship-03`, `fleet-ship-ariake`) | Hangar door leaves (`door-leaf-0` to `-4`) | Swing up about the lintel and back, one after the next, 24 s a cycle | The doors of the Vehicle Assembly Building lift in stages; a hangar roller shutter winds up. Drawn faster than a real door |
| Miyamoto | The deployed gold solar array (`array-turn`) | Sweeps 100 degrees on its root beam to face the star, 90 s a cycle | The ISS solar array rotary joints (the Solar Alpha Rotary Joint turns once an orbit, about 92 minutes, and each array can also tilt on its Beta Gimbal Assembly). Drawn faster |
| Miyamoto and Ariake | The four dishes on the command tower (`dish-track`) | Tilt back and forth 70 degrees, 60 s a cycle | A Deep Space Network dish tracks a spacecraft across the sky at about the Earth's rate, a degree every four minutes. Drawn faster |
| Emiake (`fleet-emiake`) | The two outer radiator sails (`sail-swing-port`, `sail-swing-starboard`) | Swing down and out 115 degrees on their hinge along the ship's axis and back, 40 s a cycle | The ISS radiator wings deploying. The sails' own file gained one tag and nothing else. Drawn faster |

| Kyotori (`fleet-kyotori`) | The four solar wings (`wing-turn`), in all three wing states | Sweep 90 degrees on their masts to face the star, 90 s a cycle | The ISS arrays on their rotary joints. The mast extending from flared to full needs a translation: a follow-up |

Not yet: Kyotori's bay doors, Ayanagi's sails, Kyotori's bay doors (on a concept branch), the airlock hatches, the docking-node lifts, the mission pod swap and the small craft. Hanabusa's propellant booms and hubs stay still as drawn; the booms turn with the rings in the ship's notes, and a real turn needs the hub drums and the booms in one tagged group.

## Limits, honestly

A `Move` only turns a group about an axis. So a hangar roller shutter is drawn as its leaf swinging up about the lintel (a real one winds on a drum or slides up its tracks), and the array turns but does not unfold: the stowed and the deployed arrays are still two parts. A door that slides, an array that unfolds and a lift that rides need a translation in `Move`; that is the next step. The speeds other than Hanabusa's are chosen to be watched, and the table says so in each note.

## Adding one

Tag the pieces where the ship builds them: `moving(pieces, { name, pivot, axis })`, before `place` or `local` moves them (a `Move` follows its pieces). Add a row to `MOTIONS` with the ship's registry id and the same name. `test/fleet-motion.test.ts` fails when a row names a group no part carries.
