// Build the Kessler rooftop characters from Quaternius' CC0 packs:
//   Universal Base Characters (Standard): Superhero_Male_FullBody, Hair_Buzzed
//   Modular Character Outfits - Fantasy (Standard): Male_Peasant
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
import sharp from "sharp";

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

const UBC = `${SRC}/universal_base_characters`,
  BODY = `${UBC}/Base Characters/Superhero_Male_FullBody.gltf`;
// The body file references the hair textures beside it; the mirror keeps them
// with the rigged hairstyles.
for (const f of ["T_Hair_1_BaseColor.png", "T_Hair_1_Normal.png"])
  if (!fs.existsSync(`${UBC}/Base Characters/${f}`))
    fs.copyFileSync(`${UBC}/Hairstyles/Rigged/${f}`, `${UBC}/Base Characters/${f}`);

// The caped vigilante: Universal Base Characters' Superhero_Male body in a
// suit painted over its own UV layout. The body's shading keeps the muscle
// definition; the cowl covers everything above the mouth, with white lenses.
// Ears and cape are built in game (rooftop-level.js) on the Head and spine bones.
{
  const doc = await io.read(BODY);
  for (const node of doc.getRoot().listNodes())
    if (["Eyebrows", "Eyes"].includes(node.getName())) node.dispose();
  const mat = doc
    .getRoot()
    .listMaterials()
    .find((m) => m.getName() === "MI_Superhero_Male");
  mat.setName("MI_Vigilante_Suit");
  const bodyNode = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === "SuperHero_Male");
  mat.getBaseColorTexture().setImage(
    await suitTexture(
      `${UBC}/Base Characters/T_Superhero_Male_Dark.png`,
      bodyNode.getMesh().listPrimitives()[0],
      bodyNode
        .getSkin()
        .listJoints()
        .map((j) => j.getName()),
    ),
  );
  doc.getRoot().getAsset().extras = extras(
    "Universal Base Characters - Superhero Male (suit repaint)",
    "https://quaternius.com/packs/universalbasecharacters.html",
  );
  await doc.transform(prune(), dedup());
  await io.write("src/models/vigilante.glb", doc);
  console.log("vigilante", fs.statSync("src/models/vigilante.glb").size, "bytes");
}

// Guards: the peasant outfit ships without a head, so graft the base body's
// head and neck (triangles weighted mostly to those bones), its eyes and
// eyebrows, and the buzzed hairstyle onto the outfit's own skin.
{
  const doc = await io.read(`${SRC}/modular_character_outfits/Outfits/Male_Peasant.gltf`),
    skin = doc.getRoot().listSkins()[0],
    jointIndex = new Map(skin.listJoints().map((j, i) => [j.getName(), i])),
    parent = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === "Armature"),
    body = await io.read(BODY),
    hair = await io.read(`${UBC}/Hairstyles/Rigged/Hair_Buzzed.gltf`);
  const graft = (src, nodeName, keepTri) => {
    const srcNode = src
        .getRoot()
        .listNodes()
        .find((n) => n.getName() === nodeName),
      srcJoints = srcNode
        .getSkin()
        .listJoints()
        .map((j) => j.getName()),
      mesh = doc.createMesh(nodeName);
    for (const prim of srcNode.getMesh().listPrimitives()) {
      const idx = prim.getIndices().getArray(),
        J = prim.getAttribute("JOINTS_0"),
        W = prim.getAttribute("WEIGHTS_0"),
        dominant = (v) => {
          const w = W.getElement(v, []),
            j = J.getElement(v, []);
          let best = 0;
          for (let k = 1; k < 4; k++) if (w[k] > w[best]) best = k;
          return srcJoints[j[best]];
        },
        tris = [];
      for (let t = 0; t < idx.length; t += 3)
        if (!keepTri || [0, 1, 2].every((k) => keepTri(dominant(idx[t + k]))))
          tris.push(idx[t], idx[t + 1], idx[t + 2]);
      // Compact the kept vertices and remap joints to the outfit skin by name.
      const remap = new Map(),
        order = [];
      for (const v of tris) if (!remap.has(v)) remap.set(v, order.push(v) - 1);
      const out = doc.createPrimitive();
      for (const sem of prim.listSemantics()) {
        const a = prim.getAttribute(sem),
          n = a.getElementSize(),
          arr = new (sem === "JOINTS_0" ? Uint16Array : Float32Array)(order.length * n);
        order.forEach((v, i) => {
          const e = a.getElement(v, []);
          for (let c = 0; c < n; c++)
            arr[i * n + c] = sem === "JOINTS_0" ? jointIndex.get(srcJoints[e[c]]) : e[c];
        });
        out.setAttribute(sem, doc.createAccessor().setType(a.getType()).setArray(arr));
      }
      out.setIndices(
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(tris.map((v) => remap.get(v)))),
      );
      const m = prim.getMaterial(),
        copy = doc
          .createMaterial(m.getName())
          .setRoughnessFactor(m.getRoughnessFactor())
          .setMetallicFactor(0)
          .setBaseColorFactor(m.getBaseColorFactor())
          .setAlphaMode(m.getAlphaMode());
      for (const [get, set] of [
        ["getBaseColorTexture", "setBaseColorTexture"],
        ["getNormalTexture", "setNormalTexture"],
      ]) {
        const tex = m[get]();
        if (tex)
          copy[set](
            doc
              .createTexture(tex.getName())
              .setImage(tex.getImage())
              .setMimeType(tex.getMimeType()),
          );
      }
      out.setMaterial(copy);
      mesh.addPrimitive(out);
    }
    parent.addChild(doc.createNode(`Guard_${nodeName}`).setMesh(mesh).setSkin(skin));
  };
  graft(body, "SuperHero_Male", (j) => j === "Head" || j === "neck_01");
  graft(body, "Eyes");
  graft(body, "Eyebrows");
  graft(
    hair,
    hair
      .getRoot()
      .listNodes()
      .find((n) => n.getMesh())
      .getName(),
  );
  doc.getRoot().getAsset().extras = extras(
    "Modular Character Outfits - Male Peasant, with Universal Base Characters head and hair",
    "https://quaternius.com/packs/modularcharacteroutfitsfantasy.html",
  );
  await doc.transform(dedup(), prune());
  await io.write("src/models/crew.glb", doc);
  console.log("crew", fs.statSync("src/models/crew.glb").size, "bytes");
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

// Repaint the superhero body texture as a suit: charcoal carrying the skin's
// own shading, white cowl lenses, skin only below the cowl line. Gloves,
// gauntlets, boots, the utility belt and the chest emblem are placed from the
// mesh itself: texture triangles driven by the hand and foot bones, a band at
// the waist, and the UV of the chest's front surface. Lens coordinates are in
// the 1024 px UV layout of T_Superhero_Male_*.
async function suitTexture(file, prim, joints) {
  const { data, info } = await sharp(file)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
    W = info.width,
    k = W / 1024,
    out = Buffer.alloc(W * info.height * 3);
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3,
        [r, g, b] = [data[i], data[i + 1], data[i + 2]],
        lum = 0.3 * r + 0.59 * g + 0.11 * b,
        skin = r - b > 30,
        u = x / k,
        v = y / k,
        // Face island: mouth and chin stay bare below the cowl line.
        bare = u < 360 && v > 232 && v < 372 && Math.abs(u - 190) < 108 - (v - 232) * 0.25;
      let c;
      if (bare && skin) c = [r, g, b];
      else if (skin) {
        const s = Math.min(1.3, Math.max(0.6, lum / 150));
        c = [62 * s, 63 * s, 66 * s];
      } else c = [lum * 0.3, lum * 0.3, lum * 0.32];
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
    }

  const P = prim.getAttribute("POSITION"),
    UV = prim.getAttribute("TEXCOORD_0"),
    J = prim.getAttribute("JOINTS_0"),
    Wt = prim.getAttribute("WEIGHTS_0"),
    idx = prim.getIndices().getArray(),
    pos = (v) => P.getElement(v, []),
    uv = (v) => UV.getElement(v, []).map((c) => c * 1024),
    bone = (v) => {
      const w = Wt.getElement(v, []),
        j = J.getElement(v, []);
      let best = 0;
      for (let n = 1; n < 4; n++) if (w[n] > w[best]) best = n;
      return joints[j[best]];
    },
    gear = (v) => {
      const [x, y] = pos(v),
        b = bone(v);
      if (/hand|index|middle|ring|pinky|thumb/.test(b)) return "glove";
      if (/lowerarm/.test(b) && Math.abs(x) > 0.6) return "glove";
      if (/foot|ball/.test(b) || y < 0.42) return "boot";
      if (/pelvis|spine_01/.test(b) && y > 0.97 && y < 1.04) return "belt";
      return null;
    },
    paths = { glove: [], boot: [], belt: [] };
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]],
      kinds = tri.map(gear);
    if (!kinds[0] || kinds.some((g) => g !== kinds[0])) continue;
    const [a, b, c] = tri.map(uv);
    // Skip triangles that straddle a UV seam.
    if (Math.max(a[0], b[0], c[0]) - Math.min(a[0], b[0], c[0]) > 80) continue;
    paths[kinds[0]].push(`M${a[0]},${a[1]}L${b[0]},${b[1]}L${c[0]},${c[1]}Z`);
  }
  // Chest emblem: centre on the front surface at pectoral height, scaled and
  // turned to match the UV spacing between points either side of the sternum.
  const front = (tx, ty) => {
    let best = -1,
      bz = -Infinity;
    for (let v = 0; v < P.getCount(); v++) {
      const [x, y, z] = pos(v);
      if (Math.abs(x - tx) < 0.035 && Math.abs(y - ty) < 0.035 && z > bz) {
        bz = z;
        best = v;
      }
    }
    return uv(best);
  };
  const l = front(-0.12, 1.4),
    r = front(0.12, 1.4),
    mid = front(0, 1.4),
    span = Math.hypot(r[0] - l[0], r[1] - l[1]),
    angle = (Math.atan2(r[1] - l[1], r[0] - l[0]) * 180) / Math.PI,
    // Mirror if the UV island runs right-to-left.
    flip = Math.abs(angle) > 90 ? 180 : 0,
    scale = (span * 1.6) / 132;
  const bat =
    "M0,-14 C6,-14 9,-20 11,-26 C12,-18 16,-14 30,-14 C40,-14 54,-20 66,-28 C60,-16 60,-4 66,8 " +
    "C52,2 42,4 34,14 C28,8 20,10 14,18 C10,12 4,14 0,24 C-4,14 -10,12 -14,18 C-20,10 -28,8 -34,14 " +
    "C-42,4 -52,2 -66,8 C-60,-4 -60,-16 -66,-28 C-54,-20 -40,-14 -30,-14 C-16,-14 -12,-18 -11,-26 C-9,-20 -6,-14 0,-14 Z";
  const svg = (body) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 1024 1024">${body}</svg>`,
    );
  const tris = (d, fill) =>
    d.length ? `<path d="${d.join("")}" fill="${fill}" stroke="${fill}" stroke-width="2"/>` : "";
  console.log(
    "suit:",
    Object.entries(paths)
      .map(([k2, v]) => `${k2} ${v.length}`)
      .join(", "),
    `emblem at ${mid.map(Math.round)} span ${span.toFixed(0)} px`,
  );
  return sharp(out, { raw: { width: W, height: info.height, channels: 3 } })
    .composite([
      // Gloves and boots darken the suit but keep its shading.
      { input: svg(tris(paths.glove, "#232427") + tris(paths.boot, "#141517")), blend: "multiply" },
      { input: svg(tris(paths.belt, "#7d6732")) },
      {
        input: svg(`
          <g fill="#e8eef4">
            <path d="M118,186 L160,176 L158,190 L122,194 Z"/>
            <path d="M262,186 L220,176 L222,190 L258,194 Z"/>
          </g>
          <g transform="translate(${mid[0]} ${mid[1]}) rotate(${angle + flip}) scale(${scale})">
            <path d="${bat}" fill="#08090b" stroke="#5a5f68" stroke-width="${2 / scale}"/>
          </g>`),
      },
    ])
    .png()
    .toBuffer();
}
