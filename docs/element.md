# The element

```html
<script type="module">
  import "@johnmorrisdotca/uchusen-rockets/element";
</script>

<uchusen-rocket rocket="starship" variant="v3" show="together" look="painted" view="back"></uchusen-rocket>
```

| Attribute | What | Values |
| --- | --- | --- |
| `rocket` | Which rocket | `starship`, `falcon-9`, `falcon-heavy`, `dragon`, `grasshopper` |
| `variant` | Which version | Starship: `v1-flight1`, `v1`, `v2`, `v3`, `v4`, `2019`. Falcon 9: `v1.0`, `v1.0-dragon`, `v1.1`, `ft`, `block-5`, `block-5-dragon-2`. Dragon: `dragon-1`, `dragon-2` |
| `show` | Which parts | `together`, `apart`, or a part: `booster`, `ship`, `first-stage`, `second-stage`, `fairing`, `trunk`, `capsule`, `centre`, `side-left`, `side-right` |
| `look` | How it is drawn | `line`, `thick`, `painted` |
| `engines` | Full thrust, one flame and a glow at each engine | `off` (the default), `on`. A reader who asked for reduced motion has them off whatever the page says. A flame's length and its shock diamonds are a picture, not a measurement |
| `beside` | Other craft stand beside the rocket at true scale, on the same ground, and Fit holds them all | `off` (the default); `on` is Starship with Super Heavy (Block 3), and Starship itself has nothing beside it; a list such as `saturn-v:saturn-v,iss:iss` is up to two craft, each a rocket and a variant (its default variant when none is named), in a row to the right, and every craft in the picture is named with its length, each name under that craft's foot. What stands beside is in this package's own paint, in every look. A craft that flies in space stands on a marked plinth, so it is not read as a rocket on a pad; the plinth is under the footprint and is not part of the box the camera fits |
| `captions` | Name the craft on screen under its foot even when it stands alone | Present or absent. A list in `beside` already names every craft |
| `scale-note` | The words on that plinth | Left out, the words are "shown on the ground for scale" |
| `scale` | The size of Kaminari, Emiake or Romaryū, in per cent of its full size | `60` to `100` in steps of 5; `100` (the default). Only those three ships take it (`fleet-kaminari`, `fleet-emiake`, `fleet-romaryu`); any other craft ignores it. Fit holds the ship at its size, and a craft named in `beside` stays at its own true size |
| `phase` | A phase of the rocket's flight, by its id, such as `hot-staging`: which engines burn there, and how the parts stand. See [flight.md](flight.md) | A phase of `element.flight` |
| `motion` | The moving parts of a fleet ship: the rings, the doors, the solar array, the dishes. See [fleet/motion.md](fleet/motion.md) | `off` (the default), `on` (real speed), `fast` (ten times). A reader who asked for reduced motion has them still whatever the page says |
| `view` | Where from | `three-quarter`, `front`, `back`, `side`, `below` |
| `build` | A rocket from parts, as JSON | See [parts.md](parts.md) |
| `spin` | How it turns by itself | `off`, `slow`, `medium`, `fast` or seconds a turn |
| `way` | Which way it turns | `cw` takes the near side to the viewer's left, `ccw` to the right. Anything else is `cw` |
| `mode` | `drawing` keeps the drawing and never loads three.js | `auto`, `drawing` |
| `assets` | Where the painted models are | An address |
| `label` | What a screen reader says | Words |
| `sun` | Light it as in space: one light from the Sun, the far side dark, next to no fill | The direction towards the Sun in the craft's own frame (Y up, +Z its nose or windward side), as three numbers: `sun="1, 0.2, -0.5"`. Left out, or anything that is not three numbers, keeps the showroom light. `parseSun` reads it the same way |
| `flags` | The rocket's country's flag in the picture's corner, beside the drawing and never on it | Present or absent; `off` is absent. The flags are `@johnmorrisdotca/hata`'s, an optional peer loaded only then: without it there is no flag and no error. A craft of several countries or an international body, and a ship of the SPX fleet, has none. `data-flag` is the code shown, or empty when there is none |

**Front** is the windward, tiled side and **back** the steel side.

- The drawing shows first, made by code. When the element comes on screen and the browser can draw WebGL, the 3D view takes over without a jump. With no WebGL, under Save-Data, or on any failure, the drawing stays, and it still follows `look`, `show` and `view`.
- **Changing `look` keeps the angle.** It changes materials, not the camera.
- **Changing `show` is an animated move**, a cut under reduced motion. A part alone fills the frame.
- Turn it by dragging, by touch, with the arrow keys, or leave it to its slow spin. The wheel over the view zooms it (so does a pinch, and `+` and `-`); with the pointer elsewhere, or when the zoom is already at its end, the wheel scrolls the page. Home or a double-click puts it back. Under reduced motion it does not spin. These are the element's own hands, for a page that adds none; [the family's view controls](#the-familys-view-controls) can take them over.
- A licensed model is fetched only when the painted look asks for it. Until it is in, or if it fails, this package's own paint shows.
- It asks little of the machine. The 3D view draws once a frame while something moves and not at all when it is still, out of sight or in a hidden tab. A spin of its own settles after a minute and a half with no one touching it, and a lit rocket's flames stop moving after 15 seconds; a flame adds no canvas and no context, and lighting or dousing engines makes and frees nothing on the graphics card after a part's first flame. One WebGL context for each element, given back after 30 seconds out of sight and on any change. The canvas is the element's size times the screen's pixel ratio, held to a ratio of 2, to 4096 pixels a side and to 6 million pixels in all, so a view as wide as a 5K screen is drawn a little less sharp, never at a size that can hang the graphics card. If the browser takes the context away, the drawing takes over. The drawing, with no WebGL, is made again at most 20 times a second and only while it is on screen.

Read from a script: `element.report` (the label, parts, credits and fit), `element.state` (`picture`, `loading`, `3d`, `fallback`, `error`), `element.angle` (`{ az, el }`), and `element.description` to set a rocket from parts. Events: `uchusen-ready`, `uchusen-change`, `uchusen-painted`, `uchusen-fallback`, `uchusen-error`.

A flight, where a page gives one for the variant, plays from a script or from [`<uchusen-flight>`](flight.md): `element.flight`, `element.flightState`, `play()`, `pause()`, `seek(position)`, `endFlight()`, `engineCharts()`, and an `uchusen-flight` event.

## The family's view controls

`<kazoku-view-controls>` from [`@johnmorrisdotca/kazoku-ui`](https://www.npmjs.com/package/@johnmorrisdotca/kazoku-ui) is one set of controls for every project in the family: angle and tilt, auto-turn, zoom, Fit, move, and the same drag, pinch, wheel (the wheel over the view zooms it) and keys everywhere. It never draws; it tells the page what was chosen, and the page hands that to the element with `drive()`. The package does not import it, so it adds nothing to your bundle unless your page uses it.

```html
<uchusen-rocket id="rocket" rocket="starship" variant="v3"></uchusen-rocket>
<kazoku-view-controls for="rocket" address autoplay speed="5"></kazoku-view-controls>

<script type="module">
  import "@johnmorrisdotca/uchusen-rockets/element";
  import "@johnmorrisdotca/kazoku-ui/view-controls/define";

  const controls = document.querySelector("kazoku-view-controls");
  controls.addEventListener("kazoku-viewchange", (event) => document.getElementById("rocket").drive(event.detail));
</script>
```

`element.picked` is the slot drawn at full strength (the attribute is `part`, for example `part="zarya"`), and the other parts are dimmed. `element.parts()` lists each part's id, English name, Japanese name, and the launch date and length when a source gives them. A press on a part sends `uchusen-part` with `{ id }`. Setting it asks for one frame and then nothing is drawn.

`element.drive({ yaw, tilt, zoom, panX, panY })` takes what the controls report: `yaw` and `tilt` in degrees, `zoom` (1 is the whole rocket in the picture; held to 0.25 to 8) and the pan in pixels. Each is optional and must be a finite number, or what was stays. The first call hands over: the element's own drag, wheel, keys and spin stand down, `data-driven` is set, and the 3D view and the drawing both follow, so it works with no WebGL too. `drive(null)` takes the hands back.

- The turn and tip are from the angle `view` names: yaw 0 and tilt 0 is that view. Dragging right makes `yaw` larger, which carries the camera to the left; a larger `tilt` lowers it. To go to another view, set `view` and give the controls `set({ yaw: 0, tilt: 0 })`.
- How far it tips depends on the craft: `variant.view.tiltMax` is 90 degrees for a craft in space (the SPX fleet, the ISS, Hubble, Voyager, Juno, James Webb, Parker Solar Probe, Cassini, Galileo, Pioneer, New Horizons, Europa Clipper, Starlink, LAGEOS-1, Sputnik 1, Dragon, Gemini, Mercury and the lunar module), so it can be seen from straight above or below, and 45 for a rocket or a site on the ground, which keeps the ground in view. Give it to the controls as `tilt-max` (`bar.setAttribute("tilt-max", String(variantOf(rocket, variant)?.view?.tiltMax ?? 45))`); their slider, drag and address then follow it. The camera never reaches the pole itself (it is held at 87 degrees), so the picture does not roll over.
- The auto-turn goes either way: `speed` is degrees a second at 1×, positive taking the near side to the right and negative to the left. Set the attribute while it turns and it changes at once, from where it is. The demo's Turn left and Turn right do this. The controls' speed buttons (0.5×, 1× and 2×, kazoku-ui 0.14 or later) multiply `speed`; the reader's choice is the `pace` attribute and `?pace=2` in the address.
- Zoom is the camera's, so a zoomed 3D view stays sharp. The camera keeps the distance that holds the whole rocket, so turning never makes it breathe.
- Tilt to turn on a phone still works, added to the chosen view.
- A rocket is thin, so a pan could lose it. Tell the controls how big it is on the screen with `object-size="width,height"` (CSS pixels at Fit) and they hold a pan so that at least a quarter of it stays in view; once the view is zoomed or moved their Centre button (and the keys Home and 0) puts it back in the middle. Leave `grab-radius` out: it is for a round piece, and a rocket's drag keeps the controls' default turn.
- The drawing is zoomed and moved by its `viewBox`, so it is as sharp as its box at any zoom and never grows past it.
- `autoplay` is idle while the element is out of sight (a scrolled-away view or a hidden tab gets no change events and no frames) and goes on from where it was when it is back. `autoplay-for="60"` ends the turn by itself after a minute of turning, for a gentle introduction, as the demo does; a Play button starts it again (kazoku-ui 0.7.1 or later).

`setAssetBase(url)` says where the models are for every element on a page. By default they are beside the module, in `./assets/`.

The same attributes are the query of [the embed page](embed.md), for a site that cannot run script. `embedCode` writes the snippet, and a painted rocket's credit goes with it.

## To scale

`<uchusen-lineup>` stands rockets on one baseline at one scale, with a ruler, a person and a building.

```html
<uchusen-lineup items="starship:v1,starship:v2,starship:v3,starship:v4,building,person" unit="3" look="line" ruler labels></uchusen-lineup>
```

The front is what it shows unless `view` says otherwise, except that the stacked Space Shuttle is turned so its orbiter shows, and a rocket black all over takes a thin light outline in the painted look, so it does not vanish on a dark ground.

`unit` is pixels a metre. The person (1.8 m) and the ten-storey building (30 m) are round numbers, there for scale.

## React

```jsx
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

<UchusenRocket rocket="starship" variant="v3" show="apart" look="thick" />;
```
