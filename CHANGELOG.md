# Changelog

## [Unreleased]

## [0.2.1]

- Fixed: the demo could hang the screen while turning. When the 3D view turned by itself, or glided to a stop after a drag, the controls' change event asked for the next frame while the view's own loop did too, so each frame started two and the number of draws doubled every frame: thousands of draws a second, enough to starve the graphics card (measured in a real browser on a real graphics card: 12,308 draws in 3 seconds, against 181 now at 60 frames a second). One frame is asked for, once.
- Fixed: every change of variant, look or parts left the old shapes in the graphics card (about 60 buffers each), and a painted model's pictures with them. They are given back now, and the glow's too.
- Fixed: the canvas had no size limit but a ratio of 2. It is held to 4096 pixels a side and 6 million pixels in all, so a view as wide as a 5K screen is no longer drawn at 15 million.
- The drawing, with no WebGL, is zoomed and moved by its `viewBox` instead of a CSS scale, so it never grows past its box; it is made again at most 20 times a second, never while out of sight (a hidden tab, scrolled away), and is not rebuilt when only the zoom or the move changes.
- The "Tilt to turn" listener is let go when the 3D view is, and does nothing out of sight; it was added again after each return to the screen.
- `drive()` with the same choice again does nothing.
- The demo's auto-turn stops after a minute and when the view leaves the screen; Play starts it again.
- `pixelRatioFor(width, height, deviceRatio)`, with `MAX_PIXELS`, `MAX_SIDE` and `MAX_RATIO`.
- New browser tests: draws per frame, nothing drawing when still or out of sight, no growth of contexts, buffers, vertex arrays or textures over changes, a lost context, and the canvas within its budget from 1x to 5x on a 5K screen.

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
