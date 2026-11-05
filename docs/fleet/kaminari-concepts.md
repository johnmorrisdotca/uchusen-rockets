# ISV 加美鳴 Kaminari, SPX-207, ISV 笑明 Emiake, SPX-109, and ISV 羅馬龍 Romaryū, SPX-118

**加美鳴（かみなり） · Kaminari.** **笑明（えみあけ） · Emiake · smiling dawn.** **羅馬龍（ローマりゅう） · Romaryū · dragon of Rome.**

Maker and operator SPX. The Quiver is the public ISV 加美鳴 Kaminari, SPX-207 (`fleet-kaminari`). The keel is ISV 笑明 Emiake, SPX-109 (`fleet-emiake`; smiling dawn), with the outer radiator sails deployed on `fleet-emiake-deployed`. The carrier is ISV 羅馬龍 Romaryū, SPX-118 (`fleet-romaryu`; dragon of Rome). The first hull is kept at `docs/fleet/ship-02-original.md` and opened by address as `fleet-02-original`, not listed in the Rocket picker.

John's brief (2026-11-04): the length of about 1.8 km may stay, the size is open; the beam was wrong, because a wide hull cannot just be a bigger round tube. So: (A) thinner cylinders, (B) a hull that is not a tube, (C) a carrier spine with four Miyamoto-size craft. Every concept has the drive LESSONS 29 asks for: many realistic thrusters, no scaled-up bell. Franchise ships are mood only and nothing is copied; real spacecraft and engineering come first.

Code: `src/model/fleet/kaminari-concepts/` (`a.ts`, `b.ts`, `c.ts`, the shared `common.ts`, `drive.ts`, `berth.ts`, `sails.ts`, `scale.ts`, `specs.ts`), the registry rows in `src/model/kaminari-concepts.ts`, the data in `src/data/kaminari-concepts.ts`. Tests: `test/kaminari-concepts.test.ts`, `e2e/kaminari-scale.demo.ts`.

## The drive, shared by the three

A thruster is `mnThruster(s)` (`drive.ts`): a ceramic plasma chamber with a helicon antenna and five superconducting booster coils, a feed manifold with three flanged feed lines, four cryocooler fins, a ceramic throat liner, and below it a nozzle that is no bell: five separate field-coil rings growing in radius on six struts, which shape the exhaust. Real ancestors: the VASIMR VX-200, Princeton's direct fusion drive, the Daedalus coil-held chamber and NASA's X3 nested Hall thruster.

One rule works out the thrust of all three: a reactor cell gives 6 PW of heat, half of it reaches the exhaust, the exhaust leaves at 0.4 c, so thrust = 2 x jet power / exhaust speed. The numbers below are design targets from `specs.ts`, tested in `test/kaminari-concepts.test.ts`.

## A. Quiver: thinner cylinders

One 24 m square truss, 1.5 km long, carries everything, and everything on it is slim. Six rings of eight slim propellant tanks (18 m across, 80 m long) round the truss like the barrels of a revolver; eight rings of eight 22 by 22 by 40 m cargo containers; twelve reactor cells and a stack of twelve fusion coil rings behind a shadow shield; four flat radiator fins on boom trusses; two counter-rotating carousels of six slim habitat drums on spokes (1 g at the rim at one turn in 22 s); and a bow stack of the kit's crew modules (docking node, crew drum, common area, solarium, laboratory, survey pod, navigation deck, observation dome) behind a dust shield.

- Size: 1,815 m long, 97 m across the hull, 268 m across the carousels.
- Drive: 19 magnetic-nozzle thrusters (a ring of 12, a ring of 6, one on the axis) on a thrust plate over an open engine bay, with the coil stack behind: the slim ship's long in-line drive. 600 MN, 32 MN each.
- Mass guess: dry 194,000 t, propellant 799,000 t in 48 tanks, cargo 333,000 t in 64 containers, full 1.33 million t. 0.046 g, delta-v 0.37 c, 27.7 years to Proxima on board.
- Real ancestors: the ISS Integrated Truss, NASA's Mars transfer vehicle studies (DRA 5.0: truss, reactor behind a shadow shield, tanks and habitat at the far end), Nautilus-X's centrifuge, the Daedalus coil-held chamber, the Saturn V's ring of engines on a thrust structure, Soyuz's bundle of tanks.

## B. Keel and frame: a hull that is not a tube

A flattened wedge, 48 m thick, tapering in plan from 164 m across at the stern to 40 m at the bow. Built the way a ship is: an armoured keel girder (14 m by 14 m, plated) under the centreline, six longerons along the corners, and 47 ribs every 30 m. Aft the ribs stand open and eight groups of slim tanks and three cells of containers lie in rows between them, in plain sight; forward, plating closes the bays, with rows of lit windows down both flanks and, along the top, a 277 m armoured glass gallery over a garden and a promenade. A bridge tower of the kit's crew modules stands on the dorsal ridge. Three radiator fins stand edge-on on the ridge and the upper ribs: a thin line from above, the ship's sail from the side.

- Size: 1,656 m long, 164 m across, 48 m thick (the keel and the ridge make it 125 m from keel to fin tip).
- Drive: 27 magnetic-nozzle thrusters in three rows of nine across the stern face: the broad array for a wide ship. 1,201 MN, 44 MN each, behind a thrust bulkhead with a feed main on each row.
- Mass guess: dry 210,000 t, propellant 1,156,000 t in 66 tanks, cargo 135,000 t in 26 containers, full 1.51 million t. 0.081 g, delta-v 0.58 c, 18.5 years to Proxima on board.
- Real ancestors: a ship's keel and frames, the Space Shuttle's payload-bay longerons, the ISS pressurised modules' plating, the ISS Cupola and arcade roofs for the gallery, the Mars transfer vehicle studies' radiators.

## C. Carrier: a spine with four Miyamoto-size craft

A 36 m square truss round a pressurised transit tube, 1.3 km long. Two stations of six propellant barrels (30 m across, 110 m long) aft. In the middle four slots, in two pairs, where ISV Miyamoto's own model, at its true size of 380 by 118 m, docks by its keel: the first pair at the top and bottom of the shaft, the second pair a quarter turn on, so no craft's hangar shoulders meet another's. Two counter-rotating habitat rings (the shipped Kaminari's ring at 62 per cent: 100 m from the axis), and a bow stack with two farm drums and two passenger drums.

- Size: 1,775 m long, 216 m across the hull with its craft, 238 m across the rings.
- Drive: the flank-pod kind. Four hexagonal pods of seven magnetic-nozzle thrusters on outrigger trusses on the diagonals, clear of the docked craft, and one large thruster on the axis behind a stack of ten coil rings. 400 MN, 14 MN each on average.
- Mass guess: dry 332,000 t (with the four craft at their 21,000 t each), propellant 757,000 t in 12 tanks, full 1.09 million t. 0.037 g, delta-v 0.47 c, 24.7 years to Proxima on board. Its cargo is the four craft.
- Real ancestors: the Space Shuttle on its carrier aircraft, the ISS's visiting-vehicle ports, the Saturn V's outboard engines on outriggers, Nautilus-X's docked modules, ISV Miyamoto.

## The size slider

`scale="60"` to `"100"` (steps of 5) on `<uchusen-rocket>`, `build(description, { scale })`, and the demo's "Ship size" slider with `?kscale=` in the address. It applies to the three concepts only; every piece of every part is made that share of the full size (`scalePieces`), the parts' places and the viewer's labels with it, and Fit follows. The whole ship is scaled, docked craft included: at 60 per cent concept C's craft are 228 m long, so use 100 per cent to see Miyamoto at her true size. A test holds every scaled length to the full length times the share.
