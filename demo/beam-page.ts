// The beam page: a cargo container and a stand-in for the drone, on a dark ground, with the beam as light between them.
import { beamLight } from "../src/draw/beamLight.ts";
import { defsOf, drawPart, perspective } from "../src/draw/svg.ts";
import { PICTURE_H, PICTURE_W, VIEWS, type Vec3 } from "../src/framing.ts";
import type { LookName } from "../src/looks.ts";
import { detail } from "../src/model/detail.ts";
import { MATERIALS } from "../src/model/materials.ts";
import { boundsOfPieces } from "../src/model/pieces.ts";
import { box, rng } from "../src/model/fleet/ship-02/adapter.ts";
import { container } from "../src/model/fleet/ship-02/cargo.ts";
import { bindStage, placeZoom } from "./viewBinder.ts";

detail.level = "coarse";

// A real cargo container, 22 m by 40 m by 22 m. The box under it stands in for the drone until that drone exists.
const cargo = container(0, 0, 0, 1, 1, rng(3), "A1", "hull-orange");
const drone: Vec3 = [0, -46, 0];
const standIn = box("hull-grey-dark", drone, [4, 3, 4]);
const pieces = [...cargo, standIn];
const bounds = boundsOfPieces(pieces);
const cam = perspective(
  {
    min: [bounds.min[0] - 6, bounds.min[1] - 4, bounds.min[2] - 6],
    max: [bounds.max[0] + 6, bounds.max[1] + 4, bounds.max[2] + 6],
  },
  VIEWS.side,
);
const from: Vec3 = [0, -44.5, 0];
const to: Vec3 = [0, -20, 0];

function picture(id: string, look: LookName, beam: string): void {
  const fill = look === "painted" ? (material: keyof typeof MATERIALS) => `url(#${MATERIALS[material].fill})` : () => "none";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PICTURE_W} ${PICTURE_H}"><rect width="${PICTURE_W}" height="${PICTURE_H}" fill="#070b14"/>${defsOf(look)}${drawPart(pieces, [0, 0, 0], cam, look, 1, undefined, fill)}${beam}</svg>`;
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  document.getElementById(id)?.replaceChildren(document.importNode(parsed.documentElement, true));
}

picture("beam-carry", "painted", beamLight(from, to, 0.4, 6, cam, "painted", "carry"));
picture("beam-line", "line", beamLight(from, to, 0.4, 6, cam, "line", "line"));
picture("beam-dotted", "painted", beamLight(from, to, 0.4, 6, cam, "painted", "still", true));

const stage = document.getElementById("beam-stage");
const row = document.getElementById("beam-row");
if (stage && row) bindStage(stage, (view) => placeZoom(row, view), { flat: true, theme: "dark", controls: "basic", zoomMin: "0.25", zoomMax: "8", testid: "view-bar" });
