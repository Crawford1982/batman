import * as T from "three";
import { chapterCard, clearPresentation, showResults } from "./presentation.js";
import {
  RECEIVERS,
  ORIGIN,
  CARRIER,
  WAVE_START,
  FREQUENCY_RANGE,
  CLUES,
  SUSPECTS,
  WRONG_PENALTY_SECONDS,
  signalStrength,
  isLocked,
  originDistrict,
  carrierSample,
  waveMatch,
  waveLocked,
  fitsClues,
  rejection,
  caveScore,
  wrapAngle,
} from "./cave-puzzles.js";
import "./cave.css";

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const INTRO_SECONDS = 6.5;
const REVEAL_SECONDS = 7;
const LOCK_DWELL = 0.4;
const MAP_BOUNDS = { minX: -1800, maxX: 1900, minZ: -1500, maxZ: 1500 };
const STAGES = ["trace", "decrypt", "identify"];
const smooth = (x) => x * x * (3 - 2 * x);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CaveLevel {
  constructor({ camera, audio, keys, onMode }) {
    this.camera = camera;
    this.audio = audio;
    this.keys = keys;
    this.onMode = onMode;
    this.phase = "off";
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x020409);
    this.scene.fog = new T.FogExp2(0x03070d, 0.021);
    this.screens = [];
    this.bats = [];
    this.parallax = { x: 0, y: 0 };
    this.viewShift = 0;
    this.buildCave();
    this.buildComputer();
    this.buildBats();
    this.bindUI();
  }

  buildCave() {
    const rand = seeded(1989);
    const shell = new T.SphereGeometry(70, 64, 40);
    const p = shell.attributes.position,
      v = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const n =
        Math.sin(v.x * 7.1 + v.y * 3.3) * 0.5 +
        Math.sin(v.z * 9.7 - v.x * 4.1) * 0.35 +
        Math.sin(v.y * 15 + v.z * 11) * 0.18;
      v.multiplyScalar(70 * (1 + n * 0.09));
      p.setXYZ(i, v.x * 1.25, v.y * 0.62 + 8, v.z * 1.1);
    }
    shell.computeVertexNormals();
    this.scene.add(
      new T.Mesh(
        shell,
        new T.MeshStandardMaterial({
          color: 0x2b3038,
          roughness: 1,
          flatShading: true,
          side: T.BackSide,
        }),
      ),
    );

    const stalactite = new T.ConeGeometry(0.9, 1, 6);
    stalactite.rotateX(Math.PI);
    stalactite.translate(0, -0.5, 0);
    const rocks = new T.InstancedMesh(
      stalactite,
      new T.MeshStandardMaterial({ color: 0x23272d, roughness: 1, flatShading: true }),
      90,
    );
    const m = new T.Matrix4(),
      q = new T.Quaternion();
    for (let i = 0; i < rocks.count; i++) {
      const a = rand() * TAU,
        r = 8 + rand() * 62,
        len = 3 + rand() * 11;
      m.compose(
        new T.Vector3(Math.cos(a) * r, 46 - r * 0.32 + rand() * 4, Math.sin(a) * r * 0.85),
        q,
        new T.Vector3(0.6 + rand() * 1.4, len, 0.6 + rand() * 1.4),
      );
      rocks.setMatrixAt(i, m);
    }
    this.scene.add(rocks);

    const water = new T.Mesh(
      new T.PlaneGeometry(260, 260),
      new T.MeshStandardMaterial({ color: 0x02070d, metalness: 0.85, roughness: 0.18 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -5;
    this.scene.add(water);

    const steel = new T.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.75, roughness: 0.42 });
    const deck = new T.Mesh(new T.CylinderGeometry(15, 15.5, 0.9, 6), steel);
    deck.rotation.y = Math.PI / 6;
    this.scene.add(deck);
    for (let i = 0; i < 6; i++) {
      const leg = new T.Mesh(new T.CylinderGeometry(0.5, 0.7, 6, 8), steel);
      const a = (i / 6) * TAU;
      leg.position.set(Math.cos(a) * 11, -3.2, Math.sin(a) * 11);
      this.scene.add(leg);
    }
    const edge = new T.Mesh(
      new T.RingGeometry(14.5, 14.85, 6),
      new T.MeshBasicMaterial({ color: 0x5aa8ff, side: T.DoubleSide }),
    );
    edge.rotation.set(-Math.PI / 2, 0, Math.PI / 6);
    edge.position.y = 0.47;
    this.scene.add(edge);
    const bridge = new T.Mesh(new T.BoxGeometry(4.2, 0.45, 34), steel);
    bridge.position.set(0, 0.1, 31);
    this.scene.add(bridge);
    for (const side of [-1, 1]) {
      const strip = new T.Mesh(
        new T.BoxGeometry(0.12, 0.08, 34),
        new T.MeshBasicMaterial({ color: 0x3f7fd0 }),
      );
      strip.position.set(side * 2.1, 0.38, 31);
      this.scene.add(strip);
    }

    this.scene.add(new T.HemisphereLight(0x4a5f80, 0x0a0c10, 1.1));
    const bulbGeo = new T.SphereGeometry(0.22, 8, 6);
    const bulbs = new T.InstancedMesh(bulbGeo, new T.MeshBasicMaterial({ color: 0xffc070 }), 44);
    for (let i = 0; i < bulbs.count; i++) {
      const side = i < 22 ? -1 : 1,
        u = (i % 22) / 21,
        z = -45 + u * 70;
      m.compose(
        new T.Vector3(
          side * (52 - Math.abs(z + 10) * 0.25),
          16 - Math.sin(u * Math.PI * 4) ** 2 * 3,
          z,
        ),
        q,
        new T.Vector3(1, 1, 1),
      );
      bulbs.setMatrixAt(i, m);
    }
    this.scene.add(bulbs);
    for (const [x, z, color] of [
      [-44, -15, 0xffa860],
      [44, -15, 0xffa860],
      [0, -55, 0x5f8dff],
    ]) {
      const lamp = new T.PointLight(color, 220, 60, 1.4);
      lamp.position.set(x, 14, z);
      this.scene.add(lamp);
    }
    const work = new T.SpotLight(0xffc47a, 260, 60, 0.6, 0.6, 1.4);
    work.position.set(6, 24, 6);
    work.target.position.set(0, 0, -4);
    this.scene.add(work, work.target);
    this.screenLight = new T.PointLight(0x5fa8ff, 70, 34, 1.3);
    this.screenLight.position.set(0, 5, -6);
    this.scene.add(this.screenLight);
    const rim = new T.PointLight(0x3a6dff, 40, 90, 1.2);
    rim.position.set(-30, 18, -40);
    this.scene.add(rim);
  }

  buildComputer() {
    const frameMat = new T.MeshStandardMaterial({
      color: 0x14181e,
      metalness: 0.6,
      roughness: 0.5,
    });
    const desk = new T.Mesh(new T.BoxGeometry(11, 1.1, 2.6), frameMat);
    desk.position.set(0, 1.1, -7.2);
    this.scene.add(desk);
    const keyboard = new T.Mesh(
      new T.BoxGeometry(4, 0.08, 0.9),
      new T.MeshBasicMaterial({ color: 0x1d3e66 }),
    );
    keyboard.position.set(0, 1.7, -6.6);
    keyboard.rotation.x = -0.15;
    this.scene.add(keyboard);
    const layout = [
      { x: 0, y: 4.9, w: 6.4, h: 3.6, ry: 0, main: true },
      { x: -5.6, y: 4.6, w: 3.8, h: 2.6, ry: 0.42 },
      { x: 5.6, y: 4.6, w: 3.8, h: 2.6, ry: -0.42 },
      { x: -4.6, y: 7.6, w: 3.4, h: 2, ry: 0.32 },
      { x: 4.6, y: 7.6, w: 3.4, h: 2, ry: -0.32 },
    ];
    for (const [i, s] of layout.entries()) {
      const canvas = document.createElement("canvas");
      canvas.width = s.main ? 640 : 384;
      canvas.height = Math.round((canvas.width * s.h) / s.w);
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      const group = new T.Group();
      group.position.set(s.x, s.y, -8.6 + Math.abs(s.ry) * 2.2);
      group.rotation.y = s.ry;
      const bezel = new T.Mesh(new T.BoxGeometry(s.w + 0.3, s.h + 0.3, 0.25), frameMat);
      bezel.position.z = -0.14;
      const screen = new T.Mesh(
        new T.PlaneGeometry(s.w, s.h),
        new T.MeshBasicMaterial({ map: texture, toneMapped: false }),
      );
      group.add(bezel, screen);
      this.scene.add(group);
      this.screens.push({ canvas, ctx: canvas.getContext("2d"), texture, main: !!s.main, seed: i });
    }
  }

  buildBats() {
    const wing = new T.BufferGeometry();
    wing.setAttribute(
      "position",
      new T.Float32BufferAttribute([0, 0, -0.25, 1.1, 0.05, 0.1, 0, 0, 0.35], 3),
    );
    wing.computeVertexNormals();
    const mat = new T.MeshBasicMaterial({ color: 0x050608, side: T.DoubleSide });
    const rand = seeded(42);
    for (let i = 0; i < 16; i++) {
      const bat = new T.Group(),
        left = new T.Mesh(wing, mat),
        right = new T.Mesh(wing, mat);
      right.scale.x = -1;
      bat.add(left, right);
      bat.scale.setScalar(0.7 + rand() * 0.6);
      this.scene.add(bat);
      this.bats.push({
        bat,
        left,
        right,
        radius: 14 + rand() * 30,
        height: 14 + rand() * 16,
        speed: (0.18 + rand() * 0.25) * (rand() < 0.5 ? 1 : -1),
        phase: rand() * TAU,
        flap: 9 + rand() * 6,
      });
    }
  }

  bindUI() {
    this.map = $("cave-map");
    this.mapCtx = this.map.getContext("2d");
    this.wave = $("cave-wave");
    this.waveCtx = this.wave.getContext("2d");
    const list = $("cave-receivers");
    this.receiverButtons = RECEIVERS.map((r, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<small>RECEIVER ${i + 1}</small><b></b><i><span></span></i>`;
      b.querySelector("b").textContent = r.name;
      b.onclick = () => this.select(i);
      list.append(b);
      return b;
    });
    const hold = (id, dir) => {
      const b = $(id);
      b.onpointerdown = (e) => {
        b.setPointerCapture(e.pointerId);
        this.touchTurn = dir;
      };
      b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => (this.touchTurn = 0);
    };
    hold("cave-left", -1);
    hold("cave-right", 1);
    const aim = (e) => {
      if (this.phase !== "play" || this.stage !== "trace") return;
      const rect = this.map.getBoundingClientRect(),
        mx = ((e.clientX - rect.left) / rect.width) * this.map.width,
        my = ((e.clientY - rect.top) / rect.height) * this.map.height;
      const hit = RECEIVERS.findIndex((r) => {
        const [x, y] = this.toMap(r.x, r.z);
        return Math.hypot(mx - x, my - y) < 22;
      });
      if (e.type === "pointerdown" && hit >= 0) {
        this.select(hit);
        return;
      }
      const r = RECEIVERS[this.selected],
        [rx, ry] = this.toMap(r.x, r.z);
      if (this.locked[this.selected] || Math.hypot(mx - rx, my - ry) < 8) return;
      this.angles[this.selected] = Math.atan2(my - ry, mx - rx);
    };
    this.map.onpointerdown = (e) => {
      this.map.setPointerCapture(e.pointerId);
      this.dragging = true;
      aim(e);
    };
    this.map.onpointermove = (e) => this.dragging && aim(e);
    this.map.onpointerup = this.map.onpointercancel = () => (this.dragging = false);
    $("cave-freq").min = FREQUENCY_RANGE[0];
    $("cave-freq").max = FREQUENCY_RANGE[1];
    $("cave-freq").oninput = (e) => (this.frequency = Number(e.target.value));
    $("cave-phase").oninput = (e) => (this.wavePhase = Number(e.target.value));
    $("cave-clues").replaceChildren(
      ...CLUES.map((c) => {
        const li = document.createElement("li");
        li.textContent = c;
        return li;
      }),
    );
    this.suspectButtons = SUSPECTS.map((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = "<b></b><small></small><em></em>";
      b.querySelector("b").textContent = s.name;
      b.querySelector("small").textContent = s.detail;
      b.onclick = () => this.accuse(s, b);
      $("cave-suspects").append(b);
      return b;
    });
    $("cave-skip").onclick = () => this.skip();
    $("cave-pause").onclick = () => this.pause();
    addEventListener("keydown", (e) => {
      if (this.phase === "intro" || this.phase === "reveal") {
        if (["Space", "Enter"].includes(e.code)) {
          e.preventDefault();
          this.skip();
        }
        return;
      }
      if (this.phase !== "play" || e.repeat) return;
      if (this.stage === "trace") {
        const n = ["Digit1", "Digit2", "Digit3"].indexOf(e.code);
        if (n >= 0) this.select(n);
        if (e.code === "KeyQ") this.select((this.selected + 2) % 3);
        if (e.code === "KeyE") this.select((this.selected + 1) % 3);
      }
      if (this.stage === "identify") {
        const n = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
        if (n >= 0) this.suspectButtons[n].click();
      }
    });
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      this.parallax.x = (e.clientX / innerWidth - 0.5) * 2;
      this.parallax.y = (e.clientY / innerHeight - 0.5) * 2;
    });
  }

  begin() {
    clearPresentation();
    this.audio.stopVoice();
    this.audio.start();
    this.saved = { fov: this.camera.fov, near: this.camera.near, far: this.camera.far };
    this.camera.fov = 50;
    this.camera.near = 0.1;
    this.camera.far = 400;
    this.camera.updateProjectionMatrix();
    this.reset();
    this.phase = "intro";
    this.introTime = 0;
    this.onMode("caveIntro");
    $("pause-menu").hidden = true;
    $("cave-hud").hidden = false;
    $("cave-hud").classList.add("intro");
    $("cave-skip").hidden = false;
    chapterCard("CHAPTER III / THE SIGNAL", "Find who rang the bell");
    this.radio(
      "ALFRED / The override bought us time, sir. The network is still talking to someone.",
    );
  }
  start() {
    this.begin();
    this.skip();
  }
  reset() {
    this.time = 0;
    this.penalty = 0;
    this.mistakes = 0;
    this.stage = "trace";
    this.selected = 0;
    this.angles = RECEIVERS.map((r) => r.start);
    this.dwell = [0, 0, 0];
    this.locked = [false, false, false];
    this.frequency = WAVE_START.frequency;
    this.wavePhase = WAVE_START.phase;
    this.waveDwell = 0;
    this.waveLock = false;
    this.touchTurn = 0;
    this.nextPing = 0;
    this.screenClock = 0;
    $("cave-freq").value = this.frequency;
    $("cave-phase").value = this.wavePhase;
    for (const b of this.suspectButtons) {
      b.disabled = false;
      b.classList.remove("wrong", "right");
      b.querySelector("em").textContent = "";
    }
    this.select(0);
    this.showStage("trace");
  }
  hide() {
    if (this.phase === "off") return;
    this.phase = "off";
    $("cave-hud").hidden = true;
    this.viewShift = 0;
    this.camera.clearViewOffset();
    if (this.saved) {
      Object.assign(this.camera, this.saved);
      this.camera.updateProjectionMatrix();
    }
  }
  pause() {
    if (this.phase === "intro" || this.phase === "reveal") return this.skip();
    if (this.phase === "play") {
      this.audio.stopVoice();
      this.phase = "paused";
      this.onMode("cavePaused");
      $("pause-title").textContent = "Batcomputer idle.";
      $("pause-copy").textContent = "The trace clock is paused.";
      $("resume").hidden = false;
      $("next-level").hidden = true;
      $("pause-menu").hidden = false;
    } else if (this.phase === "paused") {
      this.phase = "play";
      this.onMode("cave");
      $("pause-menu").hidden = true;
    }
  }
  skip() {
    if (this.phase === "intro") {
      this.phase = "play";
      this.onMode("cave");
      $("cave-hud").classList.remove("intro");
      $("cave-skip").hidden = true;
      clearPresentation();
      this.radio(
        "ALFRED / All three relays from tonight still hear the rogue carrier. Turn each receiver until it peaks.",
      );
    } else if (this.phase === "reveal") this.finish();
  }
  radio(text) {
    $("cave-radio").textContent = text;
    this.radioUntil = performance.now() + 7000;
  }

  select(i) {
    this.selected = i;
    this.receiverButtons.forEach((b, n) => b.classList.toggle("active", n === i));
  }
  showStage(stage) {
    this.stage = stage;
    for (const el of document.querySelectorAll(".cave-stage"))
      el.hidden = el.dataset.stage !== stage;
    const index = STAGES.indexOf(stage);
    document.querySelectorAll(".cave-steps li").forEach((li, n) => {
      li.classList.toggle("done", n < index);
      li.classList.toggle("active", n === index);
    });
  }
  chime(notes) {
    if (!this.audio.ctx) return;
    const at = this.audio.ctx.currentTime;
    notes.forEach((f, i) => this.audio.tone(f, at + i * 0.09, 0.5, 0.05, "triangle"));
  }

  accuse(suspect, button) {
    if (this.phase !== "play" || this.stage !== "identify") return;
    if (fitsClues(suspect)) {
      button.classList.add("right");
      for (const b of this.suspectButtons) b.disabled = true;
      this.chime([392, 523, 659, 784]);
      this.beginReveal(suspect);
      return;
    }
    this.mistakes++;
    this.penalty += WRONG_PENALTY_SECONDS;
    button.disabled = true;
    button.classList.add("wrong");
    button.querySelector("em").textContent = `+${WRONG_PENALTY_SECONDS}s`;
    this.audio.hit();
    this.radio(`ALFRED / ${rejection(suspect)}`);
  }
  beginReveal(suspect) {
    this.phase = "reveal";
    this.onMode("caveReveal");
    this.revealTime = 0;
    this.found = suspect;
    $("cave-skip").hidden = false;
    $("cave-hud").classList.add("intro");
    this.radio(
      `ALFRED / ${suspect.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}, The Narrows. Leased last month through a shell company.`,
    );
    setTimeout(() => {
      if (this.phase === "reveal")
        this.radio("BATMAN / Then that's where the bell is. Fuel the Batwing.");
    }, 3600);
  }
  finish() {
    const seconds = this.time + this.penalty,
      score = caveScore(seconds, this.mistakes);
    this.phase = "ended";
    this.onMode("caveEnded");
    $("cave-hud").hidden = true;
    showResults(
      "batcave",
      true,
      seconds,
      score,
      null,
      `Source: ${this.found.name}, ${originDistrict()} · ${this.mistakes} wrong call${this.mistakes === 1 ? "" : "s"}`,
    );
    window.gothamAnalytics?.event("level_end", {
      level_name: "batcave",
      success: true,
      elapsed_seconds: seconds,
      score,
    });
    $("pause-title").textContent = "Source located.";
    $("pause-copy").textContent = "To be continued in The Narrows.";
    $("resume").hidden = true;
    $("next-level").hidden = true;
    $("pause-menu").hidden = false;
  }

  updateTrace(dt) {
    const k = this.keys,
      turn =
        (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + (this.touchTurn || 0),
      rate = (k.ShiftLeft || k.ShiftRight ? 8 : 38) * (Math.PI / 180);
    const i = this.selected;
    if (turn && !this.locked[i]) this.angles[i] = wrapAngle(this.angles[i] + turn * rate * dt);
    RECEIVERS.forEach((r, n) => {
      if (this.locked[n]) return;
      this.dwell[n] = isLocked(r, this.angles[n]) ? this.dwell[n] + dt : 0;
      if (this.dwell[n] >= LOCK_DWELL) {
        this.locked[n] = true;
        this.angles[n] = r.truth;
        this.receiverButtons[n].classList.add("locked");
        this.chime([523, 784]);
        const next = this.locked.findIndex((l) => !l);
        if (next >= 0) this.select(next);
      }
    });
    const s = signalStrength(RECEIVERS[i], this.angles[i]);
    this.nextPing -= dt;
    if (!this.locked[i] && this.nextPing <= 0 && this.audio.ctx) {
      this.audio.tone(420 + s * 720, this.audio.ctx.currentTime, 0.08, 0.02 + s * 0.03, "sine");
      this.nextPing = 0.85 - s * 0.72;
    }
    this.receiverButtons.forEach((b, n) => {
      const strength = this.locked[n] ? 1 : signalStrength(RECEIVERS[n], this.angles[n]);
      b.querySelector("span").style.width = Math.round(strength * 100) + "%";
    });
    if (this.locked.every(Boolean)) {
      this.radio(
        `ALFRED / The bearings cross in ${originDistrict()
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase())}. Now we need to hear what it is saying.`,
      );
      this.showStage("decrypt");
    }
  }
  updateDecrypt(dt) {
    const k = this.keys,
      df = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0),
      dp = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0),
      fine = k.ShiftLeft || k.ShiftRight ? 0.2 : 1;
    if (df) {
      this.frequency = Math.min(
        FREQUENCY_RANGE[1],
        Math.max(FREQUENCY_RANGE[0], this.frequency + df * 0.9 * fine * dt),
      );
      $("cave-freq").value = this.frequency;
    }
    if (dp) {
      this.wavePhase = (this.wavePhase + dp * 1.4 * fine * dt + TAU) % TAU;
      $("cave-phase").value = this.wavePhase;
    }
    const match = waveMatch(this.frequency, this.wavePhase);
    $("cave-match").textContent = Math.round(match * 100) + "%";
    this.waveDwell = waveLocked(this.frequency, this.wavePhase) ? this.waveDwell + dt : 0;
    if (this.waveDwell >= LOCK_DWELL) {
      this.frequency = CARRIER.frequency;
      this.wavePhase = CARRIER.phase;
      this.chime([440, 554, 659]);
      this.radio("ALFRED / Carrier locked. Two things ride under it, sir. A hum, and a schedule.");
      this.showStage("identify");
    }
  }

  toMap(x, z) {
    const { minX, maxX, minZ, maxZ } = MAP_BOUNDS;
    return [
      ((x - minX) / (maxX - minX)) * this.map.width,
      ((z - minZ) / (maxZ - minZ)) * this.map.height,
    ];
  }
  drawMap(t) {
    const c = this.mapCtx,
      w = this.map.width,
      h = this.map.height;
    c.fillStyle = "#04101c";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(90,168,255,0.08)";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 28) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y < h; y += 28) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    const [rx0] = this.toMap(575, 0),
      [rx1] = this.toMap(865, 0);
    c.fillStyle = "rgba(40,90,150,0.28)";
    c.fillRect(rx0, 0, rx1 - rx0, h);
    c.font = "600 12px 'Barlow Condensed', Arial, sans-serif";
    c.fillStyle = "rgba(160,190,220,0.45)";
    const label = (text, x, y) => {
      c.textAlign = x > w - 130 ? "right" : x < 130 ? "left" : "center";
      c.fillText(text, x > w - 130 ? x + 8 : x < 130 ? x - 8 : x, y);
    };
    c.textAlign = "center";
    for (const [name, x, z] of [
      ["MIDTOWN", 0, 60],
      ["OLD GOTHAM", -1180, -1380],
      ["THE NARROWS", -1180, 1180],
      ["TRICORNER DOCKS", 1400, 1300],
      ["GOTHAM RIVER", 720, -1300],
    ]) {
      const [mx, my] = this.toMap(x, z);
      c.fillText(name, mx, my);
    }
    const all = this.locked.every(Boolean);
    RECEIVERS.forEach((r, n) => {
      const [x, y] = this.toMap(r.x, r.z),
        a = this.angles[n],
        s = this.locked[n] ? 1 : signalStrength(r, a);
      c.strokeStyle = this.locked[n]
        ? "rgba(237,207,135,0.95)"
        : `rgba(${Math.round(110 + s * 127)},${Math.round(180 + s * 27)},255,${0.35 + s * 0.6})`;
      c.lineWidth = this.locked[n] ? 2 : n === this.selected ? 2.5 : 1.2;
      c.setLineDash(this.locked[n] ? [] : [7, 6]);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * 2000, y + Math.sin(a) * 2000);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = this.locked[n] ? "#edcf87" : n === this.selected ? "#9fd2ff" : "#4f86c2";
      c.beginPath();
      c.arc(x, y, n === this.selected && !all ? 8 + Math.sin(t * 6) * 1.5 : 6, 0, TAU);
      c.fill();
      c.fillStyle = "rgba(237,242,245,0.85)";
      label(`${n + 1} · ${r.name}`, x, y - 14);
    });
    if (all) {
      const [ox, oy] = this.toMap(ORIGIN.x, ORIGIN.z),
        pulse = 10 + ((t * 30) % 30);
      c.strokeStyle = `rgba(255,98,75,${1 - (pulse - 10) / 30})`;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(ox, oy, pulse, 0, TAU);
      c.stroke();
      c.fillStyle = "#ff624b";
      c.beginPath();
      c.arc(ox, oy, 5, 0, TAU);
      c.fill();
      c.fillStyle = "#ffb3a6";
      c.fillText("SOURCE", ox, oy + 24);
    }
  }
  drawWave(t) {
    const c = this.waveCtx,
      w = this.wave.width,
      h = this.wave.height;
    c.fillStyle = "#04101c";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(90,168,255,0.12)";
    c.beginPath();
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.stroke();
    const trace = (fn, style, width) => {
      c.strokeStyle = style;
      c.lineWidth = width;
      c.beginPath();
      for (let i = 0; i <= w; i += 3) {
        const x = (i / w) * TAU,
          y = h / 2 - fn(x) * h * 0.36;
        i ? c.lineTo(i, y) : c.moveTo(i, y);
      }
      c.stroke();
    };
    trace(
      (x) => carrierSample(x, CARRIER.frequency, CARRIER.phase) + Math.sin(x * 40 + t * 9) * 0.05,
      "rgba(237,207,135,0.75)",
      3,
    );
    trace((x) => carrierSample(x, this.frequency, this.wavePhase), "#7fd0ff", 2);
  }
  drawScreens(t) {
    for (const s of this.screens) {
      const c = s.ctx,
        w = s.canvas.width,
        h = s.canvas.height;
      if (s.main && this.stage !== "identify" && this.phase !== "intro") {
        c.drawImage(this.stage === "trace" ? this.map : this.wave, 0, 0, w, h);
      } else {
        c.fillStyle = "#03101d";
        c.fillRect(0, 0, w, h);
        c.font = `${s.main ? 22 : 15}px monospace`;
        c.fillStyle = s.main && this.found ? "#ff8c75" : "#5aa8ff";
        const rows = Math.floor(h / (s.main ? 28 : 19));
        const rand = seeded(s.seed * 97 + Math.floor(t * 4));
        if (s.main && this.stage === "identify") {
          c.fillStyle = "#edcf87";
          c.fillText("CROSS-REFERENCE / THE NARROWS", 24, 40);
          SUSPECTS.forEach((sus, i) => {
            c.fillStyle = this.found === sus ? "#ff8c75" : "#7fb6e8";
            c.fillText(`${i + 1}. ${sus.name}`, 24, 90 + i * 40);
          });
        } else
          for (let r = 0; r < rows; r++) {
            let line = "";
            for (let i = 0; i < 4; i++)
              line +=
                Math.floor(rand() * 0xffff)
                  .toString(16)
                  .padStart(4, "0") + " ";
            c.globalAlpha = 0.35 + rand() * 0.65;
            c.fillText(line, 12, (r + 1) * (s.main ? 28 : 19));
          }
        c.globalAlpha = 1;
      }
      s.texture.needsUpdate = true;
    }
  }

  update(dt, wallDt = dt) {
    if (this.phase === "off") return;
    const now = performance.now() / 1000;
    for (const b of this.bats) {
      const a = b.phase + now * b.speed;
      b.bat.position.set(
        Math.cos(a) * b.radius,
        b.height + Math.sin(now * 0.7 + b.phase) * 2,
        Math.sin(a) * b.radius * 0.8 - 10,
      );
      b.bat.rotation.y = -a - (b.speed > 0 ? 0 : Math.PI);
      const flap = Math.sin(now * b.flap) * 0.7;
      b.left.rotation.z = flap;
      b.right.rotation.z = -flap;
    }
    if (this.radioUntil && performance.now() > this.radioUntil) {
      $("cave-radio").textContent = "";
      this.radioUntil = 0;
    }
    const rest = new T.Vector3(this.parallax.x * 0.6, 4.4 - this.parallax.y * 0.3, 7.5),
      focus = new T.Vector3(0, 4.6, -9);
    if (this.phase === "intro") {
      this.introTime += Math.min(wallDt, 0.1);
      const k = smooth(Math.min(1, this.introTime / INTRO_SECONDS));
      this.camera.position.lerpVectors(new T.Vector3(-6, 9, 50), rest, k);
      this.camera.lookAt(new T.Vector3(0, 3, -6).lerp(focus, k));
      if (this.introTime >= INTRO_SECONDS) this.skip();
    } else if (this.phase === "reveal") {
      this.revealTime += Math.min(wallDt, 0.1);
      const k = smooth(Math.min(1, this.revealTime / REVEAL_SECONDS));
      this.camera.position.lerpVectors(rest, new T.Vector3(0, 4.9, -2.5), k);
      this.camera.lookAt(focus);
      this.screenLight.color.setHex(0xff7058);
      if (this.revealTime >= REVEAL_SECONDS) this.finish();
    } else {
      this.camera.position.lerp(rest, 1 - Math.exp(-wallDt * 3));
      this.camera.lookAt(focus);
      this.screenLight.color.setHex(0x5fa8ff);
    }
    const panelOpen =
      (this.phase === "play" || this.phase === "paused") && innerWidth > 760 && innerHeight > 500;
    const shift = panelOpen ? (Math.min(600, innerWidth * 0.46) + 32) / 2 : 0;
    this.viewShift += (shift - this.viewShift) * (1 - Math.exp(-Math.min(wallDt, 0.1) * 4));
    this.camera.setViewOffset(innerWidth, innerHeight, this.viewShift, 0, innerWidth, innerHeight);
    if (this.phase === "play") {
      this.time += wallDt;
      if (this.stage === "trace") this.updateTrace(wallDt);
      else if (this.stage === "decrypt") this.updateDecrypt(wallDt);
      $("cave-time").textContent = clock(this.time + this.penalty);
    }
    if (this.phase !== "paused") {
      if (this.stage === "trace") this.drawMap(now);
      if (this.stage === "decrypt") this.drawWave(now);
      this.screenClock -= wallDt;
      if (this.screenClock <= 0) {
        this.screenClock = 0.12;
        this.drawScreens(now);
      }
    }
    this.screenLight.intensity = 62 + Math.sin(now * 3.1) * 6;
  }
}
