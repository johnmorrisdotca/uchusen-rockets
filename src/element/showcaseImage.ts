// Keep the full painted hull and its depth until the view changes. Only the exhaust is drawn again for its own animation.
import { AlwaysDepth, Camera, DepthTexture, HalfFloatType, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderTarget, type WebGLRenderer } from "three";

export const SHOWCASE_EXHAUST_LAYER = 1;

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uImage;
uniform sampler2D uDepth;
varying vec2 vUv;
void main() {
  vec4 base = texture2D(uImage, vUv);
  gl_FragColor = vec4(base.rgb / max(base.a, 0.0001), base.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb *= base.a;
  gl_FragDepth = texture2D(uDepth, vUv).r;
}
`;

export class ShowcaseImage {
  private readonly size = new Vector2();
  private readonly target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthTexture: new DepthTexture(1, 1) });
  private readonly screen = new Scene();
  private readonly camera = new Camera();
  private readonly quad = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uImage: { value: this.target.texture }, uDepth: { value: this.target.depthTexture } },
    depthFunc: AlwaysDepth,
  }));
  private captured = false;

  constructor() {
    this.quad.frustumCulled = false;
    this.screen.add(this.quad);
  }

  draw(renderer: WebGLRenderer, scene: Scene, camera: Camera, dirty: boolean): void {
    const size = renderer.getDrawingBufferSize(this.size);
    if (size.x !== this.target.width || size.y !== this.target.height) {
      this.target.setSize(size.x, size.y);
      this.captured = false;
    }
    const mask = camera.layers.mask;
    const background = scene.background;
    const autoClear = renderer.autoClear;
    const autoReset = renderer.info.autoReset;
    renderer.info.reset();
    renderer.info.autoReset = false;
    try {
      if (dirty || !this.captured) {
        camera.layers.set(0);
        renderer.setRenderTarget(this.target);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        this.captured = true;
      }
      renderer.render(this.screen, this.camera);
      renderer.autoClear = false;
      scene.background = null;
      camera.layers.set(SHOWCASE_EXHAUST_LAYER);
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(null);
      renderer.autoClear = autoClear;
      renderer.info.autoReset = autoReset;
      scene.background = background;
      camera.layers.mask = mask;
    }
  }

  dispose(): void {
    this.target.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }
}
