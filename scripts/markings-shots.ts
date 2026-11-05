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
  const tank = face(tankAz, 215, 41, 70, 42);
  const drum = face(1.71, 276, 14, 72, 42);
  jobs.push({
    glb: kaminari,
    shots: [
      { name: `kaminari-${id}-close`, ...tank, size: [1400, 900], look: "painted", shadow: 90 },
      { name: `kaminari-${id}-lit`, ...face(tankAz, 215, 41, 70, 42), size: [1400, 900], look: "lit", shadow: 90, sun: 0.05 },
      { name: `kaminari-${id}-hull`, ...face(tankAz, 220, 41, 280, 38), size: [1600, 900], look: "painted", shadow: 250 },
    ],
  });
  jobs.push({
    glb: miyamoto,
    shots: [
      { name: `miyamoto-${id}-close`, ...drum, size: [1400, 900], look: "painted", shadow: 40 },
      { name: `miyamoto-${id}-lit`, ...face(1.71, 276, 14, 72, 42), size: [1400, 900], look: "lit", shadow: 40, sun: 0.05 },
    ],
  });
}
writeFileSync(join(folder, "jobs.json"), JSON.stringify(jobs, null, 2));
console.log(`wrote ${jobs.length} jobs`);
