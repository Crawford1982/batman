// Regression coverage for the Chapter I launch reveal cancellation.
//
// The 2.6s establishing pull-in must survive while the player is idle and must
// be skipped the moment any real control is used: keyboard, mouse steering,
// mouse cannon fire, the actual touch stick (real pointer events, not a
// synthetic flag), the touch throttle buttons, and every gamepad axis/button.
// A gamepad that is connected but only drifting inside the 0.13 deadzone must
// NOT cancel it.
//
// Assertions are behavioural: they watch the rendered camera distance to the
// ship (wide establishing ~186 units vs tight chase ~30 units), so they do not
// just restate the source condition. The margins are kept wide so a cancel and
// a natural completion stay distinguishable at ordinary frame rates; the
// wall-clock waits below are a guide, not an fps-independent guarantee.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const base = process.env.GAME_URL || "http://localhost:4173";
const REVEAL_MIN = 120; // establishing camera is ~186 units from the ship
const CHASE_MAX = 60; // tight chase camera is ~30 units from the ship
const SKIP_MS = 1600; // idle reveal has likely not converged here; a skipped one has

const browser = await chromium.launch({ channel: "msedge", headless: true });
const errors = [];

async function open({ mobile = false, pad = null } = {}) {
  const page = await browser.newPage({
    viewport: mobile ? { width: 844, height: 390 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  if (pad)
    await page.addInitScript((axes) => {
      const state = {
        axes,
        buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
      };
      window.__mockPad = state;
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => [
          {
            index: 0,
            connected: true,
            id: "Mock Gamepad",
            mapping: "standard",
            get axes() {
              return state.axes;
            },
            get buttons() {
              return state.buttons;
            },
          },
        ],
      });
    }, pad);
  await page.goto(base + "/?test=1", { timeout: 90000 });
  await page.waitForFunction(() => window.__batwing?.ready);
  return page;
}

const startPlay = async (page) => {
  await page.evaluate(() => window.__batwing.start());
  await page.waitForFunction(() => window.__batwing.state.mode === "play");
  await page.waitForFunction(
    (min) => {
      const g = window.__batwing;
      return g.camera.position.distanceTo(g.flight.position) > min;
    },
    REVEAL_MIN,
    { timeout: 5000 },
  );
};

const camDist = (page) =>
  page.evaluate(() => {
    const g = window.__batwing;
    return g.camera.position.distanceTo(g.flight.position);
  });

const skipped = async (page, label) => {
  await page.waitForTimeout(SKIP_MS);
  const d = await camDist(page);
  assert.ok(
    d < CHASE_MAX,
    `${label}: reveal should be skipped, camera still ${d.toFixed(0)} units`,
  );
  return d;
};

const canvasPoint = (page) =>
  page.evaluate(() => {
    for (let y = 200; y <= 700; y += 50)
      for (let x = 200; x <= 1240; x += 80)
        if (document.elementFromPoint(x, y)?.id === "game") return { x, y };
    return null;
  });

try {
  // 1. Idle player keeps the wide establishing reveal. Evidence is captured
  //    after the timing assertions so the screenshot cannot skew them.
  const idle = await open();
  await startPlay(idle);
  await idle.waitForTimeout(900);
  const held = await camDist(idle);
  assert.ok(held > REVEAL_MIN, `idle reveal should still be wide, got ${held.toFixed(0)}`);
  await idle.waitForTimeout(SKIP_MS - 900);
  const notConverged = await camDist(idle);
  assert.ok(
    notConverged > CHASE_MAX,
    `control: an idle reveal must not have converged by ${SKIP_MS}ms, got ${notConverged.toFixed(0)}`,
  );
  await idle.screenshot({ path: "verification/launch-cancel-idle.png" });
  await idle.close();

  // 2. Keyboard.
  const kb = await open();
  await startPlay(kb);
  await kb.keyboard.down("d");
  await skipped(kb, "keyboard");
  await kb.keyboard.up("d");
  await kb.close();

  // 3. Real touch-stick steering via trusted touch pointer events.
  const touch = await open({ mobile: true });
  await startPlay(touch);
  assert.ok(
    await touch.locator("#stick").isVisible(),
    "touch stick should be visible on coarse pointer",
  );
  const box = await touch.locator("#stick").boundingBox();
  assert.ok(box, "touch stick should have a layout box");
  const cdp = await touch.context().newCDPSession(touch);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x: cx, y: cy }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x: cx + box.width * 0.4, y: cy }],
  });
  await skipped(touch, "touch stick");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await touch.close();

  // 4. Mocked gamepad steering (left stick X). Start neutral so the wide reveal
  //    is confirmed first, then inject the axis to prove it is what cancels.
  const padSteer = await open({ pad: [0, 0, 0, 0] });
  await startPlay(padSteer);
  await padSteer.evaluate(() => {
    window.__mockPad.axes = [0.9, 0, 0, 0];
  });
  await skipped(padSteer, "gamepad steering");
  await padSteer.close();

  // 5. Mocked gamepad action (button 6 = boost).
  const padBtn = await open({ pad: [0, 0, 0, 0] });
  await startPlay(padBtn);
  await padBtn.evaluate(() => {
    window.__mockPad.buttons[6] = { pressed: true };
  });
  await skipped(padBtn, "gamepad action");
  await padBtn.close();

  // 6. Connected gamepad drifting inside the deadzone keeps the reveal.
  const padDrift = await open({ pad: [0.05, -0.04, 0, 0] });
  await startPlay(padDrift);
  await padDrift.waitForTimeout(SKIP_MS);
  const drift = await camDist(padDrift);
  assert.ok(drift > CHASE_MAX, `sub-deadzone pad drift must not cancel, got ${drift.toFixed(0)}`);
  await padDrift.close();

  // 7. Mouse steering (pointer move over the canvas).
  const mouse = await open();
  await startPlay(mouse);
  const pt = await canvasPoint(mouse);
  assert.ok(pt, "canvas should be reachable for mouse steering");
  await mouse.mouse.move(pt.x, pt.y, { steps: 4 });
  await skipped(mouse, "mouse steering");
  await mouse.close();

  // 8. Stationary mouse fire: a left press that never moves the pointer, so
  //    this exercises mouse.fire without touching mouse.active.
  const mfire = await open();
  await startPlay(mfire);
  const fpt = await canvasPoint(mfire);
  assert.ok(fpt, "canvas should be reachable for stationary fire");
  const cdpFire = await mfire.context().newCDPSession(mfire);
  await cdpFire.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: fpt.x,
    y: fpt.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await skipped(mfire, "stationary mouse fire");
  await cdpFire.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: fpt.x,
    y: fpt.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
  await mfire.close();

  // 9. Touch throttle button (data-hold="up").
  const throttle = await open({ mobile: true });
  await startPlay(throttle);
  const up = throttle.locator('[data-hold="up"]');
  assert.ok(await up.isVisible(), "touch throttle button should be visible on coarse pointer");
  const tbox = await up.boundingBox();
  assert.ok(tbox, "touch throttle button should have a layout box");
  const cdpThr = await throttle.context().newCDPSession(throttle);
  await cdpThr.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 3, x: tbox.x + tbox.width / 2, y: tbox.y + tbox.height / 2 }],
  });
  await skipped(throttle, "touch throttle");
  await cdpThr.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await throttle.close();

  // 10. Reduced motion skips the reveal immediately.
  const rm = await open();
  await rm.emulateMedia({ reducedMotion: "reduce" });
  await rm.evaluate(() => window.__batwing.start());
  await rm.waitForFunction(() => window.__batwing.state.mode === "play");
  await rm.waitForTimeout(80);
  const rmDist = await camDist(rm);
  assert.ok(
    rmDist < 45,
    `reduced motion should start at the chase distance, got ${rmDist.toFixed(0)}`,
  );
  await rm.close();

  // 11. Restarting the chapter re-arms the reveal.
  const replay = await open();
  await startPlay(replay);
  await replay.keyboard.down("d");
  await skipped(replay, "replay pre-cancel");
  await replay.keyboard.up("d");
  await replay.evaluate(() => window.__batwing.start());
  await replay.waitForFunction(() => window.__batwing.state.mode === "play");
  await replay.waitForTimeout(150);
  const rearmed = await camDist(replay);
  assert.ok(rearmed > REVEAL_MIN, `restart should re-arm the reveal, got ${rearmed.toFixed(0)}`);
  await replay.screenshot({ path: "verification/launch-cancel-replayed.png" });
  await replay.close();

  assert.deepEqual(errors, []);
  console.log(
    "PASS launch-cancel: idle reveal held; keyboard, touch stick, touch throttle, gamepad steer/action, mouse steering/fire and reduced motion skip it; deadzone drift and restart behave",
  );
} finally {
  await browser.close();
}
