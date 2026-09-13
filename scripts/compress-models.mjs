// Compress the derived GLB models in public/ for delivery.
//
// Geometry is encoded with EXT_meshopt_compression and textures are converted
// to WebP at their existing resolution (capped at MAX_TEXTURE). Triangle
// counts, node structure and the embedded licence metadata are unchanged; the
// runtime decodes through src/model-loader.js. Idempotent: run it after any
// prepare-*.mjs script regenerates a model.
//
//   node scripts/compress-models.mjs            # all models
//   node scripts/compress-models.mjs batwing    # one model
import { statSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const MODELS = {
  batwing: "public/batwing.glb",
  batmobile: "public/batmobile.glb",
  predator: "public/predator.glb",
  theatre: "public/environment/theatre-kit.glb",
};
const MAX_TEXTURE = 1024;

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

// Triangles reachable from a scene. Meshes deliberately detached from the
// scene (the Batwing's display stand) are dropped by prune() and not counted.
const triangles = (doc) => {
  let n = 0;
  for (const scene of doc.getRoot().listScenes())
    scene.traverse((node) => {
      for (const p of node.getMesh()?.listPrimitives() || [])
        n += (p.getIndices()?.getCount() || p.getAttribute("POSITION").getCount()) / 3;
    });
  return n;
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODELS);
for (const name of names) {
  const path = MODELS[name];
  if (!path) throw new Error(`Unknown model "${name}". Known: ${Object.keys(MODELS).join(", ")}`);
  const doc = await io.read(path);
  const before = { bytes: statSync(path).size, tris: triangles(doc), extras: doc.getRoot().getAsset().extras };
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [MAX_TEXTURE, MAX_TEXTURE] }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  if (triangles(doc) !== before.tris) throw new Error(`${name}: triangle count changed`);
  if (JSON.stringify(doc.getRoot().getAsset().extras) !== JSON.stringify(before.extras))
    throw new Error(`${name}: licence metadata changed`);
  await io.write(path, doc);
  const after = statSync(path).size;
  console.log(
    `${name.padEnd(10)} ${(before.bytes / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB` +
      ` (${Math.round((1 - after / before.bytes) * 100)}% smaller, ${before.tris} triangles)`,
  );
}
