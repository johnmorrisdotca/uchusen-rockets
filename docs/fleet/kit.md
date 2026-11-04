# The fleet module kit

One manufacturer, three ships. Every ship of the fleet is **a list of modules on a spine**, and every module comes from this kit, so the three ships share one construction language, one set of materials and one docking standard, and still have their own silhouettes. Everything here is fictional: this package's own design, with no source and no franchise shape.

- Code: `src/model/fleet/kit.ts` (the interface), `modules.ts` (the modules), `detail.ts` (the detail kit), `collars.ts` (the docking standard), `hull.ts` (the shared body builder), `types.ts`.
- Data: `src/data/fleet.ts` turns the kit into rockets and variants, so the picker, the drawings, the 3D view and the .glb files all read it.
- Tests: `test/fleet-kit.test.ts` (sizes, collars, ships, detail, determinism), `e2e/freeze.demo.ts` (graphics memory) and `e2e/fleet-kit.demo.ts` (the pictures).

## Units and axes

- **Metres, tonnes.** A module's `length` is along the spine (Y), its `width` is across X and its `depth` across Z. `test/fleet-kit.test.ts` holds the declared sizes to the mesh, so they are true. `node scripts/fleet-sizes.ts` rewrites `sizes.ts` after you change a module.
- **A module stands from y = 0 to y = `length`, its origin the middle of its base on the spine.** Y is up the spine, the way every rocket here stands. A ship's engines are at the bottom, so its nose points up the page. The viewer lays it down if it likes.
- **Windward is +Z.** A cutaway opens the hull on the windward side, between 58 and 302 degrees round the axis, so the default view looks into it.

## The collar standard

Every module ends in a docking collar of one of four classes. Two modules mate when the facing collars are the same class (`mates(a, b)`); `assemble` names the place where they are not. The classes double:

| Class | Outer diameter | Clear bore | Bolts | Latch dogs | Use |
|---|---|---|---|---|---|
| S | 3 m | 1.4 m | 8 | 4 | thruster pods, service ports |
| M | 6 m | 3 m | 16 | 8 | the ordinary spine, containers, labs |
| L | 12 m | 6 m | 24 | 12 | the heavy spine: tanks, reactors, engines |
| H | 24 m | 12 m | 36 | 18 | reserved for the largest hulls |

A collar is built by `collar(class, y, facing)`: a flange ring, a seal, hazard blocks, a bolt circle, four alignment pins, latch dogs on the rim and a pressure door in the bore. Nothing stands out past the end face, so two collars meet face to face. A hull wider than its collar steps down to it through a cone; an **adapter** changes class (`adapter-m-l`, `adapter-l-m`). A collar's outer diameter is the module's joint in its `PartRecord`, so the registry's own fit check (`check`) agrees with `assemble`.

## The modules

Sizes are length x width x depth in metres, mass in tonnes (dry), propellant in tonnes (full). `inside` modules also have a cutaway, named `<id>-cutaway`.

| Id | Name | Kind | Collars (bottom / top) | Size (m) | Mass | Propellant | Ports | Inside |
|---|---|---|---|---|---|---|---|---|
| `engine-fusion-1` | Fusion engine, single | engine | - / L | 13.5 x 13.4 x 13.3 | 360 | - | - | - |
| `engine-fusion-3` | Fusion engine cluster, 3 | engine | - / L | 11.6 x 13.3 x 13.4 | 780 | - | - | - |
| `engine-fusion-4` | Fusion engine cluster, 4 | engine | - / L | 11.6 x 13.3 x 13.3 | 960 | - | - | - |
| `engine-fusion-7` | Fusion engine cluster, 7 | engine | - / L | 11.6 x 13.3 x 13.4 | 1500 | - | - | - |
| `thruster-pod-s` | Fusion thruster pod | thruster | - / S | 8.4 x 6.7 x 3.9 | 48 | - | - | - |
| `rcs-ring-m` | Attitude thruster ring | thruster | M / M | 2.8 x 8.4 x 8.4 | 22 | - | - | - |
| `tank-cryo-12` | Cryogenic fuel tank, 12 m | tank | L / L | 12 x 13.4 x 13.4 | 160 | 2100 | - | yes |
| `tank-cryo-24` | Cryogenic fuel tank, 24 m | tank | L / L | 24 x 13.5 x 13.5 | 290 | 4300 | - | yes |
| `tank-slim-18` | Slim fuel tank, 18 m | tank | M / M | 18 x 7.2 x 7.2 | 70 | 520 | - | yes |
| `tank-spheres-4` | Sphere tank farm | tank | L / L | 14 x 12 x 12 | 210 | 640 | - | yes |
| `container-12` | Heavy cargo container | cargo | M / M | 12 x 6.3 x 6.3 | 38 | - | - | yes |
| `container-12-cold` | Refrigerated container | cargo | M / M | 12 x 6.3 x 7.3 | 44 | - | - | yes |
| `cargo-bay-4` | Cargo bay frame | cargo | L / L | 15 x 23.4 x 23.4 | 150 | - | bay1, bay2, bay3, bay4 | - |
| `habitat-ring-16` | Habitat ring, 16 m | habitat | M / M | 16 x 38.1 x 38 | 520 | - | - | yes |
| `habitat-ring-30` | Habitat ring, 30 m | habitat | M / M | 16 x 66.1 x 66.2 | 1800 | - | - | yes |
| `habitat-drum-crew` | Crew habitat drum | habitat | M / M | 18 x 10.7 x 10.2 | 190 | - | - | yes |
| `habitat-drum-large` | Passenger habitat drum | habitat | L / L | 24 x 13.4 x 12.9 | 340 | - | - | yes |
| `farm-drum` | Farm drum | habitat | L / L | 18 x 13.2 x 12.8 | 260 | - | - | yes |
| `lab-m` | Laboratory module | lab | M / M | 14 x 9.5 x 9.3 | 96 | - | - | yes |
| `deck-nav-m` | Navigation deck | habitat | M / M | 10 x 9.8 x 10 | 120 | - | - | yes |
| `common-area-m` | Common area | habitat | M / M | 12 x 10.4 x 10.3 | 130 | - | - | yes |
| `store-drum-m` | Stores drum | habitat | M / M | 14 x 9.6 x 9.4 | 98 | - | - | yes |
| `comms-array-m` | Communications array | sensor | M / M | 10 x 15.2 x 15.2 | 74 | - | - | yes |
| `eva-lock-m` | EVA lock | habitat | M / M | 8 x 7.1 x 7.1 | 52 | - | - | yes |
| `tank-header-9` | Header tank, 9 m | tank | M / M | 9 x 7.8 x 7.8 | 24 | 160 | - | yes |
| `pod-survey-m` | Mission pod, survey | lab | M / M | 10 x 13.6 x 9.2 | 88 | - | - | yes |
| `pod-medical-m` | Mission pod, medical and rescue | lab | M / M | 10 x 8.2 x 9.1 | 88 | - | - | yes |
| `mast-sensor-40` | Sensor mast | sensor | M / - | 40 x 10.6 x 7.5 | 38 | - | - | - |
| `reactor-fusion` | Fusion reactor module | reactor | L / L | 14 x 13.3 x 13.3 | 420 | - | - | yes |
| `radiator-stowed` | Radiator array, stowed | radiator | M / M | 12 x 8.7 x 7.5 | 70 | - | - | - |
| `radiator-deployed` | Radiator array, deployed | radiator | M / M | 12 x 24.1 x 20.9 | 70 | - | - | - |
| `node-two` | Docking node, 2 ports | node | L / L | 8 x 13.8 x 13.8 | 85 | - | p1, p2 | - |
| `node-four` | Docking node, 4 ports | node | L / L | 8 x 14.8 x 14.8 | 120 | - | p1, p2, p3, p4 | - |
| `truss-m-12` | Truss segment, M, 12 m | truss | M / M | 12 x 6.3 x 6.3 | 18 | - | - | - |
| `truss-l-24` | Truss segment, L, 24 m | truss | L / L | 24 x 12.7 x 12.7 | 64 | - | - | - |
| `adapter-m-l` | Adapter M to L | adapter | M / L | 3.3000000000000003 x 12.6 x 12.6 | 14 | - | - | - |
| `adapter-l-m` | Adapter L to M | adapter | L / M | 3.3000000000000003 x 12.6 x 12.6 | 14 | - | - | - |
| `shield-forward` | Forward particle shield | shield | L / - | 11 x 14.3 x 14.3 | 640 | - | - | - |

Ports are mounting collars on a module's side that face up: another module of the same class stands on one, parallel to the spine. A cargo bay carries four containers this way.

**Swappable mission pods.** `pod-survey-m` and `pod-medical-m` share the slot `mission-pod`: the same M collars, the same length. `swapsFor("pod-survey-m")` lists what stands in its place, so a ship can carry either.

**The named sections of a crewed ship** are modules too, so a ship can list them nose to tail: `tank-header-9` (a header tank), `deck-nav-m` (the navigation deck), `comms-array-m`, `common-area-m`, `store-drum-m` (storage), `lab-m`, `eva-lock-m` (the EVA hatch), the main tanks, the transfer-line manifolds and the engines by type. Each is its own `PartRecord`, so a ship can show it alone, hide it or highlight it.

**Combinations.** Every collar mates with every other collar of its class: any module whose top collar is class X goes under any module whose bottom collar is class X. `test/fleet-kit.test.ts` walks the kit's joints, builds a thousand different ships from the engines up and checks that every joint lines up, and counts how many different ships come out.

## The interface

All of it is exported from the package root, with no three.js and no DOM.

```ts
import { assemble, KIT, shipParts, shipPieces, SAMPLE_SHIPS, COLLARS } from "@johnmorrisdotca/uchusen-rockets";
```

- `KIT: Record<string, KitModule>`. A `KitModule` has `id`, `name`, `kind`, `note`, `mass`, `propellant`, `length`, `width`, `depth`, `top?`, `bottom?` (collar classes), `ports`, `inside`, `livery` and `pieces(options?)`.
- `pieces({ detail?, cutaway?, livery?, seed? })` returns the module's pieces (`Piece[]` of `src/model/pieces.ts`: lathes, plates and lines, the same pieces every other part is made of). `detail` is 0.25 to 1 (default: the module's own, which keeps each module inside the mesh limit of a part). `seed` changes the weathering, so two of the same module differ. The same arguments always give the same bytes.
- `ShipList = ShipPlace[]`, `ShipPlace = { module, on?: { place, port }, beside?: { x, z, y? }, turn?, seed? }`. On the spine a module stands on the end of the one before; `on` hangs it from a port of an earlier place; `beside` stands it parallel to the spine at an offset, with clamps.
- `assemble(list): Assembly` puts a ship in place and checks every joint: `placed` (where each module stands), `issues` (`collar-mismatch`, `unknown-module`, `no-such-port`, `port-taken`, `no-spine`), `mass`, `propellant`, `length`, `width`, `depth`, `ok`.
- `shipPieces(list, options?)` is the whole ship as pieces, with clamps. Lower `detail` for a ship of many modules.
- `shipParts(ship, list, options?, rocket?, variant?)` is how a ship joins the registry: one `PartEntry` for each place (a `PartRecord` with its joints and, for a hung module, `strapOn`), the slot names in stacking order, and the slot-to-part ids. Together, apart and one-part-alone then work as for Saturn V or the Shuttle.
- `SAMPLE_SHIPS` holds three working lists (`hauler`, `scout`, `bulwark`) to copy.
- `LIVERY` is the colour language: `industrial` (orange and white), `science` (white and yellow), `command` (grey and blue), `transport` (white and orange), each with worn twins, an accent and a dark structural colour. A ship picks a livery for each module, so the colour blocking runs along the ship.

### How a ship joins the package

The same pattern as every other craft here (`src/data/<ship>.ts`, `src/model/<ship>.ts`, a row in `registry.ts`):

1. `src/model/<ship>.ts`: a `ShipList`, and `shipParts("<rocket>-<variant>", list, { detail })` for its entries.
2. `src/data/<ship>.ts`: the `Variant` (status `"fictional"`, blank figures with a `brief` such as `"182 m, as designed"`, `slots` and `partIds` from `shipParts`), and a `ROCKETS` row with maker `fleet` (see `src/data/fleet.ts`).
3. `registry.ts`: `entries.push(...parts.entries)`.
4. Credit: a fictional ship credits `uchusen-design` in `SOURCES`. No licensed model is used, so no `MODEL_CREDITS` row.

Nothing else changes. The variant is labelled fictional in the picker, under the maker "Fleet (fictional)", and works in all three looks (line, thick and painted): a look changes lines and colours, never the shape.

## Data every ship shares

All of this is pure data and pure functions, exported from the package root. A ship's sheet and its 3D inspector read it, so the three ships agree.

### Engine cards and performance

`ENGINE_CARDS` has one card for each engine type: the main fusion drive (`fusion-main`, 30 MN, 1.2 million s, exhaust 3.9% of c), a braking drive, a plasma manoeuvring pod and cold-plasma verniers. A card gives `thrust`, `isp`, `massFlow`, `exhaust` (and as a fraction of c), `fuel`, `fuelCapacity`, `operation` (continuous or pulsed) and the `count` on its module. The numbers agree: thrust = mass flow x specific impulse x g0, and `test/fleet-sheet.test.ts` holds every card to it. A fictional drive whose exhaust is a few per cent of c says so in its note.

- `engineTable(list)` is a ship's engine table: for each role the card, the count and the thrust together.
- `performanceOf(list)` gives thrust, acceleration (full and dry), the exhaust speed, the top speed its fuel buys one way and the cruise speed it can reach and still stop (the relativistic rocket equation, `rocketSpeed`), and the burn time.
- `trip(distance, a, cruise)` is a trip at constant proper acceleration: ship years, Earth years, peak speed. One g to 4.37 light years is 3.6 years aboard and 6.0 on Earth, and the test holds it. `PROXIMA_LY` is 4.2465 (Proxima Centauri; 4.37 is Alpha Centauri A and B).

### Hull layers

`HULL_STACKS` has a numbered stack from the outside in for each role: `transport` (thick radiation shielding: water and polymer behind a heavy bumper), `explorer` (a light whipple shield), `command` (armour and an impact absorber), `liner` and `tanker`. Each layer has `n`, `id` (ablative, whipple, armour, radiation, water, foam, pressure, frame, lining), `name`, `material`, `made`, `mm` and a note. A module's cutaway draws its stack as real concentric shells at their real thickness, with a flat face for each layer at both cut edges (`layerShells`). `stackDepth(stack)` is the wall's thickness in metres.

### Sections, labels and decks

`SECTIONS[moduleId]` names every internal volume of a module, bottom to top, each with a job, a role and its place as shares of the module's length; a deck is a section with `deck: true`. For a ship's list:

- `labelsOf(list)`: one `Label` for every section, with the point it leads to in the ship's metres, the side it stands on (alternating, so a sheet can carry them both sides) and, for a deck, its number. A 3D view moves each label with its part, because the point follows the module wherever the list puts it. `labelDensity(list)` says how many labels there are for each hundred metres and what share of the length each stands for; the test holds it to one for every 5% or better (the hauler has one for every 1%).
- `deckSummary(list)`: the numbered decks, deck 1 at the bow.
- `specBlock(list)`: the lines of the spec block (length, beam, masses, engines, acceleration, speeds, the Proxima trip).

Each module is its own `PartRecord`, so a ship can show, hide or highlight it alone; the sections within a module are labels and decks of that part.

### System insets

`INSETS` has four assemblies of five or six numbered sub-parts: the reactor core (field coil, plasma vessel, breeding blanket, neutron shield, heat exchanger, fuel injector), the navigation and sensor suite (star tracker, inertial platform, radar array, optical telescope, navigation computer, beacon receiver), life support (air scrubber, water recycler, oxygen generator, waste processor, hydroponic rack, control panel) and the docking port (collar flange, capture ring, pressure door, tunnel, guide lights). Each sub-part is its own part of the registry (`inset-<inset>-<n>`) placed in its assembly, under the rocket `fleet-insets`, so "apart" opens the inset and a click on a number shows one part alone.

### Sheet helpers

`LEGEND` (symbols with their own stroke paths), `scaleBar(pixelsPerMetre, maxPixels)` (a round length, ticks and the ratio), `arrangement(list, frame)` (side, front and top at one scale with a length ruler) and `exploded(list, gap)` (every module named, moved apart along the spine, with each collar's and port's mounting point).

## The detail kit

`DETAIL` (`src/model/fleet/detail.ts`, re-exported by `kit.ts`) is what every module is covered with. Every function is pure and returns pieces in metres; a cylinder is addressed by radius, azimuth and height.

| Function | What it makes |
|---|---|
| `hullPanels` | Raised plating in the livery's colours, some worn, some bare, with seam lines for the line drawings |
| `hatch` | An access hatch (square door with hinges, latch, hazard strips) or a round pressure door with a handwheel |
| `conduitRun`, `pipeRing`, `cableTray` | Pipe bundles on clamps, rings of pipe, cable channels with cables |
| `vent`, `ladder`, `hazardBand`, `stencil`, `lamps` | Louvres, ladders, hazard stripes, our own seven-bar numbers, navigation lamps |
| `radiator` | A radiator wing, deployed (hinged panels with coolant pipes) or stowed (a latched box) |
| `tileShield` | Layers of heat-shield tile with seams, for the forward shield |
| `antenna` | Whip, dish, yagi, phased array, omni, horn |
| `greebles` | Junction boxes, valve wheels, sensor posts, pumps, scattered over a patch of hull |
| `boltRing`, `hoop`, `annulus`, `disc`, `post`, `rod`, `beam`, `box`, `horn`, `panel` | Solids: bolts, torus rings, rings of rectangular section, discs, posts, rods, beams, boxes, cones |
| `place`, `stamp`, `ringOf` | Move pieces to a pose; put one template at many poses; poses round a circle |

**Repeated detail is stamped.** `stamp(template, poses)` writes a template once and merges every copy into the part's mesh, so detail costs vertices and no draw calls: a part is one draw call for each material. (The viewer merges per material; GPU instancing of the stamps would also cut the vertices, and is ticketed.)

## The fleet palette

`FLEET_PALETTE` (`src/model/fleet/palette.ts`, a file with no imports) is the one set of colours every ship shares, by what each means on a sheet: orange `shield` (removable shields and shutters), ceramic white `protected` (protected volumes), grey `structure`, teal `coolant` (coolant and feed lines), gold `coil` (copper field coils), yellow `service` (access and rails), near-black `heatSink`, green `farm`, blue `propellant` and pale blue `light`. `materials.ts` builds the fleet's materials from it (`hull-orange`, `hull-white`, `hull-grey`, `coolant`, `coil`, `hull-yellow`, `panel-dark`, `plant`, `fuel`, `lamp-blue`, each with worn twins). A ship asks for a role, never for a colour, so the three ships agree whatever else they change.

## Light

A fleet part is lit by the key light with a shadow (a rocket is not): one directional light casts a 2048 pixel shadow map fitted to what shows, so a radiator wing throws its shadow on the hull and a module's dishes on its drum. Metal, painted panels, glass and the lamps have their own roughness and metalness (`MATERIALS`), so they react to the light differently; wear is geometry (worn twins of each colour, bare panels, grime-dark panels) and our own stencils are the seven-bar numbers on each hull.

## Budgets

- A module alone stays under the repository's 600 KB mesh limit (`test/fleet-kit.test.ts`); a ship's mesh is allowed 6 MB (`FLEET_MESH_LIMIT`). A drawing stays under 80 KB: detail is `only: "mesh"`, and the drawing gets the body and the seam lines.
- 3D budget as for every view here: render on demand, 30 fps, one WebGL context, canvas within 4096 px and 6 MP, everything disposed, nothing drawn out of sight. The kit adds geometry only; `e2e/freeze.demo.ts` walks the fleet and holds graphics memory flat.
- The kit adds about 62 KB (minified) to the package's root entry.

## Adding a module

1. Write a `define({...})` in `modules.ts`: a `drum(ctx, {...})` for a hull with its collars and detail, then what makes it its own.
2. Declare `length`; run `node scripts/fleet-sizes.ts`; run `pnpm test`. The test names what is wrong: size, collar joint, bare surface, mesh limit.
3. Give it a `detail` default if it is near the mesh limit.
