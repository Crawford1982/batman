import test from "node:test";
import assert from "node:assert/strict";
import { turbineTargets, clockState } from "../src/audio.js";
test("turbine targets rise monotonically and clamp speed", () => {
  let last = turbineTargets(0);
  for (let s = 1; s <= 70; s++) {
    const next = turbineTargets(s); assert.ok(next.frequency > last.frequency); assert.ok(next.cutoff > last.cutoff); last = next;
  }
  assert.deepEqual(turbineTargets(700), last); assert.deepEqual(turbineTargets(-35), turbineTargets(35));
});
test("mission clock uses strict warning boundaries", () => {
  for (const [seconds, expected] of [[Infinity,"normal"],[60,"normal"],[59,"warning"],[15,"warning"],[14,"critical"],[0,"critical"]]) assert.equal(clockState(seconds), expected);
});
