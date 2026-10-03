import test from "node:test";
import assert from "node:assert/strict";
import {
  RECEIVERS,
  ORIGIN,
  CARRIER,
  WAVE_START,
  SUSPECTS,
  LOCK_DEGREES,
  bearingError,
  signalStrength,
  isLocked,
  originDistrict,
  waveMatch,
  waveLocked,
  fitsClues,
  rejection,
  caveScore,
} from "../src/cave-puzzles.js";
import { RELAY_SITES } from "../src/districts.js";

test("receivers sit on the Chapter I relays and start well off their true bearing", () => {
  assert.equal(RECEIVERS.length, 3);
  RECEIVERS.forEach((r, i) => {
    assert.equal(r.x, RELAY_SITES[i].x);
    assert.equal(r.z, RELAY_SITES[i].z);
    assert.ok(bearingError(r, r.start) > 60);
    assert.ok(signalStrength(r, r.start) < 0.01);
    assert.equal(signalStrength(r, r.truth), 1);
  });
});

test("every true bearing passes through the origin, which lies in The Narrows", () => {
  for (const r of RECEIVERS) {
    const d = Math.hypot(ORIGIN.x - r.x, ORIGIN.z - r.z);
    const x = r.x + Math.cos(r.truth) * d,
      z = r.z + Math.sin(r.truth) * d;
    assert.ok(Math.hypot(x - ORIGIN.x, z - ORIGIN.z) < 1e-6);
  }
  assert.equal(originDistrict(), "THE NARROWS");
});

test("lock tolerance is symmetric and wraps across ±180 degrees", () => {
  const r = RECEIVERS[0],
    step = ((LOCK_DEGREES - 0.1) * Math.PI) / 180;
  assert.ok(isLocked(r, r.truth + step));
  assert.ok(isLocked(r, r.truth - step));
  assert.ok(isLocked(r, r.truth + Math.PI * 2));
  assert.ok(!isLocked(r, r.truth + step * 2));
  assert.ok(signalStrength(r, r.truth + step) > signalStrength(r, r.truth + step * 4));
});

test("carrier match peaks only at the target frequency and phase", () => {
  assert.ok(waveMatch(CARRIER.frequency, CARRIER.phase) > 0.999);
  assert.ok(waveMatch(WAVE_START.frequency, WAVE_START.phase) < 0.7);
  assert.ok(!waveLocked(WAVE_START.frequency, WAVE_START.phase));
  assert.ok(waveLocked(CARRIER.frequency + 0.05, CARRIER.phase - 0.1));
  assert.ok(waveLocked(CARRIER.frequency, CARRIER.phase + Math.PI * 2));
  assert.ok(!waveLocked(CARRIER.frequency + 0.2, CARRIER.phase));
});

test("exactly one suspect fits both clues and every other gets a reason", () => {
  const fits = SUSPECTS.filter(fitsClues);
  assert.equal(fits.length, 1);
  assert.equal(fits[0].id, "kessler");
  for (const s of SUSPECTS.filter((s) => !fitsClues(s))) assert.ok(rejection(s).length > 20);
});

test("score rewards speed and clean deduction without going negative", () => {
  assert.equal(caveScore(60, 0), 2900);
  assert.ok(caveScore(60, 0) > caveScore(120, 0));
  assert.ok(caveScore(60, 0) > caveScore(60, 1));
  assert.ok(caveScore(5000, 3) >= 0);
});
