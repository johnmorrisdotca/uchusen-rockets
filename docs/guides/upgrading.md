---
title: Upgrading
section: upgrading
order: 13
description: What changed between versions that a project might feel, and how to move forward without surprises.
---

The package is at 0.x, so a minor version may change behaviour. Read [CHANGELOG.md](../../CHANGELOG.md) before you move; this page says what to look for.

## From 0.18 to 0.19

The stations, the telescope and Jupiter-C are parts in slots now, like the rockets. A page that names one of their old single slots feels it.

- **Slots:** the ISS's `station`, Hubble's `telescope` and Jupiter-C's `vehicle` are gone. `show="station"` falls back to `together` (as `cleanShow` does for any name a variant lacks), so a page that showed the whole still shows the whole; a page that wants one part names it: `show="zvezda"`, `show="light-shield"`, `show="tub"`. The ISS has 27 slots, Hubble 9 and Jupiter-C 4; `variantOf(rocket)?.slots` lists them.
- **Hubble's credit:** its painted look is Cybertron B-127's model (CC BY 4.0) in place of NASA's. A page that shows Hubble painted must show that credit; `check({ rocket: "hubble" }).credits` and `paintedCredit` give it, as they always did.
- **Tiangong:** `rocket="tiangong"`, under the new maker group `china` in `MAKERS`.
- **Kinds:** `PartKind` gains `tail`, `fourth-stage`, `array` and `antenna`. A switch over every kind needs the four new cases.
- **Files:** `iss-station.glb`, `hubble-telescope.glb` and `jupiter-c-vehicle.glb` are gone from `assets/models/`, replaced by one file a part (`iss-zvezda.glb` and so on). Nothing loads them but the painted look, which knows the new names.

## From 0.6 to 0.7

The package itself is unchanged: `spin` and `way` work as before.

- **The demo's view controls need kazoku-ui 0.14** (`^0.14.0`). Their Auto-turn speeds are the family's speed buttons, 0.5×, 1× and 2×; Slow, Medium and Fast are gone. The reader's choice is the controls' `pace` attribute and `?pace=2` in the address, not `speed`. A page that gives the controls `speed="5"` keeps that base speed, which the buttons now multiply.

## From 0.2 to 0.3

0.3 added rockets, data and helpers. Its changelog lists no removal and no rename.

- **New rockets:** Falcon 1, Saturn V, the Space Shuttle, SLS, New Glenn, Electron, Soyuz-2, drone ships and landing zones, the Starbase tower and Starbase scenes, Apollo spacecraft, Gemini, Mercury, Jupiter-C, the ISS and Hubble. A `<uchusen-rocket rocket="...">` for any of them works with no other change.
- **Licence line:** the package's licence is `MIT AND CC-BY-4.0 AND ODbL-1.0`. Starbase's coordinates, outlines and map heights, and the tower's 13 m footprint, are © OpenStreetMap contributors under ODbL, not MIT. If you ship those scenes, credit them.
- **Data:** `FLIGHT_LOG` and `flightLogOf` list real flights with dates and outcomes.
- **Lineup:** in `<uchusen-lineup>`, the stacked Space Shuttle is turned to show its orbiter.
- **Helpers:** `builderState` is the rule behind the demo's builder, and `spinOf` and `cleanWay` read the element's `spin` and `way` attributes.

## From 0.1 to 0.2

- `element.drive({ yaw, tilt, zoom, panX, panY })` hands the turn, tip, zoom and move to the family's `<kazoku-view-controls>`. The element's own drag, wheel, keys and spin stand down while driven; `drive(null)` takes them back. kazoku-ui is not imported by the package.
- `turnedBy(base, yaw, tilt)` and the `ViewChoice` type are new.
- 0.2.1 fixed a doubling of draws while turning, leaked graphics memory on every change, and a canvas with no size limit. `pixelRatioFor`, `MAX_PIXELS`, `MAX_SIDE` and `MAX_RATIO` are new. If you had worked round those bugs, remove the workaround.

```ts
import { turnedBy, VIEWS } from "@johnmorrisdotca/uchusen-rockets";

console.log(turnedBy(VIEWS["three-quarter"], 30, 5));
```

## Before you move

1. Read the CHANGELOG headings between your version and the new one.
2. Run `check` on any `build` descriptions you store: an id that no longer exists is refused by name.
3. If you keep pictures from `dist/assets`, take them again: a size is corrected when a better source is read, and the data says which.
4. Re-run your own tests with painted rockets, since the credit line comes from the parts showing.

## Version notes

- Only the latest version is supported.
- Node 22 or later is needed to use the package.
- `three` is a peer dependency, `>=0.170.0`, and the CDN snippet names the version this package is tested with (`THREE_VERSION`).

```ts
import { THREE_VERSION } from "@johnmorrisdotca/uchusen-rockets";

console.log(THREE_VERSION);
```
