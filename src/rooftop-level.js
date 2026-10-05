import * as T from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { chapterCard, clearPresentation, showResults } from "./presentation.js";
import { createModelLoader } from "./model-loader.js";
import { ROOFTOP_LINES } from "./radio-lines.js";
import {
  LAYOUT,
  RooftopMission,
  ANTAGONIST,
  MAX_ALARMS,
  TIME_LIMIT,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  grappleTarget,
} from "./rooftop-mission.js";
import operativeUrl from "./models/operative.glb?url";
import "./rooftop.css";

const $ = (id) => document.getElementById(id);
const INTRO_SECONDS = 7;
const CAMERA_DISTANCE = 9;
const CAMERA_PITCH = 0.42;
const smooth = (x) => x * x * (3 - 2 * x);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const CONE_COLORS = {
  patrol: 0xd9e4ee,
  suspicious: 0xffc35a,
  search: 0xffc35a,
  alert: 0xff4b3a,
};

function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Kessler Cold Storage rooftops: the infiltration that follows the Batcave trace.
// Mission rules live in rooftop-mission.js; this file draws, animates and reads input.
export class RooftopLevel {
  constructor({ camera, audio, keys, onMode }) {
    this.camera = camera;
    this.audio = audio;
    this.keys = keys;
    this.onMode = onMode;
    this.phase = "off";
    this.mission = new RooftopMission();
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x060b14);
    this.scene.fog = new T.FogExp2(0x0a111c, 0.0105);
    this.yaw = 0;
    this.touch = { x: 0, z: 0, act: false, grapple: false, run: false };
    this.figures = [];
    this.modelState = "idle";
    this.buildCity();
    this.buildProps();
    this.buildCones();
    this.bindUI();
  }

  buildCity() {
    const s = this.scene;
    s.add(new T.HemisphereLight(0x6f86a8, 0x0a0c12, 0.9));
    const moon = new T.DirectionalLight(0xbcd2ff, 1.4);
    moon.position.set(-60, 120, -40);
    s.add(moon);
    const street = new T.Mesh(
      new T.PlaneGeometry(900, 900),
      new T.MeshStandardMaterial({ color: 0x0b0f15, roughness: 1 }),
    );
    street.rotation.x = -Math.PI / 2;
    s.add(street);
    // The river behind Kessler's loading dock (the deduction's "waterline" clue).
    const river = new T.Mesh(
      new T.PlaneGeometry(120, 900),
      new T.MeshStandardMaterial({ color: 0x03070d, metalness: 0.8, roughness: 0.25 }),
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(190, 0.2, 0);
    s.add(river);

    // Lit window texture shared by every facade.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const c = canvas.getContext("2d"),
      rand = seeded(1989);
    c.fillStyle = "#151a22";
    c.fillRect(0, 0, 128, 128);
    for (let y = 6; y < 128; y += 16)
      for (let x = 6; x < 128; x += 14) {
        c.fillStyle =
          rand() < 0.22 ? `rgba(255,${190 + rand() * 40},${110 + rand() * 40},0.9)` : "#0c1016";
        c.fillRect(x, y, 7, 9);
      }
    const windows = new T.CanvasTexture(canvas);
    windows.colorSpace = T.SRGBColorSpace;
    windows.wrapS = windows.wrapT = T.RepeatWrapping;
    const facade = (w, h, d) => {
      const tex = windows.clone();
      tex.repeat.set(Math.max(1, w / 14), Math.max(1, h / 16));
      tex.needsUpdate = true;
      return new T.MeshStandardMaterial({
        color: 0x8a919c,
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.55,
        roughness: 0.9,
      });
    };
    const roofTop = new T.MeshStandardMaterial({ color: 0x2c333d, roughness: 0.95 });
    const parapet = new T.MeshStandardMaterial({ color: 0x48505c, roughness: 0.9 });
    for (const r of LAYOUT.roofs) {
      const body = new T.Mesh(new T.BoxGeometry(r.w, r.h, r.d), [
        facade(r.d, r.h),
        facade(r.d, r.h),
        roofTop,
        roofTop,
        facade(r.w, r.h),
        facade(r.w, r.h),
      ]);
      body.position.set(r.x, r.h / 2, r.z);
      s.add(body);
      for (const [x, z, w, d] of [
        [r.x, r.z - r.d / 2 + 0.2, r.w, 0.4],
        [r.x, r.z + r.d / 2 - 0.2, r.w, 0.4],
        [r.x - r.w / 2 + 0.2, r.z, 0.4, r.d],
        [r.x + r.w / 2 - 0.2, r.z, 0.4, r.d],
      ]) {
        const p = new T.Mesh(new T.BoxGeometry(w, 0.9, d), parapet);
        p.position.set(x, r.h + 0.45, z);
        s.add(p);
      }
    }
    // Kessler's name in lights over the river side.
    const sign = document.createElement("canvas");
    sign.width = 512;
    sign.height = 64;
    const sc = sign.getContext("2d");
    sc.fillStyle = "#ff8f5a";
    sc.font = "bold 44px 'Barlow Condensed', Arial, sans-serif";
    sc.textAlign = "center";
    sc.fillText("KESSLER COLD STORAGE", 256, 48);
    const k = LAYOUT.roofs.find((r) => r.id === "kessler");
    const signMesh = new T.Mesh(
      new T.PlaneGeometry(24, 3),
      new T.MeshBasicMaterial({ map: new T.CanvasTexture(sign), transparent: true }),
    );
    signMesh.position.set(k.x + k.w / 2 + 0.05, k.h - 3, k.z);
    signMesh.rotation.y = Math.PI / 2;
    s.add(signMesh);

    // Distant Narrows skyline, instanced so it costs one draw.
    const far = new T.InstancedMesh(
      new T.BoxGeometry(1, 1, 1),
      new T.MeshStandardMaterial({ color: 0x1a202a, roughness: 1, emissive: 0x0b0d10 }),
      140,
    );
    const m = new T.Matrix4(),
      q = new T.Quaternion();
    for (let i = 0; i < far.count; i++) {
      const a = rand() * Math.PI * 2,
        d = 150 + rand() * 220,
        x = 50 + Math.cos(a) * d,
        z = 20 + Math.sin(a) * d;
      if (x > 130 && x < 250) continue;
      const h = 12 + rand() * 45;
      m.compose(
        new T.Vector3(x, h / 2, z),
        q,
        new T.Vector3(10 + rand() * 18, h, 10 + rand() * 18),
      );
      far.setMatrixAt(i, m);
    }
    s.add(far);
  }

  buildProps() {
    const s = this.scene,
      roofH = (id) => LAYOUT.roofs.find((r) => r.id === id).h;
    const metal = new T.MeshStandardMaterial({ color: 0x5b636e, metalness: 0.5, roughness: 0.6 });
    for (const o of LAYOUT.occluders) {
      const h = o.x === LAYOUT.terminal.x ? 2.6 : 1.9;
      const box = new T.Mesh(new T.BoxGeometry(o.w, h, o.d), metal);
      box.position.set(o.x, roofH(o.roof) + h / 2, o.z);
      s.add(box);
    }
    // Water tower over the tower roof's plant box.
    const tower = LAYOUT.occluders.find((o) => o.roof === "tower");
    const wood = new T.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.95 });
    const tank = new T.Mesh(new T.CylinderGeometry(3, 3, 4.5, 16), wood);
    tank.position.set(tower.x, roofH("tower") + 6.2, tower.z);
    const cap = new T.Mesh(new T.ConeGeometry(3.3, 1.6, 16), wood);
    cap.position.set(tower.x, roofH("tower") + 9.2, tower.z);
    s.add(tank, cap);

    this.dishes = this.mission.uplinks.map((u) => {
      const group = new T.Group();
      group.position.set(u.x, roofH(u.roof), u.z);
      const post = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 1.6, 8), metal);
      post.position.y = 0.8;
      const dish = new T.Mesh(
        new T.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3),
        new T.MeshStandardMaterial({
          color: 0xb8c0c8,
          metalness: 0.4,
          roughness: 0.4,
          side: T.DoubleSide,
        }),
      );
      dish.position.y = 1.9;
      dish.rotation.x = -Math.PI / 2.6;
      const lamp = new T.Mesh(
        new T.SphereGeometry(0.16, 8, 6),
        new T.MeshBasicMaterial({ color: 0xff3b2e }),
      );
      lamp.position.y = 2.5;
      const glow = new T.PointLight(0xff3b2e, 6, 9, 1.6);
      glow.position.y = 2.4;
      group.add(post, dish, lamp, glow);
      s.add(group);
      return { group, lamp, glow };
    });
    const t = LAYOUT.terminal;
    this.terminalGlow = new T.PointLight(0x5fa8ff, 8, 8, 1.5);
    this.terminalGlow.position.set(t.x, roofH(t.roof) + 1.4, t.z - 0.4);
    const screen = new T.Mesh(
      new T.PlaneGeometry(1.4, 0.8),
      new T.MeshBasicMaterial({ color: 0x5fa8ff }),
    );
    screen.position.set(t.x, roofH(t.roof) + 1.4, t.z + 0.85);
    screen.rotation.y = Math.PI;
    this.terminalScreen = screen;
    s.add(this.terminalGlow, screen);

    const x = LAYOUT.extraction;
    this.pad = new T.Mesh(
      new T.RingGeometry(x.r - 0.3, x.r, 40),
      new T.MeshBasicMaterial({
        color: 0xedcf87,
        transparent: true,
        opacity: 0.25,
        side: T.DoubleSide,
      }),
    );
    this.pad.rotation.x = -Math.PI / 2;
    this.pad.position.set(x.x, roofH(x.roof) + 0.06, x.z);
    s.add(this.pad);

    this.marker = new T.Mesh(
      new T.RingGeometry(0.7, 0.95, 32),
      new T.MeshBasicMaterial({
        color: 0x9fd2ff,
        transparent: true,
        opacity: 0.9,
        side: T.DoubleSide,
      }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    s.add(this.marker);
    this.line = new T.Line(
      new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
      new T.LineBasicMaterial({ color: 0xc8d4de }),
    );
    this.line.visible = false;
    s.add(this.line);
  }

  // Ground-level vision cones keep the stealth rules readable. They do not show
  // occlusion; cover is still honoured by the mission logic.
  buildCones() {
    const geo = new T.CircleGeometry(VISION_RANGE, 20, -VISION_HALF_ANGLE, VISION_HALF_ANGLE * 2);
    geo.rotateX(-Math.PI / 2);
    this.cones = this.mission.guards.map(() => {
      const cone = new T.Mesh(
        geo,
        new T.MeshBasicMaterial({
          color: CONE_COLORS.patrol,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        }),
      );
      cone.renderOrder = 2;
      this.scene.add(cone);
      return cone;
    });
  }

  // Placeholder figures stand in until the model arrives, and stay if it fails.
  makePlaceholder(color) {
    const g = new T.Group(),
      body = new T.Mesh(
        new T.CapsuleGeometry(0.35, 1.1, 4, 10),
        new T.MeshStandardMaterial({ color, roughness: 0.7 }),
      );
    body.position.y = 0.9;
    g.add(body);
    this.scene.add(g);
    return { root: g, mixer: null, actions: {}, current: null };
  }
  buildFigures() {
    this.player = this.makePlaceholder(0x22262e);
    this.guardFigures = this.mission.guards.map(() => this.makePlaceholder(0x8b8f96));
    this.figures = [this.player, ...this.guardFigures];
  }
  async loadModel() {
    if (this.modelState !== "idle") return;
    this.modelState = "loading";
    try {
      const gltf = await createModelLoader().loadAsync(operativeUrl);
      const dress = (tint) => {
        const root = cloneSkinned(gltf.scene);
        root.traverse((o) => {
          if (!o.isMesh) return;
          o.material = o.material.clone();
          o.material.color.setHex(tint);
          o.frustumCulled = false;
        });
        return root;
      };
      const swap = (figure, tint) => {
        const root = dress(tint);
        root.position.copy(figure.root.position);
        root.rotation.copy(figure.root.rotation);
        this.scene.remove(figure.root);
        this.scene.add(root);
        figure.root = root;
        figure.mixer = new T.AnimationMixer(root);
        figure.actions = Object.fromEntries(
          gltf.animations.map((c) => [c.name, figure.mixer.clipAction(c)]),
        );
        for (const name of ["takedown", "down", "jump"]) {
          figure.actions[name]?.setLoop(T.LoopOnce, 1);
          if (figure.actions[name]) figure.actions[name].clampWhenFinished = true;
        }
        figure.current = null;
      };
      // The palette texture is multiplied by the tint: near-black suit for the
      // player, muted work clothes for TOLLER's crew.
      swap(this.player, 0x3a3f4a);
      for (const f of this.guardFigures) swap(f, 0xa9a39a);
      this.modelState = "ready";
    } catch (error) {
      this.modelState = "failed";
      console.warn("Operative model unavailable; placeholder figures retained.", error.message);
    }
  }
  play(figure, name, fade = 0.2) {
    const next = figure.actions[name];
    if (!next || figure.current === next) return;
    next.reset().fadeIn(fade).play();
    figure.current?.fadeOut(fade);
    figure.current = next;
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

  begin() {
    clearPresentation();
    this.audio.stopVoice();
    this.audio.start();
    if (!this.player) this.buildFigures();
    this.loadModel();
    this.saved = { fov: this.camera.fov, near: this.camera.near, far: this.camera.far };
    this.camera.fov = 55;
    this.camera.near = 0.1;
    this.camera.far = 900;
    this.camera.updateProjectionMatrix();
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
    this.padStart = false;
    for (const k in this.touch) this.touch[k] = typeof this.touch[k] === "boolean" ? false : 0;
    for (const f of this.figures) {
      f.current?.stop();
      f.current = null;
    }
    this.sync(0);
  }
  hide() {
    if (this.phase === "off") return;
    clearTimeout(this.planTimer);
    this.phase = "off";
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
      if (e.type === "grapple") this.chime([330, 660], "sine");
      else if (e.type === "grapple-miss") this.chime([180], "sine");
      else if (e.type === "uplink") {
        this.chime([523, 784]);
        this.radio(ROOFTOP_LINES.uplink);
      } else if (e.type === "stage")
        this.radio(e.stage === "log" ? ROOFTOP_LINES.uplinksDone : ROOFTOP_LINES.logDone);
      else if (e.type === "terminal-locked") this.radio(ROOFTOP_LINES.locked);
      else if (e.type === "takedown") {
        this.chime([220, 880], "square");
        this.radio(ROOFTOP_LINES.takedown);
        const i = m.guards.findIndex((g) => g.id === e.guard);
        if (i >= 0) this.play(this.guardFigures[i], "down");
        this.play(this.player, "takedown", 0.08);
        this.takedownAnim = 0.6;
      } else if (e.type === "suspicious") {
        if (performance.now() - this.lastAlarmLine > 8000) this.radio(ROOFTOP_LINES.suspicious);
        this.chime([440], "sine");
      } else if (e.type === "alarm") {
        this.lastAlarmLine = performance.now();
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

  // Place figures, cones and markers from mission state.
  sync(dt) {
    const m = this.mission,
      p = m.player,
      roofH = (id) => m.roof(id).h;
    if (!this.player) return;
    const py = m.playerY();
    this.player.root.position.set(p.x, py, p.z);
    this.player.root.rotation.y = Math.PI / 2 - p.facing;
    m.guards.forEach((g, i) => {
      const f = this.guardFigures[i],
        h = roofH(g.roof);
      f.root.position.set(g.x, h, g.z);
      f.root.rotation.y = Math.PI / 2 - g.facing;
      const cone = this.cones[i];
      cone.visible = g.state !== "down";
      cone.position.set(g.x, h + 0.08, g.z);
      cone.rotation.y = -g.facing;
      cone.material.color.setHex(CONE_COLORS[g.state] || CONE_COLORS.patrol);
      cone.material.opacity = g.state === "alert" ? 0.24 : 0.1 + g.suspicion * 0.12;
      if (this.modelState === "ready" && g.state !== "down")
        this.play(f, g.moving > 2 ? "run" : g.moving > 0 ? "walk" : "idle");
      f.mixer?.update(dt * (g.moving > 2 ? 1.1 : 1));
    });
    if (this.takedownAnim > 0) this.takedownAnim -= dt;
    else if (this.modelState === "ready")
      this.play(
        this.player,
        p.zip ? "jump" : p.moving > 0.05 ? (this.running ? "run" : "walk") : "idle",
      );
    this.player.mixer?.update(dt);

    m.uplinks.forEach((u, i) => {
      const d = this.dishes[i],
        color = u.done ? 0x58e08a : 0xff3b2e;
      d.lamp.material.color.setHex(color);
      d.glow.color.setHex(color);
      d.glow.intensity = u.done ? 3 : 4 + Math.sin(performance.now() / 180) * 3;
    });
    const unlocked = m.stage !== "uplinks";
    this.terminalScreen.material.color.setHex(
      m.terminal.done ? 0x58e08a : unlocked ? 0x5fa8ff : 0x7a2a26,
    );
    this.pad.material.opacity =
      m.stage === "extract" ? 0.6 + Math.sin(performance.now() / 200) * 0.3 : 0.15;

    const target = !p.zip && m.phase === "play" ? grappleTarget(p, m.layout.roofs) : null;
    this.marker.visible = !!target;
    if (target) this.marker.position.set(target.x, roofH(target.roof) + 0.1, target.z);
    this.target = target;
    this.line.visible = !!p.zip;
    if (p.zip) {
      const a = this.line.geometry.attributes.position;
      a.setXYZ(0, p.x, py + 1.5, p.z);
      a.setXYZ(1, p.zip.to.x, p.zip.to.y + 0.2, p.zip.to.z);
      a.needsUpdate = true;
    }
  }

  updateHud() {
    const m = this.mission;
    $("roof-time").textContent = clock(Math.max(0, TIME_LIMIT - m.time));
    $("roof-time").dataset.clockState = TIME_LIMIT - m.time < 60 ? "danger" : "normal";
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
    const action = m.actionAt(),
      prompt = $("roof-prompt");
    // Name the on-screen buttons on touch screens, the keys elsewhere.
    const touch = matchMedia("(pointer: coarse)").matches,
      act = touch ? "ACT" : "E",
      jump = touch ? "GRAPPLE" : "SPACE · GRAPPLE";
    let text = "",
      progress = 0;
    if (action?.kind === "takedown") text = `${act} · EMP TAKEDOWN`;
    else if (action?.kind === "uplink") {
      text = `HOLD ${act} · DISABLE UPLINK`;
      progress = action.target.progress;
    } else if (action?.kind === "terminal") {
      text = action.locked
        ? "LOG ENCRYPTED · DISABLE THE UPLINKS"
        : `HOLD ${act} · COPY FLIGHT LOG`;
      progress = action.target.progress;
    } else if (this.target) text = `${jump} → ${m.roof(this.target.roof).name}`;
    prompt.querySelector("span").textContent = text;
    prompt.querySelector("i").style.width = Math.round(progress * 100) + "%";
    prompt.hidden = !text;
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
      this.introTime += step;
      const k = smooth(Math.min(1, this.introTime / INTRO_SECONDS)),
        kes = m.roof("kessler");
      this.camera.position.set(kes.x + 70 - k * 90, 70 - k * 38, kes.z - 60 + k * 40);
      this.camera.lookAt(kes.x - k * 50, kes.h, kes.z - k * 10);
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
      this.updateHud();
      if (m.phase === "ended") this.phase = "ending";
    } else if (this.phase === "ending") {
      this.endDelay -= step;
      if (this.endDelay <= 0) this.finish();
    }
    if (this.phase !== "paused") this.sync(this.phase === "ended" ? 0 : step);
    // Third-person camera on a boom behind the player, eased to avoid snapping.
    const py = m.playerY(),
      target = new T.Vector3(p.x, py + 1.6, p.z),
      want = new T.Vector3(
        p.x - Math.cos(this.yaw) * CAMERA_DISTANCE * Math.cos(CAMERA_PITCH),
        py + 1.6 + CAMERA_DISTANCE * Math.sin(CAMERA_PITCH),
        p.z - Math.sin(this.yaw) * CAMERA_DISTANCE * Math.cos(CAMERA_PITCH),
      );
    this.camera.position.lerp(want, 1 - Math.exp(-step * (p.zip ? 5 : 8)));
    this.camera.lookAt(target);
  }
}
