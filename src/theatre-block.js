import * as T from "three";
import { createModelLoader } from "./model-loader.js";
import theatreUrl from "./models/theatre-kit.glb?url";

// One curated block. Legacy frontages remain until every replacement is ready.
export class TheatreBlock {
  constructor(scene, collisions) {
    this.collisions = collisions;
    this.ready = false;
    this.started = false;
    this.disabled = new URLSearchParams(location.search).has("legacyCity");
    this.group = new T.Group();
    this.group.visible = false;
    scene.add(this.group);
  }
  async load() {
    this.started = true;
    try {
      const gltf = await createModelLoader().loadAsync(
        theatreUrl,
      );
      gltf.scene.updateMatrixWorld(true);
      const prepared = new Set();
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (prepared.has(m)) return;
        prepared.add(m);
        if (/FakeInterior/.test(m.name)) {
          m.emissiveMap = m.map;
          m.emissive.set("#deb57d");
          m.emissiveIntensity = 0.22;
          m.roughness = 0.8;
        } else if (/Glass/.test(m.name)) {
          m.opacity = 0.18;
          m.depthWrite = false;
        } else {
          m.color.multiplyScalar(0.65);
          m.roughness = Math.max(0.6, m.roughness);
          m.metalness = Math.min(0.2, m.metalness);
        }
        for (const t of [m.map, m.normalMap, m.roughnessMap]) if (t) t.anisotropy = 4;
      });
      const matrix = new T.Matrix4(),
        pose = new T.Object3D();
      this.bounds = [];
      for (const [index, template] of gltf.scene.children.entries()) {
        const box = new T.Box3().setFromObject(template),
          size = box.getSize(new T.Vector3());
        const transforms = [];
        for (const side of [-1, 1])
          for (let i = 0; i < 4; i++) {
            if (i % 2 !== index) continue;
            const x = -158 - i * 34,
              sx = 31 / size.x,
              sy = index === 0 ? 1.3 : 1.4,
              sz = 1.45;
            pose.position.set(x, 0.48, side * 26);
            pose.rotation.set(0, side === -1 ? 0 : Math.PI, 0);
            pose.scale.set(sx, sy, sz);
            pose.updateMatrix();
            const offset = new T.Matrix4().makeTranslation(
              -(box.min.x + box.max.x) / 2,
              -box.min.y,
              -box.max.z,
            );
            transforms.push(pose.matrix.clone().multiply(offset));
            this.bounds.push({
              x,
              z: side * (26 + (size.z * sz) / 2),
              w: 31,
              d: size.z * sz,
              h: size.y * sy,
            });
          }
        template.traverse((o) => {
          if (!o.isMesh) return;
          const mesh = new T.InstancedMesh(o.geometry, o.material, transforms.length);
          transforms.forEach((m, i) =>
            mesh.setMatrixAt(i, matrix.multiplyMatrices(m, o.matrixWorld)),
          );
          mesh.computeBoundingSphere();
          this.group.add(mesh);
        });
      }
      // Snow belongs on roofs/ledges, not an identical bright slab on every tower.
      const snow = new T.MeshStandardMaterial({ color: 0x697983, roughness: 1 });
      for (const b of this.bounds) {
        const cap = new T.Mesh(new T.BoxGeometry(b.w * 0.92, 0.12, b.d * 0.88), snow);
        cap.position.set(b.x, b.h + 0.5, b.z);
        this.group.add(cap);
      }
      this.collisions.push(...this.bounds);
      this.ready = true;
    } catch (error) {
      this.failed = true;
      console.warn("Theatre assets unavailable; original city retained.", error.message);
    }
  }
  update(pos) {
    if (this.disabled) return;
    const near = Math.hypot(pos.x + 210, pos.z) < 850;
    if (!this.started && near) this.load();
    this.group.visible = this.ready && near;
  }
}
