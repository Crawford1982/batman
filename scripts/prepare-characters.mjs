// Build the Kessler rooftop characters from Quaternius' CC0 packs:
//   Modular Character Outfits - Fantasy (Standard): Male_Ranger, Male_Peasant
//   Universal Animation Library (Standard): UAL1.glb
// All three share Quaternius' 65-joint humanoid rig, so the library's clips
// drive both outfits directly by bone name.
//
// Sources: quaternius.com / quaternius.itch.io (free Standard editions). The
// files used here were taken unmodified from the public mirror
// https://github.com/kirbycope/godot-3d-player-controller-v2 (assets/), which
// ships Quaternius' own CC0 licence files alongside them. Place the mirror's
// assets/ folder at ../assets-source/quaternius-mirror/assets, then:
//   node scripts/prepare-characters.mjs && npm run compress vigilante crew moves
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, resample } from "@gltf-transform/functions";

const SRC = "../assets-source/quaternius-mirror/assets";
const LICENCE = "CC0-1.0 (https://creativecommons.org/publicdomain/zero/1.0/)";
// Library clip -> game name.
const CLIPS = {
  Idle_Loop: "idle",
  Idle_Talking_Loop: "idleTalk",
  Walk_Loop: "walk",
  Crouch_Fwd_Loop: "sneak",
  Crouch_Idle_Loop: "crouch",
  Jog_Fwd_Loop: "jog",
  Sprint_Loop: "sprint",
  Jump_Start: "jumpStart",
  Jump_Loop: "jumpLoop",
  Jump_Land: "jumpLand",
  Punch_Cross: "takedown",
  Hit_Head: "hit",
  Death01: "down",
  Fixing_Kneeling: "hack",
  Interact: "interact",
};

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const extras = (title, source) => ({
  author: "Quaternius (https://quaternius.com)",
  license: LICENCE,
  source,
  title,
});

for (const [name, file, title] of [
  ["vigilante", "Male_Ranger", "Modular Character Outfits - Male Ranger"],
  ["crew", "Male_Peasant", "Modular Character Outfits - Male Peasant"],
]) {
  const doc = await io.read(`${SRC}/modular_character_outfits/Outfits/${file}.gltf`);
  doc.getRoot().getAsset().extras = extras(
    title,
    "https://quaternius.com/packs/modularcharacteroutfitsfantasy.html",
  );
  await doc.transform(dedup(), prune());
  await io.write(`src/models/${name}.glb`, doc);
  console.log(name, fs.statSync(`src/models/${name}.glb`).size, "bytes");
}

// Animations only: drop the mannequin's mesh and materials, keep the skeleton
// nodes the clips target, and keep only the clips the game uses.
const anim = await io.read(`${SRC}/universal_animation_library/UAL1.glb`);
for (const a of anim.getRoot().listAnimations()) {
  if (CLIPS[a.getName()]) a.setName(CLIPS[a.getName()]);
  else a.dispose();
}
for (const node of anim.getRoot().listNodes()) {
  node.setMesh(null);
  node.setSkin(null);
}
for (const m of anim.getRoot().listMeshes()) m.dispose();
for (const s of anim.getRoot().listSkins()) s.dispose();
anim.getRoot().getAsset().extras = extras(
  "Universal Animation Library",
  "https://quaternius.com/packs/universalanimationlibrary.html",
);
// The library is sampled every frame; drop keys that linear interpolation reproduces.
await anim.transform(prune({ keepLeaves: true }), resample({ tolerance: 1e-4 }));
const kept = anim
  .getRoot()
  .listAnimations()
  .map((a) => a.getName());
if (kept.length !== Object.keys(CLIPS).length) throw new Error("Missing clips: " + kept.join(","));
await io.write("src/models/moves.glb", anim);
console.log("moves", fs.statSync("src/models/moves.glb").size, "bytes", kept.join(", "));
