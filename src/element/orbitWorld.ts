// The compare page's Earth, its Moon, the major moons, and a star field. The craft stay at the origin, 400 km above the surface. Loaded only when a page asks for it.
import { BODIES, DWARF_IDS, heliocentric, PLANET_IDS, type HostId } from "@johnmorrisdotca/wakusei-planets";
import { BufferAttribute, BufferGeometry, Group, InstancedMesh, LineLoop, LineBasicMaterial, Mesh, MeshBasicMaterial, Object3D, Points, PointsMaterial, SphereGeometry, SRGBColorSpace, TextureLoader } from "three";
import { skyGroupOf, type SkyShown } from "./solarGroups.ts";
import { beltPlaces, bodyScene, earthCentre, majorMoons, moonScene, sceneOf, type BeltKind } from "./solarPlace.ts";

const STAR_R_M = 2e13;
const ORBIT_IDS: HostId[] = [...PLANET_IDS, ...DWARF_IDS.filter((id) => id === "ceres" || id === "haumea" || id === "makemake" || id === "eris")];

type Triple = readonly [number, number, number];

/** Stars as points, so a wide view stays a sky and not a stretched picture. */
function starField(): Points {
  const count = 420;
  const positions = new Float32Array(count * 3);
  let n = 20261106;
  for (let i = 0; i < count; i += 1) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const u = (n % 10000) / 10000;
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const v = (n % 10000) / 10000;
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    positions[i * 3] = STAR_R_M * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = STAR_R_M * Math.cos(phi);
    positions[i * 3 + 2] = STAR_R_M * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return new Points(geometry, new PointsMaterial({ color: "#d5def2", size: 1.5, sizeAttenuation: false }));
}

const turn = (a: Triple, b: Triple): number => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const denom = Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]);
  return Math.acos(Math.min(1, Math.max(-1, dot / (denom || 1))));
};

/** One lap of a planet, sampled from the ephemeris until it has gone all the way round. */
function orbitPoints(id: HostId, when: number, earth: Triple): Float32Array {
  const day = 86_400_000;
  const start = heliocentric(id, when);
  const step0 = turn(start, heliocentric(id, when + day));
  const guess = ((2 * Math.PI) / Math.max(step0, 1e-8)) * day;
  const step = Math.max(day, guess / 80);
  const raw: Triple[] = [];
  let t = when;
  let prev = start;
  let swept = 0;
  while (swept < Math.PI * 2 && raw.length < 120) {
    t += step;
    const place = heliocentric(id, t);
    swept += turn(prev, place);
    prev = place;
    raw.push(place);
  }
  const positions = new Float32Array(raw.length * 3);
  raw.forEach((place, index) => {
    const [x, y, z] = sceneOf(place, earth);
    const [ox, oy, oz] = earthCentre();
    positions[index * 3] = x - ox;
    positions[index * 3 + 1] = y - oy;
    positions[index * 3 + 2] = z - oz;
  });
  return positions;
}

const stand = new Object3D();

function bandMesh(kind: BeltKind, when: number): InstancedMesh {
  const places = beltPlaces(kind, when);
  const mesh = new InstancedMesh(
    new SphereGeometry(places[0]?.radiusM ?? 1, 6, 4),
    new MeshBasicMaterial({ color: "#c5d0de", transparent: true, opacity: 0.45, depthWrite: false }),
    places.length,
  );
  mesh.name = kind;
  const [ox, oy, oz] = earthCentre();
  stand.scale.set(1, 1, 1);
  places.forEach((place, index) => {
    stand.position.set(place.at[0] - ox, place.at[1] - oy, place.at[2] - oz);
    stand.updateMatrix();
    mesh.setMatrixAt(index, stand.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = places.length;
  mesh.frustumCulled = false;
  return mesh;
}

function moonMesh(when: number): InstancedMesh {
  const spots = majorMoons(when);
  const mesh = new InstancedMesh(new SphereGeometry(1, 10, 8), new MeshBasicMaterial({ color: "#d9d3c7" }), Math.max(spots.length, 1));
  mesh.name = "major-moons";
  spots.forEach((spot, index) => {
    stand.position.set(spot.at[0], spot.at[1], spot.at[2]);
    stand.scale.set(spot.radiusM, spot.radiusM, spot.radiusM);
    stand.updateMatrix();
    mesh.setMatrixAt(index, stand.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = spots.length;
  mesh.frustumCulled = false;
  return mesh;
}

/** The planets' paths and the two belts, in one draw group the page can hide. Hidden until the camera is far enough that a path is something you can see. */
function solarSketch(when: number): Group {
  const sketch = new Group();
  sketch.name = "solar-sketch";
  sketch.visible = false;
  const earth = heliocentric("earth", when);
  sketch.userData.earth = [earth[0], earth[1], earth[2]];
  const [ox, oy, oz] = earthCentre();
  sketch.position.set(ox, oy, oz);
  for (const id of ORBIT_IDS) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(orbitPoints(id, when, earth), 3));
    const line = new LineLoop(geometry, new LineBasicMaterial({ color: "#6e7c90", transparent: true, opacity: 0.2, depthWrite: false }));
    line.name = `orbit-${id}`;
    line.frustumCulled = false;
    sketch.add(line);
  }
  sketch.add(bandMesh("asteroids", when), bandMesh("kuiper", when));
  return sketch;
}

/** The Sun and every marked body except the Earth, which is already the globe under the craft. */
function planetGroup(when: number): Group {
  const bodies = new Group();
  bodies.name = "planets";
  const ids: ("sun" | HostId)[] = ["sun", ...ORBIT_IDS.filter((id) => id !== "earth")];
  for (const id of ids) {
    const mesh = new Mesh(new SphereGeometry(BODIES[id].radiusKm * 1000, 32, 24), new MeshBasicMaterial({ color: BODIES[id].colour }));
    mesh.name = `body-${id}`;
    const [x, y, z] = bodyScene(id, when);
    mesh.position.set(x, y, z);
    mesh.frustumCulled = false;
    bodies.add(mesh);
  }
  return bodies;
}

/** Shows or hides the planets, the dwarf planets and the moons. The Earth under the craft stays. Belts and paths are the viewer's, because they also depend on how far the camera is. */
export function applySolarGroups(root: Object3D, groups: Pick<SkyShown, "planets" | "moons" | "dwarfs">): void {
  const planets = root.getObjectByName("planets");
  if (planets) {
    for (const child of planets.children) {
      const id = child.name.startsWith("body-") ? child.name.slice("body-".length) : "";
      const group = skyGroupOf(id);
      if (group === "planets" || group === "dwarfs") child.visible = groups[group];
    }
  }
  const moon = root.getObjectByName("moon");
  if (moon) moon.visible = groups.moons;
  const major = root.getObjectByName("major-moons");
  if (major) major.visible = groups.moons;
}

/** Moves the Moon, the major moons and the sketch so they match `when`. The paths and belts were drawn around the Sun at the first instant, so the whole sketch shifts with the Earth. */
export function moveOrbit(group: Group, when: number): void {
  const moon = group.getObjectByName("moon");
  if (moon) {
    const [x, y, z] = moonScene(when);
    moon.position.set(x, y, z);
  }
  const moons = group.getObjectByName("major-moons");
  if (moons instanceof InstancedMesh) {
    for (const [index, spot] of majorMoons(when).entries()) {
      stand.position.set(spot.at[0], spot.at[1], spot.at[2]);
      stand.scale.set(spot.radiusM, spot.radiusM, spot.radiusM);
      stand.updateMatrix();
      moons.setMatrixAt(index, stand.matrix);
    }
    moons.instanceMatrix.needsUpdate = true;
  }
  const planets = group.getObjectByName("planets");
  if (planets) {
    for (const child of planets.children) {
      const id = child.name.slice("body-".length);
      const at = bodyScene(id === "sun" ? "sun" : (id as HostId), when);
      child.position.set(at[0], at[1], at[2]);
    }
  }
  const sketch = group.getObjectByName("solar-sketch");
  const built = sketch?.userData.earth as Triple | undefined;
  if (sketch && built) {
    const [x, y, z] = sceneOf(built, heliocentric("earth", when));
    sketch.position.set(x, y, z);
  }
}

/** The Earth under the craft, the Moon where it is today, and the stars behind both. `ready` runs when the Earth's picture has arrived. */
export function orbitWorld(ready: () => void, when = Date.now()): { group: Group; dispose: () => void } {
  const earthR = BODIES.earth.radiusKm * 1000;
  const moonR = BODIES.moon.radiusKm * 1000;
  const group = new Group();
  group.name = "orbit-world";
  const stars = starField();
  stars.name = "stars";
  stars.renderOrder = -1;
  (stars.material as PointsMaterial).depthWrite = false;
  const earth = new Mesh(new SphereGeometry(earthR, 96, 64), new MeshBasicMaterial({ color: "#1a4f86" }));
  earth.name = "earth";
  const [ex, ey, ez] = earthCentre();
  earth.position.set(ex, ey, ez);
  const [mx, my, mz] = moonScene(when);
  const moon = new Mesh(new SphereGeometry(moonR, 48, 32), new MeshBasicMaterial({ color: "#c4bfb4" }));
  moon.name = "moon";
  moon.position.set(mx, my, mz);
  const sketch = solarSketch(when);
  const moons = moonMesh(when);
  const planets = planetGroup(when);
  group.add(stars, earth, moon, moons, planets, sketch);
  const loader = new TextureLoader();
  const base = new URL("textures/", document.baseURI);
  const paint = (file: string, body: Mesh) => {
    loader.load(new URL(file, base).href, (map) => {
      map.colorSpace = SRGBColorSpace;
      const material = body.material as MeshBasicMaterial;
      material.map = map;
      material.color.set("#ffffff");
      material.needsUpdate = true;
      if (body === earth) ready();
    });
  };
  paint("day-2048.webp", earth);
  paint("moon-2048.webp", moon);
  return {
    group,
    dispose: () => {
      group.traverse((node) => {
        const mesh = node as Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as MeshBasicMaterial | MeshBasicMaterial[] | undefined;
        const list = Array.isArray(material) ? material : material ? [material] : [];
        for (const one of list) {
          one.map?.dispose();
          one.dispose();
        }
      });
    },
  };
}
