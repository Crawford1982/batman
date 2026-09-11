import test from "node:test";
import assert from "node:assert/strict";
import { FeedbackQueue } from "../src/feedback.js";
test("damage reactions have an eight-second cooldown and reset", () => {
  const q = new FeedbackQueue();
  assert.equal(q.hit(12, 0), true); assert.equal(q.hit(12, 7999), false);
  assert.equal(q.hit(30, 8000), true); assert.equal(q.amount, 1);
  q.reset(); assert.equal(q.hit(1, 8001), true);
});
test("rewards expire and never exceed four live items", () => {
  const q = new FeedbackQueue();
  for (let i = 0; i < 6; i++) q.reward(String(i), {}, i);
  assert.deepEqual(q.items.map(i => i.text), ["2", "3", "4", "5"]);
  q.reward("fresh", {}, 1300); assert.equal(q.items.length, 1);
});
