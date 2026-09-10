import { chapterCard, clearPresentation, showResults } from "./presentation.js";
import { updateEnemy } from "./enemy-ai.js";
import { GroundLevel } from "./ground-level.js";
import { Minimap } from "./minimap.js";
import "./minimap.css";
import { Mission, BRIEFING, FLIGHT_DURATION, FINAL_DEFENCE } from "./mission.js";
import { districtAt } from "./districts.js";
import "./mission.css";
import { createEnemy, createBomber } from "./enemy.js";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Flight, clamp, insideBuilding, segmentDistance } from "./flight.js";
import { createWorld } from "./world.js";
import { AudioSystem } from "./audio.js";
import "./style.css";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const testMode = params.has("test");
let renderer;
try {
  renderer = new T.WebGLRenderer({
    canvas: $("game"),
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (e) {
  $("error").hidden = false;
  $("error").textContent =
    "WebGL could not start. Enable hardware acceleration in your browser, then reload.";
  throw e;
}
renderer.info.autoReset = false;
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 7000),
  world = createWorld(scene),
  flight = new Flight(),
  audio = new AudioSystem();
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new T.Vector2(innerWidth, innerHeight),
  0.4,
  0.55,
  0.75,
);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const mission = new Mission(scene);
let briefingTime = 0,
  briefingChapter = -1;
const player = new T.Group();
scene.add(player);
const modelPivot = new T.Group();
player.add(modelPivot);
const playerLight = new T.PointLight(0xa8caff, 26, 35, 1);
playerLight.position.set(0, 7, 5);
player.add(playerLight);
let ready = false,
  mode = "menu",
  elapsed = 0,
  score = 0,
  kills = 0,
  lastShot = 0,
  missileCooldown = 0,
  spawnTimer = 0,
  t = 0,
  last = performance.now(),
  noticeTimer = 0,
  target = null,
  hitUntil = 0,
  frameCount = 0,
  fps = 60,
  fpsTime = 0,
  low = matchMedia("(pointer:coarse)").matches,
  gamepadPause = false;
const keys = {},
  mouse = { x: 0, y: 0, active: false, fire: false },
  touch = { x: 0, y: 0, fire: false, boost: false, up: false, down: false },
  enemies = [],
  shots = [],
  particles = [];
let aircraft = null,
  removedNodes = [];
function notice(text, duration = 4) {
  audio.radioMessage(text);
  $("message").textContent = text;
  noticeTimer = duration;
  $("message").style.opacity = 1;
}
function quality() {
  const q = $("quality").value;
  low = q === "low" || (q === "auto" && matchMedia("(pointer:coarse)").matches);
  renderer.setPixelRatio(
    low ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 1.5),
  );
  bloom.enabled = !low;
  world.setQuality(low);
  composer.setSize(innerWidth, innerHeight);
}
$("quality").onchange = quality;
quality();
new GLTFLoader().load(
  `${import.meta.env.BASE_URL}batwing.glb`,
  (g) => {
    aircraft = g.scene;
    const box = new T.Box3().setFromObject(aircraft),
      size = box.getSize(new T.Vector3()),
      center = box.getCenter(new T.Vector3());
    aircraft.position.sub(center);
    const scaled = new T.Group();
    scaled.add(aircraft);
    scaled.scale.setScalar(17 / size.x);
    scaled.rotation.y = Math.PI;
    modelPivot.add(scaled);
    aircraft.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        if (o.material) {
          o.material.envMapIntensity = 0.8;
          if (o.material.metalness > 0.8) o.material.metalness = 0.65;
        }
      }
    });
    ready = true;
    $("start").disabled = false;
    $("start").textContent = "BEGIN OPERATION  →";
    $("loading").textContent = "AIRCRAFT ONLINE · GOTHAM AWAITS";
  },
  undefined,
  (e) => {
    $("loading").textContent = "Aircraft failed to load. Reload to retry.";
    $("error").hidden = false;
    $("error").textContent = e.message;
  },
);
const flameMat = new T.MeshBasicMaterial({
  color: 0x84cdff,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
});
const flame = new T.Mesh(new T.ConeGeometry(0.55, 4, 12), flameMat);
flame.rotation.x = Math.PI / 2;
flame.position.set(0, -0.15, 6);
player.add(flame);
function spawn() {
  const e = createEnemy();
  const dir = flight.forward.clone();
  const right = new T.Vector3(1, 0, 0).applyQuaternion(flight.quaternion);
  e.position
    .copy(flight.position)
    .addScaledVector(dir, 260 + Math.random() * 240)
    .addScaledVector(right, (Math.random() - 0.5) * 260);
  e.position.y = clamp(flight.position.y + (Math.random() - 0.5) * 90, 90, 380);
  scene.add(e);
  enemies.push({
    mesh: e,
    hp: 2,
    kind: "interceptor",
    age: 0,
    fire: 6 + Math.random() * 6,
    phase: Math.random() * 6,
  });
}
const shotGeo = new T.SphereGeometry(0.4, 6, 4),
  shotMat = new T.MeshBasicMaterial({ color: 0xf4cc79 }),
  hostileMat = new T.MeshBasicMaterial({ color: 0xff624b }),
  missileMat = new T.MeshBasicMaterial({ color: 0x91e6ff });
function shoot(missile = false) {
  if (mode !== "play" || (missile ? missileCooldown > 0 : t - lastShot < 0.12))
    return;
  if (missile) {
    missileCooldown = 3;
    audio.shot(true);
  } else {
    lastShot = t;
    audio.shot();
  }
  const aimed = target;
  for (const side of missile ? [0] : [-1, 1]) {
    const m = new T.Mesh(shotGeo, missile ? missileMat : shotMat);
    m.scale.set(missile ? 1.5 : 0.65, missile ? 1.5 : 0.65, missile ? 5 : 9);
    m.quaternion.copy(flight.quaternion);
    m.position
      .copy(flight.position)
      .add(new T.Vector3(side * 3.2, 0, -7).applyQuaternion(flight.quaternion));
    const dir = flight.forward.clone();
    if (aimed) dir.subVectors(aimed.mesh.position, m.position).normalize();
    scene.add(m);
    shots.push({
      mesh: m,
      velocity: dir.multiplyScalar(missile ? 220 : 520),
      life: 3,
      enemy: false,
      missile,
      target: aimed,
    });
  }
}
function burst(pos, color = 0xffac58) {
  audio.explosion();
  for (let i = 0; i < (low ? 14 : 30); i++) {
    const m = new T.Mesh(
      shotGeo,
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
    );
    m.position.copy(pos);
    m.scale.setScalar(1 + Math.random() * 2);
    scene.add(m);
    particles.push({
      mesh: m,
      v: new T.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).multiplyScalar(65),
      life: 0.6 + Math.random() * 0.7,
    });
  }
}
function remove(arr, i) {
  scene.remove(arr[i].mesh);
  arr.splice(i, 1);
}
function damage(n) {
  if (flight.damage(n)) {
    document.body.classList.add("hit");
    setTimeout(() => document.body.classList.remove("hit"), 220);
    if (flight.health <= 0) finish(false);
  }
}
function start() {
  audio.radioTimes = {};
  clearPresentation();
  window.gothamAnalytics?.event("level_start",{level_name:"batwing"});
  audio.stopVoice();
  hitUntil = 0;
  ground.hide();
  $("next-level").hidden = true;
  if (!ready) return;
  for (const arr of [enemies, shots, particles])
    while (arr.length) remove(arr, 0);
  flight.reset();
  mission.reset();
  for (const r of world.rings) r.visible = true;
  player.visible = true;
  $("briefing").hidden = true;
  elapsed = 0;
  score = 0;
  kills = 0;
  missileCooldown = 0;
  spawnTimer = 25;
  mouse.x = mouse.y = 0;
  mouse.active = false;
  mode = "play";
  $("menu").hidden = true;
  $("pause-menu").hidden = true;
  $("hud").hidden = false;
  modelPivot.rotation.set(0, 0, 0);
  player.position.copy(flight.position);
  player.quaternion.copy(flight.quaternion);
  camera.position.copy(flight.position).add(new T.Vector3(0, 10, 30));
  audio.start();
  chapterCard("CHAPTER I / OPERATION SILENT BELL", "A guardian above Gotham");
  notice("ALFRED / The city is quiet. Get your bearings. Follow the gold heading marker.", 7);
}
function pause() {
  if (mode.startsWith("drive")) {
    ground.pause();
    return;
  }
  if (mode === "play") {
    audio.stopVoice();
    clearPresentation();
    mode = "paused";
    $("pause-title").textContent = "Patrol paused.";
    $("pause-copy").textContent = "Gotham can wait a moment.";
    $("resume").hidden = false;
    $("pause-menu").hidden = false;
  } else if (mode === "paused") {
    mode = "play";
    $("pause-menu").hidden = true;
    audio.start();
  }
}
function finish(win, reason = "") {
  audio.stopVoice();
  $("hud").hidden = true;
  showResults("batwing", win, elapsed, score, flight.health, `${kills} targets / ${mission.disabled} relays`);
  window.gothamAnalytics?.event("level_end",{level_name:"batwing",success:win,elapsed_seconds:elapsed,score});
  $("next-level").hidden = !win;
  mode = "ended";
  $("pause-title").textContent = win ? "The night is yours." : "Signal lost.";
  $("pause-copy").textContent =
    reason || (win ? "The skies are clear. Take the encrypted override to Gordon at the cathedral." : "The Batwing is down. Gotham needs its guardian.");
  $("resume").hidden = true;
  $("pause-menu").hidden = false;
}
$("start").onclick = beginBriefing;
$("skip-briefing").onclick = start;
$("pause").onclick = pause;
$("resume").onclick = pause;
$("restart").onclick = () =>
  mode.startsWith("drive") ? ground.start() : start();
$("exit").onclick = () => {
  clearPresentation();
  audio.stopVoice();
  ground.hide();
  $("next-level").hidden = true;
  mode = "menu";
  player.visible = true;
  $("briefing").hidden = true;
  $("pause-menu").hidden = true;
  $("hud").hidden = true;
  $("menu").hidden = false;
};
$("controls").onclick = () => {
  $("manual").hidden = false;
};
$("close-manual").onclick = () => {
  $("manual").hidden = true;
};
$("sound").onchange = () => audio.mute(!$("sound").checked);
addEventListener("keydown", (e) => {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  keys[e.code] = true;
  if (!e.repeat) {
    if (e.code === "Escape" || e.code === "KeyP") {
      if (mode === "briefing") start();
      else pause();
    }
    if (e.code === "KeyF") {
      if (mode === "drive") ground.emp();
      else shoot(true);
    }
    if (e.code === "KeyR" && mode === "drive") ground.resetRoad();
  }
});
addEventListener("keyup", (e) => (keys[e.code] = false));
addEventListener("blur", () => {
  for (const k in keys) keys[k] = false;
  mouse.fire = false;
  mouse.steering = false;
  for (const k in touch) touch[k] = typeof touch[k] === "boolean" ? false : 0;
  if (mode === "play" || mode === "drive") pause();
});
document.addEventListener("visibilitychange", () => {
  if (audio.ctx) (document.hidden ? audio.ctx.suspend() : audio.ctx.resume()).catch(() => {});
  if (document.hidden && (mode === "play" || mode === "drive")) pause();
});
$("game").addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse" && (mode === "play" || mode === "drive")) {
    if (mode === "drive" && !mouse.steering) return;
    if (mode === "drive") {
      mouse.x = clamp((e.clientX - mouse.steerOrigin) / Math.min(innerWidth * .22, 240), -1, 1);
      return;
    }
    mouse.x = clamp((e.clientX / innerWidth - 0.5) * 2, -1, 1);
    mouse.y = clamp((0.5 - e.clientY / innerHeight) * 2, -1, 1);
    mouse.active = true;
  }
});
$("game").addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") return;
  if (e.button === 0) {
    mouse.fire = true;
    if (mode === "drive") ground.emp();
  }
  if (e.button === 2) {
    if (mode === "drive") { mouse.steering = true; mouse.steerOrigin = e.clientX; mouse.x = 0; }
    else shoot(true);
  }
});
addEventListener("pointerup", (e) => { if (e.button === 0) mouse.fire = false; if (e.button === 2) { mouse.steering = false; mouse.x = 0; } });
addEventListener("pointercancel", () => { mouse.fire = false; mouse.steering = false; mouse.x = 0; });
addEventListener("contextmenu", (e) => e.preventDefault());
let stickId = null;
const stick = $("stick"),
  knob = stick.firstElementChild;
function stickMove(e) {
  const b = stick.getBoundingClientRect(),
    r = b.width * 0.38;
  touch.x = clamp((e.clientX - b.left - b.width / 2) / r, -1, 1);
  touch.y = clamp((b.top + b.height / 2 - e.clientY) / r, -1, 1);
  knob.style.transform = `translate(${touch.x * r}px,${-touch.y * r}px)`;
}
stick.onpointerdown = (e) => {
  stickId = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  stickMove(e);
};
stick.onpointermove = (e) => {
  if (e.pointerId === stickId) stickMove(e);
};
stick.onpointerup = stick.onpointercancel = stick.onlostpointercapture = () => {
  stickId = null;
  touch.x = touch.y = 0;
  knob.style.transform = "";
};
document.querySelectorAll("[data-hold]").forEach((b) => {
  const k = b.dataset.hold;
  b.onpointerdown = (e) => {
    b.setPointerCapture(e.pointerId);
    touch[k] = true;
  };
  b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => (touch[k] = false);
});
$("touch-missile").onpointerdown = () => shoot(true);
function input() {
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean),
    dead = (v) => (Math.abs(v || 0) < 0.13 ? 0 : v);
  let x =
      (keys.KeyD || keys.ArrowRight ? 1 : 0) -
      (keys.KeyA || keys.ArrowLeft ? 1 : 0),
    y = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
  if (!x && !y && mouse.active) {
    x = mouse.x;
    y = mouse.y;
  }
  if (stickId !== null) {
    x = touch.x;
    y = touch.y;
  }
  let yaw = 0,
    roll = (keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0),
    throttle =
      (keys.KeyW || touch.up ? 1 : 0) - (keys.KeyS || touch.down ? 1 : 0),
    boost = keys.ShiftLeft || touch.boost,
    fire = keys.Space || mouse.fire || touch.fire;
  if (pad) {
    const px = dead(pad.axes[0]),
      py = -dead(pad.axes[1]);
    if (px || py) {
      x = px;
      y = py;
      mouse.active = false;
    }
    yaw = dead(pad.axes[2]);
    roll +=
      (pad.buttons[4]?.pressed ? 1 : 0) - (pad.buttons[5]?.pressed ? 1 : 0);
    throttle +=
      (pad.buttons[12]?.pressed ? 1 : 0) - (pad.buttons[13]?.pressed ? 1 : 0);
    boost ||= pad.buttons[6]?.pressed;
    fire ||= pad.buttons[7]?.pressed;
    if (pad.buttons[0]?.pressed) shoot(true);
    const p = pad.buttons[9]?.pressed;
    if (p && !gamepadPause) {
      if (mode === "menu") beginBriefing();
      else if (mode === "briefing") start();
      else pause();
    }
    gamepadPause = p;
  }
  return { x, y, yaw, roll, throttle, boost, fire };
}
const ground = new GroundLevel({
  scene,
  camera,
  world,
  audio,
  keys,
  mouse,
  onMode: (value) => (mode = value),
  onExit: () => $("exit").click(),
});
function beginGround() {
  player.visible = false;
  for (const a of [enemies, shots, particles]) while (a.length) remove(a, 0);
  for (const r of mission.relays) r.mesh.visible = false;
  for (const r of world.rings) r.visible = false;
  $("menu").hidden = true;
  $("hud").hidden = true;
  $("briefing").hidden = true;
  $("next-level").hidden = true;
  ground.begin();
}
$("start-ground").onclick = beginGround;
$("next-level").onclick = beginGround;
const camOffset = new T.Vector3(),
  look = new T.Vector3(),
  temp = new T.Vector3();
const minimap = new Minimap(
  $("radar").querySelector("canvas"),
  world.buildings,
);
function update(dt, wallDt = dt) {
  if (mode.startsWith("drive")) {
    ground.update(dt, wallDt);
    return;
  }
  const controls = input();
  if (mode === "play") {
    if (Math.hypot(flight.position.x, flight.position.z) > 3000) {
      const home = Math.atan2(flight.position.x, flight.position.z),
        delta = Math.atan2(
          Math.sin(home - flight.yaw),
          Math.cos(home - flight.yaw),
        );
      controls.x = clamp(-delta * 2, -1, 1);
      controls.boost = false;
    }
    elapsed += wallDt;
    score += 0;
    missileCooldown = Math.max(0, missileCooldown - dt);
    flight.update(dt, controls);
    if (Math.hypot(flight.position.x, flight.position.z) > 3150) {
      notice("CITY PERIMETER · RETURNING TO GOTHAM", 2);
    }
    for (const b of world.buildings)
      if (insideBuilding(flight.position, b)) {
        damage(8);
        flight.recoverFrom(b);
        notice("PROXIMITY ALERT · AUTO RECOVERY", 2);
        break;
      }
    if (flight.position.y <= 16) {
      damage(4);
      flight.position.y = 24;
      flight.pitch = 0.2;
    }
    for (const r of world.rings)
      if (r.visible && r.position.distanceTo(flight.position) < 25) {
        flight.health = Math.min(100, flight.health + 25);
        score += 150;
        r.visible = false;
        setTimeout(() => (r.visible = true), 30000);
        notice("WAYNE RESUPPLY · ARMOR RESTORED");
      }
    player.position.copy(flight.position);
    player.quaternion.copy(flight.quaternion);
    modelPivot.rotation.set(0, 0, 0);
    flame.scale.y = (controls.boost ? 2 : 1) * (1 + Math.random() * 0.3);
    flame.visible = true;
    target = null;
    let best = 0.91;
    for (const e of [...enemies, ...mission.remaining]) {
      const direction = temp.subVectors(e.mesh.position, flight.position);
      const distance = direction.length(),
        dot = direction.normalize().dot(flight.forward);
      if (dot > best && distance < 700) {
        best = dot;
        target = e;
      }
    }
    if (controls.fire) shoot();
    spawnTimer -= dt;
    if (
      mission.phase !== "patrol" && mission.phase !== "defend" && spawnTimer <= 0 &&
      enemies.filter(e=>e.kind !== "bomber").length < 2
    ) {
      spawn();
      spawnTimer = mission.phase === "defend" ? 12 : 18;
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.age += dt;
      if (e.kind === "bomber") {
        const to = new T.Vector3().subVectors(e.destination, e.mesh.position);
        if (to.length() < 18) {
          burst(e.destination);
          e.hp = 0;
          mission.impact();
          notice("GORDON / Shelter hit. City grid integrity falling.", 6);
          remove(enemies, i);
          continue;
        }
        e.mesh.lookAt(e.destination);
        e.mesh.position.addScaledVector(to.normalize(), dt * 12);
        continue;
      }
      const attack = updateEnemy(e, flight, dt);
      if (attack) {
        const m = new T.Mesh(shotGeo, hostileMat);
        m.position.copy(e.mesh.position); m.scale.setScalar(1.4); scene.add(m);
        shots.push({mesh:m,velocity:attack.multiplyScalar(95),life:5,enemy:true});
      }
      if (!e.guard && e.mesh.position.distanceTo(flight.position)>1100) remove(enemies,i);

    }
    updateProjectiles(dt);
    if (mode !== "play") return;
    const previousPhase = mission.phase;
    const raid = mission.update(wallDt, elapsed, enemies.filter(e=>e.kind === 'bomber').length);
    if (mission.phase !== previousPhase) {
      chapterCard(mission.phase === 'defend' ? '03 / FINAL ATTACK' : '02 / INTERCEPTION', mission.phase === 'defend' ? 'Hold the evacuation corridor' : 'Break the rogue network');
      notice(mission.phase === 'defend'
      ? 'GORDON / Relays offline. Final evacuation underway. Stop the last three bombers.'
      : 'ALFRED / Attack source identified. Disable the three red command relays.', 8);
    }
    if (raid) spawnBomber(raid);
    if (mission.city <= 0) {
      finish(
        false,
        "The heating grid has collapsed. Intercept bombers before they reach the shelters.",
      );
      return;
    }
    const outcome = mission.outcome(elapsed, enemies.filter(e=>e.kind === 'bomber').length);
    if (outcome) {
      finish(outcome === 'won', outcome === 'won'
        ? 'Final attack contained. Evacuation complete. Take the override to Gordon in Chapter II.'
        : 'The evacuation window closed. Disable all three relays and contain the final raid before time runs out.');
      return;
    }
    camOffset
      .set(0, 9, 29 + (flight.speed - 65) * 0.06)
      .applyQuaternion(
        new T.Quaternion().setFromEuler(
          new T.Euler(flight.pitch * 0.4, flight.yaw, 0, "YXZ"),
        ),
      )
      .add(flight.position);
    camera.position.lerp(camOffset, 1 - Math.exp(-dt * 5));
    look.copy(flight.position).addScaledVector(flight.forward, 70);
    camera.up.set(-Math.sin(flight.roll * 0.12), 1, 0);
    camera.lookAt(look);
    camera.fov += (58 + (controls.boost ? 9 : 0) - camera.fov) * dt * 2;
    camera.updateProjectionMatrix();
    const left = Math.max(0, Math.ceil(FLIGHT_DURATION - elapsed));
    $("timer").textContent =
      `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
    $("hp").textContent = `${Math.round(flight.health)}%`;
    $("health").style.width = flight.health + "%";
    $("speed").textContent = Math.round(flight.speed * 2);
    $("alt").textContent = Math.round(flight.position.y);
    $("kills").textContent = String(kills).padStart(2, "0");
    $("score").textContent = String(score).padStart(6, "0") + " PTS";
    $("weapon").textContent =
      missileCooldown > 0
        ? `MISSILE REARMING · ${missileCooldown.toFixed(1)}s`
        : "CANNONS READY · MISSILES ONLINE";
    $("crosshair").classList.toggle("lock", !!target);
    const liveTarget = target && target.hp > 0;
    $("crosshair").classList.toggle("confirmed", t < hitUntil);
    $("target-label").textContent = liveTarget
      ? `${target.kind === 'relay' ? 'COMMAND RELAY' : target.kind === 'bomber' ? 'HEAVY BOMBER' : target.kind === 'escort' ? 'ESCORT' : 'INTERCEPTOR'} · ${Math.round(target.mesh.position.distanceTo(flight.position))} M · FIRE`
      : t < hitUntil ? "HIT CONFIRMED" : "";
    $("target-armour").hidden = !liveTarget;
    if (liveTarget) {
      const percent = clamp(target.hp / (target.kind === 'relay' ? 12 : target.kind === 'bomber' ? 9 : 2) * 100, 0, 100);
      $("target-armour").firstElementChild.style.width = percent + '%';
      $("target-armour").setAttribute('aria-label', `Target armour ${Math.ceil(percent)} percent`);
    }
    noticeTimer -= dt;
    if (noticeTimer <= 0) $("message").style.opacity = 0;
    $("attack-warning").hidden = !enemies.some(e=>e.ai?.phase === "warning");
    updateMissionHUD();
    minimap.update(flight, mission, enemies, world.rings, t);
  } else if (mode === "briefing") {
    updateBriefing(dt);
  } else if (mode === "menu") {
    player.position.set(0, 450, 0);
    player.rotation.set(0, 0, 0);
    modelPivot.rotation.set(0.95, 0, -0.12 + Math.sin(t * 0.2) * 0.06);
    camera.position.set(-24, 438, 48);
    camera.up.set(0, 1, 0);
    camera.lookAt(-15, 438, 0);
    world.moon.position
      .copy(camera.position)
      .add(
        temp.subVectors(player.position, camera.position).multiplyScalar(15),
      );
    world.moon.scale.set(330, 330, 1);
    flame.visible = false;
  }
  if (mode !== "menu") {
    world.moon.position
      .copy(camera.position)
      .add(new T.Vector3(500, 900, -2100));
    world.moon.scale.set(460, 460, 1);
  }
  if (mode === "play" || mode === "menu" || mode === "briefing") {
    world.update(dt, player.position, t);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.material.opacity = Math.max(0, p.life);
      p.mesh.scale.multiplyScalar(1 + dt);
      if (p.life <= 0) {
        p.mesh.material.dispose();
        remove(particles, i);
      }
    }
  }
  audio.update(flight.speed, mode === "play");
}
function frame(now) {
  requestAnimationFrame(frame);
  const frameSeconds = (now - last) / 1000;
  const dt = Math.min(frameSeconds, 0.05);
  last = now;
  t += dt;
  update(dt, Math.max(0, frameSeconds));
  renderer.info.reset();
  if (low) renderer.render(scene, camera);
  else composer.render();
  frameCount++;
  fpsTime += frameSeconds;
  if (fpsTime >= 2) {
    fps = frameCount / fpsTime;
    frameCount = 0;
    fpsTime = 0;
    if ($("quality").value === "auto" && low && fps < 28 && (mode === "play" || mode === "drive")) {
      renderer.setPixelRatio(Math.max(.6, renderer.getPixelRatio() * .85));
      composer.setSize(innerWidth, innerHeight);
    }
    if (
      $("quality").value === "auto" &&
      fps < 42 &&
      !low &&
      (mode === "play" || mode === "drive")
    ) {
      low = true;
      renderer.setPixelRatio(Math.min(1, 1280 / innerWidth));
      bloom.enabled = false;
      world.setQuality(true);
      composer.setSize(innerWidth, innerHeight);
    }
  }
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
window.__batwing = {
  get ready() {
    return ready;
  },
  get state() {
    return {
      mode,
      elapsed,
      city: mission.city,
      relays: mission.disabled,
      health: flight.health,
      score,
      kills,
      enemies: enemies.length,
      shots: shots.length,
      position: flight.position.toArray(),
      fps,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      modelLoaded: !!aircraft,
      groundReady: ground.ready,
      groundPhase: ground.phase,
      groundHealth: ground.car.health,
      groundCheckpoint: ground.car.checkpoint,
      groundTime: ground.car.elapsed,
      groundPosition: ground.car.position.toArray(),
    };
  },
  start,
  pause,
};
if (testMode)
  Object.assign(window.__batwing, {
    step: update,
    flight,
    world,
    mission,
    shoot,
    spawn,
    spawnBomber,
    enemies,
    finish,
    beginBriefing,
    ground,
    beginGround,
  });

function beginBriefing() {
  clearPresentation();
  audio.stopVoice();
  ground.hide();
  $("next-level").hidden = true;
  if (!ready) return;
  mode = "briefing";
  briefingTime = 0;
  briefingChapter = -1;
  player.visible = false;
  $("menu").hidden = true;
  $("hud").hidden = true;
  $("pause-menu").hidden = true;
  $("briefing").hidden = false;
  mission.reset();
  audio.start();
  audio.preloadVoices();
}
function updateBriefing(dt) {
  if (document.hidden) return;
  briefingTime += dt;
  const chapter = Math.min(2, Math.floor(briefingTime / 7.6));
  const shot = BRIEFING[chapter];
  if (chapter !== briefingChapter) {
    briefingChapter = chapter;
    $("brief-title").textContent = shot.title;
    $("brief-text").textContent = shot.text;
    $("brief-speaker").textContent = shot.speaker;
    audio.speak(shot.voice);
    $("brief-location").textContent = shot.location;
    document
      .querySelectorAll(".brief-chapters i")
      .forEach((el, i) => el.classList.toggle("active", i === chapter));
    const panel = document.querySelector(".cinema-copy");
    panel.style.animation = "none";
    void panel.offsetWidth;
    panel.style.animation = "";
  }
  const progress = (briefingTime % 7.6) / 7.6;
  camera.position
    .copy(shot.eye)
    .add(
      new T.Vector3(
        progress * 75,
        Math.sin(progress * Math.PI) * 12,
        -progress * 30,
      ),
    );
  camera.up.set(0, 1, 0);
  camera.fov = 58;
  camera.updateProjectionMatrix();
  camera.lookAt(shot.target);
  player.position.copy(camera.position);
  if (briefingTime >= 22.8) start();
}
function spawnBomber(site) {
  if (enemies.filter((e) => e.kind === "bomber").length >= 3) return;
  const mesh = createBomber();
  mesh.scale.setScalar(1.35);
  const destination = new T.Vector3(site.x, site.y, site.z);
  const approach = new T.Vector3(
    flight.position.x - site.x,
    0,
    flight.position.z - site.z,
  );
  if (approach.length() < 1) approach.set(0, 0, 1);
  approach.normalize();
  mesh.position.copy(destination).addScaledVector(approach, 1050);
  mesh.position.y = Math.min(370, site.y + 60);
  scene.add(mesh);
  enemies.push({
    mesh,
    hp: 9,
    age: 0,
    kind: "bomber",
    name: site.name,
    destination,
  });
  const bomber = enemies[enemies.length-1];
  const escort = enemies.find(e=>e.kind !== 'bomber' && !e.guard);
  if (escort) {
    escort.kind='escort';escort.guard=bomber;escort.ai=null;
    // Existing aircraft fly into formation rather than teleporting or raising the cap.
  }
  notice(`GORDON / Bomber inbound to ${site.name}.${escort ? ' Escort detected.' : ''} Intercept it.`, 7);
}
function updateProjectiles(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i],
      prev = shot.mesh.position.clone();
    if (
      shot.missile &&
      (enemies.includes(shot.target) || mission.remaining.includes(shot.target))
    ) {
      const desired = new T.Vector3()
        .subVectors(shot.target.mesh.position, shot.mesh.position)
        .normalize()
        .multiplyScalar(260);
      shot.velocity.lerp(desired, 1 - Math.exp(-dt * 5));
      shot.mesh.quaternion.setFromUnitVectors(
        new T.Vector3(0, 0, 1),
        shot.velocity.clone().normalize(),
      );
    }
    shot.mesh.position.addScaledVector(shot.velocity, dt);
    shot.life -= dt;
    let hit = false;
    if (shot.enemy) {
      if (segmentDistance(flight.position, prev, shot.mesh.position) < 6) {
        damage(3);
        hit = true;
      }
    } else
      for (const victim of [...enemies, ...mission.remaining]) {
        const radius =
          victim.kind === "relay" ? 15 : victim.kind === "bomber" ? 13 : 7;
        if (
          segmentDistance(victim.mesh.position, prev, shot.mesh.position) <
          radius
        ) {
          victim.hp -= shot.missile ? 5 : 1;
          hitUntil = t + .2;
          audio.hit();
          hit = true;
          if (victim.hp <= 0) {
            burst(victim.mesh.position);
            if (victim.kind === "relay") {
              victim.mesh.visible = false;
              score += 1000;
              notice(
                `ALFRED / ${victim.name} relay disabled. ${mission.disabled} of 3 offline.`,
                6,
              );
            } else {
              const bomber = victim.kind === "bomber";
              remove(enemies, enemies.indexOf(victim));
              kills++;
              score += bomber ? 750 : 250;
              notice(
                bomber
                  ? "GORDON / Bomber destroyed. Shelter is safe. +750"
                  : "DRONE NEUTRALIZED / +250",
                bomber ? 5 : 1.5,
              );
            }
          }
          break;
        }
      }
    if (hit || shot.life <= 0) remove(shots, i);
  }
}
function updateMissionHUD() {
  world.setGridIntegrity(mission.city);
  const objective = mission.objective(flight.position, enemies),
    bomber = objective?.kind === "bomber";
  $("district-name").textContent = districtAt(
    flight.position.x,
    flight.position.z,
  );
  $("mission-order").textContent = mission.phase === "patrol" ? "PATROL / GET YOUR BEARINGS" : bomber
    ? "INTERCEPT INBOUND BOMBER"
    : mission.disabled < 3
      ? "DISABLE COMMAND RELAYS"
      : "DEFEND THE EVACUATION";
  $("mission-detail").textContent = mission.phase === "patrol" ? "Enjoy the skyline. An incoming transmission will identify the threat." : bomber
    ? `${objective.name} under threat. ${Math.ceil(objective.mesh.position.distanceTo(objective.destination) / 12)}s to impact.`
    : mission.disabled < 3
      ? "Destroy the red uplinks. Cannons and homing missiles both work."
      : "Three final bombers. No reinforcements. Clear the evacuation corridor.";
  const threat = $("bomber-threat");
  threat.hidden = !bomber;
  if (bomber) {
    const seconds = Math.max(0, Math.ceil(objective.mesh.position.distanceTo(objective.destination) / 12));
    $("bomber-eta").textContent = `${seconds <= 25 ? 'FINAL APPROACH' : 'BOMBER INBOUND'} · ${seconds}s`;
    $("bomber-route").textContent = objective.name;
    $("bomber-progress").style.width = Math.max(0, Math.min(100, seconds/88*100)) + '%';
    threat.classList.toggle('critical', seconds <= 25);
  }
  $("city-value").textContent = mission.city + "%";
  $("city-bar").style.width = mission.city + "%";
  $("city-bar").style.background = mission.city < 40 ? "#ff7358" : "#ddbc7b";
  $("evac-status").textContent =
    mission.phase === 'defend'
      ? `PHASE 3 / HOLD ${Math.max(0, Math.ceil(FINAL_DEFENCE-(elapsed-mission.finalStarted)))}s · RAID ${mission.finalRaids}/3`
      : `${mission.phase === 'patrol' ? '01 / PATROL' : '02 / INTERCEPTION'} · RELAYS ${mission.disabled}/3`;
  $("objective-marker").hidden = !objective;
  if (objective) {
    const projected = objective.mesh.position.clone().project(camera);
    const behind =
      objective.mesh.position
        .clone()
        .sub(camera.position)
        .dot(camera.getWorldDirection(new T.Vector3())) < 0;
    let x = projected.x,
      y = projected.y;
    if (behind) {
      x = -Math.sign(x || 1) * 1.3;
      y = 0;
    }
    $("objective-marker").style.left =
      clamp((x * 0.5 + 0.5) * innerWidth, 75, innerWidth - 75) + "px";
    $("objective-marker").style.top =
      clamp((-0.5 * y + 0.5) * innerHeight, 145, innerHeight - 125) + "px";
    $("objective-name").textContent =
      (behind ? "TURN / " : "") + (bomber ? "BOMBER" : objective.name);
    $("objective-distance").textContent =
      Math.round(objective.mesh.position.distanceTo(flight.position)) + " M";
  }
}

requestAnimationFrame(frame);
