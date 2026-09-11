import { test } from "node:test";
import assert from "node:assert/strict";
import { frameStep, FpsSampler, nextPixelRatio, STALL_CAP } from "../src/frame-clock.js";
import { Driving } from "../src/driving.js";

test("a stalled frame caps wall-clock time so the mission timer cannot outrun physics", () => {
  const steady = frameStep(1 / 60);
  assert.equal(steady.stalled, false);
  assert.equal(steady.wallDt, 1 / 60);
  const stall = frameStep(2);
  assert.equal(stall.stalled, true);
  assert.equal(stall.wallDt, STALL_CAP);
  assert.equal(stall.dt, 0.05);
  assert.equal(frameStep(-1).wallDt, 0);
  const car = new Driving();
  car.update(stall.wallDt, { accel: 1 }, [], true, stall.wallDt);
  assert.equal(car.elapsed, STALL_CAP);
});

test("fps sampler discards windows containing a stall", () => {
  const s = new FpsSampler(1);
  for (let i = 0; i < 59; i++) assert.equal(s.push(1 / 60), null);
  const fps = s.push(1 / 60);
  assert.ok(Math.abs(fps - 60) < 1e-6);
  for (let i = 0; i < 30; i++) s.push(1 / 60);
  assert.equal(s.push(2, true), null);
  assert.equal(s.frames, 0);
  for (let i = 0; i < 59; i++) s.push(1 / 60);
  assert.ok(s.push(1 / 60) > 59);
});

test("pixel ratio steps down under load and ratchets back with headroom", () => {
  let ratio = 1;
  for (let i = 0; i < 10; i++) ratio = nextPixelRatio(ratio, 20);
  assert.equal(ratio, 0.6);
  assert.equal(nextPixelRatio(ratio, 40), ratio);
  for (let i = 0; i < 20; i++) ratio = nextPixelRatio(ratio, 60);
  assert.ok(Math.abs(ratio - 1) < 1e-9);
  assert.equal(nextPixelRatio(1, 60, { ceil: 1 }), 1);
});
