import * as T from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { chapterCard, clearPresentation, showResults } from "./presentation.js";
import { createModelLoader } from "./model-loader.js";
import { installWindowShader } from "./lighting.js";
import { KESSLER_ORIGIN } from "./districts.js";
import { ROOFTOP_LINES } from "./radio-lines.js";
import {
  LAYOUT,
  RooftopMission,
  ANTAGONIST,
  MAX_ALARMS,
  ALARM_TIME_PENALTY,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  INTERACT_RANGE,
  grappleTarget,
} from "./rooftop-mission.js";
import vigilanteUrl from "./models/vigilante.glb?url";
import crewUrl from "./models/crew.glb?url";
import movesUrl from "./models/moves.glb?url";
import kitUrl from "./models/rooftop-kit.glb?url";
import hdrUrl from "./textures/rooftop/rooftop_night_1k.hdr?url";
import "./rooftop.css";

const TEXTURE_URLS = import.meta.glob("./textures/rooftop/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const textureUrl = (name) => TEXTURE_URLS[`./textures/rooftop/${name}.webp`];

const $ = (id) => document.getElementById(id);
const INTRO_SECONDS = 8;
const CAMERA_DISTANCE = 7.5;
const CAMERA_PITCH = 0.36;
const PARAPET = 1.05;
const smooth = (x) => x * x * (3 - 2 * x);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const CONE_COLORS = {
  patrol: new T.Color(0x4fc8ff),
  suspicious: new T.Color(0xffb02e),
  search: new T.Color(0xff8a1f),
  alert: new T.Color(0xff2a1a),
};
// Moonlight direction shared with the city (world.js moonlight).
const MARKER_CLEAR = new T.Color(1.4, 1.9, 2.4);
const MARKER_WATCHED = new T.Color(2.6, 0.5, 0.35);
const MOON_DIR = new T.Vector3(-520, 360, -700).normalize();

function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box with world-scale UVs on every face, so tiling textures keep their size
// on walls of any length. scale is metres per texture repeat.
function worldBox(w, h, d, scale) {
  const g = new T.BoxGeometry(w, h, d),
    p = g.attributes.position,
    n = g.attributes.normal,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + w / 2,
      y = p.getY(i) + h / 2,
      z = p.getZ(i) + d / 2;
    if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, z / scale, y / scale);
    else if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, x / scale, z / scale);
    else uv.setXY(i, x / scale, y / scale);
  }
  return g;
}

// Snow on flat roofs banks against parapets and plant-room walls, broken up
// by world-space noise; the open membrane between is wet and catches light.
// Rects are world-space [minX, minZ, maxX, maxZ].
function installSnow(material, roofs, walls) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnowRoofs = { value: roofs };
    shader.uniforms.uSnowWalls = { value: walls };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSnowPos;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvSnowPos = (modelMatrix * vec4(position, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
varying vec3 vSnowPos;
uniform vec4 uSnowRoofs[${roofs.length}];
uniform vec4 uSnowWalls[${walls.length}];
float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(sHash(i), sHash(i + vec2(1, 0)), f.x), mix(sHash(i + vec2(0, 1)), sHash(i + vec2(1, 1)), f.x), f.y);
}`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `#include <map_fragment>
vec2 sp = vSnowPos.xz;
mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
float sn = sNoise(sp * 0.11) * 0.6 + sNoise(rot * sp * 0.37 + 7.3) * 0.3 + sNoise(rot * rot * sp * 1.3 + 3.1) * 0.1;
float edgeDist = 1e3;
for (int i = 0; i < ${roofs.length}; i++) {
  vec4 r = uSnowRoofs[i];
  if (sp.x > r.x && sp.x < r.z && sp.y > r.y && sp.y < r.w)
    edgeDist = min(edgeDist, min(min(sp.x - r.x, r.z - sp.x), min(sp.y - r.y, r.w - sp.y)));
}
for (int i = 0; i < ${walls.length}; i++) {
  vec4 r = uSnowWalls[i];
  vec2 q = max(vec2(r.x, r.y) - sp, sp - vec2(r.z, r.w));
  edgeDist = min(edgeDist, length(max(q, 0.0)) + 0.25);
}
float drift = smoothstep(2.6, 0.35, edgeDist + (sn - 0.5) * 2.2);
float snow = clamp(drift * 0.95 + smoothstep(0.66, 0.82, sn) * 0.4, 0.0, 1.0);
float wet = smoothstep(0.36, 0.22, sn);
diffuseColor.rgb = mix(diffuseColor.rgb * mix(1.0, 0.75, wet), vec3(0.48, 0.53, 0.58), snow);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 0.32, wet), 0.92, snow);",
      );
  };
}

// Vision cone drawn on the guard's roof only, with the shadows cover casts:
// a fragment is lit only if the guard has a clear line to it, mirroring
// canSee() in rooftop-mission.js.
function coneMaterial(origin) {
  return new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    uniforms: {
      uOrigin: { value: new T.Vector2(origin.x, origin.z) },
      uGuard: { value: new T.Vector2() },
      uFacing: { value: 0 },
      uRange: { value: VISION_RANGE },
      uHalf: { value: VISION_HALF_ANGLE },
      uColor: { value: new T.Color() },
      uAlpha: { value: 0.2 },
      uTime: { value: 0 },
      uRoof: { value: new T.Vector4() },
      uRects: { value: Array.from({ length: 8 }, () => new T.Vector4()) },
      uCount: { value: 0 },
    },
    vertexShader: /* glsl */ `
uniform vec2 uOrigin; varying vec2 vP;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xz - uOrigin;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fragmentShader: /* glsl */ `
uniform vec2 uGuard; uniform float uFacing, uRange, uHalf, uAlpha, uTime;
uniform vec3 uColor; uniform vec4 uRoof; uniform vec4 uRects[8]; uniform int uCount;
varying vec2 vP;
bool hits(vec2 a, vec2 b, vec4 r) {
  vec2 d = b - a; float t0 = 0.0, t1 = 1.0;
  for (int k = 0; k < 2; k++) {
    float p = k == 0 ? a.x : a.y, dd = k == 0 ? d.x : d.y;
    float lo = k == 0 ? r.x : r.y, hi = k == 0 ? r.z : r.w;
    if (abs(dd) < 1e-5) { if (p < lo || p > hi) return false; }
    else {
      float u = (lo - p) / dd, v = (hi - p) / dd;
      if (u > v) { float s = u; u = v; v = s; }
      t0 = max(t0, u); t1 = min(t1, v);
      if (t0 > t1) return false;
    }
  }
  return true;
}
void main() {
  if (vP.x < uRoof.x || vP.x > uRoof.z || vP.y < uRoof.y || vP.y > uRoof.w) discard;
  vec2 d = vP - uGuard; float dist = length(d);
  if (dist > uRange) discard;
  float a = atan(d.y, d.x) - uFacing;
  float ang = abs(atan(sin(a), cos(a)));
  if (ang > uHalf) discard;
  for (int i = 0; i < 8; i++) {
    if (i >= uCount) break;
    vec4 r = uRects[i];
    if (vP.x > r.x && vP.x < r.z && vP.y > r.y && vP.y < r.w) discard;
    if (hits(uGuard, vP, r)) discard;
  }
  float fall = 1.0 - dist / uRange;
  float fill = (0.35 + 0.65 * fall) * smoothstep(0.4, 1.4, dist);
  // Outline along both edges and the far arc, plus a sweep travelling outward.
  float aa = fwidth(ang) * 1.5;
  float sideLine = smoothstep(uHalf - 0.035 - aa, uHalf - 0.035, ang);
  float arc = smoothstep(uRange - 0.28, uRange - 0.12, dist);
  float sweep = 1.0 - smoothstep(0.0, 0.05, abs(fract(dist / uRange - uTime * 0.45) - 0.5));
  float alpha = uAlpha * fill + (sideLine + arc) * (0.35 + 0.4 * fall) + sweep * 0.12 * fall;
  gl_FragColor = vec4(uColor * (1.0 + sideLine + arc), clamp(alpha, 0.0, 0.9));
}`,
  });
}

// Merge every static mesh under group into one mesh per material and
// shadow setting, so the block costs a handful of draw calls, not hundreds.
// Meshes flagged userData.live (animated or texture-updated) are left alone.
function bake(group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(),
    buckets = new Map(),
    done = [];
  group.traverse((o) => {
    if (
      !o.isMesh ||
      o.isSkinnedMesh ||
      o.isInstancedMesh ||
      o.userData.live ||
      Array.isArray(o.material)
    )
      return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    // Compressed models store quantised or interleaved attributes; unpack to
    // plain floats so the transform and merge are exact.
    for (const [name, a] of Object.entries(g.attributes)) {
      if (a.isInterleavedBufferAttribute || a.normalized || !(a.array instanceof Float32Array)) {
        const out = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++)
          for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
        g.setAttribute(name, new T.BufferAttribute(out, a.itemSize));
      }
    }
    g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    const names = Object.keys(g.attributes).sort().join(),
      key = [o.material.uuid, o.castShadow, o.receiveShadow, names, o.renderOrder].join("|");
    if (!buckets.has(key)) buckets.set(key, { mesh: o, parts: [] });
    buckets.get(key).parts.push(g);
    done.push(o);
  });
  for (const o of done) o.removeFromParent();
  for (const { mesh, parts } of buckets.values()) {
    const merged = new T.Mesh(mergeGeometries(parts), mesh.material);
    merged.castShadow = mesh.castShadow;
    merged.receiveShadow = mesh.receiveShadow;
    merged.renderOrder = mesh.renderOrder;
    group.add(merged);
  }
}

function glowTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d"),
    r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner);
  r.addColorStop(0.35, outer);
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

// Kessler Cold Storage rooftops: the infiltration that follows the Batcave
// trace. The block is built into the city at its real place in The Narrows,
// so the rooftops share Gotham's sky, moon, snow, fog and film grade. Mission
// rules live in rooftop-mission.js; this file draws, animates and reads input.
export class RooftopLevel {
  constructor({ camera, audio, keys, onMode, scene, world, renderer }) {
    this.camera = camera;
    this.audio = audio;
    this.keys = keys;
    this.onMode = onMode;
    this.scene = scene;
    this.world = world;
    this.renderer = renderer;
    this.phase = "off";
    this.mission = new RooftopMission();
    this.origin = new T.Vector3(KESSLER_ORIGIN.x, 0, KESSLER_ORIGIN.z);
    this.yaw = 0;
    this.touch = { x: 0, z: 0, act: false, grapple: false, run: false };
    this.figures = [];
    this.modelState = "idle";
    this.time = 0;
    // The block is always part of the city; mission dressing only shows in play.
    this.block = new T.Group();
    this.block.position.copy(this.origin);
    this.props = new T.Group();
    this.block.add(this.props);
    this.active = new T.Group();
    this.active.position.copy(this.origin);
    this.active.visible = false;
    scene.add(this.block, this.active);
    this.glow = glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0.25)");
    this.buildMaterials();
    this.buildBlock();
    this.buildStreets();
    this.buildProps();
    this.buildLights();
    this.buildCones();
    // The block is part of Chapter I's skyline too; keep it to a few draws.
    bake(this.block);
    this.bindUI();
  }

  buildMaterials() {
    const std = (o) => new T.MeshStandardMaterial(o);
    this.mats = {
      kessler: std({
        color: 0x9a8f86,
        roughness: 0.9,
        emissive: 0xffffff,
        emissiveIntensity: 0.55,
      }),
      brick: std({ color: 0x8c8794, roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.55 }),
      bitumen: std({ color: 0x5b6068, roughness: 0.85 }),
      gravel: std({ color: 0x6a6c70, roughness: 0.95 }),
      concrete: std({ color: 0x8d9298, roughness: 0.92 }),
      clad: std({ color: 0x7d858e, roughness: 0.6, metalness: 0.3 }),
      door: std({ color: 0x8b7d72, roughness: 0.7, metalness: 0.4 }),
      wood: std({ color: 0x6d5a4a, roughness: 0.9, side: T.DoubleSide }),
      steel: std({ color: 0x3b424b, roughness: 0.45, metalness: 0.8 }),
      paint: std({ color: 0xd9dde0, roughness: 0.35, metalness: 0.3, side: T.DoubleSide }),
      snow: std({ color: 0xc4ccd4, roughness: 0.95 }),
      duct: std({ color: 0xaeb5bc, roughness: 0.38, metalness: 0.75 }),
      asphalt: std({ color: 0x23282e, roughness: 0.75, metalness: 0.05 }),
      pavement: std({ color: 0x5d636a, roughness: 0.9 }),
    };
    installWindowShader(this.mats.kessler, { keepMap: true });
    installWindowShader(this.mats.brick, { keepMap: true });
    const o = this.origin,
      rect = (r, grow = 0) =>
        new T.Vector4(
          o.x + r.x - r.w / 2 - grow,
          o.z + r.z - r.d / 2 - grow,
          o.x + r.x + r.w / 2 + grow,
          o.z + r.z + r.d / 2 + grow,
        ),
      roofs = LAYOUT.roofs.map((r) => rect(r, -0.34)),
      walls = LAYOUT.occluders.map((r) => rect(r));
    installSnow(this.mats.bitumen, roofs, walls);
    installSnow(this.mats.gravel, roofs, walls);
    // Texture set per material and metres per repeat (applied when loaded).
    this.surfaces = [
      ["kessler", "factory_brick", 3.2],
      ["brick", "dark_brick_wall", 2.6],
      ["bitumen", "bitumen", 4],
      ["gravel", "tarred_gravel", 2.5],
      ["concrete", "rough_concrete", 2],
      ["clad", "corrugated_iron_02", 2.2],
      ["duct", "corrugated_iron_02", 6],
      ["door", "rusty_metal_shutter", 1.2],
      ["wood", "roof_planks", 2],
      ["asphalt", "bitumen", 3],
      ["pavement", "rough_concrete", 1.5],
    ];
  }

  // Street level around the block: wet asphalt, kerbed pavements, low-rise
  // infill filling the plots the generated towers left empty, and street lamps
  // with painted light pools. All static, so bake() folds it into a few draws.
  buildStreets() {
    const b = this.block,
      M = this.mats,
      o = this.origin,
      rand = seeded(1939),
      area = { minX: -70, maxX: 200, minZ: -85, maxZ: 125 },
      lots = [],
      // Existing city towers and the mission block, in local metres.
      taken = this.world.buildings.map((t) => ({
        x: t.x - o.x,
        z: t.z - o.z,
        w: t.w,
        d: t.d,
      })),
      clear = (x, z, w, d, gap) =>
        !taken.some(
          (t) => Math.abs(x - t.x) < (w + t.w) / 2 + gap && Math.abs(z - t.z) < (d + t.d) / 2 + gap,
        );
    const road = new T.Mesh(
      worldBox(area.maxX - area.minX, 0.1, area.maxZ - area.minZ, 1),
      M.asphalt,
    );
    road.position.set((area.minX + area.maxX) / 2, -0.05, (area.minZ + area.maxZ) / 2);
    road.receiveShadow = true;
    b.add(road);
    // Plots on a 27 m grid; 19-22 m buildings leave 5-8 m streets between them.
    for (let x = area.minX + 14; x < area.maxX - 10; x += 27)
      for (let z = area.minZ + 14; z < area.maxZ - 10; z += 27) {
        const w = 19 + rand() * 3,
          d = 19 + rand() * 3;
        if (!clear(x, z, w, d, 7)) continue;
        // Low-rise next to the mission so Kessler's roofs stay the high ground.
        const near = LAYOUT.roofs.some(
            (r) => Math.abs(x - r.x) < r.w / 2 + 30 && Math.abs(z - r.z) < r.d / 2 + 30,
          ),
          h = near ? 7 + rand() * 6 : 12 + rand() * 22;
        lots.push({ x, z, w, d, h });
        taken.push({ x, z, w, d });
      }
    for (const l of lots) {
      const body = new T.Mesh(worldBox(l.w, l.h, l.d, 1), [
        M.brick,
        M.brick,
        M.snow,
        M.brick,
        M.brick,
        M.brick,
      ]);
      body.position.set(l.x, l.h / 2, l.z);
      body.receiveShadow = true;
      const cornice = new T.Mesh(worldBox(l.w + 0.4, 0.45, l.d + 0.4, 1), M.concrete);
      cornice.position.set(l.x, l.h - 0.3, l.z);
      b.add(body, cornice);
      this.world.buildings.push({ x: o.x + l.x, z: o.z + l.z, w: l.w, d: l.d, h: l.h + 2 });
    }
    // Kerbed pavement around every building on the block, with lamps at the corners.
    const pole = new T.CylinderGeometry(0.08, 0.11, 6.4, 8),
      arm = new T.BoxGeometry(1.3, 0.08, 0.08),
      bulb = new T.MeshBasicMaterial({ color: new T.Color(3, 2.3, 1.5) }),
      poolMat = new T.MeshBasicMaterial({
        map: glowTexture("rgba(255,196,128,0.32)", "rgba(255,170,90,0.1)"),
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
      });
    [...LAYOUT.roofs, ...lots].forEach((f, i) => {
      // Staggered a few millimetres so overlapping kerbs never z-fight.
      const top = 0.18 + i * 0.004,
        walk = new T.Mesh(worldBox(f.w + 5, top, f.d + 5, 1), M.pavement);
      walk.position.set(f.x, top / 2, f.z);
      walk.receiveShadow = true;
      b.add(walk);
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        if (rand() < 0.35) continue;
        const x = f.x + sx * (f.w / 2 + 1.9),
          z = f.z + sz * (f.d / 2 + 1.9),
          post = new T.Mesh(pole, M.steel),
          bar = new T.Mesh(arm, M.steel),
          lamp = new T.Mesh(new T.SphereGeometry(0.14, 10, 8), bulb),
          pool = new T.Mesh(new T.PlaneGeometry(11, 11), poolMat);
        post.position.set(x, 3.2, z);
        bar.position.set(x + sx * 0.6, 6.35, z);
        lamp.position.set(x + sx * 1.15, 6.25, z);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x + sx * 1.6, 0.06, z + sz * 0.8);
        pool.renderOrder = 1;
        b.add(post, bar, lamp, pool);
      }
    });
  }

  buildBlock() {
    const b = this.block,
      M = this.mats,
      roofH = (id) => LAYOUT.roofs.find((r) => r.id === id).h;
    this.colliders = [];
    for (const r of LAYOUT.roofs) {
      const facade = r.id === "kessler" ? M.kessler : M.brick,
        roof = r.id === "kessler" || r.id === "tower" ? M.bitumen : M.gravel;
      const body = new T.Mesh(worldBox(r.w, r.h, r.d, 1), [
        facade,
        facade,
        roof,
        facade,
        facade,
        facade,
      ]);
      body.position.set(r.x, r.h / 2, r.z);
      body.receiveShadow = true;
      b.add(body);
      // Cornice, string course and plinth break up the box at sky and street line.
      for (const [y, hh, grow] of [
        [r.h - 0.55, 0.5, 0.5],
        [r.h * 0.33, 0.3, 0.25],
        [0.6, 1.2, 0.3],
      ]) {
        const band = new T.Mesh(worldBox(r.w + grow, hh, r.d + grow, 1), M.concrete);
        band.position.set(r.x, y, r.z);
        b.add(band);
      }
      // Parapet walls with snow on the coping.
      for (const [x, z, w, d] of [
        [r.x, r.z - r.d / 2 + 0.17, r.w, 0.34],
        [r.x, r.z + r.d / 2 - 0.17, r.w, 0.34],
        [r.x - r.w / 2 + 0.17, r.z, 0.34, r.d - 0.68],
        [r.x + r.w / 2 - 0.17, r.z, 0.34, r.d - 0.68],
      ]) {
        const wall = new T.Mesh(worldBox(w, PARAPET, d, 1), M.concrete);
        wall.position.set(x, r.h + PARAPET / 2, z);
        wall.castShadow = wall.receiveShadow = true;
        const cap = new T.Mesh(new T.BoxGeometry(w + 0.08, 0.07, d + 0.08), M.snow);
        cap.position.set(x, r.h + PARAPET + 0.035, z);
        b.add(wall, cap);
      }
      this.colliders.push({
        x: this.origin.x + r.x,
        z: this.origin.z + r.z,
        w: r.w,
        d: r.d,
        h: r.h + 3,
      });
    }
    // Flight collision: the Batwing treats the block like any other building.
    this.world.buildings.push(...this.colliders);

    // Plant rooms, stair heads and the control hut are the mission's cover.
    this.doorLamps = [];
    LAYOUT.occluders.forEach((o, i) => {
      if (o.roof === "tower") return;
      const hut = o.x === LAYOUT.terminal.x && o.roof === LAYOUT.terminal.roof,
        h = hut ? 2.9 : 2.3 + (i % 3) * 0.25,
        y = roofH(o.roof),
        room = new T.Mesh(worldBox(o.w, h, o.d, 1), M.clad);
      o.height = h;
      room.position.set(o.x, y + h / 2, o.z);
      room.castShadow = room.receiveShadow = true;
      const lid = new T.Mesh(worldBox(o.w + 0.25, 0.18, o.d + 0.25, 1), M.concrete),
        drift = new T.Mesh(new T.BoxGeometry(o.w + 0.1, 0.06, o.d + 0.1), M.snow);
      lid.position.set(o.x, y + h + 0.09, o.z);
      drift.position.set(o.x, y + h + 0.21, o.z);
      lid.castShadow = true;
      b.add(room, lid, drift);
      // Door on the long side facing the roof centre; the hut's faces the terminal.
      const roof = LAYOUT.roofs.find((r) => r.id === o.roof),
        alongX = o.w >= o.d,
        side = hut ? -1 : alongX ? Math.sign(roof.z - o.z) || 1 : Math.sign(roof.x - o.x) || 1,
        door = new T.Mesh(worldBox(1.2, 2.05, 0.06, 1.2), M.door);
      if (alongX) {
        door.position.set(o.x + (hut ? -1.2 : 0), y + 1.03, o.z + side * (o.d / 2 + 0.03));
        door.rotation.y = side > 0 ? 0 : Math.PI;
      } else {
        door.position.set(o.x + side * (o.w / 2 + 0.03), y + 1.03, o.z);
        door.rotation.y = (side * Math.PI) / 2;
      }
      b.add(door);
      const normal = new T.Vector3(0, 0, 1).applyEuler(door.rotation);
      this.doorLamps.push({
        at: door.position
          .clone()
          .add(new T.Vector3(0, 1.45, 0))
          .addScaledVector(normal, 0.18),
        normal,
        roofY: y,
        hut,
      });
    });
    // The hut's terminal screen, beside its door, facing the copy point.
    const t = LAYOUT.terminal,
      hutRoom = LAYOUT.occluders.find((o) => o.x === t.x && o.roof === t.roof),
      face = hutRoom.z - hutRoom.d / 2,
      canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 160;
    this.terminalCanvas = canvas;
    this.terminalTexture = new T.CanvasTexture(canvas);
    this.terminalTexture.colorSpace = T.SRGBColorSpace;
    this.terminalScreen = new T.Mesh(
      new T.PlaneGeometry(1.3, 0.8),
      new T.MeshBasicMaterial({ map: this.terminalTexture, color: new T.Color(1.6, 1.6, 1.6) }),
    );
    this.terminalScreen.position.set(t.x + 0.9, roofH(t.roof) + 1.45, face - 0.09);
    this.terminalScreen.rotation.y = Math.PI;
    this.terminalScreen.userData.live = true;
    const bezel = new T.Mesh(new T.BoxGeometry(1.5, 1, 0.12), M.steel);
    bezel.position.set(t.x + 0.9, roofH(t.roof) + 1.45, face - 0.03);
    b.add(this.terminalScreen, bezel);

    // Water tower on its steel frame over the tower roof's plant box.
    const w = LAYOUT.occluders.find((o) => o.roof === "tower"),
      ty = roofH("tower");
    for (const [dx, dz] of [
      [-1.6, -1.6],
      [1.6, -1.6],
      [-1.6, 1.6],
      [1.6, 1.6],
    ]) {
      const leg = new T.Mesh(new T.BoxGeometry(0.22, 4.2, 0.22), M.steel);
      leg.position.set(w.x + dx, ty + 2.1, w.z + dz);
      leg.castShadow = true;
      b.add(leg);
    }
    for (const [dx, dz, ry] of [
      [0, -1.6, 0],
      [0, 1.6, 0],
      [-1.6, 0, Math.PI / 2],
      [1.6, 0, Math.PI / 2],
    ]) {
      const brace = new T.Mesh(new T.BoxGeometry(4.4, 0.08, 0.08), M.steel);
      brace.position.set(w.x + dx, ty + 2.1, w.z + dz);
      brace.rotation.set(0, ry, 0.82);
      b.add(brace);
    }
    const deck = new T.Mesh(new T.BoxGeometry(4.4, 0.2, 4.4), M.steel);
    deck.position.set(w.x, ty + 4.2, w.z);
    this.waterTank = new T.Mesh(new T.CylinderGeometry(2.3, 2.3, 4.6, 32, 1, true), M.wood.clone());
    this.waterTank.position.set(w.x, ty + 6.6, w.z);
    const roofCone = new T.Mesh(new T.ConeGeometry(2.55, 1.5, 32), M.wood);
    roofCone.position.set(w.x, ty + 9.65, w.z);
    const snowCap = new T.Mesh(new T.ConeGeometry(2.25, 1.05, 32), M.snow);
    snowCap.position.set(w.x, ty + 9.97, w.z);
    for (const yy of [5, 6.4, 7.8]) {
      const band = new T.Mesh(new T.TorusGeometry(2.32, 0.05, 6, 48), M.steel);
      band.rotation.x = Math.PI / 2;
      band.position.set(w.x, ty + yy, w.z);
      b.add(band);
    }
    for (const m of [deck, this.waterTank, roofCone]) m.castShadow = m.receiveShadow = true;
    b.add(deck, this.waterTank, roofCone, snowCap);

    // Kessler's name in lit letters on the canal side.
    const k = LAYOUT.roofs.find((r) => r.id === "kessler"),
      sign = document.createElement("canvas");
    sign.width = 1024;
    sign.height = 128;
    const sc = sign.getContext("2d");
    sc.fillStyle = "#ffffff";
    sc.textAlign = "center";
    sc.textBaseline = "middle";
    let size = 92;
    do sc.font = `700 ${size--}px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif`;
    while (sc.measureText("KESSLER COLD STORAGE").width > 960);
    sc.fillText("KESSLER COLD STORAGE", 512, 66);
    const signTex = new T.CanvasTexture(sign);
    signTex.colorSpace = T.SRGBColorSpace;
    const board = new T.Mesh(new T.BoxGeometry(0.3, 3.6, 25), M.steel);
    board.position.set(k.x + k.w / 2 + 0.35, k.h - 2.6, k.z);
    const letters = new T.Mesh(
      new T.PlaneGeometry(24, 3),
      new T.MeshBasicMaterial({
        map: signTex,
        transparent: true,
        color: new T.Color(2.4, 1.15, 0.7),
      }),
    );
    letters.position.set(k.x + k.w / 2 + 0.52, k.h - 2.6, k.z);
    letters.rotation.y = Math.PI / 2;
    b.add(board, letters);

    // A canal along the east side: Kessler's waterline, from the Batcave clue.
    this.water = new T.Mesh(
      new T.PlaneGeometry(26, 140),
      new T.ShaderMaterial({
        fog: true,
        uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { time: { value: 0 } }]),
        vertexShader: /* glsl */ `
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
        fragmentShader: /* glsl */ `
#include <fog_pars_fragment>
varying vec2 vUv; uniform float time;
void main() {
  float wave = sin(vUv.y * 260.0 + sin(vUv.x * 40.0 + time) * 2.0 + time * 1.4) * 0.5 + 0.5;
  float glint = pow(wave, 16.0) * (0.2 + 0.8 * pow(abs(sin(vUv.x * 23.0 + vUv.y * 9.0)), 10.0));
  gl_FragColor = vec4(vec3(0.006, 0.016, 0.028) + vec3(0.09, 0.12, 0.14) * glint, 1.0);
  #include <fog_fragment>
}`,
      }),
    );
    const water = this.water;
    water.userData.live = true;
    water.rotation.x = -Math.PI / 2;
    water.position.set(138, -0.4, 18);
    b.add(water);
    for (const x of [124.5, 151.5]) {
      const quay = new T.Mesh(worldBox(1, 1.6, 140, 1), M.concrete);
      quay.position.set(x, 0, 18);
      b.add(quay);
    }
  }

  // Dish uplinks, extraction pad and markers. Poly Haven props come later in dressRoofs().
  buildProps() {
    const a = this.active,
      M = this.mats,
      roofH = (id) => LAYOUT.roofs.find((r) => r.id === id).h;
    // A parabolic dish on a mast, with a concrete ballast block.
    const profile = [];
    for (let i = 0; i <= 12; i++) {
      const r = (i / 12) * 1.15;
      profile.push(new T.Vector2(r, r * r * 0.28));
    }
    const dishGeo = new T.LatheGeometry(profile, 32);
    this.dishes = this.mission.uplinks.map((u) => {
      const g = new T.Group();
      g.position.set(u.x, roofH(u.roof), u.z);
      const ballast = new T.Mesh(worldBox(1.1, 0.35, 1.1, 1), M.concrete);
      ballast.position.y = 0.18;
      const mast = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 1.7, 10), M.steel);
      mast.position.y = 1.15;
      const head = new T.Group();
      head.position.y = 1.9;
      head.rotation.set(-0.9, (u.x * 13) % 6.28, 0, "YXZ");
      const dish = new T.Mesh(dishGeo, M.paint);
      const arm = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 1, 6), M.steel);
      arm.position.y = 0.55;
      const feed = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 0.2, 10), M.steel);
      feed.position.y = 1.05;
      head.add(dish, arm, feed);
      const lamp = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), new T.MeshBasicMaterial());
      lamp.position.set(0, 2.05, 0);
      const halo = new T.Sprite(
        new T.SpriteMaterial({
          map: this.glow,
          blending: T.AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }),
      );
      halo.scale.setScalar(1.1);
      halo.position.copy(lamp.position);
      for (const m of [ballast, mast, dish, arm, feed]) m.castShadow = true;
      g.add(ballast, mast, head, lamp, halo);
      a.add(g);
      return { g, head, lamp, halo };
    });

    // Extraction pad: a painted ring with marker lamps, lit when it is time to leave.
    const x = LAYOUT.extraction;
    const ring = new T.Mesh(
      new T.RingGeometry(x.r - 0.25, x.r, 48),
      new T.MeshStandardMaterial({
        color: 0xd8c38c,
        roughness: 0.8,
        emissive: 0xedcf87,
        emissiveIntensity: 0,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x.x, roofH(x.roof) + 0.03, x.z);
    a.add(ring);
    this.pad = ring;
    this.padLamps = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2,
        lamp = new T.Sprite(
          new T.SpriteMaterial({
            map: this.glow,
            color: 0xedcf87,
            blending: T.AdditiveBlending,
            depthWrite: false,
            transparent: true,
          }),
        );
      lamp.position.set(
        x.x + Math.cos(ang) * (x.r + 0.3),
        roofH(x.roof) + 0.15,
        x.z + Math.sin(ang) * (x.r + 0.3),
      );
      lamp.scale.setScalar(0.6);
      a.add(lamp);
      this.padLamps.push(lamp);
    }

    this.marker = new T.Mesh(
      new T.RingGeometry(0.7, 0.92, 40),
      new T.MeshBasicMaterial({
        color: new T.Color(1.4, 1.9, 2.4),
        transparent: true,
        opacity: 0.9,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    a.add(this.marker);
    // Grapple line: a thin dark cable that catches the light.
    this.line = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 6), M.steel);
    this.line.visible = false;
    a.add(this.line);
    this.interactRing = new T.Mesh(
      new T.RingGeometry(INTERACT_RANGE - 0.08, INTERACT_RANGE, 48),
      new T.MeshBasicMaterial({
        color: 0xedcf87,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.interactRing.rotation.x = -Math.PI / 2;
    this.interactRing.visible = false;
    a.add(this.interactRing);
  }

  buildLights() {
    const a = this.active;
    // Shadow-casting moonlight that follows the player; the city's own lights
    // stay as they are.
    this.moon = new T.DirectionalLight(0xbcd6ff, 0.6);
    this.moon.castShadow = true;
    // Phones get a smaller shadow map; the boom camera stays close either way.
    const coarse = matchMedia("(pointer: coarse)").matches;
    this.moon.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    const sc = this.moon.shadow.camera;
    sc.left = sc.bottom = -28;
    sc.right = sc.top = 28;
    sc.near = 1;
    sc.far = 160;
    this.moon.shadow.bias = -0.0004;
    this.moon.shadow.normalBias = 0.035;
    a.add(this.moon, this.moon.target);
    // Two real lamps where the mission needs light: the control hut and the pad.
    const hut = this.doorLamps.find((d) => d.hut);
    this.hutLight = new T.SpotLight(0xffe2bd, 9, 9, 0.55, 0.65, 1.6);
    this.hutLight.position
      .copy(hut.at)
      .add(new T.Vector3(0, 0.3, 0))
      .addScaledVector(hut.normal, 0.3);
    this.hutLight.target.position.copy(hut.at).addScaledVector(hut.normal, 2.2).setY(hut.roofY);
    const x = LAYOUT.extraction,
      th = LAYOUT.roofs.find((r) => r.id === x.roof).h;
    this.padLight = new T.PointLight(0xedcf87, 0, 12, 1.8);
    this.padLight.position.set(x.x, th + 1.6, x.z);
    a.add(this.hutLight, this.hutLight.target, this.padLight);
    // Every other door lamp is a bulb with a painted light pool: no light cost.
    const pool = glowTexture("rgba(255,190,120,0.3)", "rgba(255,170,90,0.09)"),
      bulb = new T.MeshBasicMaterial({ color: new T.Color(3, 2.2, 1.4) });
    for (const d of this.doorLamps) {
      const lamp = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), bulb);
      lamp.position.copy(d.at);
      const decal = new T.Mesh(
        new T.PlaneGeometry(6, 6),
        new T.MeshBasicMaterial({
          map: pool,
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      decal.rotation.x = -Math.PI / 2;
      decal.position
        .copy(d.at)
        .addScaledVector(d.normal, 1.8)
        .setY(d.roofY + 0.04);
      this.block.add(lamp, decal);
    }
  }

  buildCones() {
    const geo = new T.PlaneGeometry(VISION_RANGE * 2, VISION_RANGE * 2);
    geo.rotateX(-Math.PI / 2);
    this.cones = this.mission.guards.map((g) => {
      const roof = this.mission.roof(g.roof),
        mat = coneMaterial(this.origin),
        rects = LAYOUT.occluders.filter((o) => o.roof === g.roof);
      mat.uniforms.uRoof.value.set(
        roof.x - roof.w / 2 + 0.35,
        roof.z - roof.d / 2 + 0.35,
        roof.x + roof.w / 2 - 0.35,
        roof.z + roof.d / 2 - 0.35,
      );
      rects
        .slice(0, 8)
        .forEach((o, i) =>
          mat.uniforms.uRects.value[i].set(
            o.x - o.w / 2,
            o.z - o.d / 2,
            o.x + o.w / 2,
            o.z + o.d / 2,
          ),
        );
      mat.uniforms.uCount.value = Math.min(8, rects.length);
      const cone = new T.Mesh(geo, mat);
      cone.renderOrder = 3;
      cone.frustumCulled = false;
      this.active.add(cone);
      return cone;
    });
  }

  // Placeholder figures stand in until the models arrive, and stay if they fail.
  makePlaceholder(color) {
    const g = new T.Group(),
      body = new T.Mesh(
        new T.CapsuleGeometry(0.32, 1.1, 4, 10),
        new T.MeshStandardMaterial({ color, roughness: 0.7 }),
      );
    body.position.y = 0.88;
    body.castShadow = true;
    g.add(body);
    this.active.add(g);
    return { root: g, mixer: null, actions: {}, current: null };
  }
  buildFigures() {
    this.player = this.makePlaceholder(0x22262e);
    this.guardFigures = this.mission.guards.map(() => this.makePlaceholder(0x5a6472));
    this.figures = [this.player, ...this.guardFigures];
  }

  async loadAssets() {
    if (this.modelState !== "idle") return;
    this.modelState = "loading";
    const loader = createModelLoader();
    // Surfaces and props fail soft: the block keeps its plain materials.
    this.loadSurfaces().catch((e) => console.warn("Rooftop textures unavailable.", e.message));
    loader
      .loadAsync(kitUrl)
      .then((kit) => this.dressRoofs(kit.scene))
      .catch((e) => console.warn("Rooftop props unavailable.", e.message));
    try {
      const [vigilante, crew, moves] = await Promise.all(
        [vigilanteUrl, crewUrl, movesUrl].map((u) => loader.loadAsync(u)),
      );
      this.clips = Object.fromEntries(moves.animations.map((c) => [c.name, c]));
      this.swap(this.player, vigilante.scene, (m) => {
        // The suit is painted into the texture; give it a slight sheen.
        if (/Vigilante/.test(m.name)) m.roughness = 0.72;
      });
      this.dressVigilante(this.player.root);
      this.guardFigures.forEach((f, i) =>
        this.swap(f, crew.scene, (m) => {
          if (/Peasant/.test(m.name))
            m.color.setHex([0x6b7685, 0x77705f, 0x5f6b62, 0x6f6672][i % 4]);
          else if (/Hair/.test(m.name))
            m.color.setHex([0x2a211b, 0x3b2c20, 0x1c1a19, 0x4a3a2a][i % 4]);
        }),
      );
      this.modelState = "ready";
    } catch (error) {
      this.modelState = "failed";
      console.warn("Character models unavailable; placeholder figures retained.", error.message);
    }
  }
  swap(figure, source, tint) {
    const root = cloneSkinned(source);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      tint(o.material);
      this.reflect(o.material);
      o.castShadow = true;
      o.frustumCulled = false;
    });
    root.position.copy(figure.root.position);
    root.rotation.copy(figure.root.rotation);
    this.active.remove(figure.root);
    this.active.add(root);
    figure.root = root;
    figure.mixer = new T.AnimationMixer(root);
    figure.actions = {};
    for (const [name, clip] of Object.entries(this.clips)) {
      const action = figure.mixer.clipAction(clip);
      if (["takedown", "down", "hit", "jumpStart", "jumpLand"].includes(name)) {
        action.setLoop(T.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      figure.actions[name] = action;
    }
    figure.current = null;
  }
  // Cowl ears on the Head bone and a cape on the upper spine, sized from the
  // body's bind pose so they fit whatever scale the model arrives at.
  dressVigilante(root) {
    const bone = (n) => root.getObjectByName(n),
      head = bone("Head"),
      chest = bone("spine_03"),
      neck = bone("neck_01");
    if (!head || !chest || !neck) return;
    root.updateMatrixWorld(true);
    const local = (o) => root.worldToLocal(o.getWorldPosition(new T.Vector3())),
      h = local(head),
      c = local(chest),
      n = local(neck),
      box = new T.Box3().setFromObject(root),
      top = root.worldToLocal(new T.Vector3(0, box.max.y, 0)).y,
      // Toes point forward in the bind pose; the cape hangs the other way.
      front = Math.sign(local(bone("ball_l")).z - local(bone("foot_l")).z) || 1,
      suit = new T.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.6, side: T.DoubleSide });
    this.reflect(suit);
    for (const side of [-1, 1]) {
      const ear = new T.Mesh(new T.ConeGeometry(0.026, 0.12, 8), suit);
      ear.position.set(h.x + side * 0.052, top + 0.025, h.z - front * 0.01);
      ear.rotation.z = -side * 0.12;
      ear.castShadow = true;
      root.add(ear);
      head.attach(ear);
    }
    // Cape: a tapered grid hung from the shoulders, animated per vertex.
    const length = Math.max(0.9, n.y - 0.3),
      geo = new T.PlaneGeometry(1, length, 8, 12);
    geo.translate(0, -length / 2, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, -pos.getY(i) / length),
        x = pos.getX(i) * (0.44 + 0.5 * t);
      pos.setX(i, x);
      // Wrap the edges forward around the shoulders, easing out toward the hem.
      pos.setZ(i, x * x * 1.7 * (1 - 0.55 * t));
    }
    this.cape = new T.Mesh(geo, suit);
    this.cape.position.set(c.x, n.y - 0.04, c.z - front * 0.15);
    this.cape.castShadow = true;
    this.cape.userData = { base: Float32Array.from(pos.array), length, front, sway: 0 };
    root.add(this.cape);
    chest.attach(this.cape);
  }
  updateCape(dt) {
    const cape = this.cape;
    if (!cape) return;
    const p = this.mission.player,
      d = cape.userData,
      want = p.zip ? 1 : p.moving * (this.running ? 1 : 0.45);
    d.sway += (want - d.sway) * Math.min(1, dt * 3);
    const pos = cape.geometry.attributes.position,
      b = d.base,
      s = d.sway;
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3],
        t = Math.max(0, -b[i * 3 + 1] / d.length),
        flow = Math.pow(t, 1.4) * (0.05 + s * 0.45),
        ripple = Math.sin(this.time * (3 + s * 5) + t * 5 + x * 4) * 0.025 * t * (0.6 + s * 1.5);
      // Streams back and lifts as speed builds; always clears the legs.
      pos.setZ(i, d.front * (b[i * 3 + 2] - flow - ripple));
      pos.setY(i, b[i * 3 + 1] + flow * 0.35 * s);
    }
    pos.needsUpdate = true;
    cape.geometry.computeVertexNormals();
  }
  async loadSurfaces() {
    const loader = new T.TextureLoader(),
      load = (url, srgb) =>
        loader.loadAsync(url).then((t) => {
          t.wrapS = t.wrapT = T.RepeatWrapping;
          t.anisotropy = 8;
          if (srgb) t.colorSpace = T.SRGBColorSpace;
          return t;
        });
    await Promise.all(
      this.surfaces.map(async ([key, name, metres]) => {
        const maps = await Promise.all([
          load(textureUrl(`${name}_diff`), true),
          load(textureUrl(`${name}_nor`), false),
          load(textureUrl(`${name}_rough`), false),
        ]);
        // World-UV boxes are in metres; one repeat per `metres`.
        for (const t of maps) t.repeat.set(1 / metres, 1 / metres);
        const m = this.mats[key];
        [m.map, m.normalMap, m.roughnessMap] = maps;
        m.color.setHex(
          key === "kessler" || key === "brick"
            ? 0xb0aaa6
            : key === "clad"
              ? 0xb8c0c8
              : key === "bitumen"
                ? 0xc4ccd6
                : key === "asphalt"
                  ? 0x3c4249
                  : key === "pavement"
                    ? 0x9aa1a8
                    : 0xffffff,
        );
        m.needsUpdate = true;
      }),
    );
    const tank = this.waterTank.material;
    tank.map = this.mats.wood.map.clone();
    tank.map.repeat.set(5, 2);
    tank.normalMap = this.mats.wood.normalMap;
    tank.color.setHex(0xffffff);
    tank.needsUpdate = true;
    const hdr = await new HDRLoader().loadAsync(hdrUrl);
    const pmrem = new T.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();
    for (const m of [...Object.values(this.mats), tank]) this.reflect(m);
    for (const root of [this.block, this.active])
      root.traverse((o) => o.isMesh && this.reflect(o.material));
  }
  // The night HDRI lights metal, glass and wet membrane on the block only;
  // putting it on the scene would also light the city's glossy ground plane.
  reflect(material) {
    for (const m of [].concat(material)) {
      if (!this.envMap || !m?.isMeshStandardMaterial || m.envMap) continue;
      m.envMap = this.envMap;
      m.envMapIntensity = 0.45;
      m.needsUpdate = true;
    }
  }

  // Poly Haven props: ducts along parapets, condensers and fans on plant
  // rooms, crates and drums in corners. Nothing here blocks movement; it sits
  // in the parapet strip the player cannot enter, or on top of cover.
  dressRoofs(kit) {
    const templates = {};
    for (const node of [...kit.children]) {
      const box = new T.Box3().setFromObject(node),
        centre = box.getCenter(new T.Vector3());
      node.position.sub(new T.Vector3(centre.x, box.min.y, centre.z));
      const holder = new T.Group();
      holder.add(node);
      holder.userData.size = box.getSize(new T.Vector3());
      node.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = true;
        this.reflect(o.material);
      });
      templates[node.name] = holder;
    }
    this.templates = templates;
    const roofH = (id) => LAYOUT.roofs.find((r) => r.id === id).h,
      place = (name, x, y, z, rotY = 0, fit = null) => {
        const t = templates[name];
        if (!t) return null;
        const p = t.clone();
        if (fit) p.scale.setScalar(fit / Math.max(t.userData.size.x, t.userData.size.z));
        p.position.set(x, y, z);
        p.rotation.y = rotY;
        this.props.add(p);
        return p;
      };
    const rand = seeded(7),
      e = 0.42;
    for (const r of LAYOUT.roofs) {
      const y = r.h;
      // Galvanised duct run along the longest parapet on short stands, with
      // a vent hood at one end. Procedural: a straight duct is just a box.
      const alongX = r.w >= r.d,
        len = (alongX ? r.w : r.d) - 5,
        side = r.id === "tower" ? -1 : 1,
        cx = alongX ? r.x : r.x + side * (r.w / 2 - e),
        cz = alongX ? r.z + side * (r.d / 2 - e) : r.z,
        duct = new T.Mesh(
          worldBox(alongX ? len : 0.42, 0.4, alongX ? 0.42 : len, 1),
          this.mats.duct,
        );
      duct.position.set(cx, y + 0.42, cz);
      duct.castShadow = duct.receiveShadow = true;
      this.props.add(duct);
      for (let u = -len / 2 + 1; u <= len / 2 - 1; u += 2.4) {
        const stand = new T.Mesh(new T.BoxGeometry(0.5, 0.22, 0.5), this.mats.steel);
        stand.position.set(alongX ? cx + u : cx, y + 0.11, alongX ? cz : cz + u);
        this.props.add(stand);
      }
      const hoodAt = -len / 2 - 0.1;
      place(
        "ductVent",
        alongX ? cx + hoodAt : cx,
        y + 0.22,
        alongX ? cz : cz + hoodAt,
        alongX ? -Math.PI / 2 : Math.PI,
        0.45,
      );
      // A wall-hung condenser on the back of each larger plant room, its
      // pipework running down to the roof.
      for (const o of LAYOUT.occluders.filter(
        (o) => o.roof === r.id && o.height && o.w * o.d >= 12,
      )) {
        const back = o.w >= o.d ? -Math.sign(r.z - o.z) || -1 : -Math.sign(r.x - o.x) || -1,
          n = o.w >= o.d ? new T.Vector3(0, 0, back) : new T.Vector3(back, 0, 0),
          size = templates.aircon?.userData.size;
        if (!size) continue;
        const half = (o.w >= o.d ? o.d : o.w) / 2,
          unit = place(
            "aircon",
            o.x + n.x * (half + size.z * 0.4),
            y + 1.25,
            o.z + n.z * (half + size.z * 0.4),
            Math.atan2(n.x, n.z),
          );
      }
      // Clutter in two corners, inside the parapet strip.
      for (const [cx, cz] of [
        [r.x - r.w / 2 + e, r.z - r.d / 2 + e],
        [r.x + r.w / 2 - e, r.z + r.d / 2 - e],
      ]) {
        const names = ["barrel", "propane", "trashbag", "crate"];
        place(names[Math.floor(rand() * names.length)], cx, y, cz, rand() * 6, 0.62);
      }
    }
    // TOLLER's crew equipment beside the hut and the dishes.
    place("militaryCrate", 77.6, roofH("kessler"), 10.4, 0.2, 1.4);
    for (const u of LAYOUT.uplinks)
      place("utilityBox", u.x + 0.95, roofH(u.roof), u.z + 0.95, 0.4, 0.62);
    // A cage lamp over every door, the security floodlight over the hut.
    for (const d of this.doorLamps) {
      const lamp = place(
        d.hut ? "securityLight" : "cageLamp",
        d.at.x,
        d.at.y - 0.12,
        d.at.z,
        Math.atan2(d.normal.x, d.normal.z),
        d.hut ? 0.42 : 0.3,
      );
      lamp?.position.addScaledVector(d.normal, -0.1);
    }
    // Ladder up a water-tower leg.
    const w = LAYOUT.occluders.find((o) => o.roof === "tower"),
      ladder = place("ladder", w.x - 1.75, roofH("tower"), w.z + 1.75, Math.PI / 4);
    if (ladder) ladder.scale.setScalar(4.2 / Math.max(0.1, templates.ladder.userData.size.y));
    bake(this.props);
  }

  bindUI() {
    const stick = $("roof-stick"),
      knob = stick.querySelector("i");
    const moveStick = (e) => {
      const r = stick.getBoundingClientRect(),
        x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2),
        y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2),
        len = Math.max(1, Math.hypot(x, y));
      this.touch.x = x / len;
      this.touch.z = y / len;
      knob.style.transform = `translate(${(x / len) * 30}px, ${(y / len) * 30}px)`;
    };
    stick.onpointerdown = (e) => {
      stick.setPointerCapture(e.pointerId);
      moveStick(e);
    };
    stick.onpointermove = (e) => stick.hasPointerCapture(e.pointerId) && moveStick(e);
    stick.onpointerup = stick.onpointercancel = () => {
      this.touch.x = this.touch.z = 0;
      knob.style.transform = "";
    };
    const hold = (id, key) => {
      const b = $(id);
      b.onpointerdown = (e) => {
        b.setPointerCapture(e.pointerId);
        this.touch[key] = true;
      };
      b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => (this.touch[key] = false);
    };
    hold("roof-act", "act");
    $("roof-act").addEventListener("pointerdown", () => (this.actPressed = true));
    hold("roof-run", "run");
    $("roof-grapple").onpointerdown = () => (this.grapplePressed = true);
    $("roof-skip").onclick = () => this.skip();
    $("roof-pause").onclick = () => this.pause();
    // Drag anywhere on the game canvas to swing the camera.
    const canvas = $("game");
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.phase.startsWith("play")) return;
      this.drag = { id: e.pointerId, x: e.clientX };
    });
    addEventListener("pointermove", (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.yaw += ((e.clientX - this.drag.x) / innerWidth) * Math.PI * 1.6;
      this.drag.x = e.clientX;
    });
    addEventListener("pointerup", () => (this.drag = null));
    addEventListener("keydown", (e) => {
      if (this.phase === "intro") {
        if (["Space", "Enter"].includes(e.code)) {
          e.preventDefault();
          this.skip();
        }
        return;
      }
      if (this.phase !== "play" || e.repeat) return;
      if (e.code === "Space") this.grapplePressed = true;
      // Latch taps so a press released within one frame still counts.
      if (e.code === "KeyE") this.actPressed = true;
    });
  }

  // Shadows, night reflections and heavier haze apply only while on the roofs.
  applyAtmosphere(on) {
    const s = this.scene;
    if (on) {
      if (!this.savedAtmosphere)
        this.savedAtmosphere = {
          fog: s.fog?.density,
          shadows: this.renderer.shadowMap.enabled,
          groundRough: this.world.ground?.material.roughness,
        };
      // From roof height the glossy street plane mirrors the moon as a hot
      // spot; at street level it reads as wet asphalt, so only matte it here.
      if (this.world.ground) this.world.ground.material.roughness = 0.85;
      if (s.fog) s.fog.density = 0.0042;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFShadowMap;
    } else if (this.savedAtmosphere) {
      const a = this.savedAtmosphere;
      if (s.fog) s.fog.density = a.fog;
      this.renderer.shadowMap.enabled = a.shadows;
      if (this.world.ground) this.world.ground.material.roughness = a.groundRough;
      this.savedAtmosphere = null;
    }
  }

  begin() {
    clearPresentation();
    this.audio.stopVoice();
    this.audio.start();
    if (!this.player) this.buildFigures();
    this.loadAssets();
    this.saved = { fov: this.camera.fov, near: this.camera.near, far: this.camera.far };
    this.camera.fov = 52;
    this.camera.near = 0.2;
    this.camera.far = 4500;
    this.camera.updateProjectionMatrix();
    this.active.visible = true;
    this.applyAtmosphere(true);
    this.reset();
    this.phase = "intro";
    this.introTime = 0;
    this.onMode("roofIntro");
    $("pause-menu").hidden = true;
    $("roof-hud").hidden = false;
    $("roof-hud").classList.add("cinematic");
    $("roof-skip").hidden = false;
    chapterCard("CHAPTER III / PART TWO", "Kessler Cold Storage");
    this.radio(ROOFTOP_LINES.briefing);
    this.planTimer = setTimeout(
      () => this.phase === "intro" && this.radio(ROOFTOP_LINES.plan),
      3600,
    );
    window.gothamAnalytics?.event("level_start", { level_name: "rooftops" });
  }
  start() {
    this.begin();
    this.skip();
  }
  reset() {
    this.mission.reset();
    this.yaw = this.mission.player.facing;
    this.grapplePressed = this.actPressed = false;
    this.lastAlarmLine = 0;
    this.lastHeardLine = 0;
    this.penaltyFlash = 0;
    this.padStart = false;
    for (const el of $("roof-threats").children) el.hidden = true;
    for (const el of $("roof-beacons").children) el.hidden = true;
    this.landTime = 0;
    this.sneakTime = 0;
    this.takedownAnim = 0;
    for (const k in this.touch) this.touch[k] = typeof this.touch[k] === "boolean" ? false : 0;
    for (const f of this.figures) {
      f.mixer?.stopAllAction();
      f.current = null;
      f.downAt = undefined;
    }
    this.sync(0);
    this.placeCamera(1);
  }
  hide() {
    if (this.phase === "off") return;
    clearTimeout(this.planTimer);
    this.phase = "off";
    this.active.visible = false;
    this.applyAtmosphere(false);
    $("roof-hud").hidden = true;
    if (this.saved) {
      Object.assign(this.camera, this.saved);
      this.camera.updateProjectionMatrix();
    }
  }
  pause() {
    if (this.phase === "intro") return this.skip();
    if (this.phase === "play") {
      this.audio.stopVoice();
      this.phase = "paused";
      this.onMode("roofPaused");
      $("pause-title").textContent = "Holding position.";
      $("pause-copy").textContent = "The purge clock is paused.";
      $("resume").hidden = false;
      $("next-level").hidden = true;
      $("pause-menu").hidden = false;
    } else if (this.phase === "paused") {
      this.phase = "play";
      this.onMode("roof");
      $("pause-menu").hidden = true;
    }
  }
  skip() {
    if (this.phase !== "intro") return;
    clearTimeout(this.planTimer);
    this.phase = "play";
    this.onMode("roof");
    $("roof-hud").classList.remove("cinematic");
    $("roof-skip").hidden = true;
    clearPresentation();
    this.radio(ROOFTOP_LINES.start);
  }
  radio([speaker, text]) {
    const line = `${speaker} / ${text}`;
    $("roof-radio").textContent = line;
    this.audio.radioMessage?.(line);
    this.radioUntil = performance.now() + 6500;
  }
  chime(notes, type = "triangle") {
    if (!this.audio.ctx) return;
    const at = this.audio.ctx.currentTime;
    notes.forEach((f, i) => this.audio.tone(f, at + i * 0.09, 0.45, 0.05, type));
  }

  finish() {
    const m = this.mission,
      win = m.outcome === "won",
      score = win ? m.score() : 0;
    this.phase = "ended";
    this.onMode("roofEnded");
    $("roof-hud").hidden = true;
    showResults(
      "rooftops",
      win,
      m.time,
      score,
      null,
      `${m.uplinksDown}/3 uplinks · ${m.alarms} alarm${m.alarms === 1 ? "" : "s"} · ${m.takedowns} stunned${win && m.alarms === 0 ? " · GHOST" : ""}`,
    );
    window.gothamAnalytics?.event("level_end", {
      level_name: "rooftops",
      success: win,
      elapsed_seconds: m.time,
      score,
    });
    $("pause-title").textContent = win
      ? `${ANTAGONIST.codename} has a name.`
      : "The trail went cold.";
    $("pause-copy").textContent = win ? `${ANTAGONIST.name}. ${ANTAGONIST.detail}` : m.reason;
    $("resume").hidden = true;
    $("next-level").hidden = true;
    $("pause-menu").hidden = false;
  }

  handleEvents() {
    const m = this.mission;
    for (const e of m.drainEvents()) {
      if (e.type === "grapple") {
        this.chime([330, 660], "sine");
        this.play(this.player, "jumpStart", 0.08);
      } else if (e.type === "land") {
        this.landTime = 0.45;
        this.play(this.player, "jumpLand", 0.06);
      } else if (e.type === "grapple-miss") this.chime([180], "sine");
      else if (e.type === "uplink") {
        this.chime([523, 784]);
        this.radio(ROOFTOP_LINES.uplink);
      } else if (e.type === "stage")
        this.radio(e.stage === "log" ? ROOFTOP_LINES.uplinksDone : ROOFTOP_LINES.logDone);
      else if (e.type === "terminal-locked") this.radio(ROOFTOP_LINES.locked);
      else if (e.type === "jammed") {
        this.chime([180, 150], "square");
        this.radio(ROOFTOP_LINES.jammed);
      } else if (e.type === "heard") {
        this.chime([392], "sine");
        if (performance.now() - this.lastHeardLine > 15000) {
          this.lastHeardLine = performance.now();
          this.radio(ROOFTOP_LINES.heard);
        }
      } else if (e.type === "takedown") {
        this.chime([220, 880], "square");
        this.radio(ROOFTOP_LINES.takedown);
        const i = m.guards.findIndex((g) => g.id === e.guard);
        if (i >= 0) {
          this.play(this.guardFigures[i], "hit", 0.05);
          this.guardFigures[i].downAt = 0.45;
        }
        this.play(this.player, "takedown", 0.06);
        this.takedownAnim = 0.75;
      } else if (e.type === "suspicious") {
        if (performance.now() - this.lastAlarmLine > 8000) this.radio(ROOFTOP_LINES.suspicious);
        this.chime([440], "sine");
      } else if (e.type === "alarm") {
        this.lastAlarmLine = performance.now();
        this.penaltyFlash = 2.5;
        this.audio.hit?.();
        this.chime([880, 660, 880, 660], "square");
        if (e.alarms < MAX_ALARMS)
          this.radio(e.alarms === 1 ? ROOFTOP_LINES.alarm1 : ROOFTOP_LINES.alarm2);
      } else if (e.type === "end") {
        this.radio(
          m.outcome === "won"
            ? ROOFTOP_LINES.won
            : m.alarms >= MAX_ALARMS
              ? ROOFTOP_LINES.lostAlarms
              : ROOFTOP_LINES.lostTime,
        );
        if (m.outcome === "won") this.chime([392, 523, 659, 784]);
        this.endDelay = 1.6;
      }
    }
  }

  readInput() {
    const k = this.keys,
      pad = Array.from(navigator.getGamepads?.() || []).find(Boolean),
      dead = (v) => (Math.abs(v || 0) < 0.18 ? 0 : v);
    let fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - this.touch.z,
      side = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + this.touch.x;
    let act = !!(k.KeyE || this.touch.act || this.actPressed),
      run = !!(k.ShiftLeft || k.ShiftRight || this.touch.run),
      turn = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0),
      grapple = this.grapplePressed;
    if (pad) {
      fwd -= dead(pad.axes[1]);
      side += dead(pad.axes[0]);
      turn += dead(pad.axes[2]);
      act ||= !!pad.buttons[2]?.pressed;
      run ||= !!(pad.buttons[5]?.pressed || pad.buttons[7]?.pressed);
      const a = !!pad.buttons[0]?.pressed;
      if (a && !this.padGrapple) grapple = true;
      this.padGrapple = a;
      const start = !!pad.buttons[9]?.pressed;
      if (start && !this.padStart) this.pause();
      this.padStart = start;
    }
    this.grapplePressed = this.actPressed = false;
    // Camera-relative: forward is the direction the camera looks across the roof.
    const fx = Math.cos(this.yaw),
      fz = Math.sin(this.yaw);
    return {
      move: { x: fx * fwd - fz * side, z: fz * fwd + fx * side },
      run,
      act,
      grapple,
      turn,
    };
  }

  play(figure, name, fade = 0.2) {
    const next = figure?.actions[name];
    if (!next || figure.current === next) return;
    next.reset().fadeIn(fade).play();
    figure.current?.fadeOut(fade);
    figure.current = next;
  }

  // Place figures, cones and markers from mission state.
  sync(dt) {
    const m = this.mission,
      p = m.player,
      roofH = (id) => m.roof(id).h;
    if (!this.player) return;
    this.time += dt;
    const py = m.playerY();
    this.player.root.position.set(p.x, py, p.z);
    // Turn smoothly toward the facing the mission reports.
    const want = Math.PI / 2 - p.facing,
      cur = this.player.root.rotation.y,
      diff = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    this.player.root.rotation.y = cur + diff * (dt ? Math.min(1, dt * 14) : 1);

    m.guards.forEach((g, i) => {
      const f = this.guardFigures[i],
        h = roofH(g.roof);
      f.root.position.set(g.x, h, g.z);
      f.root.rotation.y = Math.PI / 2 - g.facing;
      const cone = this.cones[i],
        u = cone.material.uniforms;
      cone.visible = g.state !== "down";
      cone.position.set(g.x, h + 0.06, g.z);
      u.uGuard.value.set(g.x, g.z);
      u.uFacing.value = g.facing;
      u.uTime.value = this.time;
      u.uColor.value.copy(CONE_COLORS[g.state] || CONE_COLORS.patrol);
      u.uAlpha.value = g.state === "alert" ? 0.14 : 0.045 + g.suspicion * 0.045;
      if (this.modelState === "ready") {
        if (g.state === "down") {
          if (f.downAt !== undefined) {
            if ((f.downAt -= dt) <= 0) {
              this.play(f, "down", 0.15);
              f.downAt = undefined;
            }
          } else if (f.current !== f.actions.down) this.play(f, "down", 0);
        } else this.play(f, g.moving > 2 ? "jog" : g.moving > 0 ? "walk" : "idle");
      }
      f.mixer?.update(dt);
    });

    // Player animation: zip, takedown, hack, sprint, sneak, crouch, idle.
    const action = m.actionAt(),
      hacking =
        action &&
        (action.kind === "uplink" || (action.kind === "terminal" && !action.locked)) &&
        action.target.progress > 0;
    if (p.moving > 0.05 && !this.running) this.sneakTime = 2;
    else this.sneakTime = Math.max(0, this.sneakTime - dt);
    if (this.modelState === "ready") {
      if (this.takedownAnim > 0) this.takedownAnim -= dt;
      else if (p.zip) {
        if (p.zip.t > 0.2) this.play(this.player, "jumpLoop", 0.15);
      } else if (this.landTime > 0) this.landTime -= dt;
      else if (hacking) this.play(this.player, "hack", 0.25);
      else if (p.moving > 0.05) this.play(this.player, this.running ? "sprint" : "sneak", 0.18);
      else this.play(this.player, this.sneakTime > 0 ? "crouch" : "idle", 0.3);
      const a = this.player.current;
      if (a === this.player.actions.sneak) a.timeScale = 0.6 + p.moving * 0.7;
    }
    this.player.mixer?.update(dt);
    this.water.material.uniforms.time.value = this.time;

    m.uplinks.forEach((u, i) => {
      const d = this.dishes[i],
        blink = u.done ? 1 : 0.55 + 0.45 * Math.sin(this.time * 6 + i),
        color = u.done ? 0x58e08a : 0xff3b2e;
      d.lamp.material.color.setHex(color);
      d.halo.material.color.setHex(color);
      d.halo.material.opacity = blink;
      // Live dishes hunt slowly; dead ones droop back toward the sky.
      d.head.rotation.y += u.done ? 0 : dt * 0.15;
      d.head.rotation.x += ((u.done ? -0.25 : -0.9) - d.head.rotation.x) * Math.min(1, dt * 2);
    });
    this.drawTerminal(m);
    const extract = m.stage === "extract",
      pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
    this.pad.material.emissiveIntensity = extract ? 0.6 + pulse * 0.8 : 0;
    this.padLight.intensity = extract ? 8 + pulse * 6 : 0;
    this.padLamps.forEach((l, i) => {
      l.material.opacity = extract ? (Math.sin(this.time * 6 - i * 0.8) > 0 ? 1 : 0.25) : 0.2;
    });

    const target = !p.zip && m.phase === "play" ? grappleTarget(p, m.layout.roofs) : null;
    this.marker.visible = !!target;
    if (target) {
      this.marker.position.set(target.x, roofH(target.roof) + 0.08, target.z);
      this.marker.scale.setScalar(1 + Math.sin(this.time * 5) * 0.08);
      this.marker.material.color.copy(m.landingWatched(target) ? MARKER_WATCHED : MARKER_CLEAR);
    }
    this.target = target;
    this.line.visible = !!p.zip;
    this.updateCape(dt);
    if (p.zip) {
      const from = new T.Vector3(p.x, py + 1.5, p.z),
        to = new T.Vector3(p.zip.to.x, p.zip.to.y + PARAPET, p.zip.to.z),
        len = from.distanceTo(to);
      this.line.position.copy(from).lerp(to, 0.5);
      this.line.scale.set(1, len, 1);
      this.line.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.sub(from).normalize());
    }
    const near = action && action.kind !== "takedown" ? action.target : null;
    this.interactRing.visible = !!near;
    if (near) {
      this.interactRing.position.set(near.x, roofH(near.roof) + 0.05, near.z);
      this.interactRing.material.opacity = 0.25 + 0.2 * Math.sin(this.time * 4);
    }
    // The shadow camera follows the player along the moonlight.
    const wp = new T.Vector3(p.x, py, p.z);
    this.moon.target.position.copy(wp);
    this.moon.position.copy(wp).addScaledVector(MOON_DIR, 80);
  }

  drawTerminal(m) {
    if ((this.terminalClock = (this.terminalClock || 0) - 1) > 0) return;
    this.terminalClock = 6;
    const c = this.terminalCanvas.getContext("2d"),
      locked = m.stage === "uplinks",
      done = m.terminal.done,
      rand = seeded(Math.floor(this.time * 8));
    c.fillStyle = "#02080e";
    c.fillRect(0, 0, 256, 160);
    c.font = "bold 15px monospace";
    c.fillStyle = done ? "#58e08a" : locked ? "#ff6a55" : "#7fd0ff";
    c.fillText(
      done ? "LOG COPIED" : locked ? "ENCRYPTED · RE-KEYING" : "FLIGHT LOG · OPEN",
      12,
      24,
    );
    c.font = "11px monospace";
    for (let r = 0; r < 9; r++) {
      let line = "";
      for (let i = 0; i < 5; i++)
        line +=
          Math.floor(rand() * 0xffff)
            .toString(16)
            .padStart(4, "0") + " ";
      c.globalAlpha = 0.35 + rand() * 0.5;
      c.fillText(line, 12, 46 + r * 12);
    }
    c.globalAlpha = 1;
    if (m.terminal.progress > 0 && !done) {
      c.fillStyle = "#edcf87";
      c.fillRect(12, 148, 232 * m.terminal.progress, 5);
    }
    this.terminalTexture.needsUpdate = true;
  }

  updateHud() {
    const m = this.mission;
    $("roof-time").textContent = clock(Math.max(0, m.timeLeft()));
    $("roof-time").dataset.clockState = m.timeLeft() < 60 ? "danger" : "normal";
    $("roof-penalty").textContent = `−${clock(ALARM_TIME_PENALTY)}`;
    $("roof-penalty").hidden = !(this.penaltyFlash > 0);
    const items = $("roof-objectives").children;
    items[0].querySelector("b").textContent = `${m.uplinksDown}/3`;
    items[0].classList.toggle("done", m.stage !== "uplinks");
    items[1].classList.toggle("done", m.terminal.done);
    items[1].classList.toggle("active", m.stage === "log");
    items[2].classList.toggle("active", m.stage === "extract");
    [...$("roof-alarms").children].forEach((pip, i) => pip.classList.toggle("on", i < m.alarms));
    const watching = m.guards.reduce(
      (s, g) => Math.max(s, g.state === "alert" ? 1 : g.suspicion),
      0,
    );
    $("roof-detect").style.width = Math.round(watching * 100) + "%";
    $("roof-detect").parentElement.dataset.state = m.guards.some((g) => g.state === "alert")
      ? "alert"
      : watching > 0
        ? "suspicious"
        : "hidden";
    // Name the on-screen buttons on touch screens, the keys elsewhere.
    const touch = matchMedia("(pointer: coarse)").matches,
      act = touch ? "ACT" : "E",
      jump = touch ? "GRAPPLE" : "SPACE · GRAPPLE";
    const action = m.actionAt(),
      prompt = $("roof-prompt");
    let text = "",
      progress = 0;
    if (action?.kind === "takedown") text = `${act} · EMP TAKEDOWN`;
    else if (action?.jammed && !action.locked) text = "GUARD ON ALERT · LOSE HIM FIRST";
    else if (action?.kind === "uplink") {
      text = `HOLD ${act} · DISABLE UPLINK`;
      progress = action.target.progress;
    } else if (action?.kind === "terminal") {
      text = action.locked
        ? "LOG ENCRYPTED · DISABLE THE UPLINKS"
        : `HOLD ${act} · COPY FLIGHT LOG`;
      progress = action.target.progress;
    } else if (this.target)
      text = `${jump} → ${m.roof(this.target.roof).name}${m.landingWatched(this.target) ? " · WATCHED" : ""}`;
    prompt.querySelector("span").textContent = text;
    prompt.querySelector("i").style.width = Math.round(progress * 100) + "%";
    prompt.hidden = !text;
    $("roof-hint").textContent = action?.jammed
      ? "An alerted guard is jamming you. Break line of sight and let him stand down."
      : m.stage === "uplinks"
        ? `Find the three uplink dishes (blue markers). Stand beside one and hold ${act}.`
        : m.stage === "log"
          ? `Uplinks down. Go to the control hut on Kessler and hold ${act} at the terminal.`
          : "Log copied. Grapple to the water tower and step onto the gold pad.";
    prompt.dataset.state =
      (action?.jammed && !action.locked) || (!action && m.landingWatched(this.target))
        ? "blocked"
        : "normal";
  }

  // World markers over the current objectives, with distance; pinned to the
  // screen edge when off screen.
  updateBeacons() {
    const m = this.mission,
      p = m.player,
      box = $("roof-beacons"),
      targets =
        m.stage === "uplinks"
          ? m.uplinks.filter((u) => !u.done).map((u) => [u, `UPLINK ${u.id}`, "uplink"])
          : m.stage === "log"
            ? [[m.terminal, "FLIGHT LOG", "log"]]
            : [[m.layout.extraction, "EXTRACTION", "log"]];
    while (box.children.length < 3) {
      const el = document.createElement("div");
      el.innerHTML = "<i></i><span></span>";
      box.appendChild(el);
    }
    this.camera.updateMatrixWorld();
    const v = new T.Vector3(),
      compact = innerWidth < 900,
      placed = [];
    [...box.children].forEach((el, i) => {
      const t = targets[i];
      if (!t || this.phase !== "play") return (el.hidden = true);
      const [o, label, kind] = t;
      v.set(this.origin.x + o.x, m.roof(o.roof).h + 2.4, this.origin.z + o.z).project(this.camera);
      const behind = v.z > 1;
      let x = behind ? -v.x : v.x,
        y = behind ? -v.y : v.y;
      const edge = behind || Math.abs(x) > 0.94 || Math.abs(y) > 0.86;
      if (edge) {
        if (behind && Math.hypot(x, y) < 1e-3) y = -1;
        const k = 0.94 / Math.max(Math.abs(x), Math.abs(y) / 0.86);
        x *= k;
        y *= k;
      }
      const dist = Math.hypot(o.x - p.x, o.z - p.z) + (o.roof === p.roof ? 0 : 0.001);
      el.hidden = false;
      el.dataset.kind = kind;
      el.dataset.edge = edge ? "1" : "0";
      el.dataset.near = o.roof === p.roof && dist < 6 ? "1" : "0";
      // Keep pinned labels fully on screen and clear of the objectives panel.
      let px = (x * 0.5 + 0.5) * innerWidth,
        py = (0.5 - y * 0.5) * innerHeight;
      const panel = $("roof-status").getBoundingClientRect();
      if (px < panel.right + 20 && py < panel.bottom + 40) py = panel.bottom + 40;
      const text = `${label} · ${Math.round(dist)} M${
          o.roof === p.roof || compact ? "" : " · " + m.roof(o.roof).name
        }`,
        half = text.length * 3.4 + 8;
      px = Math.min(innerWidth - half, Math.max(half, px));
      // Nudge a label down past any earlier one it would overlap.
      for (const q of placed)
        if (Math.abs(px - q.x) < half + q.half && Math.abs(py - q.y) < 34) py = q.y + 34;
      placed.push({ x: px, y: py, half });
      el.style.left = `${px}px`;
      el.style.top = `${py}px`;
      el.querySelector("span").textContent = text;
    });
  }

  // Edge arrows toward guards who are watching the player but are off screen.
  updateThreats() {
    const m = this.mission,
      box = $("roof-threats");
    while (box.children.length < m.guards.length) box.appendChild(document.createElement("i"));
    this.camera.updateMatrixWorld();
    const v = new T.Vector3();
    m.guards.forEach((g, i) => {
      const el = box.children[i],
        watching = g.state === "alert" || (g.state === "suspicious" && g.suspicion > 0);
      if (!watching || this.phase !== "play") return (el.hidden = true);
      v.set(this.origin.x + g.x, m.roof(g.roof).h + 1.6, this.origin.z + g.z).project(this.camera);
      const behind = v.z > 1;
      if (!behind && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.88) return (el.hidden = true);
      let x = behind ? -v.x : v.x,
        y = behind ? -v.y : v.y;
      if (behind && Math.hypot(x, y) < 1e-3) y = -1;
      // Push the direction out to an inset rectangle around the screen edge.
      const k = 0.9 / Math.max(Math.abs(x), Math.abs(y) / 0.85);
      x *= k;
      y *= k;
      el.hidden = false;
      el.dataset.state = g.state === "alert" ? "alert" : "suspicious";
      el.style.left = `${(x * 0.5 + 0.5) * 100}%`;
      el.style.top = `${(0.5 - y * 0.5) * 100}%`;
      el.style.transform = `translate(-50%, -50%) rotate(${Math.atan2(-y, x)}rad)`;
    });
  }

  // Third-person boom behind the player, eased; k = 1 snaps.
  placeCamera(k) {
    const m = this.mission,
      p = m.player,
      py = m.playerY(),
      o = this.origin,
      target = new T.Vector3(o.x + p.x, py + 1.5, o.z + p.z),
      want = new T.Vector3(
        target.x - Math.cos(this.yaw) * CAMERA_DISTANCE * Math.cos(CAMERA_PITCH),
        py + 1.5 + CAMERA_DISTANCE * Math.sin(CAMERA_PITCH),
        target.z - Math.sin(this.yaw) * CAMERA_DISTANCE * Math.cos(CAMERA_PITCH),
      );
    this.camera.position.lerp(want, k);
    this.camera.lookAt(target);
  }

  update(dt, wallDt = dt) {
    if (this.phase === "off") return;
    const step = Math.min(wallDt, 0.1);
    if (this.radioUntil && performance.now() > this.radioUntil) {
      $("roof-radio").textContent = "";
      this.radioUntil = 0;
    }
    const m = this.mission,
      p = m.player;
    if (this.phase === "intro") {
      // Crane in from over the canal, across the block, down to the player.
      this.introTime += step;
      const k = smooth(Math.min(1, this.introTime / INTRO_SECONDS)),
        o = this.origin,
        kes = m.roof("kessler");
      if (k < 0.75) {
        const q = smooth(k / 0.75);
        this.camera.position.set(o.x + 175 - q * 120, 62 - q * 22, o.z + 70 - q * 50);
        this.camera.lookAt(o.x + kes.x - q * 50, kes.h * (1 - q * 0.3), o.z + kes.z - q * 12);
      } else this.placeCamera(smooth((k - 0.75) / 0.25) * 0.2);
      this.sync(step);
      if (this.introTime >= INTRO_SECONDS) this.skip();
      return;
    }
    if (this.phase === "play") {
      const input = this.readInput();
      this.running = input.run;
      this.yaw += input.turn * 2.2 * step;
      m.update(step, input);
      this.handleEvents();
      this.penaltyFlash = Math.max(0, this.penaltyFlash - step);
      this.updateHud();
      if (m.phase === "ended") this.phase = "ending";
    } else if (this.phase === "ending") {
      this.endDelay -= step;
      if (this.endDelay <= 0) this.finish();
    }
    if (this.phase !== "paused") {
      this.sync(this.phase === "ended" ? 0 : step);
      this.placeCamera(1 - Math.exp(-step * (p.zip ? 5 : 8)));
    }
    this.updateThreats();
    this.updateBeacons();
  }
}
