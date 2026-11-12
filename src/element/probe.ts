// What the browser's WebGL is, asked once per page. A test context in software drawing takes seconds of the main thread, so the answer is kept for every element and every viewer on the page, and the context is let go the moment it has answered.

/** What one look at the browser's WebGL said. */
export interface GlProbe {
  /** Whether a WebGL context can be made at all. */
  works: boolean;
  /** Whether the context draws in software (SwiftShader, llvmpipe, softpipe), where smooth edges cost a frame. */
  software: boolean;
}

let answer: GlProbe | null = null;
let asked = 0;

/** How many test contexts this page has made: 1 once the answer is known, 0 before it is asked for. */
export function probeCount(): number {
  return asked;
}

/**
 * Says whether WebGL works here and whether it draws in software. The first call makes one test context and releases it at once; every later call, from any element or viewer, gets the same answer without making another.
 *
 * @returns The kept answer.
 */
export function glProbe(): GlProbe {
  if (answer) return answer;
  asked++;
  let works = false;
  let software = false;
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement("canvas");
    const two = canvas.getContext("webgl2");
    const gl = two ?? (canvas.getContext("webgl") as WebGLRenderingContext | null);
    works = Boolean(gl);
    if (gl) {
      try {
        const info = gl.getExtension("WEBGL_debug_renderer_info");
        software = /swiftshader|llvmpipe|softpipe/i.test(info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "");
      } catch {
        // The name is only a hint for smooth edges.
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    works = false;
  }
  if (canvas) {
    // A canvas of no size lets its drawing buffer go with it.
    canvas.width = 0;
    canvas.height = 0;
  }
  answer = { works, software };
  return answer;
}
