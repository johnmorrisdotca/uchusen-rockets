# The element

```html
<script type="module">
  import "@johnmorrisdotca/uchusen-rockets/element";
</script>

<uchusen-rocket rocket="starship" variant="v3" show="together" look="painted" view="back"></uchusen-rocket>
```

| Attribute | What | Values |
| --- | --- | --- |
| `rocket` | Which rocket | `starship` |
| `variant` | Which version | `v1`, `v1-flight1`, `v2`, `v3`, `v4`, `2019` |
| `show` | Which parts | `together`, `apart`, `booster`, `ship` |
| `look` | How it is drawn | `line`, `thick`, `painted` |
| `view` | Where from | `three-quarter`, `front`, `back`, `side`, `below` |
| `build` | A rocket from parts, as JSON | See [parts.md](parts.md) |
| `spin` | How it turns by itself | `off`, `slow`, `medium`, `fast` or seconds a turn |
| `way` | Which way | `cw`, `ccw` |
| `mode` | `drawing` keeps the drawing and never loads three.js | `auto`, `drawing` |
| `assets` | Where the painted models are | An address |
| `label` | What a screen reader says | Words |

**Front** is the windward, tiled side and **back** the steel side.

- The drawing shows first, made by code. When the element comes on screen and the browser can draw WebGL, the 3D view takes over without a jump. With no WebGL, under Save-Data, or on any failure, the drawing stays, and it still follows `look`, `show` and `view`.
- **Changing `look` keeps the angle.** It changes materials, not the camera.
- **Changing `show` is an animated move**, a cut under reduced motion. A part alone fills the frame.
- Turn it by dragging, by touch, with the arrow keys, or leave it to its slow spin. `+` and `-` zoom, Home or a double-click puts it back. Under reduced motion it does not spin.
- A licensed model is fetched only when the painted look asks for it. Until it is in, or if it fails, this package's own paint shows.

Read from a script: `element.report` (the label, parts, credits and fit), `element.state` (`picture`, `loading`, `3d`, `fallback`, `error`), `element.angle` (`{ az, el }`), and `element.description` to set a rocket from parts. Events: `uchusen-ready`, `uchusen-change`, `uchusen-painted`, `uchusen-fallback`, `uchusen-error`.

`setAssetBase(url)` says where the models are for every element on a page. By default they are beside the module, in `./assets/`.

## To scale

`<uchusen-lineup>` stands rockets on one baseline at one scale, with a ruler, a person and a building.

```html
<uchusen-lineup items="starship:v1,starship:v2,starship:v3,starship:v4,building,person" unit="3" look="line" ruler labels></uchusen-lineup>
```

`unit` is pixels a metre. The person (1.8 m) and the ten-storey building (30 m) are round numbers, there for scale.

## React

```jsx
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

<UchusenRocket rocket="starship" variant="v3" show="apart" look="thick" />;
```
