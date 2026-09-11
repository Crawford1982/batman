import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
try {
  const p = await b.newPage(); const errors = []; p.on("pageerror", e => errors.push(e.message));
  await p.goto("http://localhost:4173/?test=1"); await p.waitForFunction(() => window.__batwing?.ready);
  await p.click("#start-ground"); await p.waitForFunction(() => window.__batwing.state.groundReady); await p.click("#drive-launch");
  await p.evaluate(() => { const g = window.__batwing.ground; g.car.elapsed = 241; g.attackTimer = 99; });
  await p.waitForFunction(() => document.getElementById("drive-time").dataset.clockState === "warning");
  await p.evaluate(() => window.__batwing.ground.car.elapsed = 286);
  await p.waitForFunction(() => document.getElementById("drive-time").dataset.clockState === "critical");
  await p.waitForTimeout(1200);
  assert.ok(await p.evaluate(() => window.__batwing.ground.audio.melody.gain.value < .1));
  await p.click("#drive-pause"); await p.waitForTimeout(1200);
  assert.ok(await p.evaluate(() => window.__batwing.ground.audio.turbineGain.gain.value < .001));
  assert.ok(await p.evaluate(() => window.__batwing.ground.audio.melody.gain.value > .9));
  await p.click("#restart"); await p.waitForFunction(() => document.getElementById("drive-time").dataset.clockState === "normal");
  await p.evaluate(() => { window.__batwing.start(); window.__batwing.step(.001, 587); });
  await p.waitForFunction(() => document.getElementById("timer").dataset.clockState === "critical");
  await p.evaluate(() => window.__batwing.start());
  await p.waitForFunction(() => document.getElementById("timer").dataset.clockState === "normal");
  assert.deepEqual(errors, []); console.log("PASS both mission clocks, critical music duck, paused turbine gating and reset; no browser errors");
} finally { await b.close(); }
