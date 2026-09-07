import { test } from "node:test";
import assert from "node:assert/strict";
import { Scene, Vector3 } from "three";
import { Mission } from "../src/mission.js";
import { Flight, insideBuilding } from "../src/flight.js";
import { districtAt, reservedPlot } from "../src/districts.js";

test("destroying relays slows raids and reset restores the mission", () => {
  const m = new Mission(new Scene());
  assert.equal(m.remaining.length, 3);
  m.relays[0].hp = 0;
  assert.equal(m.disabled, 1);
  assert.ok(m.update(56, 56));
  assert.ok(m.nextRaid > 95);
  for (let i = 0; i < 10; i++) m.impact();
  assert.equal(m.city, 0);
  m.reset();
  assert.equal(m.city, 100);
  assert.equal(m.disabled, 0);
});
test("the nearest-to-impact bomber takes priority over relay objectives", () => {
  const m = new Mission(new Scene());
  const slow = {
    kind: "bomber",
    mesh: { position: new Vector3(0, 0, 500) },
    destination: new Vector3(),
  };
  const urgent = {
    kind: "bomber",
    mesh: { position: new Vector3(0, 0, 50) },
    destination: new Vector3(),
  };
  assert.equal(m.objective(new Vector3(), [slow, urgent]), urgent);
});
test("river and landmark plots exclude random skyscrapers", () => {
  assert.ok(reservedPlot(720, 400));
  assert.ok(reservedPlot(-1100, -1000));
  assert.equal(districtAt(-1100, -1000), "OLD GOTHAM");
  assert.equal(districtAt(1420, 1050), "TRICORNER DOCKS");
});
test("boost release decelerates gradually and collision avoids a roof teleport", () => {
  const f = new Flight();
  for (let i = 0; i < 300; i++) f.update(1 / 60, { boost: true });
  const before = f.speed;
  f.update(1 / 60, {});
  assert.ok(f.speed > 130);
  assert.ok(f.speed < before);
  f.position.set(14, 40, 0);
  f.recoverFrom({ x: 0, z: 0, w: 30, d: 40, h: 200 });
  assert.equal(f.position.y, 40);
  assert.ok(f.position.x > 20);
});
test("bridge deck collision allows flight below the elevated span", () => {
  const b = { x: 0, z: 0, w: 100, d: 40, h: 29, bottom: 19 };
  assert.ok(!insideBuilding(new Vector3(0, 8, 0), b));
  assert.ok(insideBuilding(new Vector3(0, 25, 0), b));
});
