# ISV 加美鳴 (かみなり) Kaminari, SPX-207: three concept hulls

Maker and operator SPX. The shipped Kaminari (`docs/fleet/ship-02.md`) stays as it is. These are three concepts for a better hull, in the picker as the rocket "ISV 加美鳴 (かみなり) Kaminari concepts, SPX-207", variants `kaminari-concept-a`, `-b` and `-c`.

John's brief (2026-11-04): the length of about 1.8 km may stay, the size is open; the beam was wrong, because a wide hull cannot just be a bigger round tube. So: (A) thinner cylinders, (B) a hull that is not a tube, (C) a carrier spine with four Miyamoto-size craft. Every concept has the drive LESSONS 29 asks for: many realistic thrusters, no scaled-up bell. Franchise ships are mood only and nothing is copied; real spacecraft and engineering come first.

Code: `src/model/fleet/kaminari-concepts/` (`a.ts`, `b.ts`, `c.ts`, the shared `common.ts`, `drive.ts`, `scale.ts`, `specs.ts`), the registry rows in `src/model/kaminari-concepts.ts`, the data in `src/data/kaminari-concepts.ts`. Tests: `test/kaminari-concepts.test.ts`, `e2e/kaminari-scale.demo.ts`.

## The drive, shared by the three

A thruster is `mnThruster(s)` (`drive.ts`): a ceramic plasma chamber with a helicon antenna and five superconducting booster coils, a feed manifold with three flanged feed lines, four cryocooler fins, a ceramic throat liner, and below it a nozzle that is no bell: five separate field-coil rings growing in radius on six struts, which shape the exhaust. Real ancestors: the VASIMR VX-200, Princeton's direct fusion drive, the Daedalus coil-held chamber and NASA's X3 nested Hall thruster.

One rule works out the thrust of all three: a reactor cell gives 6 PW of heat, half of it reaches the exhaust, the exhaust leaves at 0.4 c, so thrust = 2 x jet power / exhaust speed. The numbers below are design targets from `specs.ts`, tested in `test/kaminari-concepts.test.ts`.

## The size slider

`scale="60"` to `"100"` (steps of 5) on `<uchusen-rocket>`, `build(description, { scale })`, and the demo's "Ship size" slider with `?kscale=` in the address. It applies to the three concepts only; every piece of every part is made that share of the full size (`scalePieces`), the parts' places and the viewer's labels with it, and Fit follows. At 60 per cent concept C's docked craft are 228 m long: the carrier is smaller, not the craft's own size; a test holds every scaled length to the full length times the share.
