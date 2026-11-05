# The fleet module kit

One manufacturer, three ships. Every ship of the fleet is **a list of modules on a spine**, and every module comes from this kit, so the three ships share one construction language, one set of materials and one docking standard, and still have their own silhouettes. Everything here is an original design of this package, with no source and no franchise shape. The hidden data status `"fictional"` stays (it drives the exemption from prebuilt files); no visible text says it.

- Code: `src/model/fleet/kit.ts` (the interface), `modules.ts` (the modules), `detail.ts` (the detail kit), `collars.ts` (the docking standard), `hull.ts` (the shared body builder), `types.ts`.
- Data: `src/data/fleet.ts` turns the kit into rockets and variants, so the picker, the drawings, the 3D view and the .glb files all read it.
- Tests: `test/fleet-kit.test.ts` (sizes, collars, ships, detail, determinism), `e2e/freeze.demo.ts` (graphics memory) and `e2e/fleet-kit.demo.ts` (the pictures).

## Names

Every fleet ship's designation starts with `SPX-` and its class code (`designation("03")` is "SPX-03"), and the maker field is just "SPX" (`FLEET_MAKER`). That is John's written exception to the rule that keeps his marks out of an MIT package, and it covers only the designation text and the maker field: no logo or wordmark is on any hull or in the package. The kit's own sample ships are `SPX-KIT-H`, `SPX-KIT-S` and `SPX-KIT-B`.

The fleet's words are in `GLOSSARY` (`glossary.ts`), in one form for every ship, sheet and doc: the ship prefix ISV (Interstellar Service Vehicle: "ISV Kaminari, SPX-207"), the class codes IHT, ICV and IXV, the drives FTD (Fusion Torch Drive) and DCD (Directed Conversion Drive), the ship's computer KAZE ("KAZE core v4") and the small craft ATC (Auxiliary Transfer Craft). The registry number after `SPX-` comes from John and is never explained. `FLEET_OPERATOR` is just "SPX". `titleBlock` writes a sheet's block in this form (the line "ISV Kaminari, SPX-207 · IHT class · SPX · FTD ×8 · KAZE core v4", rows for class, drive, computer and operator, and a status in the future tense), and `specBlock(list, { computer, atc })` adds the computer and the small craft to the spec block.

## Units and axes

- **Metres, tonnes.** A module's `length` is along the spine (Y), its `width` is across X and its `depth` across Z. `test/fleet-kit.test.ts` holds the declared sizes to the mesh, so they are true. `node scripts/fleet-sizes.ts` rewrites `sizes.ts` after you change a module.
- **A module stands from y = 0 to y = `length`, its origin the middle of its base on the spine.** Y is up the spine, the way every rocket here stands. A ship's engines are at the bottom, so its nose points up the page. The viewer lays it down if it likes.
- **A cutaway opens on +Z by default** (the windward side), leaving the hull between 58 and 302 degrees round the axis, so the default view looks into it. `pieces({ cutaway: true, cutYaw })` turns the opening: `cutYaw` is degrees round the spine from +Z towards +X, so 90 opens on +X (a ship whose own axes have X to starboard opens its cutaway to starboard) and 180 on -Z. A ship passes its own `cutYaw` in the options of `shipPieces` and `shipParts`.

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

| Id | Name | Kind | Collars (bottom / top) | Size (m) | Mass | Propellant | Ports | Inside | Real ancestor |
|---|---|---|---|---|---|---|---|---|---|
| `engine-fusion-1` | Fusion engine, single | engine | - / L | 13.5 x 13.4 x 13.3 | 360 | - | - | - | Space Shuttle main engine and Starship Raptor plumbing (feed lines, injector head, gimbal actuators); NERVA's nozzle; Daedalus' fusion nozzle and field coils |
| `engine-fusion-3` | Fusion engine cluster, 3 | engine | - / L | 11.6 x 13.3 x 13.4 | 780 | - | - | - | Starship Super Heavy's engine cluster and its thrust puck; Saturn V's F-1 cluster; Daedalus' first-stage engine |
| `engine-fusion-4` | Fusion engine cluster, 4 | engine | - / L | 11.6 x 13.3 x 13.3 | 960 | - | - | - | Saturn V first stage's four outer engines and its thrust structure |
| `engine-fusion-7` | Fusion engine cluster, 7 | engine | - / L | 11.6 x 13.3 x 13.3 | 1500 | - | - | - | Starship Ship's seven-engine base and Saturn V's thrust structure; NASA Mars transfer vehicle studies' engine clusters |
| `thruster-pod-s` | Fusion thruster pod | thruster | - / S | 8.4 x 6.7 x 3.9 | 48 | - | - | - | Apollo service module's reaction-control quads and the ISS's attitude thrusters |
| `rcs-ring-m` | Attitude thruster ring | thruster | M / M | 2.8 x 8.4 x 8.4 | 22 | - | - | - | Space Shuttle's reaction-control jets and Apollo's RCS quad rings |
| `tank-cryo-12` | Cryogenic fuel tank, 12 m | tank | L / L | 12 x 13.4 x 13.5 | 160 | 2100 | - | yes | Saturn V S-IVB hydrogen tank, Space Shuttle external tank (ring frames, feed lines) and Starship's tank domes |
| `tank-cryo-24` | Cryogenic fuel tank, 24 m | tank | L / L | 24 x 13.4 x 13.6 | 290 | 4300 | - | yes | Space Shuttle external tank and Saturn V S-II; NASA Mars transfer vehicle studies' long propellant tanks |
| `tank-slim-18` | Slim fuel tank, 18 m | tank | M / M | 18 x 7.1 x 7.3 | 70 | 520 | - | yes | Saturn V S-IVB and Falcon 9 tanks |
| `tank-spheres-4` | Sphere tank farm | tank | L / L | 14 x 12 x 12 | 210 | 640 | - | yes | Apollo service module's spherical helium tanks and Orion's service module pressurant spheres |
| `container-12` | Heavy cargo container | cargo | M / M | 12 x 6.3 x 6.3 | 38 | - | - | yes | ISO shipping containers, and the ISS's MPLM and cargo pallets |
| `container-12-cold` | Refrigerated container | cargo | M / M | 12 x 6.3 x 7.3 | 44 | - | - | yes | Refrigerated ISO containers; the ISS's cold stowage freezers |
| `cargo-bay-4` | Cargo bay frame | cargo | L / L | 15 x 23.4 x 23.4 | 150 | - | bay1, bay2, bay3, bay4 | - | Container-ship cell guides and twist-lock castings; the ISS's external logistics carriers and Canadarm rails |
| `habitat-ring-16` | Habitat ring, 16 m | habitat | M / M | 16 x 38.5 x 38.4 | 520 | - | - | yes | Von Braun's wheel space station, NASA's Nautilus-X centrifuge and the spin habitats of the Mars transfer vehicle studies |
| `habitat-ring-30` | Habitat ring, 30 m | habitat | M / M | 16 x 70.1 x 69 | 1800 | - | - | yes | Von Braun's wheel space station and the Stanford torus study |
| `habitat-drum-crew` | Crew habitat drum | habitat | M / M | 18 x 10.9 x 10.5 | 190 | - | - | yes | ISS Destiny and Harmony nodes, and Skylab's workshop |
| `habitat-drum-large` | Passenger habitat drum | habitat | L / L | 24 x 13.4 x 13.1 | 340 | - | - | yes | ISS Zvezda and the Mars transfer vehicle studies' habitat modules |
| `farm-drum` | Farm drum | habitat | L / L | 18 x 13.2 x 13.1 | 260 | - | - | yes | Skylab's and the ISS's plant growth chambers (Veggie, Advanced Plant Habitat); BIOS-3's grow racks |
| `lab-m` | Laboratory module | lab | M / M | 14 x 9.5 x 9.3 | 96 | - | - | yes | ISS Columbus and Kibo laboratories; Skylab's workshop |
| `deck-nav-m` | Navigation deck | habitat | M / M | 10 x 9.8 x 10 | 120 | - | - | yes | Orion's crew module, the Space Shuttle's flight deck and the ISS Cupola |
| `common-area-m` | Common area | habitat | M / M | 12 x 10.4 x 10.3 | 130 | - | - | yes | ISS Node 1 Unity and the Cupola |
| `store-drum-m` | Stores drum | habitat | M / M | 14 x 9.6 x 9.4 | 98 | - | - | yes | ISS Leonardo, the Multi-Purpose Logistics Module |
| `comms-array-m` | Communications array | sensor | M / M | 10 x 15.2 x 15.2 | 74 | - | - | yes | NASA's Deep Space Network dishes, the TDRS satellites and Orion's high-gain antenna |
| `eva-lock-m` | EVA lock | habitat | M / M | 8 x 7.1 x 7.1 | 52 | - | - | yes | ISS Quest airlock and the Space Shuttle's airlock |
| `tank-header-9` | Header tank, 9 m | tank | M / M | 9 x 7.7 x 7.9 | 24 | 160 | - | yes | Starship's header tanks and the Space Shuttle's reserve tanks |
| `pod-survey-m` | Mission pod, survey | lab | M / M | 10 x 13.6 x 9.2 | 88 | - | - | yes | Orion's service module payload bay and the ISS's Express racks |
| `pod-medical-m` | Mission pod, medical and rescue | lab | M / M | 10 x 8.2 x 9.1 | 88 | - | - | yes | ISS's crew health care system and Apollo's medical kits, in a Skylab-sized pod |
| `mast-sensor-40` | Sensor mast | sensor | M / - | 40 x 10.6 x 7.5 | 38 | - | - | - | Hubble's and JWST's booms, the ISS's Canadarm2 and a Deep Space Network lattice tower |
| `reactor-fusion` | Fusion reactor module | reactor | L / L | 14 x 13.2 x 13.3 | 420 | - | - | yes | NASA's Kilopower and NERVA reactors with their shadow shields, and the Mars transfer vehicle studies' reactor and radiator layout; Daedalus' reactor chamber |
| `radiator-stowed` | Radiator array, stowed | radiator | M / M | 12 x 8.7 x 7.5 | 70 | - | - | - | ISS's photovoltaic radiators folded for launch, and the Space Shuttle's payload-bay radiators |
| `radiator-deployed` | Radiator array, deployed | radiator | M / M | 12 x 24.1 x 20.9 | 70 | - | - | - | ISS's thermal radiator wings on booms; the Mars transfer vehicle studies' large radiators |
| `node-two` | Docking node, 2 ports | node | L / L | 8 x 13.8 x 13.8 | 85 | - | p1, p2 | - | ISS Node 2 Harmony and the Common Berthing Mechanism |
| `node-four` | Docking node, 4 ports | node | L / L | 8 x 14.8 x 14.8 | 120 | - | p1, p2, p3, p4 | - | ISS Node 1 Unity and Node 3 Tranquility, with their berthing ports |
| `truss-m-12` | Truss segment, M, 12 m | truss | M / M | 12 x 6.3 x 6.3 | 18 | - | - | - | ISS Integrated Truss Structure segments |
| `truss-l-24` | Truss segment, L, 24 m | truss | L / L | 24 x 12.7 x 12.7 | 64 | - | - | - | ISS Integrated Truss Structure and the Mars transfer vehicle studies' long truss spine |
| `adapter-m-l` | Adapter M to L | adapter | M / L | 3.3000000000000003 x 12.6 x 12.6 | 14 | - | - | - | Saturn V's instrument unit and Spacecraft-LM adapter, and the Space Shuttle's payload adapters |
| `adapter-l-m` | Adapter L to M | adapter | L / M | 3.3000000000000003 x 12.6 x 12.6 | 14 | - | - | - | Saturn V's interstage and Apollo's Spacecraft-LM adapter |
| `shield-forward` | Forward particle shield | shield | L / - | 11 x 14.3 x 14.1 | 640 | - | - | - | Daedalus' beryllium dust shield, Orion's heat shield and Apollo's ablative heat shield; the Mars transfer vehicle studies' shadow shield |

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
- `pieces({ detail?, cutaway?, livery?, seed? })` returns the module's pieces (`Piece[]` of `src/model/pieces.ts`: lathes, plates and lines, the same pieces every other part is made of). `detail` is 0.25 to 1 (default: the module's own, which keeps each module inside the fleet's module limit of 1.25 MB). `separation` (or `true`) puts a separation joint on the module's base. `seed` changes the weathering, so two of the same module differ. The same arguments always give the same bytes.
- `ShipList = ShipPlace[]`, `ShipPlace = { module, on?: { place, port }, beside?: { x, z, y? }, turn?, seed?, separation? }`; `separation` plans a joint at the place's base (where the ship is to come apart in flight). On the spine a module stands on the end of the one before; `on` hangs it from a port of an earlier place; `beside` stands it parallel to the spine at an offset, with clamps.
- `assemble(list): Assembly` puts a ship in place and checks every joint: `placed` (where each module stands), `issues` (`collar-mismatch`, `unknown-module`, `no-such-port`, `port-taken`, `no-spine`), `mass`, `propellant`, `length`, `width`, `depth`, `ok`.
- `shipPieces(list, options?)` is the whole ship as pieces, with clamps. Lower `detail` for a ship of many modules.
- `shipParts(ship, list, options?, rocket?, variant?)` is how a ship joins the registry: one `PartEntry` for each place (a `PartRecord` with its joints and, for a hung module, `strapOn`), the slot names in stacking order, and the slot-to-part ids. Together, apart and one-part-alone then work as for Saturn V or the Shuttle.
- `SAMPLE_SHIPS` holds three working lists (`hauler`, `scout`, `bulwark`) to copy.
- `LIVERY` is the colour language, and it is white: every scheme (`industrial`, `science`, `command`, `foil`, `transport`) is mostly quilted white thermal blanket with a few rigid white or light grey panels, crinkled foil (silver, or gold kapton on the `industrial` and `foil` schemes) on the hardware that wears it, and orange (blue on `command`) only on small removable access panels and hazard stencils, as on the ISS, JWST and Orion's service module. A ship picks a livery for each module. `test/fleet-kit.test.ts` holds the colour to a few per cent of the plating.

### Modules of a ship's own size

The kit's modules are made by builders with the numbers as parameters, and `BUILDERS` gives a ship the same builders: `BUILDERS.container(id, name, length, cold, mass)`, `BUILDERS.tank(id, name, radius, length, top, bottom, mass, propellant, note)`, `BUILDERS.habitatRing(id, name, majorRadius, mass)`, `BUILDERS.truss(id, name, length, collar, mass)`, `BUILDERS.radiatorArray(...)`, `BUILDERS.engineCluster(...)`, and so on. A ship that needs a 40 m container, an 80 m tank or a 165 m ring asks for one and gets a `KitModule` with the standard collars, the detail, the sections' table entry to fill and the cutaway. Plating and detail scale with the hull's radius and length, and `detail` keeps a large module inside its build budget; GPU instancing of the stamped detail, hardpoints and variants on a module, and per-deck parts are the next steps and are ticketed.

### How a ship joins the package

The same pattern as every other craft here (`src/data/<ship>.ts`, `src/model/<ship>.ts`, a row in `registry.ts`):

1. `src/model/<ship>.ts`: a `ShipList`, and `shipParts("<rocket>-<variant>", list, { detail })` for its entries.
2. `src/data/<ship>.ts`: the `Variant` (status `"fictional"`, which is data only and never shown, blank figures with a `brief` such as `"182 m, as designed"`, `slots` and `partIds` from `shipParts`), and a `ROCKETS` row with maker `fleet` (see `src/data/fleet.ts`).
3. `registry.ts`: `entries.push(...parts.entries)`.
4. Credit: a ship credits `uchusen-design` in `SOURCES`. No licensed model is used, so no `MODEL_CREDITS` row.

Nothing else changes. The variant is in the picker under the maker "SPX fleet", and works in all three looks (line, thick and painted): a look changes lines and colours, never the shape.

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

- `labelsOf(list)`: one `Label` for every section, with the point it leads to in the ship's metres, the side it stands on (alternating, so a sheet can carry them both sides) and, for a deck, its number. In 3D a page keeps each label on its part with the element: `element.screenPoint(label.at)` gives the point's place on the picture in CSS pixels and whether it is in front and inside, and the element says `uchusen-draw` after every draw, so a page moves its labels when the view moves and not otherwise. The point follows the module wherever the list puts it. `labelDensity(list)` says how many labels there are for each hundred metres and what share of the length each stands for; the test holds it to one for every 5% or better (the hauler has one for every 1%).
- `deckSummary(list)`: the numbered decks, deck 1 at the bow.
- `specBlock(list)`: the lines of the spec block (length, beam, masses, engines, acceleration, speeds, the Proxima trip).

Each module is its own `PartRecord`, so a ship can show, hide or highlight it alone; the sections within a module are labels and decks of that part.

### System insets

`INSETS` has four assemblies of five or six numbered sub-parts: the reactor core (field coil, plasma vessel, breeding blanket, neutron shield, heat exchanger, fuel injector), the navigation and sensor suite (star tracker, inertial platform, radar array, optical telescope, navigation computer, beacon receiver), life support (air scrubber, water recycler, oxygen generator, waste processor, hydroponic rack, control panel) and the docking port (collar flange, capture ring, pressure door, tunnel, guide lights). Each sub-part is its own part of the registry (`inset-<inset>-<n>`) placed in its assembly, under the rocket `fleet-insets`, so "apart" opens the inset and a click on a number shows one part alone.

### Sheet helpers

`LEGEND` (symbols with their own stroke paths), `scaleBar(pixelsPerMetre, maxPixels)` (a round length, ticks and the ratio), `arrangement(list, frame)` (side, front and top at one scale with a length ruler) and `exploded(list, gap)` (every module named, moved apart along the spine, with each collar's and port's mounting point).

## Real hardware first

The kit starts from real engineering and says so: every module names its real ancestor in its data (`module.ancestor`, and `ANCESTORS` in `ancestors.ts`) and in the table above: the ISS's modules, truss and radiators, Hubble's and JWST's booms and foil, Orion's service module, the Space Shuttle, Saturn V and Starship's plumbing, the NASA Mars transfer vehicle studies (a long truss, a reactor behind a shadow shield, tanks, a habitat, big radiators on booms), Daedalus' nozzle and dust shield, and container handling. That means round pressure volumes, open trusses, white blanket and foil with little functional colour (`LIVERY.foil`), radiators on booms and real engine plumbing. Real hardware is the starting point and not a cage: bolder shapes, new materials, armour, scale and drives that do not exist yet are fine where they look engineered and have a job.

## The detail kit

`DETAIL` (`src/model/fleet/detail.ts`, re-exported by `kit.ts`) is what every module is covered with. Every function is pure and returns pieces in metres; a cylinder is addressed by radius, azimuth and height.

| Function | What it makes |
|---|---|
| `hullPanels` | Plating with depth: quilted blanket (pillows with a crease between), rigid panels with a raised frame round a sunk field and bolts, patches of crinkled foil, louvres and the odd small orange access panel with a grab handle; some worn, some bare, with seam lines for the line drawings |
| `blanketPanel`, `framedPanel`, `bolts`, `grabHandle` | The plating's parts: one quilted blanket, one framed panel with its bolt heads, hexagonal bolt heads, a grab handle |
| `foilBand` | Crinkled foil on a cylinder: a skin of flat triangles with each corner pushed in or out, every facet lit on its own (`Plate.facets` in `pieces.ts`) |
| `glazing`, `porthole`, `observationDome` | A window in a frame with mullions and a reflective pane that glows when lit; an armoured porthole with a burn shutter, open or closed; an armoured observation dome (the ISS Cupola's descendant) with six shutter petals, open or closed |
| `room` and `ROOMS` | Ten furnished rooms with names and jobs (cabin, mess, exercise room, green room, observation lounge, medical bay, storm shelter, recreation room, school room, plaza) to place in a cutaway |
| `navLight`, `floodlight` | A red or green navigation light or a white strobe; a floodlight with its housing and lens, all lit with the engines |
| `separationJoint` | Where a ship is planned to come apart in flight: a split collar with a groove, hooked latches, pyrotechnic bolt caps and umbilical plates with sockets and strobes (`separation` on a place or a module's options) |
| `hatch` | An access hatch (square door with hinges, latch, hazard strips) or a round pressure door with a handwheel |
| `conduitRun`, `pipeRing`, `cableTray` | Pipe bundles on clamps, rings of pipe, cable channels with cables |
| `vent`, `ladder`, `hazardBand`, `stencil`, `lamps` | Louvres, ladders, hazard stripes, our own seven-bar numbers, navigation lamps |
| `radiator` | A radiator wing, deployed (hinged panels with coolant pipes) or stowed (a latched box) |
| `tileShield` | Layers of heat-shield tile with seams, for the forward shield |
| `antenna` | Whip, dish, yagi, phased array, omni, horn |
| `greebles` | Junction boxes, valve wheels, sensor posts, pumps, scattered over a patch of hull |
| `boltRing`, `hoop`, `annulus`, `disc`, `post`, `rod`, `beam`, `box`, `horn`, `panel` | Solids: bolts, torus rings, rings of rectangular section, discs, posts, rods, beams, boxes, cones |
| `pipeRun` | A pipe along a path: a round twelve-sided tube for each run, corners rounded to a real bend (a chain of short tubes with a round joint at each), a proper end for each run (a flange bolted to a mating flange, a blind cap, a gland where it goes through the structure, or a valve with its handwheel), bolted flange joints at an interval, a colour-coding band, and clamp brackets that stand off the structure on a post and a base pad. A pipe never ends in a bare cone. |
| `iBeam`, `channel`, `strut` | Beam sections for braces: an I-beam, a channel, a round strut with a collar, a ball joint and a cap at each end (the lunar module's struts are the benchmark) |
| `place`, `stamp`, `ringOf` | Move pieces to a pose; put one template at many poses; poses round a circle |

**Repeated detail is stamped.** `stamp(template, poses)` writes a template once and merges every copy into the part's mesh, so detail costs vertices and no draw calls: a part is one draw call for each material. (The viewer merges per material; GPU instancing of the stamps would also cut the vertices, and is ticketed.)

## The fleet palette

`FLEET_PALETTE` (`src/model/fleet/palette.ts`, a file with no imports) is the one set of colours every ship shares, by what each means on a sheet: orange `shield` (removable shields and shutters), ceramic white `protected` (protected volumes), grey `structure`, teal `coolant` (coolant and feed lines), gold `coil` (copper field coils), yellow `service` (access and rails), near-black `heatSink`, green `farm`, blue `propellant`, pale blue `light`, and the skin of a hull: white thermal `blanket`, silver `foil`, gold `kapton` and stainless `pipe`. `materials.ts` builds the fleet's materials from it (`hull-orange`, `hull-white`, `hull-grey`, `coolant`, `coil`, `hull-yellow`, `panel-dark`, `plant`, `fuel`, `lamp-blue`, each with worn twins). A ship asks for a role, never for a colour, so the three ships agree whatever else they change.

**The Lit look.** The palette also names the colours that glow. Engine glow follows the viewer's "Engines: Lit" switch: `coilGlow` (drive coils and field rings, the `coil-lit` material), `windowLit` (the `window` material of windows and portholes) and `growLamp` (the `grow-lamp` rows of a garden). Lamp glow follows the Lights choice (`lights` is `off`, `running` or `all`, and `all` when it is left out): `navRed` and `navGreen` (steady position lights), `nav-white` (the steady stern light), `strobe` (the white anti-collision flash), `beacon` (the slow red beacon), `flood` (floodlights) and `light-pool` (the warm pool a flood throws on the hull). The amber, blue and red lamps are work lights and come on with `all`. Glass you can see through (`glass-clear`, with an `opacity`) is the dome and the solarium. Curves are used only where they have a job (fairings, tapered shrouds, rounded habitat ends).

## Light

A fleet part is lit by the key light with a shadow (a rocket is not): one directional light casts a 2048 pixel shadow map fitted to what shows, so a radiator wing throws its shadow on the hull and a module's dishes on its drum. Metal, painted panels, glass and the lamps have their own roughness and metalness (`MATERIALS`), so they react to the light differently; wear is geometry (worn twins of each colour, bare panels, grime-dark panels) and our own stencils are the seven-bar numbers on each hull.

The lamps themselves are one module, `src/model/fleet/lights.ts`, so every ship uses the same ones. Running lights are a steady red to port, a steady green to starboard and a steady white at the stern, as an aircraft's position lights are. The white anti-collision flash is 60 a minute and on for a short beat; the red beacon is 40 a minute. Both sit inside the aircraft rule of 40 to 100 a minute, and neither is a position light. A reader who asked for reduced motion gets those two steady, not off. Floods, docking lamps and a drone's work lamp are the `all` choice, and a flood throws a warm pool baked onto the surface rather than a second real light. The ancestors are an aircraft wingtip lamp, a night takeoff's flood on the ground, the Shuttle payload-bay sill floods, and the station cupola's windows lit from inside against a dark hull.

## Levels and build time

Ships are built in the visitor's browser, so every module has two levels (`pieces({ level })`, or `isCoarse(piece)` for any piece):

- **coarse**: the hull, the collars and the big shapes (nozzle bells, thrust plates, containers' boxes): about 8% of the pieces. A whole ship's coarse level is about 600 pieces and builds in about 5 to 20 ms here; it is the first picture.
- **fine**: all the detail. The detail pass is only the pieces that are not coarse: `shipLevels(list, options, order)` gives the coarse pieces of the whole ship and a generator of fine batches, one for each module, in the order asked for (nearest the camera first). A viewer draws the coarse level, then adds a batch a frame, so the picture never waits for the detail. The two together are exactly `shipPieces` at the fine level (a test holds it).
- **detail by `detail`**: 0.25 to 1 scales how many small things a module has, so a ship far away asks for 0.25 and one close up for 1.
- **repeated detail is stamped**: `stamp(template, poses)` writes a template once and puts every copy in the batch of its module; GPU instancing of the stamps (one draw of many copies) is the next step and is ticketed.

**Build time is measured.** `timeBuild(list, level, options)` builds a ship at a level and returns the milliseconds, the pieces and the triangles. The budget is `BUILD_BUDGET_MS`: the first picture within 1 000 ms and full detail within 3 000 ms on a normal laptop. `test/fleet-kit.test.ts` builds the kit's sample ships and the registered hauler (pieces, mesh and the bytes of its file) and fails when a build goes over, so a module that grows slow fails `pnpm check`. Here the whole hauler (217 000 triangles) builds in about 50 ms, so the budget has room for the browser's own parse and upload.

## Budgets

- A module alone stays under the repository's 600 KB mesh limit (`test/fleet-kit.test.ts`); a ship's mesh is allowed 6 MB (`FLEET_MESH_LIMIT`) for as long as its file is made at build time. Fleet ships are built in the browser and ship no prebuilt `.glb`: a "Download 3D model" button writes the file on demand through `src/build/glb.ts`. A drawing stays under 80 KB: detail is `only: "mesh"`, and the drawing gets the body and the seam lines.
- 3D budget as for every view here: render on demand, 30 fps, one WebGL context, canvas within 4096 px and 6 MP, everything disposed, nothing drawn out of sight. The kit adds geometry only; `e2e/freeze.demo.ts` walks the fleet and holds graphics memory flat.
- The kit adds about 62 KB (minified) to the package's root entry.

## Motion

A ship's moving parts are tagged with a `Move` where it builds them (`moving()` in `motion.ts`), and one table says what each name does: [motion.md](motion.md).

## Adding a module

1. Write a `define({...})` in `modules.ts`: a `drum(ctx, {...})` for a hull with its collars and detail, then what makes it its own.
2. Declare `length`; run `node scripts/fleet-sizes.ts`; run `pnpm test`. The test names what is wrong: size, collar joint, bare surface, mesh limit.
3. Give it a `detail` default if it is near the mesh limit.
