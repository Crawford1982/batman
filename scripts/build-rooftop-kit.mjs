// Build the Kessler rooftop assets from the CC0 Poly Haven sources fetched by
// scripts/fetch-polyhaven.mjs. Outputs:
//   src/models/rooftop-kit.glb       one template node per prop, shared textures
//   src/textures/rooftop/*.webp      roof, facade, cladding and door surfaces
//   src/textures/rooftop/*.hdr       night environment for reflections
// Then run `npm run compress rooftop` (meshopt geometry, textures capped at 1024).
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
import { HDRI, TEXTURES } from "./fetch-polyhaven.mjs";

const SRC = "../assets-source/polyhaven";
// template name -> [Poly Haven asset, top-level node names, simplify ratio]
const PIECES = {
  // Straight duct runs are procedural boxes in game; the kit keeps the vent hood.
  aircon: ["exterior_aircon_unit", ["exterior_aircon_unit_rusted"], 0.35],
  ductVent: ["modular_airduct_rectangular_01", ["modular_airduct_rectangular_01_vent_01"], 1],
  utilityBox: ["utility_box_02", ["utility_box_02"], 0.45],
  securityLight: ["security_light", ["security_light", "security_light_glass"], 0.5],
  propane: ["propane_tank", ["propane_tank"], 0.4],
  barrel: ["Barrel_01", ["Barrel_01"], 1],
  crate: [
    "wooden_crate_01",
    ["wooden_crate_01", "wooden_crate_01_lid", "wooden_crate_01_latch"],
    0.5,
  ],
  militaryCrate: [
    "old_military_crate",
    [
      "old_military_crate_a",
      "old_military_crate_lid_a",
      "old_military_crate_latch_a",
      "old_military_crate_loop_a",
      "old_military_crate_cloth_a",
    ],
    0.4,
  ],
  trashbag: ["trashbag", ["trashbag"], 0.4],
  ladder: ["ladder_sectioned_01", ["ladder_section_01"], 0.25],
  cageLamp: ["caged_hanging_light", ["caged_hanging_light"], 0.1],
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
  kit = combined.createScene("RooftopKit");
for (const s of scenes) {
  for (const n of s.listChildren()) kit.addChild(n);
  s.dispose();
}
combined.getRoot().setDefaultScene(kit);
// Props are seen from a few metres at most; 512 px keeps the kit small.
await combined.transform(
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512] }),
);
const credits = JSON.parse(fs.readFileSync(`${SRC}/credits.json`, "utf8"));
combined.getRoot().getAsset().extras = {
  author:
    [...new Set(Object.values(PIECES).flatMap(([a]) => credits[a]))].join(", ") + " (Poly Haven)",
  license: "CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)",
  source: "https://polyhaven.com/models",
  title: "Kessler rooftop props",
};
await io.write("src/models/rooftop-kit.glb", combined);
console.log(
  "kit",
  fs.statSync("src/models/rooftop-kit.glb").size,
  "bytes,",
  triangles(combined),
  "tris",
);

// Surface textures: diffuse and normal at 1024, roughness at 512.
fs.mkdirSync("src/textures/rooftop", { recursive: true });
for (const id of TEXTURES)
  for (const [map, size] of [
    ["diff", 1024],
    ["nor", 1024],
    ["rough", 512],
  ]) {
    const out = `src/textures/rooftop/${id}_${map}.webp`;
    await sharp(`${SRC}/textures/${id}_${map}.jpg`)
      .resize(size, size)
      .webp({ quality: map === "nor" ? 85 : 74 })
      .toFile(out);
  }
fs.copyFileSync(`${SRC}/hdri/${HDRI}_1k.hdr`, `src/textures/rooftop/${HDRI}_1k.hdr`);
let bytes = 0;
for (const f of fs.readdirSync("src/textures/rooftop"))
  bytes += fs.statSync(`src/textures/rooftop/${f}`).size;
console.log("textures", (bytes / 1048576).toFixed(2), "MB");
