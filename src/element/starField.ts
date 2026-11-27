import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from "three";

/** Stars as points, so a wide view stays a sky and not a stretched picture. */
export function starField(radius: number, { count = 420, size = 1.5, opacity = 1 }: { count?: number; size?: number; opacity?: number } = {}): Points<BufferGeometry, PointsMaterial> {
  const positions = new Float32Array(count * 3);
  let n = 20261106;
  for (let i = 0; i < count; i += 1) {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const u = (n % 10000) / 10000;
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    const v = (n % 10000) / 10000;
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return new Points(geometry, new PointsMaterial({ color: "#d5def2", size, opacity, transparent: opacity < 1, sizeAttenuation: false, depthWrite: false }));
}
