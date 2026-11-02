# Notice

This package holds work under two licences.

**The code, the code-made meshes and the drawings are under the MIT licence** (see [LICENSE](LICENSE) and [LICENSES/MIT.txt](LICENSES/MIT.txt)). Each is made by this package's own code from plain geometry and sourced sizes.

**The painted models in `models/` (shipped as `dist/assets/models/`) are not.** Each stays under the Creative Commons Attribution 4.0 licence of its author (see [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt) and https://creativecommons.org/licenses/by/4.0/). Using them means crediting them, as below. The credits are also data: `MODEL_CREDITS` and `creditLine`, and `check(description).credits` says which belong to a given rocket.

No mesh or drawing carries a logo, wordmark or flag. Those were removed from the models below, and no photograph is shipped or traced: photographs were looked at for where parts sit.

All trademarks belong to their owners, and this project is not affiliated with or endorsed by SpaceX, NASA or any other maker or agency named here. "SpaceX", "Starship", "Super Heavy", "Raptor", "Falcon", "Dragon" and the names of other makers' rockets appear only as plain descriptive words.

## Painted models (CC BY 4.0)

| Files | Title | Creator | Source | What was changed |
| --- | --- | --- | --- | --- |
| `starship-v3-booster.glb`, `starship-v3-ship.glb` | SpaceX Starship Block 3 | [Clarence365](https://sketchfab.com/clarence365) | https://sketchfab.com/3d-models/spacex-starship-block-3-6f6c6f88a3eb4b4d822fdca66733fbb2 | Reduced from 913,217 triangles; logos, wordmark and serial number removed; rescaled to sourced sizes; separated into booster and ship; unseen payload bay interior removed; materials merged and renamed. |
| `starship-v1-flight1-booster.glb`, `starship-v1-flight1-ship.glb` | Spacex Starship Ship 24 & Booster 7 V4 | [clarence365](https://sketchfab.com/clarence365) | https://sketchfab.com/3d-models/spacex-starship-ship-24-booster-7-v4-97875d14b63e4b9ca9ed425ef4253306 | Reduced from 870,993 triangles; logo, serial number and engine decals removed; rescaled to sourced sizes; separated into booster and ship; unseen payload bay interior removed; materials merged and renamed. |
| `starship-2019-ship.glb` | SpaceX Starship | [MartianDays](https://sketchfab.com/MartianDays) | https://sketchfab.com/3d-models/spacex-starship-a8a0b69f776841a1a465cd9fb3762fd2 | Rescaled to the sourced height; turned to this package's axes; material renamed. Its triangles and images are otherwise unchanged. |

| `falcon-9-block-5-first-stage.glb`, `-second-stage.glb`, `-fairing.glb` | Falcon 9 - SpaceX | [Stanley Creative](https://sketchfab.com/Stanley_Creative) | https://sketchfab.com/3d-models/falcon-9-spacex-394f7cf52d124bbd9db69f24d1ff2f08 | Reduced from 157,889 triangles; the wordmark, logos, flags and mission marks removed with the two textures that carried them; rescaled to sourced sizes; separated into first stage, second stage and fairing; materials merged and renamed. The model has no nozzle: this package's own code-made one is drawn with it, not changed in the file. |
| `dragon-dragon-2-capsule.glb`, `dragon-dragon-2-trunk.glb` | SpaceX - Dragon 2 | [KUBAHA](https://sketchfab.com/KUBAHA) | https://sketchfab.com/3d-models/spacex-dragon-2-1b125e30a2cb442288580290536fbe5d | Reduced from 42,974 triangles; rescaled to sourced sizes; separated into capsule and trunk; materials merged and renamed. |
| `dragon-dragon-1-capsule.glb`, `dragon-dragon-1-trunk.glb` | SpaceX Cargo Dragon | [ProgressTH](https://sketchfab.com/ProgressTH) | https://sketchfab.com/3d-models/spacex-cargo-dragon-0ca8951e47b343dc8a41e23b3e9c55e5 | Merged from 414 meshes; the logo decal and the hidden pressure vessel removed; rescaled to sourced sizes; stood upright; separated into capsule and trunk; materials merged and renamed. |
| `falcon-heavy-falcon-heavy-centre.glb`, `-side-left.glb`, `-side-right.glb` | SpaceX Falcon Heavy(Low Poly) | [Antonio_Adams](https://sketchfab.com/AAdams3112) | https://sketchfab.com/3d-models/spacex-falcon-heavylow-poly-0dc068a462e34258b3872085a7f592c8 | The wordmark and logos painted out of its colour, roughness and normal maps, which were also resized; rescaled to sourced sizes; separated into its centre core and two side boosters by its own connected pieces. |
| `grasshopper-grasshopper-vehicle.glb` | SpaceX Grasshopper | [Echo_3](https://sketchfab.com/Echo_3) | https://sketchfab.com/3d-models/spacex-grasshopper-35c07a68cdb246c59bb425610b934bf8 | The wordmark and logo removed with the texture that carried them; rescaled to the sourced height; reduced from 55,455 triangles; materials merged and renamed. |

Licence for all: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The credit line the second model's author asks for: This work is based on "Spacex Starship Ship 24 & Booster 7 V4" (https://sketchfab.com/3d-models/spacex-starship-ship-24-booster-7-v4-97875d14b63e4b9ca9ed425ef4253306) by clarence365 (https://sketchfab.com/clarence365) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

These models also informed the proportions of this package's own line drawings of the same vehicles: those measurements were taken after each was scaled to the sourced sizes. No model stands in for another version. A rocket's own parts are credited through `check(description).credits`, generated from which part came from where.

## Facts

Sizes are plain facts, each with its source in `src/data/sources.ts` and on the demo page. A figure is blank where no source gives one. Where sources disagree, the data keeps the one chosen and names the others.

| Source | What was taken |
| --- | --- |
| Wikipedia: SpaceX Starship, SpaceX Super Heavy, SpaceX Starship (spacecraft), SpaceX Raptor, SpaceX Merlin, Starship flight test 1, List of Starship launches, Falcon 1, Falcon 9, Falcon 9 Block 5, Falcon Heavy, SpaceX Dragon 1, SpaceX Dragon 2, SpaceX Grasshopper (CC BY-SA 4.0, read 2026-10-31) | Heights, diameters (the vacuum Merlin's 3.3 m), engine counts, grid fin counts, flap changes, first flight dates in UTC. Facts only: no text is copied |
| SpaceX's Starship page, https://new.spacex.com/vehicles/starship, as a search engine quoted it: the page itself would not load | Rounded heights, kept as a second opinion |
| SpaceX, Falcon 1 Launch Vehicle Payload User's Guide, Rev 7, 2008, read through the Internet Archive | Falcon 1's and Falcon 1e's heights and fairings. Facts only: no drawing is copied |
| Wikipedia: Saturn V, Apollo command and service module, Apollo (spacecraft), Saturn V instrument unit, Rocketdyne F-1, Rocketdyne J-2 (CC BY-SA 4.0, read 2026-11-02) | Saturn V's and the Apollo spacecraft's lengths and widths, and the engines' sizes. Facts only: no text is copied |
| Wikipedia: Space Shuttle, Space Shuttle orbiter, Space Shuttle external tank, Space Shuttle Solid Rocket Booster, RS-25 (CC BY-SA 4.0, read 2026-11-02) | The Shuttle's parts' lengths and widths, the wingspan and the engine's sizes. Facts only: no text is copied |
| Wikipedia: Space Launch System, Orion (spacecraft), European Service Module (CC BY-SA 4.0, read 2026-11-02) | Its sizes. Facts only: no text is copied |
| SatNews, 2026-05-14 | Grid fins, four to three and about 50% larger; about 1.5 m taller |
| Gunter's Space Page | Version names, first flights by serial number; one set of sizes per family, not used for sizes |
| NASASpaceflight, 2025-05-30, and Ars Technica, 2024-04-08 | Known through Wikipedia's citations; not read directly |
| Space.com, 2019 | The 2019 prototype's height, as a search engine quoted it |
| [r-spacex/SpaceX-API](https://github.com/r-spacex/SpaceX-API) (Apache-2.0, archived in 2024; its live address gave no JSON, so the repository's docs were read) | Its Falcon 9 row (the fairing's size; 70 m, as a second opinion) and its Falcon Heavy row (70 m, 12.2 m across). One row per rocket, not per version. No code of it is used. Its licence: Copyright r/SpaceX contributors, under the Apache License 2.0, https://www.apache.org/licenses/LICENSE-2.0 |

## Not used

Nothing from these is used, converted, traced or adapted, and their shapes and pictures were not looked at for this package: a CC BY-SA 1:600 model by RocketWorks on Thingiverse, and github.com/Spiri0/SpaceX-Starship, which has no licence. Photographs from Wikimedia Commons were looked at for where parts sit, and to compare the results with; none is shipped or traced.

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
