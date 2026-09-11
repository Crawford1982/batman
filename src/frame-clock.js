// Frame timing that survives stalls. Browsers throttle or suspend
// requestAnimationFrame for hidden tabs, minimised windows and long GC pauses;
// a single frame can then report seconds of elapsed time. Treat anything past
// STALL_CAP as a stall: physics, mission clocks and the FPS sampler all see the
// same capped interval, so the countdown cannot outrun the simulation.
export const STALL_CAP = 0.25;
export const PHYSICS_CAP = 0.05;

export function frameStep(frameSeconds) {
  const seconds = Math.max(0, frameSeconds || 0);
  const stalled = seconds > STALL_CAP;
  return {
    dt: Math.min(seconds, PHYSICS_CAP),
    wallDt: Math.min(seconds, STALL_CAP),
    stalled,
  };
}

// Averages frame rate over a window, discarding any window that contains a
// stall so a background tab never reads as a slow GPU.
export class FpsSampler {
  constructor(windowSeconds = 2) {
    this.window = windowSeconds;
    this.reset();
  }
  reset() {
    this.frames = 0;
    this.seconds = 0;
  }
  // Returns the measured FPS when a clean window completes, otherwise null.
  push(frameSeconds, stalled = false) {
    if (stalled) {
      this.reset();
      return null;
    }
    this.frames++;
    this.seconds += frameSeconds;
    if (this.seconds < this.window) return null;
    const fps = this.frames / this.seconds;
    this.reset();
    return fps;
  }
}

// Steps render resolution down under load and ratchets it back up when the
// device has headroom, so a transient dip is not a permanent blur.
export function nextPixelRatio(current, fps, { floor = 0.6, ceil = 1 } = {}) {
  if (fps < 28) return Math.max(floor, current * 0.85);
  if (fps > 55) return Math.min(ceil, current + 0.05);
  return current;
}
