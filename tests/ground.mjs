import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [];
p.on("response", (r) => {
  if (r.status() >= 400) console.log("HTTP", r.status(), r.url());
});
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await p.goto((process.env.GAME_URL || "http://localhost:4173") + "/?test=1");
await p.waitForFunction(() => window.__batwing?.ready);
await p.click("#start-ground");
await p.waitForFunction(
  () => window.__batwing.groundReady || window.__batwing.state.groundReady,
);
await p.waitForTimeout(700);
await p.screenshot({ path: "verification/ground-briefing.png" });
await p.click("#drive-launch");
await p.keyboard.down("w");
await p.waitForFunction(() => window.__batwing.state.groundPosition[2] < 430);
await p.keyboard.up("w");
console.log(
  "FIRST DRIVE",
  await p.evaluate(() => window.__batwing.state),
  errors,
);
await p.screenshot({ path: "verification/ground-driving.png" });
assert.ok(
  (await p.evaluate(() => window.__batwing.state)).groundPosition[2] < 440,
);
await p.screenshot({ path: "verification/ground-driving.png" });
await p.keyboard.press("Escape");
assert.equal(
  (await p.evaluate(() => window.__batwing.state)).mode,
  "drivePaused",
);
const elapsed = await p.evaluate(() => window.__batwing.ground.car.elapsed);
await p.waitForTimeout(300);
assert.equal(
  await p.evaluate(() => window.__batwing.ground.car.elapsed),
  elapsed,
);
await p.click("#resume");
await p.keyboard.press("f");
assert.ok(await p.evaluate(() => window.__batwing.ground.car.emp > 0));
await p.evaluate(() => {
  const g = window.__batwing.ground;
  g.car.health = 0;
  g.update(0.016);
});
assert.equal(
  (await p.evaluate(() => window.__batwing.state)).mode,
  "driveEnded",
);
await p.click("#restart");
assert.equal(
  (await p.evaluate(() => window.__batwing.state)).groundHealth,
  100,
);
await p.evaluate(() => {
  const g = window.__batwing.ground;
  for (const goal of g.checkpoints) {
    g.car.position.set(goal.x, 0.6, goal.z);
    g.car.speed = 0;
    g.update(0.016);
  }
});
assert.equal(
  await p.locator("#pause-title").textContent(),
  "Gotham is back online.",
);
await p.click("#exit");
assert.ok(await p.locator("#menu").isVisible());
await p.click("#start");
await p.click("#skip-briefing");
assert.equal((await p.evaluate(() => window.__batwing.state)).mode, "play");
await p.evaluate(() => window.__batwing.finish(true));
await p.click("#next-level");
await p.click("#drive-launch");
assert.equal((await p.evaluate(() => window.__batwing.state)).mode, "drive");
console.log(
  "DESKTOP",
  JSON.stringify(await p.evaluate(() => window.__batwing.state)),
);
const m = await b.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
m.on("pageerror", (e) => errors.push(e.message));
await m.goto((process.env.GAME_URL || "http://localhost:4173") + "/?test=1");
await m.waitForFunction(() => window.__batwing?.ready);
await m.locator("#start-ground").tap();
await m.waitForFunction(() => window.__batwing.state.groundReady);
await m.screenshot({ path: "verification/ground-mobile-briefing.png" });
await m.locator("#drive-launch").tap();
const box = await m.locator('[data-drive="accel"]').boundingBox();
const stick = await m.locator('#drive-stick').boundingBox();
const cdp = await m.context().newCDPSession(m);
const gas={id:1,x:box.x+box.width/2,y:box.y+box.height/2};
const steering={id:2,x:stick.x+stick.width*.75,y:stick.y+stick.height/2};
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[gas,steering]});
await m.waitForTimeout(500);
assert.ok(await m.evaluate(() => window.__batwing.ground.car.speed > 1));
assert.ok(await m.evaluate(() => window.__batwing.ground.car.steer > .1));
await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
assert.ok(await m.evaluate(() => !window.__batwing.ground.touch.accel && !window.__batwing.ground.touch.steering));
assert.ok(await m.locator('#drive-map').isVisible());
assert.ok(await m.locator('#drive-turn').isVisible());
await m.screenshot({ path: "verification/ground-mobile.png" });
assert.deepEqual(errors, []);
await b.close();
console.log(
  "PASS: car asset, keyboard driving, touch gas, EMP, pause, loss, restart, victory, chapter transition, flight return, no browser errors",
);
