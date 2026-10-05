// Build the Batcave assets from the CC0 Poly Haven sources fetched by
// scripts/fetch-polyhaven.mjs. Outputs:
//   src/models/cave-kit.glb       one template node per piece, shared textures
//   src/textures/cave/*.webp      cavern rock and dais steel surfaces
// Then run `npm run compress cave` (meshopt geometry).
import fs from "node:fs";
import sharp from "sharp";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  flatten,
  join,
  mergeDocuments,
  prune,
  simplify,
  textureCompress,
  unpartition,
  weld,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { CAVE_TEXTURES } from "./fetch-polyhaven.mjs";

const SRC = "../assets-source/polyhaven";
// template name -> [Poly Haven asset, top-level node names, simplify ratio]
const PIECES = {
  // Photogrammetry rock faces, scaled and repeated to build the cavern walls.
  rockA: ["rock_face_01", ["rock_face_01"], 0.5],
  rockB: ["rock_face_02", ["rock_face_02"], 0.5],
  tubeLight: ["mounted_fluorescent_lights", ["mounted_fluorescent_lights_a"], 1],
  hangLamp: ["hanging_industrial_lamp", ["hanging_industrial_lamp"], 0.5],
  toolChest: [
    "metal_tool_chest",
    [
      "metal_tool_chest_chest",
      "metal_tool_chest_hinge_chest",
      "metal_tool_chest_lid",
      "metal_tool_chest_handle_left",
      "metal_tool_chest_lock",
      "metal_tool_chest_hinge_lid",
      "metal_tool_chest_handle_right",
    ],
    0.5,
  ],
  camera: ["security_camera_02", ["security_camera_02_mount", "security_camera_02"], 0.5],
};
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const triangles = (doc) =>
  doc
    .getRoot()
    .listMeshes()
    .reduce(
      (n, m) =>
        n + m.listPrimitives().reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0),
      0,
    );

const combined = new Document();
for (const [name, [asset, keep, ratio]] of Object.entries(PIECES)) {
  const doc = await io.read(`${SRC}/models/${asset}/${asset}.gltf`),
    scene = doc.getRoot().listScenes()[0];
  const wrapper = doc.createNode(name);
  for (const node of scene.listChildren()) {
    scene.removeChild(node);
    if (keep.includes(node.getName())) wrapper.addChild(node);
  }
  scene.addChild(wrapper);
  await doc.transform(prune(), weld());
  // Small props are seen from a few metres; allow coarser error where heavily reduced.
  if (ratio < 1)
    await doc.transform(
      simplify({ simplifier: MeshoptSimplifier, ratio, error: ratio < 0.3 ? 0.02 : 0.006 }),
    );
  await doc.transform(flatten(), join(), dedup(), prune());
  // Rename after flatten so every template keeps its own top-level node.
  scene.listChildren().forEach((n) => scene.removeChild(n));
  const root = doc.createNode(name);
  doc
    .getRoot()
    .listNodes()
    .filter((n) => n !== root && n.getMesh())
    .forEach((n) => root.addChild(n));
  scene.addChild(root).setName(name);
  console.log(name.padEnd(14), triangles(doc), "tris");
  mergeDocuments(combined, doc);
}
await combined.transform(dedup(), prune(), unpartition());
const scenes = combined.getRoot().listScenes(),
  kit = combined.createScene("CaveKit");
for (const s of scenes) {
  for (const n of s.listChildren()) kit.addChild(n);
  s.dispose();
}
combined.getRoot().setDefaultScene(kit);
// Props are seen from a few metres; 512 px keeps them small. The rock faces
// are scaled up to cavern walls, so they keep 1024 px.
await combined.transform(
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: [512, 512],
    pattern: /^(?!.*rock_face).*$/,
  }),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
);
const credits = JSON.parse(fs.readFileSync(`${SRC}/credits.json`, "utf8"));
combined.getRoot().getAsset().extras = {
  author:
    [...new Set(Object.values(PIECES).flatMap(([a]) => credits[a]))].join(", ") + " (Poly Haven)",
  license: "CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)",
  source: "https://polyhaven.com/models",
  title: "Batcave rock faces and fittings",
};
await io.write("src/models/cave-kit.glb", combined);
console.log(
  "kit",
  fs.statSync("src/models/cave-kit.glb").size,
  "bytes,",
  triangles(combined),
  "tris",
);

// Surface textures: diffuse and normal at 1024, roughness at 512.
fs.mkdirSync("src/textures/cave", { recursive: true });
for (const id of CAVE_TEXTURES)
  for (const [map, size] of [
    ["diff", 1024],
    ["nor", 1024],
    ["rough", 512],
  ]) {
    const out = `src/textures/cave/${id}_${map}.webp`;
    await sharp(`${SRC}/textures/${id}_${map}.jpg`)
      .resize(size, size)
      .webp({ quality: map === "nor" ? 85 : 74 })
      .toFile(out);
  }
let bytes = 0;
for (const f of fs.readdirSync("src/textures/cave"))
  bytes += fs.statSync(`src/textures/cave/${f}`).size;
console.log("textures", (bytes / 1048576).toFixed(2), "MB");
