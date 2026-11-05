// Writes the glbs and the camera jobs for the three lettering concepts. node scripts/markings-shots.ts <folder>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toGlb } from "../src/build/glb.ts";
import { CONCEPT_FACES, conceptHull, miyamotoHull } from "../src/model/fleet/markingSets.ts";
import { meshOf } from "../src/model/pieces.ts";

const folder = process.argv[2];
if (!folder) throw new Error("usage: node scripts/markings-shots.ts <folder>");
mkdirSync(folder, { recursive: true });

const face = (az: number, y: number, radius: number, back: number, fov: number) => {
  const nx = Math.sin(az);
  const nz = Math.cos(az);
  return {
    eye: [nx * (radius + back), y, nz * (radius + back)] as [number, number, number],
    target: [nx * radius, y, nz * radius] as [number, number, number],
    up: [-Math.cos(az), 0, Math.sin(az)] as [number, number, number],
    fov,
  };
};

const tankAz = Math.atan2(-1, -1) + Math.PI;

/** One lamp in front of the line, throwing a pool across the whole field. */
const pools = (az: number, y: number, radius: number) => {
  const nx = Math.sin(az);
  const nz = Math.cos(az);
  return [{
    at: [nx * (radius + 26), y, nz * (radius + 26)] as [number, number, number],
    target: [nx * radius, y, nz * radius] as [number, number, number],
    color: "#fff2d8",
    angle: 0.9,
    intensity: 480,
  }];
};

const jobs = [];
for (const id of Object.keys(CONCEPT_FACES)) {
  const write = (name: string, parts: { record: { id: string }; pieces: () => Parameters<typeof meshOf>[0] }[]): string => {
    const glb = toGlb(parts.map((part) => ({ name: part.record.id, mesh: meshOf(part.pieces()), at: [0, 0, 0] as [number, number, number] })));
    const path = join(folder, `${name}.glb`);
    writeFileSync(path, glb.bytes);
    return path;
  };
  const kaminari = write(`kaminari-${id}`, conceptHull(id));
  const miyamoto = write(`miyamoto-${id}`, miyamotoHull(id));
  const tank = face(tankAz, 230, 42, 105, 40);
  const drum = face(1.71, 276, 15, 55, 40);
  jobs.push({
    glb: kaminari,
    shots: [
      { name: `kaminari-${id}-close`, ...tank, size: [1400, 900], look: "painted", shadow: 120 },
      { name: `kaminari-${id}-lit`, ...tank, size: [1400, 900], look: "lit", shadow: 120, sun: 0.08, spots: pools(tankAz, 230, 42) },
      { name: `kaminari-${id}-hull`, ...face(tankAz, 230, 42, 260, 36), size: [1600, 900], look: "painted", shadow: 250 },
    ],
  });
  jobs.push({
    glb: miyamoto,
    shots: [
      { name: `miyamoto-${id}-close`, ...drum, size: [1400, 900], look: "painted", shadow: 50 },
      { name: `miyamoto-${id}-lit`, ...drum, size: [1400, 900], look: "lit", shadow: 50, sun: 0.08, spots: pools(1.71, 276, 15) },
    ],
  });
}
writeFileSync(join(folder, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(`wrote ${jobs.length} jobs`);
