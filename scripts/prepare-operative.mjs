// Convert Quaternius' CC0 "Animated Human" into the rooftop chapter's character GLB.
//
// Source: https://opengameart.org/content/animated-human-low-poly (CC0 1.0).
// Extract the archive outside the repository to ../assets-source/quaternius-animated-human,
// then run `node scripts/prepare-operative.mjs` and `npm run compress operative`.
// No Blender is needed: three.js reads the FBX and writes glTF, glTF-Transform
// attaches the palette texture and the licence metadata.
//
// Changes from the source: scaled from centimetres to a 1.8 m figure, the two
// unnamed scratch actions and "Working" dropped, clips renamed, palette
// texture embedded. Geometry, rig and remaining animation are unchanged.
import fs from "node:fs";
import * as T from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";

const SOURCE = "../assets-source/quaternius-animated-human/Animated Human by @Quaternius";
const OUT = "src/models/operative.glb";
const HEIGHT = 1.8;
const CLIPS = {
  Idle: "idle",
  Walk: "walk",
  Run: "run",
  Jump: "jump",
  Punch: "takedown",
  Death: "down",
};

// GLTFExporter's binary path reads Blobs through FileReader, which Node lacks.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((b) => ((this.result = b), this.onloadend?.()));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString("base64")}`;
      this.onloadend?.();
    });
  }
};

const fbx = fs.readFileSync(`${SOURCE}/FBX/Animated Human.fbx`);
const model = new FBXLoader().parse(
  fbx.buffer.slice(fbx.byteOffset, fbx.byteOffset + fbx.byteLength),
  "",
);
model.updateMatrixWorld(true);
const box = new T.Box3().setFromObject(model);
model.scale.setScalar(HEIGHT / (box.max.y - box.min.y));
model.name = "Operative";
const animations = model.animations
  .map((clip) => {
    const short = clip.name.split("|").pop();
    if (!CLIPS[short]) return null;
    clip.name = CLIPS[short];
    return clip;
  })
  .filter(Boolean);
if (animations.length !== Object.keys(CLIPS).length) throw new Error("Expected clips missing");

const glb = await new GLTFExporter().parseAsync(model, { binary: true, animations });
const io = new NodeIO();
const doc = await io.readBinary(new Uint8Array(glb));
const texture = doc
  .createTexture("Palette")
  .setMimeType("image/png")
  .setImage(fs.readFileSync(`${SOURCE}/Blend/Textures/ClothedLightSkin.png`));
for (const material of doc.getRoot().listMaterials()) {
  material
    .setName("OperativePalette")
    .setBaseColorTexture(texture)
    .setBaseColorFactor([1, 1, 1, 1]);
  material.setMetallicFactor(0).setRoughnessFactor(0.85);
  // The 32 px palette must stay crisp; linear filtering would bleed bands into each other.
  material.getBaseColorTextureInfo().setMagFilter(9728).setMinFilter(9728);
}
doc.getRoot().getAsset().extras = {
  author: "Quaternius (https://quaternius.com)",
  license: "CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)",
  source: "https://opengameart.org/content/animated-human-low-poly",
  title: "Animated Human",
};
await doc.transform(dedup());
await io.write(OUT, doc);
const root = doc.getRoot();
console.log({
  bytes: fs.statSync(OUT).size,
  clips: root.listAnimations().map((a) => a.getName()),
  joints: root.listSkins()[0]?.listJoints().length,
  triangles: root
    .listMeshes()
    .reduce(
      (n, m) =>
        n +
        m
          .listPrimitives()
          .reduce((s, p) => s + (p.getIndices() || p.getAttribute("POSITION")).getCount() / 3, 0),
      0,
    ),
});
