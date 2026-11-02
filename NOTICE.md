# Notice

This package holds work under three licences, and NASA's models, which are public domain.

**The code, the code-made meshes and the drawings are under the MIT licence** (see [LICENSE](LICENSE) and [LICENSES/MIT.txt](LICENSES/MIT.txt)), except the map data below. Each is made by this package's own code from plain geometry and sourced sizes.

**The painted models in `models/` (shipped as `dist/assets/models/`) are not.** Each stays under the Creative Commons Attribution 4.0 licence of its author, except one under CC0 as its row says, and those of NASA, below (see [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt) and https://creativecommons.org/licenses/by/4.0/). Using them means crediting them, as below. The credits are also data: `MODEL_CREDITS` and `creditLine`, and `check(description).credits` says which belong to a given rocket.

**The map data is under the Open Database License, not MIT.** The coordinates, outlines and map heights of Starbase, in `src/data/starbase.ts` and `src/model/starbase.ts`, and the tower's 13 m footprint, in `src/data/tower.ts` and `src/model/tower.ts`, and those figures wherever they are built into `dist/`, are © OpenStreetMap contributors, https://www.openstreetmap.org/copyright, under ODbL 1.0 (see [LICENSES/ODbL-1.0.txt](LICENSES/ODbL-1.0.txt)). Each such figure names this source in the data (`SOURCES.openstreetmap`). The plain shapes standing on those places, and the rest of the package, stay MIT.

No mesh or drawing carries a logo, wordmark or flag. Those were removed from the models below, and no photograph is shipped or traced: photographs were looked at for where parts sit.

All trademarks belong to their owners, and this project is not affiliated with or endorsed by SpaceX, NASA or any other maker or agency named here. "SpaceX", "Starship", "Super Heavy", "Raptor", "Falcon", "Dragon" and the names of other makers' rockets appear only as plain descriptive words.

## Painted models (CC BY 4.0, and one CC0)

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

| `space-shuttle-discovery-orbiter.glb` | Orbiter, Space Shuttle, OV-103, Discovery | Smithsonian Institution, National Air and Space Museum; support generously provided by Meredith Siegfried Madden and Dr. Peter Madden | https://3d.si.edu/object/3d/orbiter-space-shuttle-ov-103-discovery:d8c636ce-4ebc-11ea-b77f-2e728ce88125 | **Under CC0 1.0, not CC BY** (https://creativecommons.org/publicdomain/zero/1.0/). The agency mark, the flags, the country's name and the orbiter's name painted out of its picture; reduced from 150,000 triangles; its pictures shrunk; stood upright and scaled to the sourced length; materials renamed. This package's owner confirmed the CC0 licence from the Smithsonian's record, https://www.si.edu/object/nasm_A20120325000, on 2026-11-02. Its marks, flags and names stay painted out. |

Licence for all but the last: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The credit line the second model's author asks for: This work is based on "Spacex Starship Ship 24 & Booster 7 V4" (https://sketchfab.com/3d-models/spacex-starship-ship-24-booster-7-v4-97875d14b63e4b9ca9ed425ef4253306) by clarence365 (https://sketchfab.com/clarence365) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

These models also informed the proportions of this package's own line drawings of the same vehicles: those measurements were taken after each was scaled to the sourced sizes. No model stands in for another version. A rocket's own parts are credited through `check(description).credits`, generated from which part came from where.

## NASA's models

NASA's models are from its 3D Resources, listed as the "NASA 3D Models" datasets on data.nasa.gov. **Using them rests on this package's owner's decision of 2026-11-02: "The NASA 135 are all public domain. The logo is not."** That settles what those 135 datasets state, "License not specified", and it covers them alone. NASA's own guidelines, https://www.nasa.gov/nasa-brand-center/images-and-media/, say that NASA content "used in the rendition of 3-dimensional models, such as texture maps and polygon data in any format" is generally not subject to copyright in the United States, that NASA "should be acknowledged as the source of the material", and that "The use of the Insignia, Logotype and NASA identifiers is protected by law". So NASA is credited here as the source; that is a factual credit and no suggestion that NASA endorses this package or anything made with it.

**No NASA logo, insignia, flag or lettering is in any file here.** The worm, the meatball, the seal, a mission patch, a flag and a country's or vehicle's name were each looked for, in the pictures and from every side of the result, and removed. Whoever uses these files for something else must keep to NASA's guidelines themselves, and, for merchandise, to its Merchandise Guidelines.

The dataset addresses named below are the record of what each model is. Their download addresses now lead to https://science.nasa.gov/3d-resources/, which says its assets are mirrored on https://github.com/nasa/NASA-3D-Resources, and the files were read from there on 2026-11-02; their triangle counts match the datasets' where a dataset states one.

| Files | Title | Dataset | What was changed |
| --- | --- | --- | --- |
| `space-shuttle-stack-orbiter.glb` | Shuttle (Hi-Res) | https://data.nasa.gov/dataset/nasa-3d-models-shuttle-hi-res | The agency mark, the flag, the country's name and the rest of the lettering painted out of its pictures; its open bay closed with its own doors and what was inside it left out; its engines put in place; reduced from 31,318 triangles, with its five engines 48,376, to 30,000; rescaled to the sourced length; stood upright; its materials made into one picture. |
| `space-shuttle-stack-external-tank.glb`, `space-shuttle-stack-srb.glb` | Shuttle Parts (Hi-Res) | https://data.nasa.gov/dataset/nasa-3d-models-shuttle-parts-hi-res | Its external tank and solid rocket booster only; rescaled to the sourced lengths; stood upright; its materials made into one picture; its pictures shrunk. |
| `lunar-module-descent.glb`, `lunar-module-ascent.glb` | Apollo Lunar Module | https://data.nasa.gov/dataset/nasa-3d-models-apollo-lunar-module | The flag and the country's name removed with the two plates that carried them; reduced from 97,588 triangles to 59,949; rescaled to the sourced height; separated into its two stages; its materials made into one picture. |
| `apollo-soyuz-csm.glb`, `apollo-soyuz-docking-module.glb`, `apollo-soyuz-soyuz.glb` | Apollo Soyuz | https://data.nasa.gov/dataset/nasa-3d-models-apollo-soyuz | The flags and the countries' names painted out of its pictures; reduced from 32,996 triangles to 29,314; rescaled to the sourced lengths and widths; stood on end; separated into its three craft; its materials made into one picture. |
| `gemini-adapter.glb`, `gemini-capsule.glb` | Gemini | https://data.nasa.gov/dataset/nasa-3d-models-gemini | The flag and the country's name painted out of its picture; reduced from 38,840 triangles to 27,007; rescaled to the sourced length; separated into adapter and capsule; its materials made into one picture. |
| `mercury-capsule.glb` | Friendship 7 | https://data.nasa.gov/dataset/nasa-3d-models-friendship-7 | Reduced from 164,622 triangles to 40,000; rescaled to the sourced length and width; its materials, which NASA's copy leaves all one grey, given plain colours judged from photographs. It carried no mark to remove. |
| `jupiter-c-vehicle.glb` | Jupiter-C | https://data.nasa.gov/dataset/nasa-3d-models-jupiter-c | The lettering removed with the two pictures that carried it, which are plain white here; its 8,933 triangles kept; rescaled to the sourced height; its materials made into one picture. |
| `iss-station.glb` | ISS | https://data.nasa.gov/dataset/nasa-3d-models-iss | Reduced from 174,440 triangles to 60,701; a ball of stray pieces far above it left out; rescaled to the sourced length; its materials, which NASA's copy leaves all one grey, given plain colours judged from photographs. It carried no mark to remove. |
| `hubble-telescope.glb` | Hubble Space Telescope | https://data.nasa.gov/dataset/nasa-3d-models-hubble-space-telescope | A lettered plate painted out of its picture; its 7,672 triangles kept; rescaled to the sourced length; its materials made into one picture. |
<!-- more NASA models -->

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
| Wikipedia: New Glenn, Rocket Lab Electron (CC BY-SA 4.0, read 2026-11-02) | Their sizes. Facts only: no text is copied |
| Wikipedia: Soyuz-2 (CC BY-SA 4.0, read 2026-11-02); Vulcan Centaur and Ariane 6 for the planned list | Their sizes and first flights. Facts only: no text is copied |
| Wikipedia: Autonomous spaceport drone ship, Landing Zones 1 and 2, Vandenberg Space Launch Complex 4 (CC BY-SA 4.0, read 2026-11-02) | Deck and pad sizes and first dates. Facts only: no text is copied, and the marks on the real decks and pads are not drawn |
| Federal Aviation Administration, Final Programmatic Environmental Assessment for Starship/Super Heavy at Boca Chica, June 2022, and Wikipedia: SpaceX Starbase (CC BY-SA 4.0, read 2026-11-02) | The tower's height and lightning rod, its nine sections, and first dates. Facts only |
| © OpenStreetMap contributors, https://www.openstreetmap.org/copyright (ODbL 1.0), read 2026-11-02 through its Overpass API | Starbase's named places and outlines: two towers, tank farm, Megabunker, two Mega Bays, Starfactory, the Sanchez site, the sign, the village and City Hall, and the map's height tags, with the highway and coast near them. A handful of places, not a copy of the map |
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
| draco3dgltf | 1.5.7 | Apache-2.0 | Reading NASA's compressed files, by hand, never at build time |
| meshoptimizer | 1.3.0 | MIT | Simplifying the models, by hand |
| @types/node, @types/react, @types/react-dom, @types/three | 24, 19, 19, 0.186 | MIT | Types |

The demo site bundles three and, on its check page, react and react-dom, each under the MIT licence.
