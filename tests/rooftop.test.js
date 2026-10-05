import test from "node:test";
import assert from "node:assert/strict";
import {
  LAYOUT,
  RooftopMission,
  ANTAGONIST,
  MAX_ALARMS,
  LANDING_GRACE,
  TIME_LIMIT,
  VISION_RANGE,
  ALERT_HOLD,
  SEARCH_TIME,
  ALARM_TIME_PENALTY,
  NOISE_RADIUS,
  HACK_SECONDS,
  ALARM_COOLDOWN,
  BODY_SUSPICION,
  canSee,
  PLAYER_RADIUS,
  canTakedown,
  grappleTarget,
  inRoof,
  roofById,
  rooftopScore,
  segmentHitsRect,
  zipPoint,
} from "../src/rooftop-mission.js";

const DT = 1 / 30;
const run = (m, seconds, input = {}) => {
  for (let t = 0; t < seconds; t += DT) m.update(DT, input);
};
// A mission with only the listed guards, so a test can isolate one behaviour.
const withGuards = (...ids) =>
  new RooftopMission({ ...LAYOUT, guards: LAYOUT.guards.filter((g) => ids.includes(g.id)) });
const place = (m, roof, x, z, facing = 0) =>
  Object.assign(m.player, { roof, x, z, facing, zip: null });

test("layout is self-consistent: everything sits on its roof and routes avoid cover", () => {
  for (const o of [...LAYOUT.occluders, ...LAYOUT.uplinks, LAYOUT.terminal, LAYOUT.extraction])
    assert.ok(inRoof(roofById(LAYOUT, o.roof), o.x, o.z), JSON.stringify(o));
  for (const g of LAYOUT.guards) {
    const roof = roofById(LAYOUT, g.roof);
    g.route.forEach(([x, z], i) => {
      assert.ok(inRoof(roof, x, z));
      const [nx, nz] = g.route[(i + 1) % g.route.length];
      for (const o of LAYOUT.occluders.filter((o) => o.roof === g.roof))
        assert.ok(!segmentHitsRect(x, z, nx, nz, o), `${g.id} walks through cover`);
    });
  }
});

test("every roof is reachable by grapple from the start roof", () => {
  const seen = new Set([LAYOUT.start.roof]),
    queue = [LAYOUT.start.roof];
  while (queue.length) {
    const from = roofById(LAYOUT, queue.shift());
    // Try aiming in 16 directions from the roof centre.
    for (let i = 0; i < 16; i++) {
      const t = grappleTarget(
        { roof: from.id, x: from.x, z: from.z, facing: (i / 16) * Math.PI * 2 },
        LAYOUT.roofs.map((r) => ({ ...r })),
      );
      // Centre-to-edge distance understates reach; also try from each edge midpoint.
      const edges = [
        [from.x + from.w / 2 - 1, from.z],
        [from.x - from.w / 2 + 1, from.z],
        [from.x, from.z + from.d / 2 - 1],
        [from.x, from.z - from.d / 2 + 1],
        [from.x + from.w / 2 - 1, from.z + from.d / 2 - 1],
      ].map(([x, z]) =>
        grappleTarget({ roof: from.id, x, z, facing: (i / 16) * Math.PI * 2 }, LAYOUT.roofs),
      );
      for (const hit of [t, ...edges])
        if (hit && !seen.has(hit.roof)) {
          seen.add(hit.roof);
          queue.push(hit.roof);
        }
    }
  }
  assert.deepEqual([...seen].sort(), LAYOUT.roofs.map((r) => r.id).sort());
});

test("vision cone respects range, angle, height and cover", () => {
  const guard = { x: 0, z: 0, facing: 0 };
  assert.ok(canSee(guard, 10, { x: 10, z: 0 }, 10, []));
  assert.ok(!canSee(guard, 10, { x: VISION_RANGE + 1, z: 0 }, 10, []), "beyond range");
  assert.ok(!canSee(guard, 10, { x: -5, z: 0 }, 10, []), "behind");
  assert.ok(!canSee(guard, 10, { x: 5, z: 6 }, 10, []), "outside 45 degrees");
  assert.ok(canSee(guard, 10, { x: 6, z: 5 }, 10, []), "inside 45 degrees");
  assert.ok(!canSee(guard, 10, { x: 8, z: 0 }, 20, []), "a roof well above");
  const vent = { x: 5, z: 0, w: 2, d: 2 };
  assert.ok(!canSee(guard, 10, { x: 10, z: 0 }, 10, [vent]), "behind a vent");
  assert.ok(canSee(guard, 10, { x: 10, z: 3 }, 10, [vent]), "clear of the vent");
});

test("grapple picks the roof in front, ignores the current roof and respects reach", () => {
  const p = { roof: "tenement", x: 10, z: -2, facing: 0 };
  assert.equal(grappleTarget(p, LAYOUT.roofs).roof, "laundry");
  assert.equal(grappleTarget({ ...p, facing: Math.PI }, LAYOUT.roofs), null);
  assert.equal(grappleTarget({ ...p, x: -10, facing: 0 }, LAYOUT.roofs)?.roof ?? null, null);
  const mid = zipPoint({ x: 0, y: 10, z: 0 }, { x: 20, y: 10, z: 0 }, 0.5);
  assert.ok(mid.y > 10, "zip arcs over the gap");
  assert.deepEqual(zipPoint({ x: 0, y: 10, z: 0 }, { x: 20, y: 12, z: 4 }, 1), {
    x: 20,
    y: 12,
    z: 4,
  });
});

test("grappling moves the player to the target roof after the zip", () => {
  const m = withGuards();
  place(m, "tenement", 10, -2, 0);
  m.update(DT, { grapple: true });
  assert.ok(m.player.zip);
  assert.equal(m.drainEvents()[0].type, "grapple");
  run(m, 2);
  assert.equal(m.player.zip, null);
  assert.equal(m.player.roof, "laundry");
  assert.ok(inRoof(roofById(LAYOUT, "laundry"), m.player.x, m.player.z));
});

test("movement stays on the roof and out of cover", () => {
  const m = withGuards();
  run(m, 6, { move: { x: -1, z: 0 }, run: true });
  const roof = roofById(LAYOUT, "tenement");
  assert.ok(inRoof(roof, m.player.x, m.player.z));
  assert.ok(m.player.x < roof.x - roof.w / 2 + 1);
  const vent = LAYOUT.occluders.find((o) => o.roof === "tenement");
  place(m, "tenement", vent.x, vent.z - vent.d / 2 - 2);
  run(m, 2, { move: { x: 0, z: 1 } });
  assert.ok(m.player.z <= vent.z - vent.d / 2 - 0.39, "stopped at the vent");
});

test("a guard goes patrol -> suspicious -> alert and an unseen player calms it down", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  assert.equal(g.state, "patrol");
  place(m, "laundry", g.x + 6, g.z);
  g.facing = 0;
  m.update(DT);
  assert.equal(g.state, "suspicious");
  // Step out of sight before the meter fills: suspicion decays back to patrol.
  place(m, "tenement", -10, -8);
  run(m, 4);
  assert.equal(g.state, "patrol");
  assert.equal(m.alarms, 0);
  // Stay in the cone: the meter fills and the alarm is raised once.
  place(m, "laundry", g.x + 6, g.z);
  g.facing = 0;
  run(m, 2.5);
  assert.equal(g.state, "alert");
  assert.equal(m.alarms, 1);
  run(m, 1);
  assert.equal(m.alarms, 1, "a continuing alert is one alarm");
});

test("alert decays to search and then back to patrol when the player is gone", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  place(m, "laundry", g.x + 5, g.z);
  g.facing = 0;
  run(m, 2.5);
  assert.equal(g.state, "alert");
  place(m, "tenement", -10, -8);
  run(m, ALERT_HOLD + 0.2);
  assert.equal(g.state, "search");
  run(m, SEARCH_TIME + 0.2);
  assert.equal(g.state, "patrol");
  assert.equal(g.suspicion, 0);
});

test("an alarm sends same-roof guards to search and not distant ones", () => {
  const m = withGuards("g3", "g4", "g1");
  const [g1, g3, g4] = ["g1", "g3", "g4"].map((id) => m.guards.find((g) => g.id === id));
  place(m, "kessler", g3.x + 5, g3.z);
  g3.facing = 0;
  g4.facing = Math.PI / 2; // facing away so only the radio call reaches it
  run(m, 2.5);
  assert.equal(g3.state, "alert");
  assert.equal(g4.state, "search");
  assert.notEqual(g1.state, "search", "laundry guard is out of radio range");
});

test("takedowns work only from behind, never on an alerted guard, and are non-lethal stuns", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  g.facing = 0;
  place(m, "laundry", g.x + 1.2, g.z);
  assert.ok(!canTakedown(m.player, g), "from the front");
  place(m, "laundry", g.x - 1.2, g.z);
  assert.ok(canTakedown(m.player, g));
  assert.ok(!canTakedown({ ...m.player, roof: "tenement" }, g));
  assert.ok(!canTakedown(m.player, { ...g, state: "alert" }));
  // Freeze the guard's facing for the press by testing a single frame.
  m.update(DT, { act: true });
  assert.equal(g.state, "down");
  assert.equal(m.takedowns, 1);
  // A downed guard never sees anything again.
  place(m, "laundry", g.x + 4, g.z);
  run(m, 5);
  assert.equal(m.alarms, 0);
});

test("objectives run uplinks -> flight log -> extraction for the win", () => {
  const m = withGuards();
  assert.equal(m.stage, "uplinks");
  const t = m.terminal;
  place(m, "kessler", t.x, t.z - 1);
  run(m, 0.5, { act: true });
  assert.ok(m.drainEvents().some((e) => e.type === "terminal-locked"));
  assert.equal(t.progress, 0, "log is locked until the uplinks are down");
  for (const u of m.uplinks) {
    place(m, u.roof, u.x - 1, u.z);
    run(m, 0.6, { act: true });
    run(m, 0.1); // letting go resets an unfinished hack
    assert.equal(u.progress, 0);
    run(m, 1.8, { act: true });
    assert.ok(u.done);
  }
  assert.equal(m.stage, "log");
  place(m, "kessler", t.x, t.z - 1);
  run(m, 3.2, { act: true });
  assert.equal(m.stage, "extract");
  assert.equal(m.phase, "play");
  const x = LAYOUT.extraction;
  place(m, x.roof, x.x, x.z);
  m.update(DT);
  assert.equal(m.phase, "ended");
  assert.equal(m.outcome, "won");
  assert.match(m.reason, new RegExp(ANTAGONIST.codename));
});

test("standing on the extraction pad early does not win", () => {
  const m = withGuards();
  const x = LAYOUT.extraction;
  place(m, x.roof, x.x, x.z);
  run(m, 1);
  assert.equal(m.phase, "play");
});

test("three alarms or the clock running out lose the mission", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  for (let i = 0; i < MAX_ALARMS; i++) {
    m.lastAlarm = -Infinity; // separate blunders, not one encounter
    g.state = "patrol";
    g.suspicion = 0;
    g.facing = 0;
    place(m, "laundry", g.x + 5, g.z);
    run(m, 2.5);
  }
  assert.equal(m.alarms, MAX_ALARMS);
  assert.equal(m.outcome, "lost");
  const before = m.time;
  m.update(DT);
  assert.equal(m.time, before, "an ended mission stops updating");

  const late = withGuards();
  run(late, TIME_LIMIT + 0.1);
  assert.equal(late.outcome, "lost");
});

test("reset restores a fresh mission", () => {
  const m = new RooftopMission();
  m.alarms = 2;
  m.uplinks[0].done = true;
  m.guards[0].state = "down";
  m.update(1);
  m.reset();
  assert.equal(m.alarms, 0);
  assert.equal(m.time, 0);
  assert.equal(m.stage, "uplinks");
  assert.ok(m.uplinks.every((u) => !u.done));
  assert.ok(m.guards.every((g) => g.state === "patrol"));
  assert.equal(m.player.roof, LAYOUT.start.roof);
});

test("score rewards a quiet, quick run and never goes negative", () => {
  assert.ok(rooftopScore(120, 0, 0) > rooftopScore(120, 1, 0));
  assert.ok(rooftopScore(120, 0, 0) > rooftopScore(240, 0, 0));
  assert.ok(rooftopScore(120, 0, 2) > rooftopScore(120, 0, 0));
  assert.ok(rooftopScore(5000, 9, 0) >= 0);
});

test("guards only watch their own roof, matching the cones drawn on it", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  g.wait = 99;
  g.facing = Math.PI; // the laundry guard looks west toward the tenement
  place(m, "tenement", 10, g.z);
  run(m, 3);
  assert.equal(g.state, "patrol", "a player on the next roof is not seen");
  place(m, "laundry", g.x - 6, g.z);
  m.update(DT);
  assert.equal(g.state, "suspicious");
});

test("a grapple landing gets a short grace before suspicion builds at full rate", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  g.wait = 99;
  place(m, "tenement", 10, -2, 0);
  m.update(DT, { grapple: true });
  const to = m.player.zip.to;
  // Stand the guard a few metres from the landing point, looking at it.
  Object.assign(g, { x: to.x + 4, z: to.z, facing: Math.PI });
  run(m, m.player.zip.duration + 0.05);
  assert.equal(m.player.roof, "laundry");
  assert.ok(m.player.grace > 0);
  const graced = g.suspicion;
  run(m, LANDING_GRACE * 0.8);
  assert.ok(g.state !== "alert", "no instant alarm on landing");
  assert.ok(g.suspicion - graced < 0.5);
});

test("each alarm takes time off the purge clock", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  place(m, "laundry", g.x + 5, g.z);
  g.facing = 0;
  run(m, 2.5);
  assert.equal(m.alarms, 1);
  assert.ok(Math.abs(m.timeLeft() - (TIME_LIMIT - m.time - ALARM_TIME_PENALTY)) < 1e-9);
  const late = withGuards();
  late.penalty = TIME_LIMIT - 1;
  run(late, 1.1);
  assert.equal(late.outcome, "lost", "penalties bring the purge forward");
});

test("an alerted guard on the player's roof jams uplink work until it stands down", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  const u = m.uplinks.find((x) => x.roof === "laundry");
  place(m, "laundry", u.x, u.z + 1);
  Object.assign(g, { state: "alert", x: u.x - 6, z: u.z + 1, facing: Math.PI, wait: 99 });
  assert.ok(m.actionAt().jammed);
  m.update(DT, { act: true });
  assert.ok(m.drainEvents().some((e) => e.type === "jammed"));
  run(m, HACK_SECONDS + 0.5, { act: true });
  assert.equal(u.done, false, "no hacking under an alerted guard");
  g.state = "down";
  assert.ok(!m.actionAt().jammed);
  run(m, HACK_SECONDS + 0.2, { act: true });
  assert.equal(u.done, true);
});

test("running near a guard is heard and turns it; walking past is not", () => {
  const setup = () => {
    const m = withGuards("g1");
    const g = m.guards[0];
    Object.assign(g, { x: 30, z: -6, facing: Math.PI, wait: 99 });
    // Behind the guard, inside earshot, moving sideways.
    place(m, "laundry", 30 + NOISE_RADIUS - 2, -6);
    return [m, g];
  };
  const [walker, wg] = setup();
  run(walker, 0.5, { move: { x: 0, z: 1 } });
  assert.equal(wg.state, "patrol", "walking is quiet");
  const [runner, rg] = setup();
  runner.update(DT, { move: { x: 0, z: 1 }, run: true });
  assert.equal(rg.state, "suspicious");
  assert.ok(runner.drainEvents().some((e) => e.type === "heard"));
  const before = Math.abs(rg.facing);
  run(runner, 0.4);
  assert.ok(Math.abs(rg.facing) < before, "turns toward the footsteps");
  assert.equal(runner.alarms, 0, "noise alone never raises the alarm");
});

test("a takedown lands while the player is still moving in behind the guard", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  Object.assign(g, { facing: 0, wait: 99 });
  place(m, "laundry", g.x - 2, g.z);
  m.update(DT, { move: { x: 1, z: 0 }, act: true });
  assert.equal(g.state, "down");
  assert.equal(m.takedowns, 1);
});

test("a grapple landing inside an awake guard's view is flagged as watched", () => {
  const m = withGuards("g1");
  const g = m.guards[0];
  const target = { roof: "laundry", x: 30, z: -6 };
  Object.assign(g, { x: 36, z: -6, facing: Math.PI });
  assert.ok(m.landingWatched(target));
  g.facing = 0;
  assert.ok(!m.landingWatched(target), "looking away");
  g.facing = Math.PI;
  g.state = "down";
  assert.ok(!m.landingWatched(target), "stunned guards see nothing");
  assert.ok(!m.landingWatched(null));
});

test("a second guard spotting you right after an alarm does not count as another alarm", () => {
  const m = withGuards("g3", "g4");
  const [g3, g4] = m.guards;
  place(m, "kessler", g3.x + 5, g3.z);
  g3.facing = 0;
  run(m, 2.5);
  assert.equal(m.alarms, 1);
  // g4 comes round and sees the player inside the cooldown.
  Object.assign(g4, { x: m.player.x + 5, z: m.player.z, facing: Math.PI, state: "search" });
  run(m, 2);
  assert.equal(g4.state, "alert");
  assert.equal(m.alarms, 1);
  assert.ok(m.time < ALARM_COOLDOWN);
});

test("a guard who sees a stunned colleague searches the body once, without an alarm", () => {
  const m = withGuards("g3", "g4");
  const [g3, g4] = m.guards;
  place(m, "tenement", 0, 0);
  Object.assign(g3, { state: "down", x: 70, z: 8 });
  // g4 faces away from the body, then turns toward it.
  Object.assign(g4, { x: 62, z: 8, facing: Math.PI, wait: 99 });
  m.update(DT);
  assert.equal(g4.state, "patrol", "facing away");
  g4.facing = 0;
  m.update(DT);
  assert.equal(g4.state, "search");
  assert.deepEqual(g4.lastSeen, { x: 70, z: 8 });
  assert.ok(g4.suspicion >= BODY_SUSPICION - 0.05);
  assert.equal(m.alarms, 0);
  assert.ok(m.drainEvents().some((e) => e.type === "body" && e.body === "g3"));
  run(m, SEARCH_TIME + 1);
  assert.equal(g4.state, "patrol");
  // Already found: walking past it again changes nothing.
  Object.assign(g4, { x: 62, z: 8, facing: 0, wait: 99 });
  m.update(DT);
  assert.equal(g4.state, "patrol");
});

test("grapple landings never put the player inside a vent or plant room", () => {
  let checked = 0;
  for (const from of LAYOUT.roofs)
    for (let gx = 0; gx <= 8; gx++)
      for (let gz = 0; gz <= 8; gz++)
        for (let i = 0; i < 16; i++) {
          const p = {
            roof: from.id,
            x: from.x - from.w / 2 + 1 + (gx / 8) * (from.w - 2),
            z: from.z - from.d / 2 + 1 + (gz / 8) * (from.d - 2),
            facing: (i / 16) * Math.PI * 2,
          };
          const t = grappleTarget(p, LAYOUT.roofs, LAYOUT.occluders);
          if (!t) continue;
          checked++;
          const roof = roofById(LAYOUT, t.roof);
          assert.ok(inRoof(roof, t.x, t.z, 1.9), `${t.roof} ${t.x},${t.z} on roof`);
          for (const o of LAYOUT.occluders.filter((o) => o.roof === t.roof))
            assert.ok(
              Math.abs(t.x - o.x) >= o.w / 2 + PLAYER_RADIUS ||
                Math.abs(t.z - o.z) >= o.d / 2 + PLAYER_RADIUS,
              `${t.roof} ${t.x.toFixed(1)},${t.z.toFixed(1)} inside cover at ${o.x},${o.z}`,
            );
        }
  assert.ok(checked > 500);
  // The case found in play: Tenement east edge, aiming at Laundry Works' vent.
  const t = grappleTarget(
    { roof: "tenement", x: 8, z: -2, facing: -0.18 },
    LAYOUT.roofs,
    LAYOUT.occluders,
  );
  assert.equal(t.roof, "laundry");
  assert.ok(t.x < 24.5 - PLAYER_RADIUS || t.z > -1 + PLAYER_RADIUS);
});
