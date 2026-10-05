import * as T from "three";
import { createModelLoader } from "./model-loader.js";
import caveKitUrl from "./models/cave-kit.glb?url";

// The Batcomputer set for Chapter III part one, after the 1989 film's look:
// hooded CRT monitors in gunmetal housings racked on scaffold pipe, a reel to
// reel deck, a pedestal console and high-backed chair, tall equipment cabinets,
// all on a slotted steel grating deck ringed by pipe rails, inside a wet rock
// cavern. Geometry is original; the cavern rock and fittings are CC0 Poly Haven
// assets (src/models/cave-kit.glb, src/textures/cave). Built in metres, then
// scaled into the cave scene's units.

const ROCK_TEXTURES = import.meta.glob("./textures/cave/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const caveTexture = (name) => ROCK_TEXTURES[`./textures/cave/${name}.webp`];

export const SET_SCALE = 3.2;
const TAU = Math.PI * 2;

function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Slotted deck plate: rows of rounded slots, staggered, in worn dark steel.
function gratingTextures() {
  const rand = seeded(7);
  const slots = (c, w, h, plate, hole, edge) => {
    c.fillStyle = plate;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = rand() < 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.05)";
      c.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 3);
    }
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 4; col++) {
        const x = col * 128 + (row % 2 ? 64 : 0) + 14,
          y = row * 64 + 20;
        c.fillStyle = edge;
        c.beginPath();
        c.roundRect(x - 2, y - 2, 104, 28, 13);
        c.fill();
        c.fillStyle = hole;
        c.beginPath();
        c.roundRect(x, y, 100, 24, 12);
        c.fill();
      }
  };
  return {
    map: canvasTexture(512, 512, (c, w, h) => slots(c, w, h, "#4a4e55", "#050607", "#6d727a")),
    rough: canvasTexture(512, 512, (c, w, h) => slots(c, w, h, "#8a8a8a", "#ffffff", "#5a5a5a")),
  };
}

// A CRT in a gunmetal housing. Returns the group and the screen mesh; the
// screen is a slightly bulged plane that takes a canvas texture.
function crt(mats, { w, h, hood = false, speakers = false, knobs = true, depth }) {
  const g = new T.Group(),
    fw = w + (speakers ? 0.34 : 0.12),
    fh = h + (knobs ? 0.16 : 0.1),
    d = depth ?? Math.max(0.3, w * 0.75);
  // Front shell, a tapered tube housing behind it, and the bezel lip.
  const shell = new T.Mesh(new T.BoxGeometry(fw, fh, 0.16), mats.housing);
  // Face sits behind the bulged glass so its corners never clip.
  shell.position.set(0, knobs ? -0.03 : 0, -0.11);
  const tube = new T.Mesh(new T.CylinderGeometry(w * 0.32, fw * 0.62, d, 4, 1), mats.housing);
  tube.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  tube.scale.set(1, 1, fh / fw);
  tube.position.set(0, -0.02, -0.16 - d / 2);
  g.add(shell, tube);
  for (const [x, y, bw, bh] of [
    [0, h / 2 + 0.018, w + 0.05, 0.036],
    [0, -h / 2 - 0.018, w + 0.05, 0.036],
    [-w / 2 - 0.018, 0, 0.036, h],
    [w / 2 + 0.018, 0, 0.036, h],
  ]) {
    const lip = new T.Mesh(new T.BoxGeometry(bw, bh, 0.04), mats.bezel);
    lip.position.set(x, y, 0.01);
    g.add(lip);
  }
  const glassGeo = new T.PlaneGeometry(w, h, 12, 9),
    p = glassGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i) / (w / 2),
      ny = p.getY(i) / (h / 2);
    p.setZ(i, 0.022 * (1 - nx * nx * 0.6 - ny * ny * 0.6));
  }
  glassGeo.computeVertexNormals();
  const screen = new T.Mesh(glassGeo, mats.screenBlank.clone());
  screen.position.z = -0.012;
  g.add(screen);
  if (speakers)
    for (const side of [-1, 1]) {
      const grille = new T.Mesh(new T.CircleGeometry(0.07, 20), mats.grille);
      grille.position.set(side * (w / 2 + 0.09), h * 0.18, 0.002);
      const grille2 = grille.clone();
      grille2.position.y = -h * 0.18;
      g.add(grille, grille2);
    }
  if (knobs)
    for (let i = 0; i < 4; i++) {
      const knob = new T.Mesh(new T.CylinderGeometry(0.014, 0.016, 0.03, 10), mats.chrome);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(-w * 0.3 + i * w * 0.2, -h / 2 - 0.07, 0.01);
      g.add(knob);
    }
  if (hood) {
    // Sun hood: a canted roof and cheeks standing proud of the face.
    const roof = new T.Mesh(new T.BoxGeometry(fw + 0.04, 0.025, 0.2), mats.housing);
    roof.position.set(0, fh / 2 + 0.01, 0.05);
    roof.rotation.x = -0.18;
    g.add(roof);
    for (const side of [-1, 1]) {
      const cheek = new T.Mesh(new T.BoxGeometry(0.025, fh * 0.75, 0.18), mats.housing);
      cheek.position.set(side * (fw / 2 + 0.01), fh * 0.12, 0.04);
      g.add(cheek);
    }
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return { group: g, screen };
}

// Scaffold pipe from a to b with sleeve fittings at both ends.
function pipe(group, mats, a, b, r = 0.021) {
  const dir = new T.Vector3().subVectors(b, a),
    len = dir.length(),
    m = new T.Mesh(new T.CylinderGeometry(r, r, len, 10), mats.pipe);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  group.add(m);
  for (const end of [a, b]) {
    const sleeve = new T.Mesh(new T.CylinderGeometry(r * 1.55, r * 1.55, 0.06, 10), mats.pipe);
    sleeve.position.copy(end);
    sleeve.quaternion.copy(m.quaternion);
    group.add(sleeve);
  }
}

export function buildBatcave(scene) {
  const rand = seeded(1989),
    V = (x, y, z) => new T.Vector3(x, y, z),
    std = (o) => new T.MeshStandardMaterial(o),
    grate = gratingTextures(),
    mats = {
      housing: std({ color: 0x2c2f35, metalness: 0.55, roughness: 0.48 }),
      bezel: std({ color: 0x15171b, metalness: 0.4, roughness: 0.6 }),
      grille: std({ color: 0x0c0d0f, roughness: 0.9 }),
      chrome: std({ color: 0xb8bec6, metalness: 1, roughness: 0.25 }),
      pipe: std({ color: 0x80868e, metalness: 0.85, roughness: 0.45 }),
      deck: std({
        map: grate.map,
        roughnessMap: grate.rough,
        metalness: 0.5,
        roughness: 1,
        color: 0xb4b8bf,
      }),
      steel: std({ color: 0x33373d, metalness: 0.7, roughness: 0.45 }),
      leather: std({ color: 0x17181b, roughness: 0.42, metalness: 0.1 }),
      rock: std({ color: 0x4a4d52, roughness: 0.95 }),
      wet: std({ color: 0x010407, metalness: 0.85, roughness: 0.22 }),
      screenBlank: new T.MeshBasicMaterial({ color: 0x0d2333, toneMapped: false }),
      lamp: new T.MeshBasicMaterial({ color: new T.Color(4, 2.6, 1.5), toneMapped: false }),
      led: new T.MeshBasicMaterial({ color: new T.Color(0.3, 1.6, 3), toneMapped: false }),
      ledWarm: new T.MeshBasicMaterial({ color: new T.Color(3, 1, 0.35), toneMapped: false }),
    };
  const set = new T.Group();
  set.scale.setScalar(SET_SCALE);
  set.position.set(0, 0.45, -3.9);
  scene.add(set);
  const add = (o, x, y, z, ry = 0) => {
    o.position.set(x, y, z);
    o.rotation.y = ry;
    set.add(o);
    return o;
  };

  // Deck: an angular platform with chamfered front corners.
  const outline = [
    [-3.2, -2.1],
    [3.2, -2.1],
    [3.2, 1.3],
    [2.2, 2.4],
    [-2.2, 2.4],
    [-3.2, 1.3],
  ];
  const shape = new T.Shape(outline.map(([x, z]) => new T.Vector2(x, -z)));
  const deckGeo = new T.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
  deckGeo.rotateX(-Math.PI / 2);
  const uv = deckGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.1, uv.getY(i) / 1.1);
  const deck = add(new T.Mesh(deckGeo, mats.deck), 0, -0.14, 0);
  deck.receiveShadow = true;
  // Deck edge band and support columns down into the water.
  for (let i = 0; i < outline.length; i++) {
    const [ax, az] = outline[i],
      [bx, bz] = outline[(i + 1) % outline.length],
      len = Math.hypot(bx - ax, bz - az),
      band = new T.Mesh(new T.BoxGeometry(len, 0.18, 0.06), mats.steel);
    band.position.set((ax + bx) / 2, -0.09, (az + bz) / 2);
    band.rotation.y = -Math.atan2(bz - az, bx - ax);
    set.add(band);
    const col = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 2.2, 10), mats.steel);
    col.position.set(ax * 0.9, -1.25, az * 0.9);
    set.add(col);
  }
  // Catwalk out to the cave mouth, the way the intro camera arrives.
  const walk = new T.Mesh(new T.BoxGeometry(1.2, 0.08, 11), mats.deck);
  walk.geometry.attributes.uv.array.forEach((v, i, a) => (a[i] = v * (i % 2 ? 10 : 1.1)));
  add(walk, 0, -0.04, 7.9).receiveShadow = true;

  // Pipe rails round the open sides, with posts and two rails.
  const railRun = (pts, gap) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = V(pts[i][0], 0, pts[i][1]),
        b = V(pts[i + 1][0], 0, pts[i + 1][1]);
      if (gap && i === gap.index) {
        // Leave the catwalk opening clear.
        const mid = a.clone().lerp(b, 0.5),
          dir = b.clone().sub(a).normalize();
        railRun([
          [a.x, a.z],
          [mid.x - dir.x * gap.half, mid.z - dir.z * gap.half],
        ]);
        railRun([
          [mid.x + dir.x * gap.half, mid.z + dir.z * gap.half],
          [b.x, b.z],
        ]);
        continue;
      }
      for (const y of [0.5, 1.0]) pipe(set, mats, V(a.x, y, a.z), V(b.x, y, b.z));
      const posts = Math.max(1, Math.round(a.distanceTo(b) / 1.3));
      for (let k = 0; k <= posts; k++) {
        const p = a.clone().lerp(b, k / posts);
        pipe(set, mats, V(p.x, 0, p.z), V(p.x, 1.04, p.z), 0.024);
      }
    }
  };
  railRun(
    [
      [-3.1, -0.4],
      [-3.1, 1.25],
      [-2.15, 2.3],
      [2.15, 2.3],
      [3.1, 1.25],
      [3.1, 0.2],
    ],
    { index: 2, half: 0.7 },
  );
  for (const side of [-1, 1])
    for (const y of [0.5, 1.0]) pipe(set, mats, V(side * 0.62, y, 2.35), V(side * 0.62, y, 13.3));

  // Monitor wall. Screens are returned in the order the cave level expects:
  // main first, then two side CRTs, then two top CRTs, then small monitors.
  const screens = [];
  const place = (spec, x, y, z, ry = 0, rx = 0) => {
    const m = crt(mats, spec);
    m.group.position.set(x, y, z);
    m.group.rotation.set(rx, ry, 0);
    set.add(m.group);
    screens.push({ mesh: m.screen, w: spec.w, h: spec.h, main: !!spec.main });
    return m;
  };
  // Central cabinet with the main CRT and its button panel.
  const cab = add(new T.Mesh(new T.BoxGeometry(1.25, 0.95, 0.75), mats.housing), 0, 0.475, -1.65);
  cab.castShadow = cab.receiveShadow = true;
  const panel = add(new T.Mesh(new T.BoxGeometry(1.1, 0.16, 0.36), mats.bezel), 0, 1.0, -1.28);
  panel.rotation.x = 0.3;
  for (let i = 0; i < 22; i++) {
    const b = new T.Mesh(
      new T.BoxGeometry(0.045, 0.02, 0.045),
      [mats.led, mats.ledWarm, mats.chrome, mats.chrome][i % 4],
    );
    b.position.set(-0.45 + (i % 11) * 0.09, 0.09, -0.06 + Math.floor(i / 11) * 0.12);
    panel.add(b);
  }
  place({ w: 0.78, h: 0.58, speakers: true, main: true, depth: 0.6 }, 0, 1.52, -1.55);
  place({ w: 0.62, h: 0.46, hood: true }, -1.45, 1.75, -1.35, 0.42);
  place({ w: 0.62, h: 0.46, hood: true }, 1.45, 1.75, -1.35, -0.42);
  place({ w: 0.34, h: 0.26, hood: true, knobs: false }, -0.22, 2.16, -1.62, 0.06, 0.08);
  place({ w: 0.34, h: 0.26, hood: true, knobs: false }, 0.22, 2.16, -1.62, -0.06, 0.08);
  // Small monitors: left shelf pair, right stack of three, right side unit.
  place({ w: 0.26, h: 0.2 }, -1.62, 0.98, -1.25, 0.42);
  place({ w: 0.26, h: 0.2 }, -1.2, 0.72, -1.45, 0.42);
  for (let i = 0; i < 3; i++)
    place({ w: 0.18, h: 0.14, knobs: false, depth: 0.22 }, 1.12, 0.62 + i * 0.22, -1.42, -0.42);
  place({ w: 0.32, h: 0.24 }, 1.62, 1.0, -1.18, -0.42);

  // Scaffold frames behind the side CRTs and shelves.
  for (const side of [-1, 1]) {
    const cx = side * 1.42,
      frame = new T.Group();
    frame.position.set(cx, 0, -1.55);
    frame.rotation.y = -side * 0.42;
    set.add(frame);
    for (const fx of [-0.45, 0.45])
      for (const fz of [-0.25, 0.25]) pipe(frame, mats, V(fx, 0, fz), V(fx, 1.5, fz), 0.022);
    for (const fy of [0.05, 0.55, 1.05, 1.5])
      for (const fz of [-0.25, 0.25]) pipe(frame, mats, V(-0.45, fy, fz), V(0.45, fy, fz));
    for (const fy of [0.55, 1.5])
      for (const fx of [-0.45, 0.45]) pipe(frame, mats, V(fx, fy, -0.25), V(fx, fy, 0.25));
    const shelf = new T.Mesh(new T.BoxGeometry(0.92, 0.03, 0.52), mats.steel);
    shelf.position.y = 0.56;
    frame.add(shelf);
  }

  // Reel to reel deck on the left frame; reels spin while the trace runs.
  const deckBox = new T.Mesh(new T.BoxGeometry(0.46, 0.34, 0.2), mats.housing);
  add(deckBox, -1.55, 0.78, -1.05, 0.42);
  const reels = [];
  for (const dx of [-0.11, 0.11]) {
    const reel = new T.Mesh(new T.CylinderGeometry(0.085, 0.085, 0.012, 24), mats.chrome);
    reel.rotation.x = Math.PI / 2;
    const hub = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.02, 12), mats.bezel);
    reel.add(hub);
    const holder = new T.Group();
    holder.position.set(dx, 0.05, 0.106);
    holder.add(reel);
    deckBox.add(holder);
    reels.push(reel);
  }

  // Pedestal console in front of the main screen.
  const ped = add(
    new T.Mesh(new T.CylinderGeometry(0.32, 0.36, 0.72, 20), mats.housing),
    0.1,
    0.36,
    -0.82,
  );
  ped.castShadow = true;
  const desk = add(new T.Mesh(new T.BoxGeometry(0.62, 0.07, 0.36), mats.bezel), 0.1, 0.78, -0.78);
  desk.rotation.x = 0.22;
  const keys = new T.Mesh(new T.BoxGeometry(0.46, 0.02, 0.16), mats.steel);
  keys.position.set(-0.04, 0.045, 0.04);
  desk.add(keys);
  for (let i = 0; i < 6; i++) {
    const b = new T.Mesh(
      new T.CylinderGeometry(0.018, 0.018, 0.02, 10),
      i % 2 ? mats.ledWarm : mats.led,
    );
    b.position.set(0.24, 0.045, -0.1 + i * 0.04);
    desk.add(b);
  }

  // High-backed padded chair on a star base, turned toward the screens.
  const chair = new T.Group();
  for (let i = 0; i < 5; i++) {
    const leg = new T.Mesh(new T.BoxGeometry(0.06, 0.05, 0.36), mats.steel);
    leg.position.set(Math.sin((i / 5) * TAU) * 0.18, 0.05, Math.cos((i / 5) * TAU) * 0.18);
    leg.rotation.y = (i / 5) * TAU;
    chair.add(leg);
  }
  const stem = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.42, 10), mats.chrome);
  stem.position.y = 0.26;
  const seat = new T.Mesh(new T.CylinderGeometry(0.27, 0.27, 0.11, 24), mats.leather);
  seat.scale.z = 0.95;
  seat.position.y = 0.5;
  chair.add(stem, seat);
  // Tall moulded back shell with chrome edging and tufted pads facing forward.
  const backShape = new T.Shape();
  backShape.moveTo(-0.24, 0);
  backShape.lineTo(0.24, 0);
  backShape.quadraticCurveTo(0.3, 0.45, 0.22, 0.78);
  backShape.quadraticCurveTo(0, 0.88, -0.22, 0.78);
  backShape.quadraticCurveTo(-0.3, 0.45, -0.24, 0);
  const backGeo = new T.ExtrudeGeometry(backShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    bevelSegments: 3,
  });
  const chairBack = new T.Mesh(backGeo, mats.housing);
  chairBack.position.set(0, 0.55, -0.3);
  chairBack.rotation.x = -0.12;
  chair.add(chairBack);
  // Horizontal padded rolls across the front of the shell.
  for (let row = 0; row < 4; row++) {
    const roll = new T.Mesh(new T.CapsuleGeometry(0.055, 0.3, 6, 12), mats.leather);
    roll.rotation.z = Math.PI / 2;
    roll.scale.set(1, 1, 0.55);
    roll.position.set(0, 0.12 + row * 0.16, 0.1);
    chairBack.add(roll);
  }
  for (const side of [-1, 1]) {
    const arm = new T.Mesh(new T.BoxGeometry(0.07, 0.06, 0.38), mats.leather);
    arm.position.set(side * 0.29, 0.68, -0.04);
    const post = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.16, 8), mats.chrome);
    post.position.set(side * 0.29, 0.6, 0.06);
    chair.add(arm, post);
  }
  chair.traverse((o) => o.isMesh && (o.castShadow = true));
  // Swung round toward the room at the front left, below the screen line.
  add(chair, -1.35, 0, 0.75, 0.75);

  // Tall equipment cabinets on the right, one with a mushroom lever.
  const cabinet = (x, z, h, lever) => {
    const body = add(new T.Mesh(new T.BoxGeometry(0.5, h, 0.46), mats.housing), x, h / 2, z, -0.3);
    body.castShadow = true;
    for (let i = 0; i < 4; i++) {
      const vent = new T.Mesh(new T.BoxGeometry(0.06, 0.16, 0.01), mats.grille);
      vent.position.set(-0.12 + (i % 2) * 0.24, -h / 2 + 0.25 + Math.floor(i / 2) * 0.22, 0.236);
      body.add(vent);
    }
    for (let i = 0; i < 3; i++) {
      const dial = new T.Mesh(
        new T.CylinderGeometry(0.035, 0.035, 0.015, 16),
        i ? mats.chrome : mats.ledWarm,
      );
      dial.rotation.x = Math.PI / 2;
      dial.position.set(-0.13 + i * 0.13, h / 2 - 0.12, 0.236);
      body.add(dial);
    }
    if (lever) {
      const rod = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.2, 10), mats.chrome);
      rod.position.y = h / 2 + 0.1;
      const knob = new T.Mesh(
        new T.SphereGeometry(0.08, 18, 10, 0, TAU, 0, Math.PI / 2),
        mats.chrome,
      );
      knob.position.y = h / 2 + 0.2;
      body.add(rod, knob);
    }
  };
  cabinet(2.55, -0.6, 1.25, false);
  cabinet(2.7, 0.1, 1.6, true);

  // Cavern: a textured shell, CC0 rock faces dressed around it, water below.
  const shellGeo = new T.SphereGeometry(70, 64, 40),
    sp = shellGeo.attributes.position,
    v = new T.Vector3();
  for (let i = 0; i < sp.count; i++) {
    v.fromBufferAttribute(sp, i).normalize();
    const n =
      Math.sin(v.x * 7.1 + v.y * 3.3) * 0.5 +
      Math.sin(v.z * 9.7 - v.x * 4.1) * 0.35 +
      Math.sin(v.y * 15 + v.z * 11) * 0.18;
    v.multiplyScalar(70 * (1 + n * 0.09));
    sp.setXYZ(i, v.x * 1.25, v.y * 0.62 + 8, v.z * 1.1);
  }
  shellGeo.computeVertexNormals();
  const shellMat = mats.rock.clone();
  shellMat.side = T.BackSide;
  const shell = new T.Mesh(shellGeo, shellMat);
  scene.add(shell);
  const water = new T.Mesh(new T.PlaneGeometry(260, 260), mats.wet);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -5;
  scene.add(water);

  // Strings of caged work bulbs along the cavern walls give the dark depth.
  const bulbs = new T.InstancedMesh(new T.SphereGeometry(0.22, 8, 6), mats.lamp, 48),
    bm = new T.Matrix4();
  for (let i = 0; i < bulbs.count; i++) {
    const side = i < 24 ? -1 : 1,
      u = (i % 24) / 23,
      z = -50 + u * 62;
    bm.makeTranslation(
      side * (46 - Math.abs(z + 14) * 0.2),
      14 - Math.sin(u * Math.PI * 5) ** 2 * 2.5,
      z,
    );
    bulbs.setMatrixAt(i, bm);
  }
  scene.add(bulbs);
  // Their glow on the rock either side.
  for (const side of [-1, 1]) {
    const glow = new T.PointLight(0xffb070, 260, 55, 1.5);
    glow.position.set(side * 38, 12, -22);
    scene.add(glow);
  }

  // Lighting: cold cave fill, warm work lamps over the deck, CRT glow.
  scene.add(new T.HemisphereLight(0x405a7a, 0x07090c, 0.75));
  const moon = new T.DirectionalLight(0x8fb0e0, 0.9);
  moon.position.set(-30, 50, 20);
  scene.add(moon);
  const work = new T.SpotLight(0xffc98a, 380, 50, 0.55, 0.7, 1.5);
  work.position.set(4, 26, 6);
  work.target.position.set(0, 0, -6);
  work.castShadow = true;
  work.shadow.mapSize.set(1024, 1024);
  work.shadow.bias = -0.0005;
  scene.add(work, work.target);
  const rim = new T.PointLight(0x3a6dff, 60, 90, 1.2);
  rim.position.set(-30, 18, -40);
  scene.add(rim);
  const back = new T.PointLight(0xffa860, 120, 45, 1.4);
  back.position.set(30, 10, -26);
  scene.add(back);
  const screenLight = new T.PointLight(0x5fa8ff, 70, 34, 1.3);
  screenLight.position.set(0, 5, -4.5);
  scene.add(screenLight);

  // Kit and textures arrive asynchronously; the set reads without them.
  const loadKit = async () => {
    const loader = new T.TextureLoader(),
      tex = (name, srgb, repeat) =>
        loader.loadAsync(caveTexture(name)).then((t) => {
          t.wrapS = t.wrapT = T.RepeatWrapping;
          t.repeat.set(...repeat);
          t.anisotropy = 8;
          if (srgb) t.colorSpace = T.SRGBColorSpace;
          return t;
        });
    try {
      const [map, normal, rough] = await Promise.all([
        tex("rock_face_03_diff", true, [14, 5]),
        tex("rock_face_03_nor", false, [14, 5]),
        tex("rock_face_03_rough", false, [14, 5]),
      ]);
      Object.assign(shellMat, { map, normalMap: normal, roughnessMap: rough });
      shellMat.color.setHex(0x6c7480);
      shellMat.needsUpdate = true;
      const [pm, pn] = await Promise.all([
        tex("metal_plate_02_diff", true, [2, 2]),
        tex("metal_plate_02_nor", false, [2, 2]),
      ]);
      Object.assign(mats.housing, { map: pm, normalMap: pn });
      mats.housing.color.setHex(0x6a6f78);
      mats.housing.needsUpdate = true;
    } catch (e) {
      console.warn("Batcave textures unavailable.", e.message);
    }
    try {
      const kit = (await createModelLoader().loadAsync(caveKitUrl)).scene,
        piece = (name) => kit.getObjectByName(name);
      const clone = (name) => {
        const p = piece(name);
        if (!p) return null;
        const c = p.clone(true);
        c.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = o.receiveShadow = true;
          }
        });
        return c;
      };
      // Rock faces line the back and flanks of the cavern, clear of the
      // catwalk approach the intro camera flies along.
      const mat = (r) =>
        r.traverse(
          (o) =>
            o.isMesh && ((o.material = o.material.clone()), o.material.color.multiplyScalar(0.6)),
        );
      for (let i = 0, placed = 0; placed < 22 && i < 200; i++) {
        const a = Math.PI * (0.85 + rand() * 1.3),
          dist = 34 + rand() * 16,
          x = Math.cos(a) * dist * 1.15,
          z = Math.sin(a) * dist - 10;
        if (z > -4 && Math.abs(x) < 34) continue;
        const r = clone(placed % 2 ? "rockA" : "rockB");
        if (!r) break;
        r.position.set(x, -7 + rand() * 6, z);
        r.rotation.set(
          (rand() - 0.5) * 0.3,
          Math.atan2(-x, -z) + (rand() - 0.5) * 0.8,
          (rand() - 0.5) * 0.25,
        );
        r.scale.setScalar((1.6 + rand() * 1.6) * SET_SCALE * 0.5);
        mat(r);
        scene.add(r);
        placed++;
      }
      // Hanging stalactite rocks from the roof.
      for (let i = 0; i < 10; i++) {
        const r = clone("rockB");
        if (!r) break;
        r.position.set((rand() - 0.5) * 80, 30 + rand() * 6, -14 - rand() * 36);
        r.rotation.set(Math.PI, rand() * TAU, 0);
        r.scale.setScalar((1 + rand() * 1.2) * SET_SCALE * 0.5);
        scene.add(r);
      }
      // Fittings on the set: work lamps, fluorescent tubes, tool chest, camera.
      for (const [x, z] of [
        [-1.25, -1.05],
        [1.25, -1.05],
      ]) {
        const lamp = clone("hangLamp");
        if (!lamp) continue;
        lamp.position.set(x, 3.5, z);
        lamp.scale.setScalar(0.65);
        set.add(lamp);
        const bulb = new T.Mesh(new T.SphereGeometry(0.035, 10, 8), mats.lamp);
        bulb.position.set(x, 3.41, z);
        set.add(bulb);
        pipe(set, mats, V(x, 3.6, z), V(x, 5, z), 0.01);
        const spot = new T.SpotLight(0xffd3a0, 40, 14, 0.75, 0.6, 1.6);
        spot.position.set(x * SET_SCALE, 0.45 + 3.35 * SET_SCALE, -3.9 + z * SET_SCALE);
        spot.target.position.set(x * SET_SCALE, 0, -3.9 + (z - 0.2) * SET_SCALE);
        scene.add(spot, spot.target);
      }
      const tube = clone("tubeLight");
      if (tube) {
        tube.rotation.x = Math.PI / 2;
        tube.position.set(0, 2.55, -1.95);
        set.add(tube);
      }
      const chest = clone("toolChest");
      if (chest) add(chest, -2.6, 0, 0.4, 0.6);
      const cam = clone("camera");
      if (cam) {
        cam.position.set(-2.9, 1.9, -1.9);
        cam.rotation.y = 0.8;
        set.add(cam);
        pipe(set, mats, V(-2.9, 0, -1.9), V(-2.9, 1.85, -1.9), 0.02);
      }
    } catch (e) {
      console.warn("Batcave kit unavailable.", e.message);
    }
  };

  return {
    set,
    screens,
    reels,
    screenLight,
    loadKit,
    update(now, spin) {
      for (const r of reels) r.rotation.y -= spin;
    },
  };
}
