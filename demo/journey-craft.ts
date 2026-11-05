// The craft as the stage draws it: the package's own line drawing of the rocket, and after each burn only the parts that are left, at the scale of the whole rocket. No new drawing: the stages are the rockets' own parts.
import { build } from "../src/build/index.ts";
import { stageOf, type Craft, type Stage } from "../src/journey/index.ts";

const cache = new Map<string, string>();
const frames = new Map<string, ReturnType<ReturnType<typeof build>["boundsOf"]>>();

/** The view a craft is drawn from: the side, or the front for a rocket with boosters on its sides, so that all of its cores show. */
export const viewOf = (craft: Craft): "side" | "front" => (craft.drive === "ballistic" ? craft.launchView : "side");

/**
 * The drawing of a craft at a phase of its trip: what is left of it, fitted to the whole rocket so that nothing changes size.
 * @param craft The craft.
 * @param phase The phase, such as `coast`.
 * @param lit Whether its engines burn.
 * @returns The drawing as SVG text, and the stage it shows.
 */
export function stagedSvg(craft: Craft, phase: string, lit: boolean, onPad = true): { svg: string; stage: Stage } {
  const stage = stageOf(craft, phase, onPad);
  const view = onPad ? viewOf(craft) : "side";
  const key = `${craft.id}:${stage.name}:${view}:${lit}`;
  let svg = cache.get(key);
  if (!svg) {
    let frame = frames.get(craft.id);
    if (!frame) {
      frame = build({ rocket: craft.rocket, variant: craft.variant }).boundsOf("together", true);
      frames.set(craft.id, frame);
    }
    const options = { look: "line", view, engines: lit, frame, ...(stage.slots ? { only: stage.slots } : {}) } as const;
    svg = build({ rocket: stage.rocket, variant: stage.variant }).svg(options).replace("<svg ", '<svg aria-hidden="true" ');
    cache.set(key, svg);
  }
  return { svg, stage };
}
