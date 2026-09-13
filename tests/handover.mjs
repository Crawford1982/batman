import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.GAME_URL || "http://localhost:4173";
try {
  for (const scenario of ["normal", "delayed", "retry"]) {
    const page = await browser.newPage({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let held,
      failed = false;
    await page.route(
      (url) => /predator[^/]*\.glb$/.test(url.pathname) && !url.search,
      (route) => route.abort(),
    );
    await page.route(
      (url) => /batmobile[^/]*\.glb$/.test(url.pathname) && !url.search,
      async (route) => {
        if (scenario === "delayed") {
          held = route;
          return;
        }
        if (scenario === "retry" && !failed) {
          failed = true;
          return route.fulfill({ status: 503, body: "Unavailable" });
        }
        await route.continue();
      },
    );
    await page.goto(base + "/?test=1");
    await page.waitForFunction(() => window.__batwing?.ready);
    await page.click("#start");
    await page.click("#skip-briefing");
    await page.evaluate(() => window.__batwing.finish(true));
    if (scenario === "delayed") {
      await page.waitForTimeout(3500);
      assert.ok(await page.locator("#chapter-handover").isVisible());
      assert.ok(
        await page.evaluate(
          () => Number(document.querySelector(".handover-shade").style.opacity) <= 0.55,
        ),
      );
      assert.equal(await page.evaluate(() => window.__batwing.handover.revealed), false);
      assert.ok(held, "vehicle request is pending");
      await held.continue();
    }
    if (scenario === "retry") {
      await page.locator("#handover-retry").waitFor({ state: "visible" });
      await page.click("#handover-retry");
    }
    // Watch the entire transition: do not use the skip button.
    await page.waitForFunction(() => window.__batwing.state.mode === "drive", null, {
      timeout: 45000,
    });
    assert.ok(await page.locator("#drive-hud").isVisible());
    assert.equal(await page.locator("#chapter-handover").isVisible(), false);
    await page.keyboard.down("w");
    await page.waitForFunction(() => window.__batwing.ground.car.speed > 1);
    await page.keyboard.up("w");
    assert.deepEqual(errors, []);
    await page.screenshot({ path: "verification/handover-" + scenario + ".png" });
    await page.close();
    console.log("PASS handover:", scenario, "(optional drone unavailable)");
  }
} finally {
  await browser.close();
}
