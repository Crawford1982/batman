import { Vector3, Quaternion, Euler } from "three";
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export class Flight {
  constructor() {
    this.reset();
  }
  reset() {
    this.position = new Vector3(0, 155, 380);
    this.yaw = 0;
    this.yawRate = 0;
    this.pitch = 0;
    this.roll = 0;
    this.speed = 65;
    this.cruise = 65;
    this.recovery = 0;
    this.recoveryYaw = 0;
    this.quaternion = new Quaternion();
    this.forward = new Vector3(0, 0, -1);
    this.health = 100;
    this.invulnerable = 0;
  }
  update(dt, input = {}) {
    dt = clamp(dt, 0, 0.05);
    const smooth = 1 - Math.exp(-dt * 3.5);
    this.pitch += ((input.y || 0) * 0.65 - this.pitch) * smooth;
    this.roll +=
      (-(input.x || 0) * 0.7 + (input.roll || 0) * 0.8 - this.roll) * smooth;
    this.yawRate +=
      (-(input.x || 0) * 0.62 - (input.yaw || 0) * 0.65 - this.yawRate) *
      (1 - Math.exp(-dt * 5));
    this.yaw += this.yawRate * dt;
    if (this.recovery > 0) {
      const delta = Math.atan2(
        Math.sin(this.recoveryYaw - this.yaw),
        Math.cos(this.recoveryYaw - this.yaw),
      );
      this.yaw += clamp(delta, -1.8 * dt, 1.8 * dt);
      this.recovery -= dt;
    }
    this.cruise = clamp(this.cruise + (input.throttle || 0) * dt * 28, 35, 100);
    this.speed +=
      ((input.boost ? 145 : this.cruise) - this.speed) *
      (1 - Math.exp(-dt * (input.boost ? 1.7 : 1.1)));
    this.quaternion.setFromEuler(
      new Euler(this.pitch, this.yaw, this.roll, "YXZ"),
    );
    this.forward.set(0, 0, -1).applyQuaternion(this.quaternion);
    this.position.addScaledVector(this.forward, this.speed * dt);
    this.position.y = clamp(this.position.y, 16, 480);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
  }
  recoverFrom(b) {
    const p = this.position,
      dx = p.x - b.x,
      dz = p.z - b.z;
    const escapeX = b.w / 2 + 7 - Math.abs(dx),
      escapeZ = b.d / 2 + 7 - Math.abs(dz),
      escapeY = b.h + 7 - p.y;
    if (escapeY < Math.min(escapeX, escapeZ)) {
      p.y = b.h + 7;
      this.pitch = 0.25;
    } else if (escapeX < escapeZ) {
      const sign = dx >= 0 ? 1 : -1;
      p.x = b.x + sign * (b.w / 2 + 7);
      this.recoveryYaw = (-sign * Math.PI) / 2;
      this.recovery = 1.5;
    } else {
      const sign = dz >= 0 ? 1 : -1;
      p.z = b.z + sign * (b.d / 2 + 7);
      this.recoveryYaw = sign > 0 ? Math.PI : 0;
      this.recovery = 1.5;
    }
    this.speed = Math.max(35, this.speed * 0.85);
  }
  damage(n) {
    if (this.invulnerable > 0) return false;
    this.health = clamp(this.health - n, 0, 100);
    this.invulnerable = 1.6;
    return true;
  }
}
export function insideBuilding(p, b, r = 5) {
  return (
    Math.abs(p.x - b.x) < b.w / 2 + r &&
    Math.abs(p.z - b.z) < b.d / 2 + r &&
    p.y < b.h + r &&
    p.y > (b.bottom ?? -100) - r
  );
}
export function segmentDistance(p, a, b) {
  const v = new Vector3().subVectors(b, a);
  const t = clamp(
    new Vector3().subVectors(p, a).dot(v) / Math.max(v.lengthSq(), 0.0001),
    0,
    1,
  );
  return p.distanceTo(v.multiplyScalar(t).add(a));
}
