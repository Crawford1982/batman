import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } }),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await p.goto((process.env.GAME_URL || "http://localhost:4173") + "/?test=1");
await p.waitForFunction(() => window.__batwing?.ready);
await p.click("#start");
await p.waitForFunction(() => window.__batwing.state.mode === "play");
// Force a real context loss through the WEBGL_lose_context extension.
await p.evaluate(() => {
  const gl = document.getElementById("game").getContext("webgl2");
  window.__lose = gl.getExtension("WEBGL_lose_context");
  window.__lose.loseContext();
});
await p.waitForFunction(() => window.__batwing.state.contextLost);
const lost = await p.evaluate(() => ({
  mode: window.__batwing.state.mode,
  error: document.getElementById("error").hidden,
}));
assert.equal(lost.mode, "paused", "game pauses when the context is lost");
assert.equal(lost.error, false, "message is shown while lost");
await p.evaluate(() => window.__lose.restoreContext());
await p.waitForFunction(() => !window.__batwing.state.contextLost);
await p.waitForTimeout(500);
await p.click("#resume");
await p.waitForFunction(() => window.__batwing.state.mode === "play");
await p.waitForTimeout(1500);
const after = await p.evaluate(() => ({
  error: document.getElementById("error").hidden,
  draws: window.__batwing.state.drawCalls,
}));
assert.equal(after.error, true, "message hidden after restore");
assert.ok(after.draws > 0, "rendering resumed after restore");
assert.deepEqual(errors, []);
console.log("PASS context lost pauses with a message, restore resumes rendering, no errors");
await b.close();
