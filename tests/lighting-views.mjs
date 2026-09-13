// Captures fixed camera views for before/after comparison of lighting work.
//   node tests/lighting-views.mjs before   -> verification/lighting-<view>-before.png
//   node tests/lighting-views.mjs after
import { chromium } from "@playwright/test";
const tag = process.argv[2] || "after";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto((process.env.GAME_URL || "http://localhost:4173") + "/?test=1");
await p.waitForFunction(() => window.__batwing?.ready);
await p.click("#start");
await p.waitForFunction(() => window.__batwing.state.mode === "play");
await p.waitForTimeout(800);
const views = {
  "flight-high": { pos: [120, 260, 520], yaw: 0.25, pitch: -0.28 },
  "flight-street": { pos: [-40, 70, 300], yaw: -0.4, pitch: -0.1 },
  "flight-skyline": { pos: [600, 150, 900], yaw: 0.8, pitch: 0.05 },
};
for (const [name, v] of Object.entries(views)) {
  await p.evaluate((v) => {
    const g = window.__batwing;
    g.flight.position.set(...v.pos);
    g.flight.yaw = v.yaw;
    g.flight.pitch = v.pitch;
    g.flight.speed = 0;
    g.flight.cruise = 35;
  }, v);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `verification/lighting-${name}-${tag}.png` });
}
// Driving view.
await p.evaluate(() => window.__batwing.finish(true));
await p.click("#handover-skip");
await p.waitForFunction(() => window.__batwing.state.mode === "drive");
await p.evaluate(() => {
  const g = window.__batwing.ground;
  g.car.position.set(0, 0.6, 380);
  g.car.yaw = 0;
  g.car.speed = 0;
  for (let i = 0; i < 60; i++) g.update(0.016, 0.016);
  g.phase = "paused";
});
await p.waitForTimeout(600);
await p.screenshot({ path: `verification/lighting-drive-${tag}.png` });
console.log(errors.length ? "ERRORS " + errors.join("; ") : "OK captured " + tag);
await b.close();
