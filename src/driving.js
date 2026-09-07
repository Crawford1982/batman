import { Vector3 } from "three";
import { clamp, insideBuilding } from "./flight.js";

export const DRIVE_ROUTE = [
  {
    x: 0,
    z: 0,
    name: "MIDTOWN INTERCHANGE",
    line: "ALFRED / Turn left. The westbound corridor is clear.",
  },
  {
    x: -522.5,
    z: 0,
    name: "WESTBOUND EXIT",
    line: "GORDON / Head north into Old Gotham. Drones are tracking you.",
  },
  {
    x: -522.5,
    z: -997.5,
    name: "OLD GOTHAM TURN",
    line: "ALFRED / Turn left at the junction. The cathedral is ahead.",
  },
  {
    x: -997.5,
    z: -997.5,
    name: "CATHEDRAL APPROACH",
    line: "GORDON / Bring the override to the front steps. We are waiting.",
  },
  {
    x: -997.5,
    z: -890,
    name: "CATHEDRAL SQUARE",
    line: "GORDON / Final turn. Deliver the override at the front steps.",
  },
  {
    x: -1100,
    z: -890,
    name: "DELIVER THE OVERRIDE",
    line: "ALFRED / Override accepted. The network belongs to Gotham again.",
  },
];
export const ROAD_HALF_WIDTH = 18;
export const ROAD_POINTS = [{ x: 0, z: 450 }, ...DRIVE_ROUTE];
export function roadContainsPoint(x, z) {
  return ROAD_POINTS.slice(1).some((b, i) => {
    const a = ROAD_POINTS[i];
    return x >= Math.min(a.x, b.x) - ROAD_HALF_WIDTH &&
      x <= Math.max(a.x, b.x) + ROAD_HALF_WIDTH &&
      z >= Math.min(a.z, b.z) - ROAD_HALF_WIDTH &&
      z <= Math.max(a.z, b.z) + ROAD_HALF_WIDTH;
  });
}
// Check the body, not just its centre: a long car must not hang over a curb.
export function carFitsRoad(position, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const x of [-2.1, 0, 2.1]) for (const z of [-4.5, 0, 4.5]) {
    if (!roadContainsPoint(position.x + x*c + z*s, position.z - x*s + z*c)) return false;
  }
  return true;
}
export function deadZone(value, threshold = .18) {
  return Math.abs(value) <= threshold ? 0 : Math.sign(value) * (Math.abs(value)-threshold)/(1-threshold);
}
export function driveSteering(keys, mouse, touch, pad) {
  // Explicit input wins; a centred controller never falls back to a stale cursor.
  if (keys.KeyA || keys.KeyD || keys.ArrowLeft || keys.ArrowRight)
    return (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (touch.steering) return deadZone(touch.steer || 0, .06);
  if (pad) return deadZone(pad.axes[0] || 0);
  return mouse.steering ? deadZone(mouse.x || 0, .08) : 0;
}
export function routeCue(position, yaw, checkpoint) {
  const goal = DRIVE_ROUTE[checkpoint];
  if (!goal) return "OVERRIDE DELIVERED";
  const prev = ROAD_POINTS[checkpoint], next = DRIVE_ROUTE[checkpoint + 1];
  const desired = Math.atan2(-(goal.x-position.x), -(goal.z-position.z));
  const error = Math.atan2(Math.sin(desired-yaw), Math.cos(desired-yaw));
  if (Math.hypot(position.x-prev.x,position.z-prev.z)<75 && Math.abs(error)>.65)
    return error>0 ? "← TURN LEFT NOW" : "TURN RIGHT NOW →";
  const distance = Math.round(Math.hypot(goal.x-position.x,goal.z-position.z));
  if (!next) return `↑ DELIVER OVERRIDE · ${distance} M`;
  const cross = (goal.x-prev.x)*(next.z-goal.z)-(goal.z-prev.z)*(next.x-goal.x);
  const turn = cross<0 ? "← LEFT" : "RIGHT →";
  return `${turn} IN ${distance} M${distance<130 ? " · BRAKE FOR TURN" : ""}`;
}
export class Driving {
  constructor() {
    this.reset();
  }
  reset() {
    this.position = new Vector3(0, 0.6, 450);
    this.yaw = 0;
    this.speed = 0;
    this.steer = 0;
    this.health = 100;
    this.invulnerable = 0;
    this.elapsed = 0;
    this.checkpoint = 0;
    this.emp = 0;
    this.score = 0;
    this.done = false;
  }
  recoverToRoute() {
    const a = ROAD_POINTS[this.checkpoint], b = DRIVE_ROUTE[this.checkpoint];
    if (!b) return;
    const dx=b.x-a.x, dz=b.z-a.z, length=Math.hypot(dx,dz);
    const distance=clamp(((this.position.x-a.x)*dx+(this.position.z-a.z)*dz)/length,0,Math.max(0,length-35));
    this.position.set(a.x+dx*distance/length,.6,a.z+dz*distance/length);
    this.yaw=Math.atan2(-dx,-dz);
    this.speed=0; this.steer=0; this.invulnerable=2;
  }
  damage(amount) {
    if (this.invulnerable > 0) return false;
    this.health = clamp(this.health - amount, 0, 100);
    this.invulnerable = 1.5;
    return true;
  }
  update(dt, input, buildings = [], constrainRoad = true, wallDt = dt) {
    this.elapsed += Math.max(0, wallDt);
    const duration = clamp(dt, 0, .25), steps = Math.max(1, Math.ceil(duration / (1/60)));
    let passed = null;
    for (let i=0;i<steps;i++) passed = this.step(duration/steps,input,buildings,constrainRoad) || passed;
    return passed;
  }
  step(dt, input, buildings, constrainRoad) {

    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.emp = Math.max(0, this.emp - dt);
    this.steer +=
      (clamp(input.steer || 0, -1, 1) - this.steer) * (1 - Math.exp(-dt * (input.steer ? 6 : 10)));
    const accel = input.accel || 0,
      brake = input.brake || 0,
      max = input.boost ? 70 : 46;
    this.speed += accel * (input.boost ? 38 : 27) * dt;
    if (brake > 0) {
      if (this.speed > 1)
        this.speed = Math.max(0, this.speed - brake * 55 * dt);
      else this.speed = Math.max(-10, this.speed - brake * 12 * dt);
    }
    this.speed *= Math.exp(-dt * (input.drift ? 1.3 : accel ? 0.12 : 1.2));
    if (this.speed > max)
      this.speed += (max - this.speed) * (1 - Math.exp(-dt * 2));
    this.speed = clamp(this.speed, -10, 72);
    const oldYaw = this.yaw;
    this.yaw -=
      this.steer *
      Math.sign(this.speed) *
      Math.min(Math.abs(this.speed) / 12, 1) *
      (input.drift ? 1.65 : 1.3 - .42 * Math.min(Math.abs(this.speed)/70,1)) *
      dt;
    const old = this.position.clone();
    this.position.x -= Math.sin(this.yaw) * this.speed * dt;
    this.position.z -= Math.cos(this.yaw) * this.speed * dt;
    this.roadContact = false;
    if (constrainRoad && !carFitsRoad(this.position, this.yaw)) {
      // Slide along a curb when possible. Reject only the blocked component.
      const next = this.position.clone();
      this.position.set(next.x, old.y, old.z);
      if (!carFitsRoad(this.position, this.yaw)) {
        this.position.set(old.x, old.y, next.z);
        if (!carFitsRoad(this.position, this.yaw)) {
          this.position.copy(old);
          this.yaw = oldYaw;
        }
      }
      this.speed *= Math.exp(-dt * 9);
      this.roadContact = true;
    }
    for (const b of buildings)
      if (insideBuilding(this.position, b, 2)) {
        this.position.copy(old);
        if (Math.abs(this.speed) > 8) this.damage(6);
        this.speed *= -0.2;
        break;
      }
    if (Math.abs(this.position.x) > 3100 || Math.abs(this.position.z) > 3100) {
      this.position.copy(old);
      this.speed = 0;
    }
    const target = DRIVE_ROUTE[this.checkpoint];
    if (
      target &&
      Math.hypot(this.position.x - target.x, this.position.z - target.z) < 27
    ) {
      this.checkpoint++;
      this.health = Math.min(100, this.health + 8);
      this.score += 500;
      this.done = this.checkpoint === DRIVE_ROUTE.length;
      return target;
    }
    return null;
  }
}
