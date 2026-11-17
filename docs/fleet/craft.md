# The small craft (ATC)

The Auxiliary Transfer Craft are the small craft every hangar and port of the fleet shares. This page covers the family and the two built so far, the crew shuttle. Code: `src/model/fleet/craft/`; cards: `src/data/atc.ts`; test: `test/fleet-craft.test.ts`. Rocket `fleet-atc`, one variant each, grouped under "SPX fleet" in the picker.

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

| Craft | Size (long, across, deep) | Collar | Tightest door | Carried by |
|---|---|---|---|---|
| ATC crew shuttle | 15.9, 7.0, 6.8 m | M, 6 m ring, 3 m bore | Miyamoto rescue bay, 7.2 m to spare | Hanabusa (small-craft berth), Kyotori (bay A dock), Kaminari (dorsal hangar), Miyamoto (rescue bay) |

## Lineage

- Crew shuttle: Dragon (capsule and trunk), Orion with the European Service Module, and the Apollo service module's reaction-control quads. A round cabin, a service section with radiator bands, a main engine and four quads. A cutaway shows six couches, a console and the vestibule to the collar.

## Still to come

The cargo tug, the rescue cutter, the survey lander and drone and the EVA work pod; their ids are in `ATC_IDS` and the map already has rows for them.
