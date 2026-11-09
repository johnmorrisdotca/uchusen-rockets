// The one view bar. Every stage hears Ctrl or Command and the wheel through here, and nowhere else.
import "@johnmorrisdotca/kazoku-ui/view-controls/define";

/** What a view change carries. The bar fills the numbers; a page may read only the ones it draws. */
export type ViewDetail = {
  yaw?: number;
  tilt?: number;
  roll?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
  reason?: string;
};

export type BindOptions = {
  /** Where a new bar is added. A stage's own box keeps the rocket's frame. */
  where?: HTMLElement;
  /** Sit over the bottom of the stage, so the page under it does not move. */
  overlay?: boolean;
  flat?: boolean;
  theme?: string;
  controls?: string;
  zoomMin?: string;
  zoomMax?: string;
  testid?: string;
};

/**
 * The one view bar for a stage. It hears Ctrl or Command and the wheel, a pinch, and a drag.
 * A page that already has `<kazoku-view-controls for="the stage">` keeps that bar. A page without one gets one.
 */
export function bindStage(stage: HTMLElement, onView: (detail: ViewDetail) => void, options: BindOptions = {}): HTMLElement {
  if (stage.id === "") throw new Error("a stage needs an id");
  const root = stage.ownerDocument;
  if (stage.dataset.viewStage !== undefined) {
    const ready = root.querySelector(`kazoku-view-controls[for="${stage.id}"]`);
    if (ready instanceof HTMLElement) return ready;
  }
  stage.dataset.viewStage = "";
  if (!stage.hasAttribute("tabindex")) stage.tabIndex = 0;
  const found = root.querySelector(`kazoku-view-controls[for="${stage.id}"]`);
  const bar = found instanceof HTMLElement ? found : root.createElement("kazoku-view-controls");
  if (!(found instanceof HTMLElement)) {
    bar.setAttribute("for", stage.id);
    if (options.flat) bar.setAttribute("flat", "");
    if (options.theme) bar.setAttribute("theme", options.theme);
    bar.setAttribute("controls", options.controls ?? "basic");
    if (options.zoomMin) bar.setAttribute("zoom-min", options.zoomMin);
    if (options.zoomMax) bar.setAttribute("zoom-max", options.zoomMax);
    if (options.testid) bar.dataset.testid = options.testid;
    if (options.overlay) bar.setAttribute("overlay", "");
    const spot = options.where;
    if (options.overlay || spot === undefined) {
      const box = options.overlay ? null : stage.closest(".stage-box");
      if (box instanceof HTMLElement && box !== stage) {
        const hint = [...box.children].find((child) => child.classList.contains("hint"));
        if (hint) box.insertBefore(bar, hint);
        else box.append(bar);
      } else if (options.overlay || stage.shadowRoot === null) stage.append(bar);
      else stage.insertAdjacentElement("afterend", bar);
    } else spot.append(bar);
  }
  // The bar sits on the stage: over it when asked, otherwise directly under it, in the stage's own colour.
  bar.style.margin = "0";
  if (!bar.hasAttribute("overlay")) {
    bar.style.position = "relative";
    bar.style.zIndex = "1";
  }
  const paint = stagePaint(stage);
  if (paint) bar.style.setProperty("--kazoku-surface", paint);
  // The published controls put pan-y back on every change until the view is already zoomed. Put none back after each one.
  const lock = (): void => {
    stage.style.setProperty("touch-action", "none", "important");
  };
  lock();
  stopPageGesture(stage);
  bar.style.setProperty("touch-action", "manipulation", "important");
  stopPageGesture(bar);
  paintControls(bar);
  bar.addEventListener("kazoku-viewchange", (event) => {
    lock();
    const detail = (event as CustomEvent<ViewDetail>).detail;
    if (detail) onView(detail);
  });
  // A stage with no view stage around it keeps the wheel. One drawn inside another lets the event
  // go on, so the outer stage zooms too. The bar still calls preventDefault, so the page does not.
  stage.addEventListener("wheel", (event) => {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) return;
    if (stage.parentElement?.closest("[data-view-stage]")) return;
    event.stopPropagation();
  });
  return bar;
}

/** A colour a reader can see. A gradient's own colour is clear, so a child that is painted counts. */
function stagePaint(stage: HTMLElement): string {
  const own = getComputedStyle(stage).backgroundColor;
  if (painted(own)) return own;
  for (const node of stage.querySelectorAll("uchusen-lineup, uchusen-rocket, canvas")) {
    if (!(node instanceof HTMLElement)) continue;
    const color = getComputedStyle(node).backgroundColor;
    if (painted(color)) return color;
  }
  return "";
}

function painted(color: string): boolean {
  return color !== "" && color !== "transparent" && color !== "rgba(0, 0, 0, 0)";
}

/** Safari's own pinch and double-tap. Stopped on the stage and the bar, never on the page. */
function stopPageGesture(node: HTMLElement): void {
  const stop = (event: Event) => event.preventDefault();
  for (const name of ["gesturestart", "gesturechange", "gestureend"]) node.addEventListener(name, stop, { passive: false });
}

/** The buttons take a tap without zooming the page, and the strip uses the stage colour set on the host. The builder refuses a style tag, so each control is set on its own. */
function paintControls(bar: HTMLElement): void {
  const write = (root: ParentNode): void => {
    for (const node of root.querySelectorAll(".bar, button, input, a, select")) {
      if (!(node instanceof HTMLElement) || node.getRootNode() !== root) continue;
      if (node.classList.contains("bar")) {
        const colour = bar.style.getPropertyValue("--kazoku-surface").trim();
        if (colour) node.style.background = colour;
      } else node.style.setProperty("touch-action", "manipulation");
    }
    for (const node of root.querySelectorAll("*")) if (node.shadowRoot) write(node.shadowRoot);
  };
  const run = (): void => {
    if (bar.shadowRoot) write(bar.shadowRoot);
  };
  run();
  if (bar.shadowRoot) requestAnimationFrame(run);
  bar.addEventListener("kazoku-viewchange", run);
  if (!bar.shadowRoot) void customElements.whenDefined("kazoku-view-controls").then(run);
}

/** A flat picture follows the bar: the same move the comparison lineup already uses. */
export function placeZoom(node: HTMLElement, detail: ViewDetail): void {
  const zoom = detail.zoom ?? 1;
  const panX = detail.panX ?? 0;
  const panY = detail.panY ?? 0;
  node.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  node.style.transformOrigin = "center center";
}
