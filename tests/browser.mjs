import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
fs.mkdirSync("verification", { recursive: true });
const base = process.env.GAME_URL || "http://localhost:4173";
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base + "/?test=1");
await page.waitForFunction(() => window.__batwing?.ready, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "verification/menu.png" });
await page.click("#start");
await page.waitForTimeout(800);
assert.equal(
  (await page.evaluate(() => window.__batwing.state)).mode,
  "briefing",
);
await page.screenshot({ path: "verification/briefing-docks.png" });
await page.evaluate(() => window.__batwing.step(9));
await page.waitForTimeout(850);
await page.screenshot({ path: "verification/briefing-cathedral.png" });
await page.click("#skip-briefing");
await page.waitForFunction(()=>window.__batwing.state.elapsed>1.1);
let s = await page.evaluate(() => window.__batwing.state);
assert.equal(s.mode, "play");
assert.ok(s.elapsed > 1);
assert.ok(s.enemies >= 4);
assert.ok(s.position.every(Number.isFinite));
await page.screenshot({ path: "verification/flight.png" });
await page.keyboard.press("Escape");
s = await page.evaluate(() => window.__batwing.state);
assert.equal(s.mode, "paused");
const before = s.elapsed;
await page.waitForTimeout(400);
assert.equal(
  (await page.evaluate(() => window.__batwing.state)).elapsed,
  before,
);
await page.click("#resume");
await page.evaluate(() => {
  const g = window.__batwing,
    b = g.world.buildings[0];
  g.flight.position.set(b.x, b.h / 2, b.z);
  g.flight.invulnerable = 0;
  g.step(0.016);
});
s = await page.evaluate(() => window.__batwing.state);
assert.equal(s.health, 92);
await page.evaluate(() => {
  const g = window.__batwing;
  g.flight.reset();
  g.spawn();
  g.enemies[0].mesh.position
    .copy(g.flight.position)
    .addScaledVector(g.flight.forward, 90);
  g.step(0.016);
  g.shoot(true);
  for (let i = 0; i < 70; i++) g.step(0.016);
});
s = await page.evaluate(() => window.__batwing.state);
assert.ok(s.kills >= 1, "missile destroys target");
await page.evaluate(() => {
  const g = window.__batwing;
  g.start();
  window.__testPad = {
    axes: [0.7, -0.4, 0.2],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    mapping: "standard",
  };
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => [window.__testPad],
  });
});
await page.waitForFunction(() => window.__batwing.flight.yaw < -0.1);
await page.evaluate(() => {
  window.__testPad.axes = [0, 0, 0];
  window.__testPad.buttons[7].pressed = true;
});
await page.waitForTimeout(350);
assert.ok(
  (await page.evaluate(() => window.__batwing.state)).shots > 0,
  "controller fires",
);
await page.evaluate(() => {
  window.__testPad.buttons[7].pressed = false;
  for (const r of window.__batwing.mission.relays) {
    r.hp = 0;
    r.mesh.visible = false;
  }
  window.__batwing.step(1200);
});
assert.equal(
  await page.locator("#pause-title").textContent(),
  "The night is yours.",
);
await page.click("#restart");
assert.equal((await page.evaluate(() => window.__batwing.state)).kills, 0);
await page.evaluate(() => {
  const g = window.__batwing;
  g.start();
  const r = g.mission.relays[0];
  for (let n = 0; n < 3; n++) {
    g.flight.reset();
    r.mesh.position
      .copy(g.flight.position)
      .addScaledVector(g.flight.forward, 90);
    g.step(0.016);
    g.shoot(true);
    for (let i = 0; i < 220; i++) g.step(0.016);
  }
});
assert.equal(
  (await page.evaluate(() => window.__batwing.state)).relays,
  1,
  "missiles disable a relay",
);
await page.evaluate(() => {
  const g = window.__batwing;
  g.start();
  g.spawnBomber(g.mission.relays[0]);
  const b = g.enemies.find((e) => e.kind === "bomber");
  b.mesh.position.copy(b.destination);
  g.step(0.016);
});
assert.equal(
  (await page.evaluate(() => window.__batwing.state)).city,
  90,
  "bomber impact damages city",
);
await page.evaluate(() => {
  const g = window.__batwing;
  g.mission.city = 0;
  g.step(0.016);
});
assert.equal(
  (await page.evaluate(() => window.__batwing.state)).mode,
  "ended",
  "city collapse loses mission",
);
await page.click("#restart");
await page.waitForTimeout(5000);
console.log(
  "DESKTOP",
  JSON.stringify(await page.evaluate(() => window.__batwing.state)),
);
const mobile = await browser.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto(base + "/?test=1");
await mobile.waitForFunction(() => window.__batwing?.ready);
await mobile.locator("#start").tap();
await mobile.waitForTimeout(850);
await mobile.screenshot({ path: "verification/briefing-mobile.png" });
await mobile.locator("#skip-briefing").tap();
await mobile.waitForTimeout(1200);
assert.ok(await mobile.locator("#stick").isVisible());
const stickBox = await mobile.locator("#stick").boundingBox();
await mobile.mouse.move(
  stickBox.x + stickBox.width * 0.8,
  stickBox.y + stickBox.height * 0.4,
);
await mobile.mouse.down();
await mobile.waitForTimeout(300);
await mobile.mouse.up();
const fireBox = await mobile.locator('[data-hold="fire"]').boundingBox();
await mobile.mouse.move(fireBox.x + 20, fireBox.y + 20);
await mobile.mouse.down();
await mobile.waitForTimeout(200);
await mobile.mouse.up();
await mobile.screenshot({ path: "verification/mobile.png" });
console.log(
  "MOBILE",
  JSON.stringify(await mobile.evaluate(() => window.__batwing.state)),
);
assert.deepEqual(errors, []);
await browser.close();
console.log(
  "PASS: model, rendering, flight, collision, missile combat, timer, pause, restart, mobile, no runtime errors.",
);
