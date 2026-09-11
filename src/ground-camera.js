import { Vector3 } from 'three';

// Reused vectors and time-based damping keep steering consistent across frame rates.
export class GroundCamera {
  constructor() {
    this.eye = new Vector3(); this.look = new Vector3();
    this.targetEye = new Vector3(); this.targetLook = new Vector3();
    this.up = new Vector3(0, 1, 0);
  }
  reset(position, yaw = 0) {
    this.yaw = yaw; this.steer = 0; this.boost = 0;
    this.eye.set(0, 3.4, 13).applyAxisAngle(this.up, yaw).add(position);
    this.look.set(0, 1.3, -17).applyAxisAngle(this.up, yaw).add(position);
  }
  update(dt, car, boosting, reducedMotion = false) {
    const speed = Math.min(Math.abs(car.speed) / 45, 1);
    this.yaw += Math.atan2(Math.sin(car.yaw-this.yaw), Math.cos(car.yaw-this.yaw)) * (1-Math.exp(-dt*10));
    this.steer += (car.steer*speed-this.steer) * (1-Math.exp(-dt*7));
    this.boost += ((boosting && !reducedMotion ? speed : 0)-this.boost) * (1-Math.exp(-dt*3));
    this.targetEye.set(-this.steer*.65, 3.4+speed*.2, 13+this.boost*1.5).applyAxisAngle(this.up,this.yaw).add(car.position);
    this.targetLook.set(-this.steer*1.5, 1.3, -17-speed*4).applyAxisAngle(this.up,car.yaw).add(car.position);
    this.eye.lerp(this.targetEye,1-Math.exp(-dt*9));
    this.look.lerp(this.targetLook,1-Math.exp(-dt*10));
    return this;
  }
}
