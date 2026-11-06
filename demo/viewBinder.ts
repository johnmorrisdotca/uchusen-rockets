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
  stage.dataset.viewStage = "";
  const root = stage.ownerDocument;
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
      } else if (options.overlay) stage.append(bar);
      else stage.insertAdjacentElement("afterend", bar);
    } else spot.append(bar);
  }
  bar.addEventListener("kazoku-viewchange", (event) => {
    const detail = (event as CustomEvent<ViewDetail>).detail;
    if (detail) onView(detail);
  });
  // An inner stage keeps the wheel, so an outer stage does not zoom as well. The bar still calls preventDefault.
  stage.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) event.stopPropagation();
  });
  return bar;
}

/** A flat picture follows the bar: the same move the comparison lineup already uses. */
export function placeZoom(node: HTMLElement, detail: ViewDetail): void {
  const zoom = detail.zoom ?? 1;
  const panX = detail.panX ?? 0;
  const panY = detail.panY ?? 0;
  node.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  node.style.transformOrigin = "center center";
}
