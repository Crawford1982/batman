// Screenshots the Chapter I launch reveal at several points, and asserts it
// hands off cleanly to the normal chase camera with no runtime errors.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await p.goto((process.env.GAME_URL || "http://localhost:4173") + "/?test=1");
await p.waitForFunction(() => window.__batwing?.ready);
await p.click("#start");
await p.waitForFunction(() => window.__batwing.state.mode === "play");
const shots = [0, 0.4, 1.3, 2.2, 3.2];
let last = 0;
for (const at of shots) {
  await p.waitForTimeout((at - last) * 1000);
  last = at;
  await p.screenshot({ path: `verification/launch-reveal-${at.toFixed(1)}s.png` });
}
// Reduced motion should skip straight to the normal chase distance.
await p.emulateMedia({ reducedMotion: "reduce" });
await p.evaluate(() => window.__batwing.start());
await p.waitForFunction(() => window.__batwing.state.mode === "play");
await p.waitForTimeout(50);
const distReduced = await p.evaluate(() => {
  const g = window.__batwing;
  return g.camera.position.distanceTo(g.flight.position);
});
assert.ok(distReduced < 45, `reduced motion should start near the chase distance, got ${distReduced}`);
assert.deepEqual(errors, []);
console.log("PASS launch reveal captured, reduced motion skips it, no errors");
await b.close();
