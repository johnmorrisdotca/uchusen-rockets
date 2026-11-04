# The fleet's badges

One emblem for the whole fleet, a round crest for each ship, a class mark for the Romurusu class and a crew patch for each ship. All are flat SVG pictures drawn by hand for this package, in the fleet's own palette, and they stay crisp from 16 px to 512 px. The Japanese version of this page is [ja/badges.md](ja/badges.md).

- Pictures: `src/data/fleet/badges/*.svg` (the files are the source).
- Data and accessors: `src/data/fleet/badges.ts`, exported from the package root (`FLEET_BADGES`, `FLEET_BADGE_SHIPS`, `badge`, `badgesOf`, `badgeSvg`, `badgeUri`).
- Tests: `test/fleet-badges.test.ts` (every SVG is well formed, has a `viewBox`, uses only palette colours and stays under its size budget) and `e2e/fleet-badges.demo.ts` (drawn in a browser at 16 px and 512 px, on a white blanket and on a dark hull).

Nothing here touches a ship's model. A ship places its badges as decals later.

## The badges

| Id | Kind | Ship | The design | Colours (palette roles) |
|---|---|---|---|---|
| `fleet-emblem` | emblem | the whole fleet | A four-pointed star on a tilted orbit, in a ring; a plate under it with a small SPX. | shield, protected, heatSink |
| `crest-kaminari` | crest | Kaminari 加美鳴 (かみなり), SPX-207 | One bolt breaking a ring: thunder. | service, protected, heatSink |
| `crest-miyamoto` | crest | Miyamoto 宮本, SPX-452 | A torii over two crossed swords. | shield, protected, heatSink |
| `crest-ariake` | crest | Ariake 有明 (ありあけ), SPX-186 | A crescent moon on the horizon, the dawn rays behind it, the water below. | coil, protected, heatSink |
| `crest-hanabusa` | crest | Hanabusa 花房 | Seven flowers in a round cluster. | light, coil, protected, heatSink |
| `class-romurusu` | class mark | the Romurusu class (ロムルス級): Miyamoto and Ariake | A wolf's face, front on, in a hexagon. | service, protected, heatSink |
| `patch-kaminari`, `patch-miyamoto`, `patch-ariake`, `patch-hanabusa` | crew patch | one for each ship | The ship's crest in a shield, the name above it and the registry number below, in the crest's colour. | the crest's, and protected |

The emblem is the fleet's own and is not the SPX mark: it does not use or imitate it. The small SPX on its plate is the operator's name, drawn as letters.

## How they are made

- **Kamon style.** A crest is a circle with a ring, one flat symbol and nothing else: no gradients, no shading, no fine lines. The torii, dawn, flower and wolf marks are mirror-symmetric; the thunder crest is one bolt, which breaks the symmetry on purpose (a pair of bolts is avoided: it reads as something else).
- **Two or three colours plus the outline.** Every badge uses the dark `heatSink` as its outline and field and the light `protected` as its ring, and one or two accent roles from `FLEET_PALETTE` (`src/model/fleet/palette.ts`). The light ring stands out on a dark hull and the dark outline on a white blanket, so one picture serves both.
- **Words are paths.** The letters are strokes drawn by `scripts/badge-letters.ts` (a bold, wide, chamfered font of our own), so a badge needs no font and no other file. `node scripts/badge-letters.ts "SPX-207" 120 236 14 middle` prints the path for a line of letters. The SVGs carry no Japanese: a ship's name in kanji, with its reading, is in `FLEET_BADGE_SHIPS` for a sheet or a label to set as text.
- **The public words only.** Names, registry numbers and class names, as in `FLEET_BADGE_SHIPS`. Nothing explains a number or takes a name apart.
- **No ids, no style, no script, no pictures, no gradients.** An SVG can be put in a page any number of times without its ids clashing.
- **Size budget.** A crest, the emblem or the class mark is under 4 KB; a crew patch is under 6 KB; all ten together are under 24 KB.

## Using one

```ts
import { badge, badgesOf, badgeSvg, badgeUri, FLEET_BADGE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";

badgesOf("kaminari").map((one) => one.id); // ["crest-kaminari", "patch-kaminari"]
badgeSvg("crest-kaminari", 64); // the SVG at 64 px wide
badgeUri("fleet-emblem"); // a data: address for an image's src
FLEET_BADGE_SHIPS.ariake.registry; // "SPX-186"
```

For a decal in 3D, draw the SVG into a canvas at 512 px (or 1024 px on a large hull) and use that as the texture; the emblem and crests are round, so put them on a transparent plane.

## Changing a badge

1. Edit the `.svg` file in `src/data/fleet/badges/`. Keep the rules above.
2. Run `pnpm badges` to rewrite `src/data/fleet/badges/svgs.ts` (the test fails if it is out of date).
3. Run `node --test test/fleet-badges.test.ts`.

**Hanabusa's registry number is still to come.** `HANABUSA_REGISTRY` holds a placeholder, and the crew patch shows the operator's name where the number will go. When John gives the number, set the constant, draw the line again in `patch-hanabusa.svg` with `badge-letters.ts` (the same height, 14, and position as the other patches) and update the test's expectation.
