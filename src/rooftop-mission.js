// Chapter III, part two: Kessler Cold Storage rooftops. Pure mission logic
// with no three.js or DOM dependency, so tests/rooftop.test.js can drive it.
//
// Units are metres on a local x/z plane, y up. Roofs are axis-aligned slabs;
// the player walks on one roof at a time and crosses gaps only by grapple.
// Guards are non-lethal opposition: they see, grow suspicious and raise the
// alarm. The player avoids them or stuns them from behind with the gauntlet EMP.

export const VISION_RANGE = 15;
export const VISION_HALF_ANGLE = (45 * Math.PI) / 180;
export const VISION_MAX_DY = 4;
export const GRAPPLE_RANGE = 34;
export const GRAPPLE_HALF_ANGLE = (55 * Math.PI) / 180;
export const TAKEDOWN_RANGE = 2.6;
export const INTERACT_RANGE = 2.4;
export const PLAYER_RADIUS = 0.4;
export const WALK_SPEED = 3.2;
export const RUN_SPEED = 6.2;
export const GUARD_SPEED = 1.5;
// Below WALK_SPEED, so walking out of sight always shakes an alerted guard.
export const GUARD_ALERT_SPEED = 2.8;
export const GUARD_TURN_RATE = 3;
export const SUSPICION_DECAY = 0.35;
export const ALERT_HOLD = 5;
export const SEARCH_TIME = 6;
export const RADIO_RADIUS = 30;
export const MAX_ALARMS = 3;
export const TIME_LIMIT = 240;
// Each alarm makes TOLLER speed up the server purge.
export const ALARM_TIME_PENALTY = 30;
// A running player is heard within this radius; the guard turns to look.
export const NOISE_RADIUS = 8;
// Sightings this soon after an alarm belong to the same blunder: guards go
// alert but the alarm count and the purge clock are left alone.
export const ALARM_COOLDOWN = 6;
// Being seen while running fills the suspicion meter faster.
export const RUN_VISIBILITY = 1.5;
export const HACK_SECONDS = 1.6;
export const LOG_SECONDS = 3;
// After a grapple landing, suspicion builds at a quarter rate for this long,
// so a landing the player could not see in advance is not an instant alarm.
export const LANDING_GRACE = 1;

export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const ANTAGONIST = {
  codename: "TOLLER",
  name: "Ines Varga",
  detail:
    "Former Wayne Aerospace flight-systems engineer. Her remote-override autopilot was shelved in 2019; Silent Bell used it.",
};

// Roofs in The Narrows around Kessler Cold Storage. h is the roof height.
export const LAYOUT = {
  roofs: [
    { id: "tenement", name: "TENEMENT", x: 0, z: 0, w: 22, d: 20, h: 18 },
    { id: "laundry", name: "LAUNDRY WORKS", x: 34, z: -6, w: 22, d: 24, h: 21 },
    { id: "garage", name: "BUS GARAGE", x: 28, z: 32, w: 28, d: 22, h: 15 },
    { id: "kessler", name: "KESSLER COLD STORAGE", x: 72, z: 14, w: 38, d: 34, h: 24 },
    { id: "tower", name: "WATER TOWER", x: 110, z: 44, w: 18, d: 18, h: 20 },
  ],
  // Vents, plant rooms and stair heads. They block sight and movement.
  occluders: [
    { roof: "tenement", x: -5, z: 4, w: 4, d: 3 },
    { roof: "laundry", x: 26, z: -4, w: 3, d: 6 },
    { roof: "laundry", x: 39, z: 2, w: 5, d: 3 },
    { roof: "garage", x: 22, z: 30, w: 4, d: 4 },
    { roof: "garage", x: 34, z: 36, w: 6, d: 3 },
    { roof: "kessler", x: 62, z: 6, w: 5, d: 4 },
    { roof: "kessler", x: 80, z: 4, w: 4, d: 6 },
    { roof: "kessler", x: 66, z: 25.5, w: 6, d: 3 },
    // Control hut housing the flight-log terminal.
    { roof: "kessler", x: 72, z: 15, w: 5, d: 3 },
    { roof: "kessler", x: 82, z: 22, w: 3, d: 3 },
    { roof: "tower", x: 106, z: 48, w: 4, d: 4 },
  ],
  uplinks: [
    { id: "A", roof: "laundry", x: 42, z: -13 },
    { id: "B", roof: "garage", x: 16, z: 24 },
    { id: "C", roof: "kessler", x: 88, z: 24 },
  ],
  terminal: { roof: "kessler", x: 72, z: 12.6 },
  extraction: { roof: "tower", x: 113, z: 41, r: 2.6 },
  start: { roof: "tenement", x: -6, z: -4, facing: 0 },
  guards: [
    {
      id: "g1",
      roof: "laundry",
      route: [
        [28, -14],
        [42, -4],
        [28, 2],
      ],
    },
    {
      id: "g2",
      roof: "garage",
      route: [
        [18, 38],
        [38, 40],
        [38, 26],
      ],
    },
    {
      id: "g3",
      roof: "kessler",
      route: [
        [58, 0],
        [86, 0],
        [86, 10],
      ],
    },
    {
      id: "g4",
      roof: "kessler",
      route: [
        [86, 30],
        [58, 30],
        [58, 18],
      ],
    },
  ],
};

export const roofById = (layout, id) => layout.roofs.find((r) => r.id === id);
export function inRoof(roof, x, z, inset = 0) {
  return Math.abs(x - roof.x) <= roof.w / 2 - inset && Math.abs(z - roof.z) <= roof.d / 2 - inset;
}

// 2D segment against an axis-aligned rectangle (slab method).
export function segmentHitsRect(ax, az, bx, bz, rect) {
  const minX = rect.x - rect.w / 2,
    maxX = rect.x + rect.w / 2,
    minZ = rect.z - rect.d / 2,
    maxZ = rect.z + rect.d / 2;
  let t0 = 0,
    t1 = 1;
  const dx = bx - ax,
    dz = bz - az;
  for (const [p, d, lo, hi] of [
    [ax, dx, minX, maxX],
    [az, dz, minZ, maxZ],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let a = (lo - p) / d,
        b = (hi - p) / d;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) return false;
    }
  }
  return true;
}

// Can a guard (position, facing, height) see a point at height y?
export function canSee(guard, gy, point, py, occluders) {
  const dx = point.x - guard.x,
    dz = point.z - guard.z,
    dist = Math.hypot(dx, dz);
  if (dist > VISION_RANGE || Math.abs(py - gy) > VISION_MAX_DY) return false;
  if (dist > 0.01 && Math.abs(wrapAngle(Math.atan2(dz, dx) - guard.facing)) > VISION_HALF_ANGLE)
    return false;
  return !occluders.some(
    (o) =>
      !inRoof(o, guard.x, guard.z) &&
      !inRoof(o, point.x, point.z) &&
      segmentHitsRect(guard.x, guard.z, point.x, point.z, o),
  );
}
// Closer targets fill the meter faster: about 0.8 s point blank, 2.4 s at range.
export const suspicionRate = (dist) => 1 / (0.8 + 1.6 * clamp(dist / VISION_RANGE, 0, 1));

// The nearest point on another roof, inset from its edge, that lies in front of
// the player and within reach. Returns { roof, x, z } or null.
export function grappleTarget(player, roofs) {
  let best = null,
    bestScore = Infinity;
  for (const roof of roofs) {
    if (roof.id === player.roof) continue;
    const x = clamp(player.x, roof.x - roof.w / 2 + 2, roof.x + roof.w / 2 - 2),
      z = clamp(player.z, roof.z - roof.d / 2 + 2, roof.z + roof.d / 2 - 2),
      dist = Math.hypot(x - player.x, z - player.z);
    if (dist > GRAPPLE_RANGE || dist < 0.5) continue;
    const off = Math.abs(wrapAngle(Math.atan2(z - player.z, x - player.x) - player.facing));
    if (off > GRAPPLE_HALF_ANGLE) continue;
    const score = dist * (1 + off);
    if (score < bestScore) {
      bestScore = score;
      best = { roof: roof.id, x, z };
    }
  }
  return best;
}
// Point along a grapple zip: straight across with a lift that clears the parapet.
export function zipPoint(from, to, t) {
  const k = clamp(t, 0, 1),
    s = k * k * (3 - 2 * k);
  return {
    x: from.x + (to.x - from.x) * s,
    y: from.y + (to.y - from.y) * s + Math.sin(k * Math.PI) * (3 + Math.abs(to.y - from.y) * 0.3),
    z: from.z + (to.z - from.z) * s,
  };
}

// Takedown is allowed from outside the guard's cone, on the same roof, while
// the guard has not raised the alarm.
export function canTakedown(player, guard) {
  if (guard.state === "down" || guard.state === "alert") return false;
  if (player.zip || player.roof !== guard.roof) return false;
  const dx = player.x - guard.x,
    dz = player.z - guard.z;
  if (Math.hypot(dx, dz) > TAKEDOWN_RANGE) return false;
  return Math.abs(wrapAngle(Math.atan2(dz, dx) - guard.facing)) > VISION_HALF_ANGLE;
}

export function rooftopScore(seconds, alarms, takedowns) {
  const base = Math.max(800, Math.round(5000 - seconds * 6));
  return Math.max(0, base - alarms * 900 + takedowns * 150 + (alarms === 0 ? 1500 : 0));
}

export class RooftopMission {
  constructor(layout = LAYOUT) {
    this.layout = layout;
    this.reset();
  }
  reset() {
    const L = this.layout,
      s = L.start;
    this.time = 0;
    this.phase = "play";
    this.stage = "uplinks";
    this.outcome = null;
    this.reason = "";
    this.alarms = 0;
    this.penalty = 0;
    this.lastAlarm = -Infinity;
    this.takedowns = 0;
    this.events = [];
    this.actWas = false;
    this.player = {
      x: s.x,
      z: s.z,
      roof: s.roof,
      facing: s.facing,
      zip: null,
      moving: 0,
      noisy: false,
      grace: 0,
    };
    this.uplinks = L.uplinks.map((u) => ({ ...u, done: false, progress: 0 }));
    this.terminal = { ...L.terminal, done: false, progress: 0 };
    this.guards = L.guards.map((g) => {
      const [x, z] = g.route[0],
        [nx, nz] = g.route[1];
      return {
        id: g.id,
        roof: g.roof,
        route: g.route,
        x,
        z,
        facing: Math.atan2(nz - z, nx - x),
        waypoint: 1,
        wait: 0,
        state: "patrol",
        suspicion: 0,
        lastSeen: null,
        timer: 0,
        moving: 0,
      };
    });
  }
  roof(id) {
    return roofById(this.layout, id);
  }
  playerY() {
    const p = this.player;
    if (p.zip) return zipPoint(p.zip.from, p.zip.to, p.zip.t / p.zip.duration).y;
    return this.roof(p.roof).h;
  }
  emit(type, detail = {}) {
    this.events.push({ type, ...detail });
  }
  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
  timeLeft() {
    return TIME_LIMIT - this.time - this.penalty;
  }
  // An alerted guard on the player's roof jams uplink and terminal work.
  jammer() {
    const p = this.player;
    return p.zip ? null : this.guards.find((g) => g.state === "alert" && g.roof === p.roof) || null;
  }
  // Would an awake guard see the player land at this grapple target?
  landingWatched(target) {
    if (!target) return false;
    const h = this.roof(target.roof).h;
    return this.guards.some(
      (g) =>
        g.state !== "down" &&
        g.roof === target.roof &&
        canSee(g, h, target, h, this.layout.occluders),
    );
  }
  get uplinksDown() {
    return this.uplinks.filter((u) => u.done).length;
  }
  // What the act button would do right now, for HUD prompts.
  actionAt() {
    const p = this.player;
    if (p.zip || this.phase !== "play") return null;
    const guard = this.guards.find((g) => canTakedown(p, g));
    if (guard) return { kind: "takedown", guard };
    const near = (o) => o.roof === p.roof && Math.hypot(o.x - p.x, o.z - p.z) <= INTERACT_RANGE,
      jammed = !!this.jammer();
    const uplink = this.uplinks.find((u) => !u.done && near(u));
    if (uplink) return { kind: "uplink", target: uplink, jammed };
    if (!this.terminal.done && near(this.terminal))
      return {
        kind: "terminal",
        target: this.terminal,
        locked: this.stage === "uplinks",
        jammed,
      };
    return null;
  }

  // input: { move: {x, z} world-space, length <= 1; run; act (held); grapple (pressed) }
  update(dt, input = {}) {
    if (this.phase !== "play") return;
    this.time += dt;
    this.updatePlayer(dt, input);
    for (const g of this.guards) this.updateGuard(dt, g);
    this.checkOutcome();
  }

  updatePlayer(dt, input) {
    const p = this.player;
    p.grace = Math.max(0, p.grace - dt);
    p.noisy = false;
    if (p.zip) {
      p.zip.t += dt;
      const k = p.zip.t / p.zip.duration,
        at = zipPoint(p.zip.from, p.zip.to, k);
      p.x = at.x;
      p.z = at.z;
      if (k >= 1) {
        p.roof = p.zip.roof;
        p.x = p.zip.to.x;
        p.z = p.zip.to.z;
        p.zip = null;
        p.grace = LANDING_GRACE;
        this.emit("land", { roof: p.roof });
      }
      this.actWas = !!input.act;
      return;
    }
    if (input.grapple) {
      const target = grappleTarget(p, this.layout.roofs);
      if (target) {
        const to = this.roof(target.roof),
          dist = Math.hypot(target.x - p.x, target.z - p.z);
        p.zip = {
          from: { x: p.x, y: this.roof(p.roof).h, z: p.z },
          to: { x: target.x, y: to.h, z: target.z },
          roof: target.roof,
          t: 0,
          duration: 0.55 + dist / 30,
        };
        this.resetProgress();
        this.emit("grapple", { roof: target.roof });
        this.actWas = !!input.act;
        return;
      }
      this.emit("grapple-miss");
    }
    const move = input.move || { x: 0, z: 0 },
      mag = Math.min(1, Math.hypot(move.x, move.z));
    p.moving = mag;
    p.noisy = !!input.run && mag > 0.05;
    if (mag > 0.05) {
      const speed = (input.run ? RUN_SPEED : WALK_SPEED) * mag;
      p.facing = Math.atan2(move.z, move.x);
      this.movePlayer((move.x / mag) * speed * dt, (move.z / mag) * speed * dt);
    }
    const act = !!input.act,
      pressed = act && !this.actWas;
    this.actWas = act;
    const action = this.actionAt();
    // Takedowns land on the move (you chase a guard from behind); hacking
    // needs the player to stand still.
    if (action?.kind === "takedown") {
      this.resetProgress();
      if (!pressed) return;
      action.guard.state = "down";
      action.guard.suspicion = 0;
      this.takedowns++;
      this.emit("takedown", { guard: action.guard.id });
      return;
    }
    if (!action || !act || mag > 0.05) {
      this.resetProgress();
      return;
    }
    if (action.kind === "terminal" && action.locked) {
      if (pressed) this.emit("terminal-locked");
      return;
    }
    if (action.jammed) {
      if (pressed) this.emit("jammed");
      this.resetProgress();
      return;
    }
    const t = action.target,
      need = action.kind === "uplink" ? HACK_SECONDS : LOG_SECONDS;
    t.progress += dt / need;
    if (t.progress < 1) return;
    t.progress = 1;
    t.done = true;
    if (action.kind === "uplink") {
      this.emit("uplink", { id: t.id, count: this.uplinksDown });
      if (this.uplinksDown === this.uplinks.length) {
        this.stage = "log";
        this.emit("stage", { stage: "log" });
      }
    } else {
      this.stage = "extract";
      this.emit("stage", { stage: "extract" });
    }
  }
  resetProgress() {
    for (const o of [...this.uplinks, this.terminal]) if (!o.done) o.progress = 0;
  }
  movePlayer(dx, dz) {
    const p = this.player,
      roof = this.roof(p.roof),
      inset = PLAYER_RADIUS + 0.3;
    p.x = clamp(p.x + dx, roof.x - roof.w / 2 + inset, roof.x + roof.w / 2 - inset);
    p.z = clamp(p.z + dz, roof.z - roof.d / 2 + inset, roof.z + roof.d / 2 - inset);
    for (const o of this.layout.occluders) {
      if (o.roof !== p.roof) continue;
      // Push the player's circle out of the box along the shallowest axis.
      const cx = clamp(p.x, o.x - o.w / 2, o.x + o.w / 2),
        cz = clamp(p.z, o.z - o.d / 2, o.z + o.d / 2),
        ox = p.x - cx,
        oz = p.z - cz,
        d = Math.hypot(ox, oz);
      if (d >= PLAYER_RADIUS) continue;
      if (d > 1e-6) {
        p.x = cx + (ox / d) * PLAYER_RADIUS;
        p.z = cz + (oz / d) * PLAYER_RADIUS;
      } else {
        const exits = [
          [o.x - o.w / 2 - PLAYER_RADIUS - p.x, 0],
          [o.x + o.w / 2 + PLAYER_RADIUS - p.x, 0],
          [0, o.z - o.d / 2 - PLAYER_RADIUS - p.z],
          [0, o.z + o.d / 2 + PLAYER_RADIUS - p.z],
        ].sort((a, b) => Math.hypot(...a) - Math.hypot(...b))[0];
        p.x += exits[0];
        p.z += exits[1];
      }
    }
  }

  // Walk toward (x, z), turning at a limited rate. Returns remaining distance.
  stepGuard(g, dt, x, z, speed) {
    const roof = this.roof(g.roof);
    x = clamp(x, roof.x - roof.w / 2 + 0.6, roof.x + roof.w / 2 - 0.6);
    z = clamp(z, roof.z - roof.d / 2 + 0.6, roof.z + roof.d / 2 - 0.6);
    const dx = x - g.x,
      dz = z - g.z,
      dist = Math.hypot(dx, dz);
    if (dist < 0.05) {
      g.moving = 0;
      return 0;
    }
    this.turnGuard(g, dt, Math.atan2(dz, dx));
    const step = Math.min(dist, speed * dt);
    g.x += (dx / dist) * step;
    g.z += (dz / dist) * step;
    g.moving = speed;
    return dist - step;
  }
  turnGuard(g, dt, angle) {
    const diff = wrapAngle(angle - g.facing),
      max = GUARD_TURN_RATE * dt;
    g.facing = wrapAngle(g.facing + clamp(diff, -max, max));
  }
  raiseAlarm(g) {
    g.state = "alert";
    g.timer = 0;
    if (this.time - this.lastAlarm >= ALARM_COOLDOWN) {
      this.alarms++;
      this.penalty += ALARM_TIME_PENALTY;
      this.lastAlarm = this.time;
      this.emit("alarm", { guard: g.id, alarms: this.alarms, penalty: ALARM_TIME_PENALTY });
    }
    // Crew on the same roof, or within radio range, come looking.
    for (const other of this.guards) {
      if (other === g || other.state === "down" || other.state === "alert") continue;
      if (other.roof !== g.roof && Math.hypot(other.x - g.x, other.z - g.z) > RADIO_RADIUS)
        continue;
      other.state = "search";
      other.timer = 0;
      other.lastSeen = g.lastSeen && { ...g.lastSeen };
    }
  }

  updateGuard(dt, g) {
    if (g.state === "down") {
      g.moving = 0;
      return;
    }
    const p = this.player,
      // Guards watch their own roof; a zip counts once it is about to land there.
      onRoof = p.zip ? p.zip.roof === g.roof && p.zip.t / p.zip.duration > 0.7 : p.roof === g.roof,
      seen = onRoof && canSee(g, this.roof(g.roof).h, p, this.playerY(), this.layout.occluders),
      dist = Math.hypot(p.x - g.x, p.z - g.z),
      heard = !seen && onRoof && p.noisy && dist <= NOISE_RADIUS;
    if (seen) {
      g.lastSeen = { x: p.x, z: p.z };
      const rate = suspicionRate(dist) * (p.grace > 0 ? 0.25 : 1) * (p.noisy ? RUN_VISIBILITY : 1);
      g.suspicion = Math.min(1, g.suspicion + rate * dt);
    } else if (g.state !== "alert") g.suspicion = Math.max(0, g.suspicion - SUSPICION_DECAY * dt);
    // Footsteps: the guard turns toward the sound but noise alone never fills the meter.
    if (heard && g.state !== "alert") {
      g.lastSeen = { x: p.x, z: p.z };
      if (g.state !== "search") g.suspicion = Math.max(g.suspicion, 0.35);
      if (g.state === "patrol") {
        g.state = "suspicious";
        this.emit("heard", { guard: g.id });
      }
    }

    switch (g.state) {
      case "patrol": {
        if (seen) {
          g.state = "suspicious";
          this.emit("suspicious", { guard: g.id });
          break;
        }
        if (g.wait > 0) {
          g.wait -= dt;
          g.moving = 0;
          break;
        }
        const [wx, wz] = g.route[g.waypoint];
        if (this.stepGuard(g, dt, wx, wz, GUARD_SPEED) <= 0.05) {
          g.waypoint = (g.waypoint + 1) % g.route.length;
          g.wait = 1.2;
        }
        break;
      }
      case "suspicious":
        g.moving = 0;
        if (g.lastSeen) this.turnGuard(g, dt, Math.atan2(g.lastSeen.z - g.z, g.lastSeen.x - g.x));
        if (g.suspicion >= 1) this.raiseAlarm(g);
        else if (g.suspicion <= 0) {
          g.state = "patrol";
          this.emit("calm", { guard: g.id });
        }
        break;
      case "alert":
        g.timer = seen ? 0 : g.timer + dt;
        if (seen && dist > 2) this.stepGuard(g, dt, p.x, p.z, GUARD_ALERT_SPEED);
        else if (seen) {
          g.moving = 0;
          this.turnGuard(g, dt, Math.atan2(p.z - g.z, p.x - g.x));
        } else if (g.lastSeen) this.stepGuard(g, dt, g.lastSeen.x, g.lastSeen.z, GUARD_ALERT_SPEED);
        if (g.timer >= ALERT_HOLD) {
          g.state = "search";
          g.timer = 0;
          g.suspicion = 0.5;
        }
        break;
      case "search":
        if (g.suspicion >= 1) {
          this.raiseAlarm(g);
          break;
        }
        g.timer += dt;
        if (
          g.lastSeen &&
          this.stepGuard(g, dt, g.lastSeen.x, g.lastSeen.z, GUARD_SPEED * 1.4) <= 0.05
        )
          g.facing = wrapAngle(g.facing + dt * 1.6);
        if (g.timer >= SEARCH_TIME) {
          g.state = "patrol";
          g.suspicion = 0;
          g.lastSeen = null;
          let best = 0;
          g.route.forEach(([x, z], i) => {
            if (
              Math.hypot(x - g.x, z - g.z) <
              Math.hypot(g.route[best][0] - g.x, g.route[best][1] - g.z)
            )
              best = i;
          });
          g.waypoint = best;
          this.emit("calm", { guard: g.id });
        }
        break;
    }
  }

  checkOutcome() {
    if (this.alarms >= MAX_ALARMS)
      return this.end("lost", "TOLLER heard the alarms and purged the servers.");
    if (this.timeLeft() <= 0)
      return this.end("lost", "The purge finished before you reached the log.");
    const p = this.player,
      x = this.layout.extraction;
    if (
      this.stage === "extract" &&
      !p.zip &&
      p.roof === x.roof &&
      Math.hypot(p.x - x.x, p.z - x.z) <= x.r
    )
      this.end("won", `Flight log recovered. ${ANTAGONIST.codename} is ${ANTAGONIST.name}.`);
  }
  end(outcome, reason) {
    this.phase = "ended";
    this.outcome = outcome;
    this.reason = reason;
    this.emit("end", { outcome });
  }
  score() {
    return rooftopScore(this.time, this.alarms, this.takedowns);
  }
}
