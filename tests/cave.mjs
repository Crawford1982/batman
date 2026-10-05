// Chapter III browser check: intro skip, all three Batcomputer stages through
// the real UI, a wrong deduction penalty, results, pause, exit and a clean
// return to flight. Set CHROMIUM_PATH to use a local Chromium instead of Edge.
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

for (const [tag, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 844, height: 390 }],
]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: process.env.CI ? 0.5 : 1 });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
  await page.goto(base + "/?test=1");
  await page.waitForFunction(() => window.__batwing?.ready, { timeout: 60000 });
  if (process.env.CI) await page.selectOption("#quality", "low");
  await page.click("#start-cave");
  assert.equal((await state(page)).cavePhase, "intro");
  await page.evaluate(() => {
    const b = document.getElementById("cave-skip");
    if (!b.hidden) b.click();
  });
  await page.waitForFunction(() => window.__batwing.state.cavePhase === "play");

  await page.keyboard.press("Escape");
  assert.equal((await state(page)).mode, "cavePaused");
  const pausedAt = await page.evaluate(() => window.__batwing.cave.time);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => window.__batwing.cave.time), pausedAt);
  await page.click("#resume");
  assert.equal((await state(page)).mode, "cave");

  const box = await page.locator("#cave-map").boundingBox();
  const ox = box.x + ((-1180 + 1800) / 3700) * box.width,
    oy = box.y + ((820 + 1500) / 3000) * box.height;
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Digit" + (i + 1));
    await page.mouse.move(ox + 60, oy - 40);
    await page.mouse.down();
    await page.mouse.move(ox, oy, { steps: 4 });
    await page.waitForFunction((n) => window.__batwing.cave.locked[n], i, { timeout: 20000 });
    await page.mouse.up();
  }
  await page.waitForFunction(() => window.__batwing.state.caveStage === "decrypt");
  await page.screenshot({ path: `verification/cave-${tag}-decrypt.png` });

  for (const [id, v] of [
    ["#cave-freq", 3.62],
    ["#cave-phase", 2.25],
  ])
    await page.locator(id).evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, v);
  await page.waitForFunction(() => window.__batwing.state.caveStage === "identify", {
    timeout: 20000,
  });

  const wrong = page.locator("#cave-suspects button").nth(0);
  await wrong.click();
  assert.ok(await wrong.isDisabled(), "a wrong suspect is struck off");
  assert.equal(await page.evaluate(() => window.__batwing.cave.penalty), 20);
  await page.screenshot({ path: `verification/cave-${tag}-identify.png` });
  await page.locator("#cave-suspects button").nth(3).click();
  assert.equal((await state(page)).cavePhase, "reveal");
  await page.evaluate(() => {
    const b = document.getElementById("cave-skip");
    if (!b.hidden) b.click();
  });
  await page.waitForFunction(() => window.__batwing.state.cavePhase === "ended");
  const results = await page.locator("#chapter-results").innerText();
  assert.match(results, /KESSLER COLD STORAGE/);
  assert.match(results, /1 wrong call/);
  assert.doesNotMatch(results, /ARMOR/);
  await page.screenshot({ path: `verification/cave-${tag}-results.png` });

  await page.click("#next-level");
  await page.waitForFunction(() => window.__batwing.state.mode.startsWith("roof"));
  await page.click("#roof-skip");
  await page.waitForFunction(() => window.__batwing.state.roofPhase === "play");
  await page.keyboard.press("Escape");
  await page.click("#exit");
  assert.equal((await state(page)).cavePhase, "off");
  await page.click("#start");
  await page.click("#skip-briefing");
  await page.waitForFunction(() => window.__batwing.state.mode === "play");
  assert.equal(await page.evaluate(() => window.__batwing.camera.view?.enabled ?? false), false);
  await page.close();
}
await browser.close();
assert.deepEqual(errors, []);
console.log("Chapter III browser checks passed");
