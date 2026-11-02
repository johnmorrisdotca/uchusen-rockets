<h1 align="center">Uchusen Rockets <sub>宇宙船</sub></h1>

<p align="center"><strong>Rockets drawn from sourced sizes, that you drop into a page, take apart and turn round.</strong><br>
Uchūsen means "spaceship". Each rocket comes in every variant a source documents, each with its own sizes: a line drawing, thick lines and a painted 3D view, together, apart and each part alone, and a typed model that checks whether a rocket really goes together.</p>

<p align="center">
  <a href="https://github.com/johnmorrisdotca/uchusen-rockets/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/johnmorrisdotca/uchusen-rockets/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/@johnmorrisdotca/uchusen-rockets"><img alt="npm" src="https://img.shields.io/npm/v/@johnmorrisdotca/uchusen-rockets?color=2f5d4a"></a>
  <a href="./NOTICE.md"><img alt="MIT licence, CC BY 4.0 models, ODbL map data" src="https://img.shields.io/badge/licence-MIT%20%2B%20CC%20BY%204.0%20%2B%20ODbL-2f5d4a"></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/types-TypeScript-3178c6">
</p>

<p align="center"><a href="https://johnmorrisdotca.github.io/uchusen-rockets/"><strong>Open the demo →</strong></a> · <a href="./docs/variants.md">Variants and sizes</a> · <a href="./docs/parts.md">Build from parts</a> · <a href="./docs/element.md">The element</a> · <a href="./docs/assets.md">Assets</a></p>

<p align="center"><img alt="Block 3 of the rocket as a painted 3D view, stainless steel with black tiles, beside its controls and its sizes, each with a source." src="https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/main-painted.jpg" width="820"></p>

<p align="center">
  <img alt="The same rocket as a light line drawing on night blue, its tiled side a mosaic of hexagons." src="https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/main-line.jpg" width="400">
  <img alt="The booster from below: 33 engines in their rings, three grid fins and the long chines." src="https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/booster-below.jpg" width="400">
</p>

<p align="center"><img alt="Block 1, 2, 3 and 4 side by side at one scale, with a ruler to 140 metres, a ten-storey building and a person, and a table of their sizes." src="https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/compare.jpg" width="820"></p>

<p align="center"><img alt="Every rocket at one scale: Starship, Falcon 9, Falcon 9 with Dragon 2, Falcon Heavy, Grasshopper and Dragon 2, as line drawings beside a ruler, a building and a person." src="https://raw.githubusercontent.com/johnmorrisdotca/uchusen-rockets/main/docs/images/family.jpg" width="820"></p>

## One minute

```sh
npm install @johnmorrisdotca/uchusen-rockets three
```

```html
<script type="module">
  import "@johnmorrisdotca/uchusen-rockets/element";
</script>

<uchusen-rocket rocket="starship" variant="v3"></uchusen-rocket>
<uchusen-rocket rocket="starship" variant="v3" show="apart" look="painted" view="back"></uchusen-rocket>
<uchusen-rocket rocket="starship" variant="v2" show="booster" look="thick" view="below"></uchusen-rocket>
```

That is all a page needs with a bundler. The drawing shows at once; when the element comes on screen and the browser can draw WebGL, the 3D view takes over without a jump. Drag to turn it, use the arrow keys, or leave it to its slow spin; or hand it to the family's shared view controls (angle, tilt, zoom, move) with `element.drive()`, see [the element](./docs/element.md#the-familys-view-controls). With no WebGL, under Save-Data, or on any failure, the drawing stays.

| Attribute | Values |
| --- | --- |
| `rocket` | `starship`, `falcon-9`, `falcon-heavy`, `dragon`, `grasshopper`, `falcon-1`, `saturn-v`, `space-shuttle`, `sls`, `new-glenn`, `electron`, `soyuz`, `droneship`, `landing-zone`, `launch-tower`, `starbase`, `lunar-module`, `apollo-soyuz`, `gemini`, `mercury` |
| `variant` | Starship: `v1-flight1`, `v1`, `v2`, `v3`, `v4`, `2019`. Falcon 9: `v1.0`, `v1.1`, `ft`, `block-5`, `block-5-dragon-2`. Dragon: `dragon-1`, `dragon-2`, `cargo-dragon-2`, `crew-dragon-inside`. Falcon 1: `falcon-1`, `falcon-1e`. Saturn V: `saturn-v`. Space Shuttle: `stack`, `discovery`. Space Launch System: `block-1`. New Glenn: `7x2`. Electron: `electron`. Soyuz: `soyuz-2`. Drone ships: `ocisly`, `jrti`, `asog`. Landing zones: `lz-1`, `lz-4`. Launch tower: `tower`, `stack`, `catch`. Starbase: `launch-site`, `build-site`, `city`. Apollo lunar module: `lunar-module`. Apollo and Soyuz: `apollo-soyuz`. Gemini: `gemini`. Mercury: `friendship-7` |
| `show` | `together`, `apart`, or a part: `booster`, `ship`, `first-stage`, `second-stage`, `fairing`, `trunk`, `capsule`, `centre`, `side-left`, `side-right` |
| `look` | `line`, `thick`, `painted` |
| `view` | `three-quarter`, `front`, `back`, `side`, `below` |

Changing `look` keeps the angle. Changing `show` is an animated move, and a cut under reduced motion. Each part alone fills the frame and has its own listed size. Every look works for every variant and every choice of parts. Front is the windward, tiled side; back is the steel side.

## The rockets

Starship; Falcon 9 in v1.0, v1.1, Full Thrust and Block 5, with a fairing or with Dragon 2; Falcon Heavy; Dragon 1, Dragon 2 and Cargo Dragon 2, and Crew Dragon cut open to see inside; Grasshopper, the test vehicle; and Falcon 1, with the Falcon 1e that was announced and never flew. From other makers, to compare at one scale, each drawn by this package's code from its published sizes: Saturn V; the Space Shuttle, stacked with its tank and boosters, each part alone too, and Discovery, a real scan; the Space Launch System, Block 1 with Orion; New Glenn 7×2; Electron; and Soyuz-2. And where a booster lands: drone ships and landing zones. The Starbase integration tower too, with its mount and arms, a Block 3 stacked on it, or catching its booster. And Starbase, as a scene from the map: `launch-site`, `build-site` and `city`. The Apollo lunar module, painted by NASA's model. Apollo docked to Soyuz, painted by NASA's model, stood on end. The Gemini spacecraft, painted by NASA's model. The Mercury spacecraft, as Friendship 7, painted by NASA's model. <!-- more rockets -->

```html
<uchusen-rocket rocket="falcon-9" variant="block-5" show="apart" look="painted"></uchusen-rocket>
<uchusen-rocket rocket="falcon-9" variant="block-5-dragon-2"></uchusen-rocket>
<uchusen-rocket rocket="falcon-heavy" look="thick" view="below"></uchusen-rocket>
<uchusen-rocket rocket="dragon" variant="dragon-1" show="capsule"></uchusen-rocket>
<uchusen-rocket rocket="grasshopper" look="painted"></uchusen-rocket>
```

## Variants, with their sources

Sizes changed over time, so each variant lists its own, as data with types. A variant goes in only if a source documents it. A size no source gives is blank, never estimated. Where sources disagree, the data keeps the one chosen and says what else was said.

```ts
import { SOURCES, variantOf } from "@johnmorrisdotca/uchusen-rockets";

const v3 = variantOf("starship", "v3");
v3.facts.height.value; // 124.4
v3.facts.parts.booster.value; // 72.3
SOURCES[v3.facts.parts.booster.source].publisher; // "Wikipedia"
v3.facts.parts.booster.others.some((other) => other.value === 81); // true
```

| Variant | Whole | Super Heavy | Ship | First flew |
| --- | --- | --- | --- | --- |
| `v1-flight1` Block 1 as it first flew: Ship 24, Booster 7, no ring | 121 m as stated; its parts add to 119.3 m, and it is drawn to them | 69 m | 50.3 m | 2023-04-20, Starship's first flight |
| `v1` Block 1 with the vented ring | 121.3 m | 71 m | 50.3 m | 2023-11-18, the first with the ring |
| `v2` Block 2 | 123.1 m | 71 m | 52.1 m | 2025-01-16 |
| `v3` Block 3 | 124.4 m | 72.3 m | 52.1 m | 2026-05-22 |
| `v4` Block 4, **announced, not built** | 142 m, an estimate | 81 m, announced | 61 m, announced | Not flown |
| `2019` 2019 design (an artist's model, ship only) | 50 m | | 50 m | Never flew |

All are 9 m across, except the 2019 design, for which no source read here gives one. [docs/variants.md](docs/variants.md) has the sources and what they disagree on.

## Build a rocket from parts

Every part from every source has the same record: its real size, its origin and the joints it mates at. Ask whether it fits, with no three.js at all. A mix that fits is built, and is labelled as what it is, never as a vehicle that flew.

```ts
import { check } from "@johnmorrisdotca/uchusen-rockets";

check({ rocket: "starship", variant: "v3" }).label; // "Block 3 (V3)"

const mix = check({ rocket: "starship", variant: "v3", parts: { ship: "starship-v2-ship" } });
mix.ok; // true
mix.custom; // true

const wrong = check({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } });
wrong.ok; // false
wrong.issues[0].message; // "Ship, Block 3 (V3) is a ship; this slot takes a booster."
```

```ts
import { build } from "@johnmorrisdotca/uchusen-rockets/build";

const rocket = build({ rocket: "starship", variant: "v3" });
rocket.report.credits[0].creator; // "Clarence365"
rocket.glb().bytes.length > 1000; // true
rocket.svg({ look: "thick", view: "below", show: "booster" }).startsWith("<svg"); // true
```

[docs/parts.md](docs/parts.md) has every part and which source each comes from.

## What is in it

| Entry | What | Needs |
| --- | --- | --- |
| `@johnmorrisdotca/uchusen-rockets` | The rockets and variants (`ROCKETS`, `variantOf`, `SOURCES`), the parts (`PART_ENTRIES`), the fit check (`check`), the camera rule, the looks, the credits (`MODEL_CREDITS`) | Nothing |
| `.../build` | `build(description)`, `buildPart(id)`, `lineupSvg`: one mesh and one drawing, in Node or a browser | Nothing |
| `.../element` | `<uchusen-rocket>` and `<uchusen-lineup>`: load `three` only when a 3D view is wanted, and a painted model only when the painted look is | `three` for 3D |
| `.../react` | A thin `<UchusenRocket>` wrapper | `react` |
| `.../assets/*` | Ready files: `starship-v3.glb`, `starship-v3.svg`, `starship-v3-booster.thick.svg`, `parts/raptor-vacuum.glb`, `models/starship-v3-ship.glb` | Nothing |

## To scale

`<uchusen-lineup>` stands rockets on one baseline at one scale, with a ruler, a person and a building.

```html
<uchusen-lineup items="starship:v1,starship:v2,starship:v3,starship:v4,building,person" unit="3" ruler labels></uchusen-lineup>
```

## React

```jsx
import { UchusenRocket } from "@johnmorrisdotca/uchusen-rockets/react";

<UchusenRocket rocket="starship" variant="v3" show="apart" look="thick" />;
```

## Licences, credits and a word on trademarks

The code, the code-made meshes and the drawings are under the MIT licence. **The painted models are not: they stay under Creative Commons Attribution 4.0, or public domain where the row says so, and using them means crediting them.** `check(description).credits` says which belong to a rocket. **Starbase's coordinates and outlines, its map heights and the tower's 13 m footprint are © OpenStreetMap contributors, under ODbL 1.0, not MIT** (https://www.openstreetmap.org/copyright).

| Painted | Title | Creator | Source | Changed |
| --- | --- | --- | --- | --- |
| Block 3 | SpaceX Starship Block 3 | [Clarence365](https://sketchfab.com/clarence365) | [Sketchfab](https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2) | Reduced, logos and serial number removed, rescaled to sourced sizes, parts separated |
| Block 1 as it first flew | Spacex Starship Ship 24 & Booster 7 V4 | [clarence365](https://sketchfab.com/clarence365) | [Sketchfab](https://sketchfab.com/3d-models/spacex-starship-ship-24-booster-7-v4-97875d14b63e4b9ca9ed425ef4253306) | Reduced, logo, serial number and decals removed, rescaled to sourced sizes, parts separated |
| 2019 design | SpaceX Starship | [MartianDays](https://sketchfab.com/MartianDays) | [Sketchfab](https://sketchfab.com/3d-models/spacex-starship-a8a0b69f776841a1a465cd9fb3762fd2) | Rescaled to the sourced height, turned to this package's axes |

| Falcon 9 Block 5 | Falcon 9 - SpaceX | [Stanley Creative](https://sketchfab.com/Stanley_Creative) | [Sketchfab](https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08) | Reduced, wordmark, logos and flags removed, rescaled to sourced sizes, parts separated |
| Dragon 2 | SpaceX - Dragon 2 | [KUBAHA](https://sketchfab.com/KUBAHA) | [Sketchfab](https://sketchfab.com/3d-models/spacex-dragon-2-1b125e30a2cb442288580290536fbe5d) | Reduced, rescaled to sourced sizes, parts separated |
| Dragon 1 | SpaceX Cargo Dragon | [ProgressTH](https://sketchfab.com/ProgressTH) | [Sketchfab](https://sketchfab.com/3d-models/spacex-cargo-dragon-0ca8951e47b343dc8a41e23b3e9c55e5) | Merged, logo and hidden pressure vessel removed, rescaled to sourced sizes, parts separated |
| Falcon Heavy | SpaceX Falcon Heavy(Low Poly) | [Antonio_Adams](https://sketchfab.com/AAdams3112) | [Sketchfab](https://sketchfab.com/3d-models/spacex-falcon-heavylow-poly-0dc068a462e34258b3872085a7f592c8) | Wordmark and logos painted out, rescaled to sourced sizes, side boosters separated |
| Grasshopper | SpaceX Grasshopper | [Echo_3](https://sketchfab.com/Echo_3) | [Sketchfab](https://sketchfab.com/3d-models/spacex-grasshopper-35c07a68cdb246c59bb425610b934bf8) | Wordmark and logo removed, rescaled to the sourced height, reduced |

| Discovery | Orbiter, Space Shuttle, OV-103, Discovery | [Smithsonian Institution, National Air and Space Museum](https://3d.si.edu/) | [Smithsonian 3D](https://3d.si.edu/object/3d/orbiter-space-shuttle-ov-103-discovery:d8c636ce-4ebc-11ea-b77f-2e728ce88125) | Marks painted out, reduced, stood upright, rescaled to the sourced length. Under CC0 |

| Space Shuttle, stacked | Shuttle (Hi-Res) and Shuttle Parts (Hi-Res) | [NASA](https://science.nasa.gov/3d-resources/) | [Orbiter](https://data.nasa.gov/dataset/nasa-3d-models-shuttle-hi-res), [tank and boosters](https://data.nasa.gov/dataset/nasa-3d-models-shuttle-parts-hi-res) | Marks painted out, bay shut, reduced, stood upright, rescaled to the sourced lengths. Public domain |
| Apollo lunar module | Apollo Lunar Module | [NASA](https://science.nasa.gov/3d-resources/) | [data.nasa.gov](https://data.nasa.gov/dataset/nasa-3d-models-apollo-lunar-module) | Flag and name removed, reduced, rescaled to the sourced height, its stages separated. Public domain |
| Apollo and Soyuz, docked | Apollo Soyuz | [NASA](https://science.nasa.gov/3d-resources/) | [data.nasa.gov](https://data.nasa.gov/dataset/nasa-3d-models-apollo-soyuz) | Flags and names painted out, reduced, rescaled to the sourced sizes, stood on end, its craft separated. Public domain |
| Gemini | Gemini | [NASA](https://science.nasa.gov/3d-resources/) | [data.nasa.gov](https://data.nasa.gov/dataset/nasa-3d-models-gemini) | Flag and name painted out, reduced, rescaled to the sourced length, its parts separated. Public domain |
| Mercury, Friendship 7 | Friendship 7 | [NASA](https://science.nasa.gov/3d-resources/) | [data.nasa.gov](https://data.nasa.gov/dataset/nasa-3d-models-friendship-7) | Reduced, rescaled to the sourced sizes, its colours judged from photographs. Public domain |
<!-- more NASA models -->

All but Discovery and NASA's are under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). NASA is named as the source of its models, as its guidelines ask, with no suggestion that it endorses this package, and no NASA logo, insignia, flag or lettering is shipped: [NOTICE.md](NOTICE.md) says what that rests on. Starship Blocks 1, 2 and 4 and the older Falcon 9s are painted by this package's own code: no model is stretched to stand in for another version.

**No mesh or drawing carries a logo, a wordmark or a flag.** Rocket names appear only as plain descriptive words. All trademarks belong to their owners, and this project is not affiliated with or endorsed by SpaceX, NASA or any other maker or agency named here. [NOTICE.md](NOTICE.md) names each source and what was taken from it.

## Still to come

`PLANNED_ROCKETS` lists rockets with sourced facts and no shape yet: Vulcan Centaur and Ariane 6.

## The rest

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md) · [NOTICE.md](NOTICE.md) · MIT licence, CC BY 4.0 for the painted models, and ODbL 1.0 for the map data
