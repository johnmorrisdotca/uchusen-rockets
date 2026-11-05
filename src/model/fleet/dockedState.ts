// Which craft a build is mating to the ports, while that build's pieces are made. `null` means the caller did not ask, so a ship keeps the visitors it already draws. A string, including an empty one, is the choice. `build` sets it and puts it back.
export const dockedNow: { spec: string | null } = { spec: null };
