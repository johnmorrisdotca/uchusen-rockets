// Bounded volumes of illuminated exhaust in the drive parts' own frames.
import { AdditiveBlending, BoxGeometry, Data3DTexture, Group, LinearFilter, Mesh, RedFormat, RepeatWrapping, ShaderMaterial } from "three";
import type { Bell } from "../engines.ts";
import { seeded } from "./paint.ts";
import { PartPlumes, type PlumeKit } from "./plumes.ts";
import { SHOWCASE_EXHAUST_LAYER } from "./showcaseImage.ts";
import type { ShowcaseDrive } from "./showcaseView.ts";

export const SHOWCASE_STILL = 1.5;
const NOISE_SIZE = 32;
const VOLUME_MIN = [-137, -270, -137] as const;
const VOLUME_MAX = [137, 2, 137] as const;

const VERTEX = /* glsl */ `
#include <logdepthbuf_pars_vertex>
varying vec3 vAt;
varying vec3 vEye;
void main() {
  vAt = position;
  vEye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

const FRAGMENT = /* glsl */ `
#include <logdepthbuf_pars_fragment>
uniform float uTime;
uniform float uIntensity;
uniform highp sampler3D uNoise;
varying vec3 vAt;
varying vec3 vEye;

float hash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return texture(uNoise, (i + f + 0.5) / ${NOISE_SIZE}.0).r;
}

float folds(vec3 p) {
  return noise(p) * 0.56 + noise(p * 2.14 + 11.8) * 0.28 + noise(p * 4.41 + 32.4) * 0.16;
}

// The wake expands freely aft. Axial flow stretches the turbulent edges into filaments.
vec4 exhaust(vec3 p) {
  float down = -p.y;
  float radius = 15.0 + max(down, 0.0) * 0.43;
  float crossSection = length(p.xz) / radius;
  if (crossSection > 1.24) return vec4(0.0);

  vec3 q = vec3(p.xz / (1.0 + down * 0.007), down * 0.52 - uTime * 33.0) * 0.078;
  float eddy = folds(q);
  float edge = crossSection + (eddy - 0.50) * 0.30;
  float taper = smoothstep(6.0, 31.0, down) * (1.0 - smoothstep(144.0, 260.0, down));
  float jet = (1.0 - smoothstep(0.22, 1.10, edge)) * mix(0.61, 1.2, eddy) * taper;
  float heat = exp(-down * 0.016) * (1.0 - smoothstep(0.04, 0.84, crossSection));
  vec3 cold = vec3(0.07, 0.19, 0.42) * (0.72 + eddy);
  vec3 hot = vec3(2.5, 1.13, 0.55) * heat * heat;
  return vec4((cold + hot) * jet * uIntensity, jet * 0.022);
}

void main() {
  #include <logdepthbuf_fragment>
  vec3 ray = normalize(vAt - vEye);
  vec3 invRay = 1.0 / ray;
  vec3 a = (vec3(${VOLUME_MIN.join(", ")}) - vEye) * invRay;
  vec3 b = (vec3(${VOLUME_MAX.join(", ")}) - vEye) * invRay;
  vec3 low = min(a, b), high = max(a, b);
  float start = max(max(low.x, low.y), max(0.0, low.z));
  float end = min(high.x, min(high.y, high.z));
  float stepSize = max((end - start) / 29.0, 0.0);
  float where = start + stepSize * mix(0.32, 0.68, hash(floor(vec3(gl_FragCoord.xy, 0.0))));
  vec4 result = vec4(0.0);
  for (int i = 0; i < 29; ++i) {
    vec3 p = vEye + ray * where;
    vec4 gas = exhaust(p);
    float alpha = 1.0 - exp(-stepSize * gas.a);
    result += (1.0 - result.a) * vec4(gas.rgb * alpha, alpha);
    if (result.a > 0.97) break;
    where += stepSize;
  }
  if (result.a < 0.005) discard;
  gl_FragColor = vec4(result.rgb / result.a, result.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

let volumeBytes: Uint8Array<ArrayBuffer> | undefined;

function exhaustTexture(): Data3DTexture {
  if (!volumeBytes) {
    const random = seeded(530);
    volumeBytes = Uint8Array.from({ length: NOISE_SIZE ** 3 }, () => Math.floor(random() * 256));
  }
  const texture = new Data3DTexture(volumeBytes, NOISE_SIZE, NOISE_SIZE, NOISE_SIZE);
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export interface ShowcaseMount extends Pick<ShowcaseDrive, "frame" | "coreLength" | "wakes"> {
  part: Group;
  bells: readonly Bell[];
}

export class ShowcaseExhaust {
  readonly count: number;
  private readonly cores: PartPlumes[] = [];
  private readonly wakes: Mesh<BoxGeometry, ShaderMaterial>[] = [];
  private readonly frames: Group[] = [];
  private readonly noise = exhaustTexture();
  private readonly geometry = new BoxGeometry(VOLUME_MAX[0] - VOLUME_MIN[0], VOLUME_MAX[1] - VOLUME_MIN[1], VOLUME_MAX[2] - VOLUME_MIN[2]);
  private readonly time = { value: SHOWCASE_STILL };

  constructor(plumes: PlumeKit, mounts: readonly ShowcaseMount[], layered: boolean) {
    this.geometry.translate((VOLUME_MIN[0] + VOLUME_MAX[0]) / 2, (VOLUME_MIN[1] + VOLUME_MAX[1]) / 2, (VOLUME_MIN[2] + VOLUME_MAX[2]) / 2);
    this.count = mounts.reduce((total, mount) => total + mount.bells.length, 0);
    for (const { part, bells, wakes, frame, coreLength } of mounts) {
      const parent = frame ? new Group() : part;
      if (frame) {
        parent.position.set(...frame.at);
        parent.rotation.set(...frame.rotation);
        part.add(parent);
        this.frames.push(parent);
      }
      const cores = new PartPlumes(plumes, bells, "showcase", coreLength);
      cores.light(bells);
      if (layered) cores.group.traverse((node) => node.layers.set(SHOWCASE_EXHAUST_LAYER));
      parent.add(cores.group);
      this.cores.push(cores);
      for (const wake of wakes) {
        const material = new ShaderMaterial({
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          uniforms: { uTime: this.time, uNoise: { value: this.noise }, uIntensity: { value: wake.intensity ?? 1 } },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        const mesh = new Mesh(this.geometry, material);
        mesh.position.set(...wake.at);
        mesh.scale.set(...wake.scale);
        mesh.renderOrder = 4;
        if (layered) mesh.layers.set(SHOWCASE_EXHAUST_LAYER);
        parent.add(mesh);
        this.wakes.push(mesh);
      }
    }
  }

  setTime(seconds: number): void {
    this.time.value = seconds;
  }

  dispose(): void {
    for (const cores of this.cores) cores.dispose();
    for (const wake of this.wakes) {
      wake.removeFromParent();
      wake.material.dispose();
    }
    for (const frame of this.frames) frame.removeFromParent();
    this.geometry.dispose();
    this.noise.dispose();
  }
}
