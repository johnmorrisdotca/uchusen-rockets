# Changelog

## [Unreleased]

- Falcon 1, and the Falcon 1e that was announced and never flew, drawn by this package's code. Sizes from SpaceX's 2008 user's guide, with Wikipedia's other figures kept beside them. A part placed rather than stacked can now stand above the ground (`strapOn.y`).
- Cargo Dragon 2, on the sizes its article gives for both versions of Dragon 2, with no windows. Falcon 9 Block 4 stays unlisted: the Full Thrust article was read too and gives it no sizes of its own. Full Thrust keeps that article's 71 m beside its 69.8 m.
- Saturn V with the Apollo spacecraft, drawn by this package's code from sourced lengths and widths: 7 parts, 4,658 triangles and 143 KB, well under the largest code-made mesh (Starship Block 4, 17,220 triangles and 508 KB).
- The Space Shuttle, stacked with its external tank and two boosters, drawn by this package's code from each part's own article: 5,554 triangles and 156 KB.
- The Space Launch System, Block 1 with Orion, drawn by this package's code: 5,172 triangles and 155 KB.
- New Glenn 7×2 (2,732 triangles, 84 KB) and Electron (2,812 triangles, 81 KB), drawn by this package's code.
- Other makers' rockets share one scale in `<uchusen-lineup>`, and each lists its own sources.
- Soyuz-2 with its four boosters, drawn by this package's code: 5,592 triangles and 160 KB. A lathe's axis may lean (`lean`), for its boosters. Vulcan Centaur and Ariane 6 are listed in `PLANNED_ROCKETS` with their sourced facts, to come.
- Drone ships (Of Course I Still Love You, Just Read the Instructions, A Shortfall of Gravitas) and landing zones (LZ-1, LZ-4), each with a landed Falcon 9 first stage, legs out: 2,988 and 3,084 triangles, 109 and 106 KB. A variant's other sizes are `facts.sizes`, and `firstWord` names its first date when it is not a flight.
- The Starbase integration tower with its mount and arms: alone (1,748 triangles, 65 KB), with Block 3 stacked on it (18,092 triangles, 546 KB, the largest code-made mesh so far, just over Block 4's 17,220 and 508 KB, and under the 600 KB limit) or catching its booster (12,236 triangles, 380 KB).
- Inside Crew Dragon, cut open, with its four seats, panel and cargo, and a person for scale: `dragon` `crew-dragon-inside`, 1,268 triangles and 41 KB.
- Starbase as a first scene, from OpenStreetMap's places and outlines: `launch-site` (4,084 triangles, 141 KB), `build-site` (1,296, 40 KB) and `city` (5,620, 189 KB). A browser test measures what scenes draw a frame, and that their graphics memory stays flat as they are switched. The tower's footprint, 13 m, is now the map's.
- `FLIGHTS` and `flightsOf`: real flights as data, Falcon 1's five and Starship's fourteen, with their dates, vehicles and outcomes. Nothing plays them yet.
- Discovery, the Smithsonian's CC0 scan of a real orbiter, as `space-shuttle` `discovery`: its mark, flags and names painted out, reduced to 116,672 triangles and 3.6 MB, against the largest painted model's 136,304 and 2.7 MB: fewer triangles and a larger file, because its picture is cut into thousands of islands and it could not be reduced further without showing them. `MODEL_CREDITS` rows may now say CC0.
- The licence line is now `MIT AND CC-BY-4.0 AND ODbL-1.0`: Starbase's coordinates, outlines and map heights and the tower's 13 m footprint are © OpenStreetMap contributors, under ODbL 1.0, not MIT. NOTICE, the README and the files that hold them say so.
- In the to-scale lineup, the stacked Space Shuttle is turned so its orbiter shows, not its tank, and Electron, black all over, takes a thin light outline on the dark ground. Its shape and figures are unchanged.
- The stacked Space Shuttle is painted by NASA's own models: its orbiter (30,000 triangles from 48,376, 842 KB), its external tank (6,326, 153 KB) and its solid rocket booster (4,136, 123 KB), with every mark painted out and the orbiter's bay shut. `pnpm models:nasa` makes NASA's models, by hand; NOTICE.md says what they rest on.
- The Apollo lunar module, `lunar-module`: NASA's model, its flag and the country's name removed, 97,588 triangles reduced to 59,949 and 972 KB in two files, its stages apart.
- Apollo docked to Soyuz, `apollo-soyuz`: NASA's model, its flags and the countries' names painted out, 32,996 triangles reduced to 29,314 and 497 KB in three files.
- The Gemini spacecraft, `gemini`: NASA's model, its flag and the country's name painted out, 38,840 triangles reduced to 27,007 and 548 KB in two files.
- The Mercury spacecraft, `mercury` `friendship-7`: NASA's model, 164,622 triangles reduced to 40,000 and 591 KB, its colours judged from photographs because NASA's copy is all one grey.
- Jupiter-C, `jupiter-c`: NASA's model, its lettering painted out, 8,933 triangles and 141 KB.
- The International Space Station, `iss`: NASA's model, 174,440 triangles reduced to 60,701 and 1,050 KB, its colours judged from photographs because NASA's copy is all one grey.
- The Hubble Space Telescope, `hubble`: NASA's model, a lettered plate painted out, 7,672 triangles and 470 KB.
- The demo's credit and source lists break a long address, so it never pushes a phone's page sideways.
- `node scripts/budget.ts` lists what each rocket asks of a page: triangles and bytes.

## [0.2.2]

- Demo: kazoku-ui 0.7 (a dev dependency, used only by the demo). The demo's strict Content-Security-Policy is now plain `style-src 'self'`: the controls adopt their styles as a constructable stylesheet since kazoku-ui 0.3.1, so the build no longer writes the controls' style text's hash into the page (the `%KAZOKU_STYLE%` step of `scripts/site.ts` is gone). The introduction's own pause (a one-minute timer and a scroll observer in `demo/demo.ts`) is replaced by the controls' `autoplay-for="60"` and their idle-out-of-sight, from kazoku-ui 0.7.1; `docs/element.md` says so.
- Repository: `release.yml` calls kazoku-ui's shared `reusable-release.yml` (pinned to v0.7.3): the same checks, tag, GitHub release with the tarball and npm publish by trusted publishing; the trusted publisher entry stays `release.yml`. The GitHub release's notes are generated by GitHub until the shared workflow reads `scripts/release-notes.ts`. `AGENTS.md` is written from kazoku-ui's template.

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
