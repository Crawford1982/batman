// Chapter III part two browser check: menu entry, intro skip, model load,
// keyboard movement, grapple, takedown, pause, a scripted win and a scripted
// loss through results, the Batcave continue button, and a clean return to
// flight. Set CHROMIUM_PATH to use a local Chromium instead of Edge.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
fs.mkdirSync("verification", { recursive: true });
const base = process.env.GAME_URL || "http://localhost:4173";
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : { channel: "msedge" }),
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const errors = [];
const state = (page) => page.evaluate(() => window.__batwing.state);
const mission = (page, fn) => page.evaluate(`(${fn})(window.__batwing.roof.mission)`);

for (const [tag, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 844, height: 390 }],
]) {
  const page = await browser.newPage({ viewport, hasTouch: tag === "mobile" });
  page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
  page.on(
    "console",
    (m) => m.type() === "warning" && /Operative/.test(m.text()) && errors.push(m.text()),
  );
  await page.goto(base + "/?test=1");
  await page.waitForFunction(() => window.__batwing?.ready, { timeout: 60000 });
  await page.click("#start-roof");
  assert.equal((await state(page)).roofPhase, "intro");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `verification/rooftop-${tag}-intro.png` });
  await page.click("#roof-skip");
  await page.waitForFunction(() => window.__batwing.state.roofPhase === "play");
  const viewDistance = await page.evaluate(() => {
    const r = window.__batwing.roof,
      p = r.mission.player;
    return r.camera.position.distanceTo({
      x: r.origin.x + p.x,
      y: r.mission.playerY() + 1.5,
      z: r.origin.z + p.z,
    });
  });
  assert.ok(viewDistance < 10, "skipping intro enters the close gameplay camera immediately");
  await page.waitForFunction(() => window.__batwing.state.roofModel === "ready", null, {
    timeout: 30000,
  });

  // Keyboard walking moves the player on the start roof.
  const before = await mission(page, (m) => ({ ...m.player }));
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyW");
  const after = await mission(page, (m) => ({ ...m.player }));
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 1, "W walks forward");
  await page.screenshot({ path: `verification/rooftop-${tag}-play.png` });

  // Pause freezes the purge clock.
  await page.keyboard.press("Escape");
  assert.equal((await state(page)).mode, "roofPaused");
  const pausedAt = await mission(page, (m) => m.time);
  await page.waitForTimeout(400);
  assert.equal(await mission(page, (m) => m.time), pausedAt);
  await page.click("#resume");
  assert.equal((await state(page)).mode, "roof");

  // Grapple from the east edge of the tenement to the laundry roof.
  await mission(page, (m) => Object.assign(m.player, { x: 10, z: -2, facing: 0 }));
  await page.evaluate(() => (window.__batwing.roof.yaw = 0));
  await page.waitForTimeout(100);
  assert.match(await page.locator("#roof-prompt").innerText(), /GRAPPLE/);
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  await page.screenshot({ path: `verification/rooftop-${tag}-grapple.png` });
  await page.waitForFunction(() => window.__batwing.roof.mission.player.roof === "laundry", null, {
    timeout: 5000,
  });

  // Sneak up behind the laundry guard and stun it.
  await mission(page, (m) => {
    const g = m.guards[0];
    g.wait = 99;
    m.player.roof = g.roof;
    m.player.x = g.x - Math.cos(g.facing) * 1.3;
    m.player.z = g.z - Math.sin(g.facing) * 1.3;
  });
  await page.waitForTimeout(100);
  assert.match(await page.locator("#roof-prompt").innerText(), /TAKEDOWN/);
  await page.keyboard.press("KeyE");
  await page.waitForFunction(() => window.__batwing.roof.mission.guards[0].state === "down");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `verification/rooftop-${tag}-takedown.png` });

  // Scripted win: objectives completed, then walk onto the pad for real.
  await mission(page, (m) => {
    for (const u of m.uplinks) u.done = true;
    m.terminal.done = true;
    m.stage = "extract";
    for (const g of m.guards) g.state = "down";
    const x = m.layout.extraction;
    Object.assign(m.player, { roof: x.roof, x: x.x - 4, z: x.z, facing: 0, zip: null });
  });
  await page.evaluate(() => (window.__batwing.roof.yaw = 0));
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.__batwing.roof.phase === "ended", null, {
    timeout: 8000,
  });
  await page.keyboard.up("KeyW");
  let results = await page.locator("#chapter-results").innerText();
  assert.match(results, /COMPLETE/);
  assert.match(results, /1 stunned/);
  assert.doesNotMatch(results, /ARMOR/);
  assert.match(await page.locator("#pause-title").innerText(), /Silent Bell is over/);
  assert.match(await page.locator("#pause-copy").innerText(), /Gordon has the flight log/);
  await page.screenshot({ path: `verification/rooftop-${tag}-results.png` });

  // Restart, then lose to three alarms.
  // Restart skips the intro, like the other chapters.
  await page.click("#restart");
  await page.waitForFunction(() => window.__batwing.state.roofPhase === "play");
  assert.equal(await mission(page, (m) => m.alarms), 0);
  await mission(page, (m) => (m.alarms = 2));
  await mission(page, (m) => {
    const g = m.guards[0];
    g.wait = 99;
    Object.assign(m.player, {
      roof: g.roof,
      x: g.x + Math.cos(g.facing) * 5,
      z: g.z + Math.sin(g.facing) * 5,
    });
  });
  await page.waitForFunction(() => window.__batwing.roof.phase === "ended", null, {
    timeout: 8000,
  });
  results = await page.locator("#chapter-results").innerText();
  assert.match(results, /INTERRUPTED/);
  assert.match(await page.locator("#pause-copy").innerText(), /purged/);

  // The Batcave's results now continue into the rooftops.
  await page.click("#exit");
  assert.equal((await state(page)).roofPhase, "off");
  await page.evaluate(() => {
    const cave = window.__batwing.cave;
    window.__batwing.beginCave();
    cave.skip();
    cave.found = { name: "KESSLER COLD STORAGE" };
    cave.finish();
  });
  assert.match(await page.locator("#next-level").innerText(), /KESSLER ROOFTOPS/);
  await page.click("#next-level");
  assert.equal((await state(page)).roofPhase, "intro");
  await page.click("#roof-skip");
  await page.keyboard.press("Escape");

  await page.click("#exit");
  await page.click("#start");
  await page.click("#skip-briefing");
  await page.waitForFunction(() => window.__batwing.state.mode === "play");
  assert.equal((await state(page)).roofPhase, "off");
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log("Chapter III part two browser checks passed");
