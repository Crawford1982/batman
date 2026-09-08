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

// Heavy strike aircraft: shared geometry, two draw calls, no textures or lights.
const bomberParts = [], bomberLights = [];
part(bomberParts, new T.BoxGeometry(3.8,2.1,10), [0,0,0]);
part(bomberParts, new T.ConeGeometry(2.2,5,4), [0,0,7], [Math.PI/2,Math.PI/4,0]);
for (const side of [-1,1]) {
  part(bomberParts,new T.BoxGeometry(10,.65,5),[side*5.3,-.25,-1],[0,side*.32,0]);
  part(bomberParts,new T.CylinderGeometry(1.25,1.25,7,8),[side*5,-.3,-2],[Math.PI/2,0,0]);
  part(bomberParts,new T.BoxGeometry(.45,3.5,3),[side*3,1.6,-4.5],[0,0,-side*.22]);
  part(bomberParts,new T.CylinderGeometry(.65,.65,5,6),[side*2,-1.3,1],[Math.PI/2,0,0]);
  part(bomberLights,new T.CylinderGeometry(.88,.88,.25,8),[side*5,-.3,-5.6],[Math.PI/2,0,0]);
  part(bomberLights,new T.BoxGeometry(2,.2,.5),[side*9,-.15,-3]);
}
part(bomberLights,new T.BoxGeometry(2,.5,1.8),[0,1.15,3]);
const bomberHull = mergeGeometries(bomberParts), bomberGlow = mergeGeometries(bomberLights);
const bomberArmor = new T.MeshStandardMaterial({color:0x647380,metalness:.65,roughness:.4});
const amber = new T.MeshBasicMaterial({color:0xffb654});
export function createBomber() {
  const aircraft = new T.Group();
  aircraft.add(new T.Mesh(bomberHull,bomberArmor),new T.Mesh(bomberGlow,amber));
  aircraft.userData.aircraftClass = 'heavy-bomber';
  return aircraft;
}
