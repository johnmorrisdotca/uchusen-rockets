# Notice

This package holds work under two licences.

**The code, the code-made meshes and the drawings are under the MIT licence** (see [LICENSE](LICENSE) and [LICENSES/MIT.txt](LICENSES/MIT.txt)). Each is made by this package's own code from plain geometry and sourced sizes.

**The painted models in `models/` (shipped as `dist/assets/models/`) are not.** Each stays under the Creative Commons Attribution 4.0 licence of its author (see [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt) and https://creativecommons.org/licenses/by/4.0/). Using them means crediting them, as below. The credits are also data: `MODEL_CREDITS` and `creditLine`, and `check(description).credits` says which belong to a given rocket.

No mesh or drawing carries a logo, wordmark or flag. Those were removed from the models below, and no photograph is shipped or traced: photographs were looked at for where parts sit.

All trademarks belong to their owners, and this project is not affiliated with or endorsed by SpaceX. "SpaceX", "Starship", "Super Heavy", "Raptor", "Falcon" and "Dragon" appear only as plain descriptive words.

## Painted models (CC BY 4.0)

| Files | Title | Creator | Source | What was changed |
| --- | --- | --- | --- | --- |
| `starship-v3-booster.glb`, `starship-v3-ship.glb` | SpaceX Starship Block 3 | [Clarence365](https://sketchfab.com/clarence365) | https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2 | Reduced from 913,217 triangles; logos, wordmark and serial number removed; rescaled to sourced sizes; separated into booster and ship; unseen payload bay interior removed; materials merged and renamed. |
| `starship-v1-flight1-booster.glb`, `starship-v1-flight1-ship.glb` | Spacex Starship Ship 24 & Booster 7 V4 | [clarence365](https://sketchfab.com/clarence365) | https://sketchfab.com/3d-models/spacex-starship-ship-24-booster-7-v4-97875d14b63e4b9ca9ed425ef4253306 | Reduced from 870,993 triangles; logo, serial number and engine decals removed; rescaled to sourced sizes; separated into booster and ship; unseen payload bay interior removed; materials merged and renamed. |
| `starship-2019-ship.glb` | SpaceX Starship | [MartianDays](https://sketchfab.com/MartianDays) | https://sketchfab.com/3d-models/spacex-starship-a8a0b69f776841a1a465cd9fb3762fd2 | Rescaled to the sourced height; turned to this package's axes; material renamed. Its triangles and images are otherwise unchanged. |

Licence for all: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The credit line the second model's author asks for: This work is based on "Spacex Starship Ship 24 & Booster 7 V4" (https://sketchfab.com/3d-models/spacex-starship-ship-24-booster-7-v4-97875d14b63e4b9ca9ed425ef4253306) by clarence365 (https://sketchfab.com/clarence365) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

The Block 3 model also informed the proportions of this package's own Block 3 line drawings: those measurements were taken after it was scaled to the sourced sizes, and the same goes for MartianDays' model and the 2019 design's drawings. No model stands in for another block.

## Facts

Sizes are plain facts, each with its source in `src/data/sources.ts` and on the demo page. A figure is blank where no source gives one. Where sources disagree, the data keeps the one chosen and names the others.

| Source | What was taken |
| --- | --- |
| Wikipedia: SpaceX Starship, SpaceX Super Heavy, SpaceX Starship (spacecraft), SpaceX Raptor, Starship flight test 1, List of Starship launches, Falcon 1, Falcon 9, Falcon Heavy (CC BY-SA 4.0, read 2026-10-31) | Heights, diameters, engine counts, grid fin counts, flap changes, first flight dates in UTC. Facts only: no text is copied |
| SpaceX's Starship page, https://new.spacex.com/vehicles/starship, as a search engine quoted it: the page itself would not load | Rounded heights, kept as a second opinion |
| SatNews, 2026-05-14 | Grid fins, four to three and about 50% larger; about 1.5 m taller |
| Gunter's Space Page | Version names, first flights by serial number; one set of sizes per family, not used for sizes |
| NASASpaceflight, 2025-05-30, and Ars Technica, 2024-04-08 | Known through Wikipedia's citations; not read directly |
| Space.com, 2019 | The 2019 prototype's height, as a search engine quoted it |
| [r-spacex/SpaceX-API](https://github.com/r-spacex/SpaceX-API) (Apache-2.0, archived in 2024; its live address gave no JSON, so the repository's docs were read) | Facts on the older rockets, for those still to be built. No code of it is used. Its licence: Copyright r/SpaceX contributors, under the Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0 |

## Looked at, nothing taken

These were looked at for where parts sit; nothing from them is used, converted, traced or adapted: a CC BY-SA 1:600 Thingiverse model by RocketWorks, and pictures in the README of github.com/Spiri0/SpaceX-Starship (no licence). The Wikimedia Commons photographs and diagrams looked at are not shipped.

## What it uses

The published package has no runtime dependency of its own. These are peer dependencies the caller installs, and tools used to build and test it; none of their code is copied into the package.

| Name | Version | Licence | Used for |
| --- | --- | --- | --- |
| three | 0.186.1 (peer, >=0.170.0) | MIT | The 3D view |
| react | 19 (optional peer, >=18) | MIT | The React wrapper |
| react-dom | 19 | MIT | Testing the wrapper |
| typescript | 5.9 | Apache-2.0 | The build |
| esbuild | 0.25 | MIT | Bundling the demo |
| @playwright/test | 1.64.0 | Apache-2.0 | The browser tests |
| eslint, @eslint/js, typescript-eslint | 9, 9, 8 | MIT | Lint |
| @gltf-transform/core, extensions, functions | 4.5.1 | MIT | Reducing the models, by hand, never at build time |
| meshoptimizer | 1.3.0 | MIT | Simplifying the models, by hand |
| @types/node, @types/react, @types/react-dom, @types/three | 24, 19, 19, 0.186 | MIT | Types |

The demo site bundles three and, on its check page, react and react-dom, each under the MIT licence.
