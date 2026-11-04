// Mounts at the radiator wing tips: a small module hung on the end of each wing. The relay mast carries a dish and lights for talking to the stations; the tug is a short drum with three vernier-class nozzles for pushing
// other ships about. Local frame: the module's own centre at the origin, its axis along y, the wing on the -x side for the starboard tip.
import { beam, box, collar, cyl, dish, drum, mast, revolve, ring, rng, type Piece } from "./adapter.ts";
import { vernier } from "./drive.ts";

export function relayTip(): Piece[] {
  const r = rng(2110);
  const out: Piece[] = [drum("hull-grey", [0, 0], 6, -20, 20, 16), ring("hull-yellow", [0, 0], 6, 6.6, -4, 0, 16), ring("dark", [0, 0], 6, 7, 12, 14, 16)];
  out.push(...mast([0, 20, 0], [0, 60, 0], 0.9), ...dish([0, 0], 24, 11), ...dish([0, 0], 4, 6, "hull-orange"));
  for (let k = 0; k < 6; k++) out.push(box(r.pick(["lamp-red", "lamp-blue", "hull-yellow"]), [6.4 * Math.sin((k / 6) * 6.283), -14 + (k % 3) * 12, 6.4 * Math.cos((k / 6) * 6.283)], [1.6, 1.6, 1.6]));
  out.push(beam("hull-orange", [-6, 0, 0], [-30, 0, 0], 3, 3, false));
  return out;
}

export function tugTip(): Piece[] {
  const out: Piece[] = [drum("hull-orange", [0, 0], 8, 0, 40, 20), ring("hull-grey", [0, 0], 8, 9, 20, 24, 20), ring("dark", [0, 0], 8, 9.4, 4, 8, 20), ...vernier(0, 0, -14).map((p) => p)];
  out.push(...collar([0, 0], 40, 1, 5), cyl("engine-pale", [0, 0], 4, 40, 46, 12), revolve("coolant", [0, 0], [[3, 46], [3, 52]], 8), beam("hull-orange", [-8, 20, 0], [-30, 20, 0], 3, 3));
  return out;
}
