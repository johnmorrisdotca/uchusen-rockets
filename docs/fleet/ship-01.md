# ISV 花房 HANABUSA · SPX-013

**花房 · Hanabusa** (はなぶさ, "flower cluster"; needs a native check). Explorer ship. It travels through distant regions of space and brings back the star fragments it finds.

| | |
|---|---|
| Designation | ISV Hanabusa, SPX-013 · Hanabusa class, IXV type (Interstellar eXploration Vessel), interstellar explorer, the fleet's wheel ship |
| Operator | SPX |
| Ship computer | KAZE core v4 (Kinetic Autonomous Zonal Executive) |
| Drive | MND, Magnetic Nozzle Drive |
| Status | PLANNED · FIRST FLIGHT 2461 |
| Programme | Approved 2452 · keel laid at the orbital yard 2456 (planned) · first flight 2461 (planned) · entry into service 2464 (planned) |

Every number on this page is a design target of the programme. The ship is built in code from tables of metres in `src/model/fleet/ship-01/` and joins the other craft of the package as three variants: the three glazed rings stepping up from the bow (the default), the same with the smallest ring at the stern, and the living ring opened for a flat section view. Its insets and thruster cards are one more row of the picker.

Title block: *ISV Hanabusa, SPX-013 · Hanabusa class · IXV · SPX · MND ×19 · KAZE core v4*

## The ship in one paragraph

A 589 m keel and a 22 m bow shield, 611 m overall, of large real modules (a drive of nineteen thrusters, a fusion reactor, eight propellant tanks, two farm drums, two habitat drums, a four-port docking hub, and the crew, laboratory, survey, solarium, navigation and dome sections of the bow), two propellant booms of seventeen tanks each that turn round it, and four wheels that turn with the booms: three glazed rings, 48, 62 and 76 m in radius, stepping up from the bow so that seen from ahead every ring has open sky above it, and a closed industrial wheel of 112 m radius set apart behind them. Garden, research and living: a hydroponic farm and orchard, laboratories and ateliers, and a town of about a thousand people with a canal down its street.

## The wheels

Every number below is computed in code (`src/model/fleet/ship-01/spin.ts`, `specs.ts`), and `test/ship-01.test.ts` pins them.

| Ring | Radius | Depth | At 3.43 rpm | Inside |
|---|---|---|---|---|
| Garden (hydroponics) | 48 m | 20 m | 0.63 g | three tiers of crop beds each side under LED grow-lamps, a service aisle with a gantry, two water channels, fruit trees |
| Research | 62 m | 24 m | 0.82 g | terraces of laboratories and ateliers under a glass roof, a central canal |
| Living | 76 m | 26 m | 1.00 g | a street with a canal down the middle and tree rows, three steps of homes up each side wall with lit window bands and balconies, a theatre, market arcade, sports hall, school and clinic, a glass roof of fine mullions |
| Industrial | 112 m | 22 m | 2.83 rpm = 1.00 g | closed: workshops, spares, quarantine rooms and the yard |

Graded gravity on one shared bearing is the choice: the rings all turn at 3.43 rpm, the living ring (the largest) gives 1.00 g and the garden ring (the smallest) 0.63 g, which the crops like. The alternative, one bearing and rpm for each ring so that all three reach 1.00 g, needs 4.32 rpm for the garden ring, over the 4 rpm comfort limit, which is why it was not chosen. Two booms and the wheels turn together; counter-rotating pairs balance the spin. The rings stand 75 m apart, so a section of 20 to 26 m leaves 49 m or more of open space and daylight reaches every level.

The ring order is one parameter in the code (`Order` in `rings.ts`, the default `bow`: smallest nearest the bow); `hanabusa-aft` is the other order.

Six glazed spoke lifts run from each ring's hub to its rim with lit cars, and a glazed lift tube runs down the keel with a car at each wheel and at the docking node. A solar skirt of cells on a frame stands off the outer edge of each ring.

## Journey (approved: 0.060 g)

One function (`journey` in `specs.ts`): constant proper acceleration, turning round at halfway. At 0.060 g and an effective exhaust of 0.70 c, from 325,000 t:

| Route | Aboard | At the ends | Peak speed |
|---|---|---|---|
| 4.37 light years | 16.62 years | 17.36 years | 0.473 c |
| Proxima Centauri, 4.25 light years | 16.39 years | 17.10 years | |

The launch thrust is 191 MN, the arrival mass 74,713 t (the 60,000 t ship and more than its 12,000 t protected reserve), the jet power 23.4 PW (23 million gigawatts: the price of the drive) and 29% of the expelled mass-energy becomes directed. The shield limit is 0.55 c; the longest burn inside it is 6.37 light years; the ideal midpoint with the reserve is 0.483 c. The drive and its limits are fictional: near-light-speed exhaust is not established engineering, and a fictional drive is shown with its limits. Faster means more fictional, slower more plausible: 0.060 g is the fleet's highest sustained acceleration and the price is power, 23 PW against the command ship's 4.4.

## Propulsion cards

| | Main thruster (MND) | Plasma trim pod |
|---|---|---|
| Count | 19 (12 in a ring, 6 inside, 1 on the axis) | 6 (3 at the tail of each boom) |
| Thrust, each | 10.06 MN | 1.2 MN |
| Specific impulse | effective exhaust 0.70 c (fictional) | 50,000 s |
| Mass flow, each | 0.034 kg/s | 2.4 kg/s |
| Fuel | deuterium-helium-3 plasma held by its field coils | hydrogen plasma |
| Operation | continuous | continuous |

No bell: each thruster is a plasma chamber ringed with six field coils and a flare of five separate coil rings on struts (the field is the nozzle). The nineteen sit on a thrust ring at the tail with a stack of seven fusion field coils above them. Thrust = mass flow × exhaust speed (relativistic for the main drive), held by the test.

## Hull layers (the explorer's light whipple stack)

Outside to inside, from the kit's `HULL_STACKS.explorer`: a light whipple shield, thinner than the transport's radiation shield and the command ship's armour. See the sheets.

## Layout, tail to bow

| Slot | Part | Metres from the tail |
|---|---|---|
| `drive` | Main drive: magnetic-nozzle array (thrust ring, 19 thrusters, coil stack) | 0 |
| `reactor` | Fusion reactor | 11.6 |
| `tank-1` to `tank-4` | Propellant tanks | 25.6 to 185.6 (the industrial wheel turns round tank 4's hub) |
| `drum-habitat-1`, `drum-farm-1` | Habitat drum and farm drum, aft | 185.6, 219.6 |
| `tank-5`, `tank-6` | Propellant tanks (the living ring's hub at tank 6's fore end) | 253.6, 293.6 |
| `drum-farm-2`, `tank-7` | Farm drum, mid; tank (the research ring's hub) | 333.6, 367.6 |
| `drum-habitat-2`, `tank-8` | Habitat drum, fore; tank (the garden ring's hub) | 407.6, 441.6 |
| `node`, `adapter` | Docking hub node, 4 ports; adapter L to M | 481.6, 489.6 |
| `crew-drum`, `common-area`, `lab`, `survey-pod` | The bow watch's quarters, common area, laboratory and survey pod | 492.9 to 546.9 |
| `solarium`, `nav-deck`, `dome` | Solarium, navigation deck, observation dome | 546.9 to 589.1 |

Placed: `boom-port`, `boom-starboard` (seventeen tanks each, with three trim thrusters at the tail), `hubs` (the hub drums, cross-beams and the axial lift), `ring-garden`, `ring-research`, `ring-living` (and their `-aft` twins for the other order), `wheel-industrial`, and `ring-living-section` for the section view.

### Decks and sections, bow to stern

The numbered decks are in `deckSummary()`: thirty, from the observation dome down to the thrust ring, and `SECTIONS` names forty-four volumes (one label for every 2.3% of the length). Every deck and section is its own part or sits in one, so it can be shown alone, hidden or highlighted.

## System insets

The reactor core, the navigation and sensor suite, life support and the docking port are the fleet kit's four. Hanabusa's own: **Ring hall** (glass roof and mullions, terrace step and house, canal and tree row, glazed spoke lift, hub bearing and slip ring, solar skirt panel) and **Survey pod and laboratory** (survey drone, probe rack, laboratory bench, telescope and sensor head, deep-space dish, empty lander cradle).

## Life aboard

About 1,200 people live aboard in three rings: researchers, farmers, teachers, engineers and their families. The living ring is the town, the research ring its laboratories and workshops, the garden ring its farm and its orchard.

A day follows the lamps: the glass roof is dim blue at night and bright from the solar skirt at noon. Children go to school in the living ring, farmers walk the garden ring's terraces, and the whole ship dines on the canal's two banks on feast days. The favourite places are the canal bridge in the living ring, the research ring's atrium and the solarium beside the dome, where people watch the stars come back after a burn.

Every voyage the ring that turns slowest is given a name by the children; the garden ring's first harvest in 2462 was pressed into a single cup of juice that was shared by everyone aboard.

## Planned separations

- **The survey pod's lander bay** drops away at its collar to descend to a planet with its craft; the bay is shown empty, with its cradle and rails.
- **The industrial wheel** can stay behind as a station at a destination.

## Docking plan

John's rules: every port is on the still keel, never on a turning ring, and outside the hull as at a space station. Hanabusa is a habitat, so visiting ships can park for the whole journey and their crews live aboard; she is not a carrier, so a full Starship stack is not berthed, but one Starship upper stage (52 m by 9 m) is. Every port and berth is recorded as typed data (`PORTS` in `src/model/fleet/ship-01/docking.ts`: name, collar class, position, direction, mount, the craft that may use it, long stay or not, services, walkway, and the size of the biggest craft it takes) for the shared docking feature to read.

| Port or berth | Class | Takes | Stay |
|---|---|---|---|
| Hub node, 4 ports | L (12 m ring) | the inflatable habitat modules, stowed small (descendants of the ISS BEAM and Sierra Space LIFE), the SPX ATC and a small craft on a short call | short calls |
| Crew port | S (3 m ring, 1.4 m bore) | Dragon (SpaceX), Starliner and Orion (USA) with its adapter | long stay |
| Visitor port | S | Soyuz and Progress (Russia) | long stay |
| Small-craft berth, with a cradle | M (6 m ring, 3 m bore) | the SPX ATC small craft (the cradle, shown empty) and HTV-X (Japan) at the port ring | long stay |
| Starship upper-stage berth | three saddles on I-beam stays, an M-class hard-dock collar | the upper stage of a Starship, 52 m by 9 m: it brings crews, cargo and propellant in one trip | long stay |

Long stay: the four berths at the bow each have a clamp, a cradle or saddles, a hard-dock collar, and five service umbilicals (power, coolant, water, air and data), so a parked ship can be shut down and kept alive, and a pressurised walkway (a round tube with a flange and a lit hatch at each end) from the berth to a lock on the solarium's hull and the keel's lift, so the crew of a parked ship live aboard. The sizes run from a crew vehicle (Dragon, 8.3 m) to the Starship upper stage (52 m).

Where: a docking crown of three arms at 551 m on the keel's bow (the solarium), the ports looking down the keel so a craft docks nose-up from below; the Starship berth along the keel at 520 to 572 m on the +Z side, 14 m from the axis. All of it stands on the still keel beyond the tops of the rotating booms (508 m) and well beyond the garden ring (490 m).

Shield: a bow dust shield (a dished disc of tile, 24 m in radius, on eight stays, ahead of the dome) stands ahead of the crown and the berth, so every parked ship sits in its shadow: at a large fraction of c dust hits like bullets, and nothing docked reaches more than 20.2 m from the axis, inside the shield's 24 m.

Clearance from what turns: the berth's tail, the lowest thing docked, is 12 m above the tops of the booms and 27 m above the garden ring; Dragon, Soyuz and the small-craft berth hang to 539 m, 31 m above the booms. `clearance()`, `gapTo()` and `craftBox()` in `docking.ts` compute it, and `test/ship-01.test.ts` checks every port: a position, a unit direction, a mount that does not turn, and at least 10 m (4 m for the hub's short-call ports) from the booms, the ring rims and the industrial wheel with its craft in place. The same test places the package's own Starship upper stage, Dragon and the Soyuz of 1975 and checks each against the tops of the booms.

The sheets mark the ports and the berth. Sheet 4 shows Dragon, Soyuz and a Starship upper stage docked at true scale at the crown, and the ship with the three parked, drawn from the package's own models. Gaps: the package has no model of Starliner, Progress or HTV-X (and its Soyuz model is the 1975 Apollo-Soyuz craft, not a Soyuz MS), so those are listed and never drawn or improvised; the ATC is the fleet's own small craft and is designed separately, so its cradle is shown empty. Orion has models in the package (capsule and service module) but is not drawn docked.

## Looks

All three looks (the line drawing, thick lines and the painted model) show the same shape. The Lit look glows the thruster coil rings, the window bands, the grow-lamps, the floodlights and the lamps of the halls. The section view is drawn flat in the line look: the living ring's glass cut away, the section lines of the floor, the three terrace steps and the canal at each cut, and no furnishing.

## The catalogue sheets

`node scripts/ship-01-sheets.ts <folder>` draws eight sheets from the real model with the title block on each: the three-quarter view with callouts, the general arrangement (side, top, front and rear at one scale with a ruler), the exploded assembly, the variants, the hull layers, the thruster cards, the insets, and the specification, the decks and the legend.

## Real ancestors

| Module | Descends from |
|---|---|
| The drive | the plasma chambers and magnetic nozzles of the VASIMR and Project Daedalus studies, ringed with the field coils of fusion experiments, and the thrust structure of Saturn V's F-1 cluster |
| The reactor | NASA's Kilopower and NERVA reactors with their shadow shields and the Mars transfer vehicle studies' reactor and radiator layout |
| The tanks | Saturn V's and Starship's tank barrels with their domes and ring frames, and the Space Shuttle's external tank |
| The drums | the ISS's Destiny and Node modules and Skylab's workshop, wrapped in white blanket; the farm drum from the ISS's Veggie and Advanced Plant Habitat |
| The booms | the Mars transfer vehicle studies' twin propellant columns and the ISS truss |
| The rings | von Braun's wheel station (1952), the Stanford torus (NASA Ames, 1975), NASA's Nautilus-X centrifuge study, and the ISS's cable-stayed truss and Node hubs |
| The halls | the NASA Ames summer-study paintings of the Stanford torus and Bernal sphere: a street with a canal, terraced buildings, a glass roof of mullions |
| The hub node | the ISS's Node 1 Unity and Node 3 Tranquility with their berthing ports |
| The dome | the ISS Cupola, and Orion's crew module under its micrometeoroid shield |

NASA's pictures and studies are public; nothing is copied, only the pattern.

## Parts, variants and the build

Parts are `fleet-ship-01-<slot>`: thirty-six rows in `src/model/ship-01.ts` and the data in `src/data/ship-01.ts`; the ship's own numbers are in `src/model/fleet/ship-01/specs.ts`. The build is in the visitor's browser: the first picture is the kit's coarse level (the hulls, the collars and the big shapes), the detail follows. The whole ship is about 53,000 pieces and builds in about 270 ms here, inside the budget of 1 s for the first picture and 3 s for the full detail (`test/ship-01.test.ts` fails over it). Repeated parts (ribs, windows, houses, trees, lamps, spokes, thrusters) are one template stamped at many poses. Fleet ships ship no prebuilt model file: "Download 3D model" writes the .glb on demand.

## Influences and originality check

The pictures and films of spin-gravity ships, rings and wheels are mood only; no silhouette, name or marking of any of them is used. The nearest franchise ships are the rotating wheel of a famous film's space station and a certain series' tower with ringed gardens; Hanabusa differs in being a keel with three stepped glazed rings and a closed industrial wheel, a hull of real large tanks and drums, and a drive of nineteen coil-ring thrusters. Every shape is this package's own, from the real hardware above.
