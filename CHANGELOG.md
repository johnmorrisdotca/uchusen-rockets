# Changelog

## [Unreleased]

## [0.2.0]

- `element.drive({ yaw, tilt, zoom, panX, panY })`: a page can hand the turn, tip, zoom and move to the family's `<kazoku-view-controls>` ([`@johnmorrisdotca/kazoku-ui`](https://www.npmjs.com/package/@johnmorrisdotca/kazoku-ui)). The element's own drag, wheel, keys and spin stand down, and the 3D view and the drawing both follow, so it works with no WebGL as well. `drive(null)` takes them back. kazoku-ui is not imported by the package: the demo uses it, as a dev dependency.
- The demo uses the shared view controls: angle, tilt, auto-turn, Front, zoom, Fit and move, with the same drag, pinch and keys as the rest of the family, and the choices kept in the address (`?yaw=40&tilt=10&zoom=2`). Its own slow-spin switch and hint are gone.
- `turnedBy(base, yaw, tilt)` and the `ViewChoice` type: the camera angle for a view turned and tipped by the controls.

## [0.1.1]

- The painted Falcon 9 Block 5 second stage shows this package's own engine nozzle when it stands apart or alone, as the model has none, and not when it is nested in the first stage.
- The Falcon 9's drawn vacuum nozzle is 3.3 m across at the exit, the figure Wikipedia's Merlin infobox gives, in the line looks too (the v1.0 keeps its narrower bell).

## [0.1.0]

- Starship: Super Heavy and the Ship, in Block 1, Block 1 as it first flew, Block 2, Block 3 and the announced Block 4, each with its own sourced sizes, and an artist's model of the 2019 design.
- Falcon 9 in v1.0, v1.1, Full Thrust and Block 5, with a fairing or with Dragon 2; Falcon Heavy; Dragon 1 and Dragon 2; Grasshopper, the test vehicle.
- `<uchusen-rocket>`: three looks (line, thick, painted), together, apart and each part alone, rotation by drag, touch, keyboard and a slow spin.
- `check` and `build`: a typed way to assemble a rocket from parts, with one record for every part.
- `<uchusen-lineup>`: rockets at one scale with a ruler, a person and a building.
- A `.glb` and `.svg` per rocket and part, and the painted models under CC BY 4.0.
