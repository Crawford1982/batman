import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Share the complete interceptor geometry across every spawned aircraft.
const hullParts = [],
  lightParts = [];
function part(
  list,
  geometry,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const transform = new T.Matrix4().compose(
    new T.Vector3(...position),
    new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
    new T.Vector3(...scale),
  );
  geometry.applyMatrix4(transform);
  list.push(geometry.toNonIndexed());
}
part(
  hullParts,
  new T.CylinderGeometry(0.7, 1.5, 8, 6),
  [0, 0, 0],
  [Math.PI / 2, 0, 0],
);
part(hullParts, new T.ConeGeometry(1.25, 4, 6), [0, 0, 5], [Math.PI / 2, 0, 0]);
for (const side of [-1, 1]) {
  part(
    hullParts,
    new T.BoxGeometry(7, 0.45, 3),
    [side * 4, -0.25, -1.2],
    [0, side * 0.38, 0],
  );
  part(
    hullParts,
    new T.CylinderGeometry(0.85, 0.85, 4, 8),
    [side * 2, -0.3, -3],
    [Math.PI / 2, 0, 0],
  );
  part(
    hullParts,
    new T.BoxGeometry(0.35, 2.6, 2.4),
    [side * 2, 1, -3.5],
    [0, 0, -side * 0.35],
  );
  part(
    lightParts,
    new T.CylinderGeometry(0.58, 0.58, 0.2, 8),
    [side * 2, -0.3, -5.1],
    [Math.PI / 2, 0, 0],
  );
  part(lightParts, new T.BoxGeometry(1.5, 0.18, 0.3), [side * 6.6, -0.1, -2.2]);
}
part(
  lightParts,
  new T.SphereGeometry(1, 8, 6),
  [0, 0.85, 1.7],
  [0, 0, 0],
  [0.65, 0.4, 1.65],
);
const hull = mergeGeometries(hullParts);
const lights = mergeGeometries(lightParts);
const armor = new T.MeshStandardMaterial({
  color: 0x435260,
  metalness: 0.65,
  roughness: 0.38,
});
const glow = new T.MeshBasicMaterial({ color: 0xff6347 });
export function createEnemy() {
  const aircraft = new T.Group();
  aircraft.add(new T.Mesh(hull, armor), new T.Mesh(lights, glow));
  return aircraft;
}
