# The small craft (ATC)

The Auxiliary Transfer Craft are the small craft every hangar and port of the fleet shares. This page covers the family of six. Code: `src/model/fleet/craft/`; cards: `src/data/atc.ts`; test: `test/fleet-craft.test.ts`. Rocket `fleet-atc`, one variant each, grouped under "SPX fleet" in the picker.

## Names

Every craft's name and registry number is one row of `ATC_NAMES` (`craft/names.ts`). Until names and numbers are given the rows hold the plain placeholders ("ATC crew shuttle") and no number; the cards, the table below and the picker read them from the map.

## The hangar doors

Read from the ships' own tables, so a change to a hangar changes the test (`craft/doors.ts`).

| Ship | Door (wide by high) | Where it comes from |
|---|---|---|
| SPX-03 Miyamoto, rescue bay | 76 by 16 m | `ship-03/dims.ts` `doorOf`: the bay less 12 m each end, 5 m up, 7 m under the roof |
| SPX-03 Miyamoto, survey bay | 72 by 16 m | the same |
| SPX-207 Kaminari, dorsal hangar (first design) | 121 by 64 m | `ship-02/dims.ts` `HANGAR_DOOR`: between the 3 m posts and the 3 m floor and roof beams |

A craft passes when, in either turn about its long axis, it clears the door by 1 m on every side (`spareOf`).

## Built

All six craft are built. Sizes are measured from each craft's own pieces (`envelopeOf`) and held by `test/fleet-craft.test.ts`.

| Craft | Size (long, across, deep) | Collar | Tightest door | Carried by |
|---|---|---|---|---|
| ATC crew shuttle | 15.9, 7.0, 6.8 m | M, 6 m ring | Miyamoto rescue bay, 7.2 m to spare | Hanabusa, Kyotori, Kaminari, Miyamoto |
| ATC cargo tug | 18.2, 14.5, 12.0 m | L, 12 m ring | Miyamoto rescue bay, 1.95 m to spare | Kaminari, Hanabusa, Kyotori |
| ATC rescue cutter | 18.9, 7.5, 8.3 m | M, 6 m ring | Miyamoto rescue bay, 6.5 m to spare | Miyamoto, Ariake, Kaminari, Hanabusa |
| ATC survey lander | 7.9, 9.4, 9.4 m | S, 3 m ring | Miyamoto rescue bay, 4.6 m to spare | Miyamoto, Hanabusa, Kyotori |
| ATC survey drone | 1.7, 1.5, 1.1 m | none: a cradle clamp | Miyamoto rescue bay, 12.9 m to spare | Miyamoto, Ariake, Kaminari |
| ATC EVA work pod | 4.0, 3.3, 3.0 m | S, 3 m ring | Miyamoto rescue bay, 11.0 m to spare | Miyamoto, Kaminari, Hanabusa, Kyotori |

The tug's L collar is the size of a container's end frame; a container does not enter Miyamoto's 16 m door. Every figure of a craft is this package's own design, with no source, and says so.

## The review-gate parts

Each craft has, from one table (`craft/cards.ts`): labelled sections nose to tail (six to ten, each on a slot), a propulsion card drawn on its own (`craft/extras.ts`: bell, throat, chamber, feed manifolds, injector and gimbal, or a cold-gas quad), with its thrust and specific impulse blank because no source gives them, a hull stack (`CRAFT_STACKS`: `craft` for the crewed three, `probe` for the others; shown at ten times its thickness, and the card says so) cut open to show a shell for each layer, and an inset for each of cabin, collar, engine and layers. `node scripts/craft-render.ts <folder>` draws, from the real model, the side, top, front, rear, three-quarter and cutaway views, a 10 m close-up, a frame beside Starship Block 3, the cards, a sheet for each craft and the family at true scale. Not done: a line-look render of each craft.

## The docking scene

`src/model/fleet/scene.ts`: two Miyamoto ships moored 50 m off the tips of the first-design Kaminari's dock arms, one each side, and the six craft each on a lane between a hangar door of one ship and a door of the other: straight out 25 m, up above everything the lane crosses (measured from the real parts, `sceneBounds.ts`), across, down, in. `tripAt(trip, top, t)` is a pure function of time. The scene is read from the ships' tables; `test/fleet-scene.test.ts` holds it. `SCENE_T=20 node scripts/craft-render.ts <folder> docking_scene` draws a moment of it. Not done: the viewer's own scene mode and its motion (this is the model and the picture); Kaminari's drydock towers hold craft only up to 90 m, so no Miyamoto sits in them (a decision for John), and neither ship's table records a collar class for the mooring itself.

## Lineage

- Crew shuttle: Dragon (capsule and trunk), Orion with the European Service Module, and the Apollo service module's reaction-control quads. A round cabin, a service section with radiator bands, a main engine and four quads. A cutaway shows six couches, a console and the vestibule to the collar.
- Rescue cutter: the Soyuz descent module as a lifeboat, Dragon's capsule and trunk and Orion, drawn long: two decks of cots, a side lock, a tow hook.
- Survey lander: the Apollo Lunar Module.
- Survey drone: the package's own survey probes, scaled down.
- EVA work pod: the Shuttle's Manned Maneuvering Unit and the ISS robot arms.
- Cargo tug: the ISS's Canadarm2 and Dextre robot arms, and the Shuttle's Manned Maneuvering Unit as a free-flying work pack, scaled up. A square truss of round chords and diagonals, two domed tanks on saddle straps, two three-segment arms folded along the keel, four engines and four quads at the tail.
