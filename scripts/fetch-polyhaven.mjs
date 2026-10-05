// Download the CC0 Poly Haven sources used by the Kessler rooftops into
// ../assets-source/polyhaven (outside the repository). Re-run is idempotent.
// Then run scripts/build-rooftop-kit.mjs to produce the delivered assets.
//
//   node scripts/fetch-polyhaven.mjs
import fs from "node:fs";
import path from "node:path";

export const MODELS = [
  "exterior_aircon_unit",
  "modular_airduct_rectangular_01",
  "utility_box_02",
  "security_light",
  "propane_tank",
  "Barrel_01",
  "wooden_crate_01",
  "old_military_crate",
  "trashbag",
  "ladder_sectioned_01",
  "caged_hanging_light",
];
// Roof membranes, facades, parapet coping, plant-room cladding, doors, timber.
export const TEXTURES = [
  "bitumen",
  "tarred_gravel",
  "factory_brick",
  "dark_brick_wall",
  "rough_concrete",
  "corrugated_iron_02",
  "rusty_metal_shutter",
  "roof_planks",
];
export const HDRI = "rooftop_night";
const OUT = "../assets-source/polyhaven";

async function get(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}
const json = async (url) => (await fetch(url)).json();

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const credits = {};
  for (const id of MODELS) {
    const files = await json(`https://api.polyhaven.com/files/${id}`),
      gltf = files.gltf["1k"].gltf;
    await get(gltf.url, `${OUT}/models/${id}/${id}.gltf`);
    for (const [rel, f] of Object.entries(gltf.include))
      await get(f.url, `${OUT}/models/${id}/${rel}`);
    credits[id] = Object.keys((await json(`https://api.polyhaven.com/info/${id}`)).authors);
    console.log("model", id);
  }
  for (const id of TEXTURES) {
    const files = await json(`https://api.polyhaven.com/files/${id}`);
    for (const [map, key] of [
      ["Diffuse", "diff"],
      ["nor_gl", "nor"],
      ["Rough", "rough"],
    ]) {
      const f = files[map]?.["1k"]?.jpg;
      if (f) await get(f.url, `${OUT}/textures/${id}_${key}.jpg`);
    }
    credits[id] = Object.keys((await json(`https://api.polyhaven.com/info/${id}`)).authors);
    console.log("texture", id);
  }
  const hdri = await json(`https://api.polyhaven.com/files/${HDRI}`);
  await get(hdri.hdri["1k"].hdr.url, `${OUT}/hdri/${HDRI}_1k.hdr`);
  credits[HDRI] = Object.keys((await json(`https://api.polyhaven.com/info/${HDRI}`)).authors);
  fs.writeFileSync(`${OUT}/credits.json`, JSON.stringify(credits, null, 2));
  console.log("done", credits);
}
