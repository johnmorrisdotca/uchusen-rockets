// What the browser's WebGL is. A test context in software drawing takes seconds of the main thread, so a working answer is kept for every element and every viewer on the page, and the context is let go the moment it has answered. A failure is not kept for the whole page: it is asked again when a context is restored or the page is visible again.

/** What one look at the browser's WebGL said. */
export interface GlProbe {
  /** Whether a WebGL context can be made at all. */
  works: boolean;
  /** Whether the context draws in software (SwiftShader, llvmpipe, softpipe), where smooth edges cost a frame. */
  software: boolean;
}

let answer: GlProbe | null = null;
let asked = 0;
let retryArmed = false;
/** How many looks have failed in a row: the first failure is asked again once after a short wait; a second is kept until a context is restored or the page is shown. */
let failures = 0;
/** How long after a first failed look the second is made (ms): a context that was refused at that moment (the browser's limit on live contexts) is usually given back by then. */
const RETRY_AFTER_MS = 400;
const retryWaiters = new Set<() => void>();

/** How many test contexts this page has made. A working answer stays at 1. A failure asks again after a restore or a shown page. */
export function probeCount(): number {
  return asked;
}

/**
 * Runs `fn` after a failed probe is dropped. The page became visible again, or a WebGL context was restored, and the next `glProbe` will look once more.
 *
 * @param fn - Called after the failed answer is forgotten, before the next look.
 * @returns Stops listening.
 */
export function afterProbeRetry(fn: () => void): () => void {
  retryWaiters.add(fn);
  return () => retryWaiters.delete(fn);
}

function forgetFailure(): void {
  if (!answer || answer.works) return;
  answer = null;
  failures = 0;
  for (const fn of [...retryWaiters]) fn();
}

function armRetry(canvas: HTMLCanvasElement): void {
  if (retryArmed) return;
  retryArmed = true;
  canvas.addEventListener("webglcontextrestored", () => forgetFailure());
  document.addEventListener("webglcontextrestored", () => forgetFailure());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") forgetFailure();
  });
}

/**
 * Says whether WebGL works here and whether it draws in software. The first call makes one test context and releases it at once. A working answer is reused. A first failure is asked again once, shortly after (the elements that fell back are told), since the browser may only have been out of contexts for a moment; a second failure is reused until a context is restored or the page is visible again, and the next call looks once more.
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
    if (!works) armRetry(canvas);
  }
  answer = { works, software };
  if (works) failures = 0;
  else if (++failures === 1 && typeof setTimeout === "function") {
    // the first failure may be a moment's (another page's contexts were in the way): look once more shortly, and tell the elements that fell back
    const timer = setTimeout(() => { if (!answer || answer.works) return; answer = null; for (const fn of [...retryWaiters]) fn(); }, RETRY_AFTER_MS); // (the count stays: a second failure is not asked about again)
    (timer as { unref?: () => void }).unref?.();
  }
  return answer;
}
