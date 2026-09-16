// Unit coverage for the launch-reveal cancellation predicate. The browser
// scenarios in tests/launch-cancel.mjs prove this fires on the rendered
// camera; these cases pin the mapping from each input source.
import test from "node:test";
import assert from "node:assert/strict";
import { revealCancelled } from "../src/launch-reveal.js";

const idle = { x: 0, y: 0, yaw: 0, roll: 0, throttle: 0, boost: false, fire: false };

test("an idle player never cancels the launch reveal", () => {
  assert.equal(revealCancelled({}, false, idle), false);
  assert.equal(revealCancelled({ KeyD: false, KeyW: false }, false, idle), false);
});

test("keyboard and mouse steering cancel immediately", () => {
  assert.equal(revealCancelled({ KeyW: true }, false, idle), true);
  assert.equal(revealCancelled({ KeyA: true }, false, idle), true);
  assert.equal(revealCancelled({ ShiftLeft: true }, false, idle), true);
  assert.equal(revealCancelled({}, true, idle), true);
});

test("touch-stick steering cancels through the semantic steering axes", () => {
  assert.equal(revealCancelled({}, false, { ...idle, x: 1 }), true);
  assert.equal(revealCancelled({}, false, { ...idle, y: -0.6 }), true);
});

test("touch throttle and buttons cancel through throttle/boost/fire", () => {
  assert.equal(revealCancelled({}, false, { ...idle, throttle: 1 }), true);
  assert.equal(revealCancelled({}, false, { ...idle, boost: true }), true);
  assert.equal(revealCancelled({}, false, { ...idle, fire: true }), true);
});

test("gamepad steering, yaw, roll, throttle, boost and fire all cancel", () => {
  assert.equal(revealCancelled({}, false, { ...idle, x: 0.9 }), true);
  assert.equal(revealCancelled({}, false, { ...idle, yaw: -0.5 }), true);
  assert.equal(revealCancelled({}, false, { ...idle, roll: 1 }), true);
  assert.equal(revealCancelled({}, false, { ...idle, throttle: -1 }), true);
  assert.equal(revealCancelled({}, false, { ...idle, boost: true }), true);
  assert.equal(revealCancelled({}, false, { ...idle, fire: true }), true);
});

test("dead-zoned controls stay at zero and keep the reveal", () => {
  assert.equal(revealCancelled({}, false, idle), false);
});
