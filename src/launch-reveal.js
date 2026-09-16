// The Chapter I establishing pull-in is skipped the moment the player uses any
// control. `controls` is the dead-zoned, semantic input the flight model
// consumes, so steering, throttle, boost and fire from every source (keyboard,
// mouse, touch stick/buttons, gamepad) all count, while a connected-but-idle
// gamepad — axes zeroed inside the 0.13 deadzone — never trips this.
export function revealCancelled(keys, mouseActive, controls) {
  return Boolean(
    Object.values(keys).some(Boolean) ||
    mouseActive ||
    controls.x ||
    controls.y ||
    controls.yaw ||
    controls.roll ||
    controls.throttle ||
    controls.boost ||
    controls.fire,
  );
}
