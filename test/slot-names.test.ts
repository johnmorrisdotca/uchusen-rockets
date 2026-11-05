// A part chip says a name, never a raw id such as "drive-collar": every slot of every variant the demo lists has a proper name.
import assert from "node:assert/strict";
import { test } from "node:test";
import { isListed } from "../demo/listed.ts";
import { ROCKETS, SLOT_NAMES } from "../src/index.ts";

test("every slot of every listed variant has a name that is not its own id", () => {
  for (const rocket of Object.values(ROCKETS).filter((one) => isListed(one.id)))
    for (const variant of rocket.variants)
      for (const slot of variant.slots) {
        const name = SLOT_NAMES[slot];
        assert.ok(name, `${rocket.id} ${variant.id}: ${slot} has no name`);
        assert.notEqual(name, slot);
        assert.ok(/^[A-Z0-9]/.test(name), `${slot}: "${name}"`);
      }
});
