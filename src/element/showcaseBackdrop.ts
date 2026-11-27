import { Color, DoubleSide, Group, MathUtils, Mesh, RingGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, type Texture, TextureLoader, Vector2, Vector3 } from "three";
import { directionOf, rolledUp, type Vec3 } from "../framing.ts";
import { showcaseFrame, type ShowcaseBody, type ShowcasePreset } from "./showcaseView.ts";

const VERTEX = /* glsl */ `
#include <logdepthbuf_pars_vertex>
varying vec3 vWorld;
varying vec2 vMap;
void main() {
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vMap = uv;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  #include <logdepthbuf_vertex>
}
`;

const LIGHT = /* glsl */ `
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform vec3 uCenter;
uniform float uRadius;
uniform vec3 uSun;
varying vec3 vWorld;
varying vec2 vMap;
`;

const GLOBE = /* glsl */ `
${LIGHT}
uniform vec3 uAir;
#ifdef SHOWCASE_SURFACE_TONES
uniform vec3 uDarkTerrain;
uniform vec3 uLightTerrain;
#endif
#ifdef SHOWCASE_RINGS
uniform vec3 uAxis;
uniform vec2 uRingRadii;
uniform sampler2D uRingMap;
#endif
void main() {
  #include <logdepthbuf_fragment>
  vec3 normal = normalize(vWorld - uCenter);
  float facing = dot(normal, uSun);
  float daylight = max(facing, 0.0);
  #ifdef SHOWCASE_RINGS
  float along = dot(uSun, uAxis);
  if (abs(along) > 0.0001) {
    float toRing = -dot(normal, uAxis) / along;
    float radius = length(normal + toRing * uSun);
    if (toRing > 0.0 && radius > uRingRadii.x && radius < uRingRadii.y) {
      float band = (radius - uRingRadii.x) / (uRingRadii.y - uRingRadii.x);
      vec4 ring = texture2D(uRingMap, vec2(band, 0.5));
      daylight *= 1.0 - ring.a * smoothstep(0.03, 0.34, max(ring.r, max(ring.g, ring.b))) * 0.82;
    }
  }
  #endif
  vec3 eye = normalize(cameraPosition - vWorld);
  float rim = pow(max(0.0, 1.0 - dot(eye, normal)), 3.5);
  vec3 map = texture2D(uMap, vMap).rgb;
  #ifdef SHOWCASE_SURFACE_TONES
  float luminance = dot(map, vec3(0.2126, 0.7152, 0.0722));
  map = mix(uDarkTerrain, uLightTerrain, smoothstep(0.16, 0.46, luminance));
  #endif
  vec3 surface = map * (0.022 + 1.32 * daylight);
  gl_FragColor = vec4(surface + uAir * rim * smoothstep(-0.28, 0.7, facing) * 0.4, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const RINGS = /* glsl */ `
${LIGHT}
uniform vec3 uAxis;
uniform vec2 uRingRadii;
void main() {
  #include <logdepthbuf_fragment>
  vec3 radial = (vWorld - uCenter) / uRadius;
  float band = (length(radial) - uRingRadii.x) / (uRingRadii.y - uRingRadii.x);
  vec4 ring = texture2D(uMap, vec2(band, 0.5));
  float opacity = ring.a * smoothstep(0.006, 0.16, max(ring.r, max(ring.g, ring.b)));
  float along = -dot(radial, uSun);
  float distanceToSunRay = length(radial + along * uSun);
  float shadow = along > 0.0 ? smoothstep(0.98, 1.018, distanceToSunRay) : 1.0;
  float light = 0.035 + shadow * (0.48 + 0.6 * abs(dot(uSun, uAxis)));
  gl_FragColor = vec4(ring.rgb * light, opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** A model of the shot's distant body, with the same sunlight direction as the ship. */
export class ShowcaseBackdrop {
  readonly group = new Group();
  private readonly globe: Mesh<SphereGeometry, ShaderMaterial>;
  private readonly rings: Mesh<RingGeometry, ShaderMaterial> | null;
  private readonly maps: Texture[] = [];
  private readonly radius = { value: 1 };
  private readonly body: ShowcaseBody;
  private disposed = false;

  constructor(body: ShowcaseBody, sun: Vec3, assets: string, changed: () => void) {
    this.body = body;
    const light = { value: new Vector3(...sun).normalize() };
    const common = { uSun: light, uCenter: { value: this.group.position }, uRadius: this.radius };
    const loader = new TextureLoader();
    const mapBase = new URL("../bodies/", new URL(assets, document.baseURI));
    const load = (name: string, ready: () => void) => {
      const texture = loader.load(new URL(name, mapBase).href, () => {
        if (this.disposed) return;
        ready();
        changed();
      });
      texture.colorSpace = SRGBColorSpace;
      this.maps.push(texture);
      return texture;
    };
    const map = load(body.map, () => { this.globe.visible = true; });
    const ring = body.rings;
    const axis = new Vector3(...(ring?.axis ?? [0, 1, 0])).normalize();
    const radii = new Vector2(ring?.inner, ring?.outer);
    const ringMap = ring ? load(ring.map, () => {
      if (!this.rings) return;
      this.rings.visible = true;
      this.globe.material.defines.SHOWCASE_RINGS = 1;
      this.globe.material.needsUpdate = true;
    }) : null;
    const ringFrame = { uAxis: { value: axis }, uRingRadii: { value: radii } };
    const tones = body.surfaceTones;
    const globe = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: GLOBE,
      defines: tones ? { SHOWCASE_SURFACE_TONES: 1 } : {},
      uniforms: {
        ...common, ...ringFrame,
        uMap: { value: map },
        uRingMap: { value: ringMap },
        uAir: { value: new Color(body.atmosphere ?? "#000000") },
        ...(tones ? { uDarkTerrain: { value: new Color(tones[0]) }, uLightTerrain: { value: new Color(tones[1]) } } : {}),
      },
    });
    this.globe = new Mesh(new SphereGeometry(1, 72, 48), globe);
    this.globe.visible = false;
    this.globe.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), axis);
    this.globe.rotateY(MathUtils.degToRad(body.longitude ?? 0));
    this.group.add(this.globe);
    this.rings = ring && ringMap ? new Mesh(new RingGeometry(ring.inner, ring.outer, 128), new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: RINGS,
      uniforms: { ...common, ...ringFrame, uMap: { value: ringMap } },
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    })) : null;
    if (this.rings) {
      this.rings.visible = false;
      this.rings.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axis);
      this.group.add(this.rings);
    }
  }

  place(preset: ShowcasePreset, aspect: number): void {
    const shot = preset.shot(aspect);
    const direction = directionOf(shot.angle);
    const forward = new Vector3(...direction).negate();
    const right = forward.clone().cross(new Vector3(...rolledUp(direction, shot.roll))).normalize();
    const up = right.clone().cross(forward);
    const { position } = showcaseFrame(preset, null, aspect);
    const { center, radius } = this.body.place(aspect);
    this.group.position.set(...position).addScaledVector(right, center[0]).addScaledVector(up, center[1]).addScaledVector(forward, center[2]);
    this.group.scale.setScalar(radius);
    this.radius.value = radius;
  }

  dispose(): void {
    this.disposed = true;
    this.group.removeFromParent();
    this.globe.geometry.dispose();
    this.globe.material.dispose();
    this.rings?.geometry.dispose();
    this.rings?.material.dispose();
    for (const map of this.maps) map.dispose();
  }
}
