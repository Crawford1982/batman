import { test } from "node:test";
import assert from "node:assert/strict";
import { Flight, insideBuilding, segmentDistance } from "../src/flight.js";
import { Vector3 } from "three";
test("neutral flight moves forward and stays finite", () => {
  const f = new Flight();
  for (let i = 0; i < 600; i++) f.update(1 / 60, {});
  assert.ok(f.position.z < 0);
  assert.equal(f.position.y, 155);
  assert.ok(Number.isFinite(f.quaternion.w));
});
test("all input axes and speed bounds", () => {
  const f = new Flight();
  for (let i = 0; i < 3600; i++)
    f.update(1 / 60, { x: 1, y: 1, roll: 1, yaw: 1, boost: true, throttle: 1 });
  assert.ok(f.speed <= 146);
  assert.ok(f.position.y <= 480);
  assert.ok(f.position.y >= 16);
  assert.ok(f.yaw < 0);
});
test("collision and damage immunity", () => {
  assert.ok(
    insideBuilding(new Vector3(0, 10, 0), { x: 0, z: 0, w: 20, d: 20, h: 50 }),
  );
  assert.ok(
    !insideBuilding(new Vector3(0, 100, 0), {
      x: 0,
      z: 0,
      w: 20,
      d: 20,
      h: 50,
    }),
  );
  const f = new Flight();
  f.damage(12);
  f.damage(12);
  assert.equal(f.health, 88);
});
test("swept projectile hit detection", () => {
  assert.equal(
    segmentDistance(
      new Vector3(0, 0, -5),
      new Vector3(),
      new Vector3(0, 0, -10),
    ),
    0,
  );
});
