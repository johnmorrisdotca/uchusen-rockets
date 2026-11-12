// Juno. The span and the body are from the mission page, the arrays' own size from the deployment-test caption, both read 2026-11-12.
import { type Figure, type Variant } from "./types.ts";

const S = "nasa-juno" as const;

/** The solar arrays' overall span, the dimension the painted model is scaled to. */
export const JUNO_SPAN: Figure = { value: 20, source: S, note: "The mission page says the arrays give an overall width exceeding 66 feet (20 m)." };

export const JUNO_VARIANTS: readonly Variant[] = [
  {
    id: "juno",
    rocket: "juno",
    name: "Juno",
    status: "flown",
    firstFlight: { value: "2011-08-05", source: S, note: "From Cape Canaveral." },
    slots: ["craft"],
    note: "NASA's model in the painted look, scaled so the arrays' tip-to-tip is the sourced 20 m; at that scale the file stands 6.89 m, the antenna above the body. This package's own plain shape in the line looks, from the sourced body, span and array width. The antenna is drawn 3.46 m across, which is the model at that span; no source read here gives its diameter. No mark was on the model, and none is drawn.",
    facts: {
      height: { value: 3.5, source: S, note: "The hexagonal body is about 3.5 m high and wide. NASA's model at the 20 m span stands 6.89 m." },
      diameter: JUNO_SPAN,
      parts: { craft: { value: 3.5, source: S, note: "The body's height, about 3.5 m." } },
      engines: {},
      more: {},
      sizes: {
        Span: JUNO_SPAN,
        "Array length": { value: 8.9, source: "nasa-juno-arrays", note: "8.9 m long and 2.65 m wide. The mission page says each array extends about 9 m from the body. The line drawing reaches the 20 m span, so each array is drawn 9.8 m from the body." },
        "Array width": { value: 2.65, source: "nasa-juno-arrays", note: "2.65 m." },
      },
    },
  },
];
