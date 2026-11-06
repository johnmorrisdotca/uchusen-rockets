// Which craft a build is mating to the ports, while that build's pieces are made. `null` means the caller did not ask, so a ship keeps the visitors it already draws. A string, including an empty one, is the choice. `build` sets it and puts it back.
import type { Piece } from "../pieces.ts";

export const dockedNow: { spec: string | null } = { spec: null };

/** Filled by the docking module once it has loaded, so a ship can ask for its chosen craft without a cycle. */
export let visitorsOf: (rocket: string) => Piece[] = () => [];

export function setVisitors(fn: (rocket: string) => Piece[]): void {
  visitorsOf = fn;
}
