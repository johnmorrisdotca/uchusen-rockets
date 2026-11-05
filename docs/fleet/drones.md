# The SPX repair drone

A small work drone, about a metre across, that flies round ships under construction and mends them. It is the fleet's first small craft built to the detail of NASA's own models. Rocket `fleet-drone`, variant `repair-drone`, one part (`fleet-drone-repair-drone-drone`), grouped under "SPX fleet" in the picker.

Code: `src/model/fleet/drone/` (`layout.ts` the joints and arms, `shell.ts` the saucer, `front.ts` lens, pods, antennas and the ring light, `arms.ts` the arms, `far.ts` the coarse level, `index.ts` the assembly and the named points), `src/model/drone.ts` and `src/data/drone.ts` (the registry row). Painted models: `scripts/make-drone.ts` with its recipe `scripts/drone/recipe.ts` makes `models/fleet-drone-repair-near.glb` and `-far.glb`. Test: `test/drone.test.ts`.

## What it is

- **A layered saucer.** A bevelled white rim with a red stripe, a mid tier and a raised, domed top deck, parted by dark grooves, with panel seams, 40-odd bolted hatches, louvred grilles, slotted vents, a sensor dome, blue handrails, conduits, rim lights and port and starboard running lights.
- **A big round camera lens at the front.** A flanged barrel with a ribbed grip band, a bolt ring, coated rings and iris blades in the glass, and a small sensor cluster on top. It is the tractor-beam emitter.
- **Two thruster pods**, white with red noses, vents, louvres and a light strip, and two red-ringed stalks on the shell.
- **Two tall antennas** with clamps and glowing tips.
- **A cyan ring light under the rim**, over a gold-foil belly.
- **Two jointed arms of four segments each.** Every segment is a bevelled housing with a motor cap ringed in blue light and bolts, vents, three cables with clips and an actuator. The right arm ends in a five-claw gripper, the left in a welding tool.
- **Two landing legs** at the rear.

## The two working points of a build

In the drone's own frame: metres, the lowest point at y = 0, the front towards +Z. They are exported as `DRONE` and read in `test/drone.test.ts`.

| Point | Where (m) | What |
|---|---|---|
| `DRONE.emitter` | 0, 0.83, 0.58 | The middle of the lens glass. The tractor beam leaves along `DRONE.emitterDirection`, +Z. |
| `DRONE.weldTip` | -0.25, 0.11, 0.85 | The end of the welding tool on the left arm. |
| `DRONE.gripper` | 0.26, 0.05, 0.72 | The centre between the gripper's claws, right arm. |

The construction swarm (`src/element/swarm.ts`) draws this model, instanced: the coarse file for every drone and the fine file for the few nearest the camera. The beam leaves the lens and the weld leaves the tool and ends on the part's skin. On a long ship a drone is drawn larger than life, about a fiftieth of the ship's length (at most eight times life size), so a metre-wide craft still reads beside a ship of several hundred metres. The model's own frame matches the code: the lowest point is at y = 0 and the front, the lens, is toward +Z.

## Performance

| Level | File | Triangles | Size | Draws |
|---|---|---|---|---|
| Near | `models/fleet-drone-repair-near.glb` | 119,733 | 4.4 MB | 1 |
| Far | `models/fleet-drone-repair-far.glb` | 2,224 | 124 KB | 1 |

Each is one mesh with one material over three pictures (colour, metal and roughness, glow), so it is one draw. The near level is for a drone you are close to; the far level keeps the silhouette, the lens, the pods, the antennas, the arms and the NASA core, block, gripper, tool and legs at a coarse cut, with none of the fine detail. The exact numbers are in `docs/fleet/drone-numbers.json`, written by the script.

The line looks and the code-made mesh (`dronePieces()`) leave out the fine detail (bolts, slots) to stay inside the fleet's 1.25 MB mesh limit.

## In the Lit look

The glow picture lights the motor rings, the ring light under the rim, the lens rim and its core, the pod lamps, the antenna tips, the running lights and the weld tip. The viewer lights it with the engines (`MODEL_GLOW` in `src/element/scene.ts`); a painted model with a glow picture is lit like this package's own lamps.

## NASA's models

Free to use: the NASA-3D-Resources README says its assets "are free and without copyright" and points to NASA's usage guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media); this package rests on its owner's decision of 2026-11-02 (see `NOTICE.md`). No NASA logo, insignia, flag or lettering is in any file; each was looked for and left out. Credits are in `MODEL_CREDITS` and `NOTICE.md`, and `check()` lists them for the drone.

| Model | Page | File used | Taken | Where it is on the drone |
|---|---|---|---|---|
| Cluster II | https://science.nasa.gov/3d-resources/cluster-ii/ | `.../model/cluster-ii/Cluster%20II.glb` | The drum, its lid and the instruments on it (7,860 triangles), the booms left out | The core drum under the saucer: turned over so its gold foil faces down, a third of its size across and a fifth of its height. Its solar-cell side is the dark band under the rim. |
| High Energy Transient Explorer | https://science.nasa.gov/3d-resources/high-energy-transient-explorer/ | `.../model/high-energy-transient-explorer/High%20Energy%20Transient%20Explorer.glb` | Its whole body (4,452) | The equipment block on the saucer's rear top, with its hinged plate |
| InSight cruise and lander | https://science.nasa.gov/3d-resources/insight-cruise-lander/ | `.../model/insight-cruise-lander/InSight%20Cruise%20Lander%20(arm%20deployed).glb` | The arm's two long links, the five-claw grapple without its cable, the arm camera, and two landing legs | The right arm's upper and forearm links, its gripper and wrist camera, and the two legs |
| Curiosity (detailed) | https://science.nasa.gov/3d-resources/curiosity-rover-detailed/ | `.../printable/curiosity-rover-(detailed)/Parts.zip`: `upper-arm.stl`, `lower-arm.stl`, `mahli-apxs.stl` (the same parts as that page's `2-components.stl`, one file each) | The two arm links and the tool turret | The left arm's links and the tool turret at its wrist. An STL has no pictures, so this package paints it. |
| Grease gun | https://science.nasa.gov/3d-resources/grease-gun/ | `.../model/grease-gun/Grease%20Gun.glb` | The whole tool (9,808) | The welding tool, with a welding nozzle of this package's own at its muzzle |

The base address is https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/. Aquarius, Aura, Ben Franklin, Cassini and the Scarecrow rover were looked at and not used.

John's pictures are credited as: design reference: images supplied by the project owner (kept privately, not distributed). Nothing is traced or copied from them.

## Rebuilding the models

```sh
UCHUSEN_MODEL_SOURCES=<folder> node scripts/make-drone.ts
```

The folder holds `cluster-ii.glb`, `hete.glb`, `grease-gun.glb`, `insight-arm-deployed.glb` and `curiosity-detailed/{upper-arm,lower-arm,mahli-apxs}.stl`. The same input gives the same bytes. The pictures, which show the drone beside John's own, are made with `scripts/ship-03-render.ts`.
