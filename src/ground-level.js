import { chapterCard, clearPresentation, showResults } from "./presentation.js";
import { JunctionGuide } from "./junction-guide.js";
import { RouteScenes } from "./route-scenes.js";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Driving, DRIVE_ROUTE, driveSteering, routeCue } from "./driving.js";
import { createEnemy } from "./enemy.js";
import { Minimap } from "./minimap.js";
import { clamp } from "./flight.js";
import "./ground.css";
import { StreetDetail } from "./street-detail.js";
import { GroundEffects, createMine } from "./ground-effects.js";
import { GroundCamera } from "./ground-camera.js";
import { loadPursuitDrone, installPursuitDrone } from "./pursuit-drone.js";

const $ = (id) => document.getElementById(id);
export class GroundLevel {
  constructor({ scene, camera, world, audio, keys, mouse, onMode, onExit }) {
    Object.assign(this, {
      scene,
      camera,
      world,
      audio,
      keys,
      mouse,
      onMode,
      onExit,
    });
    this.car = new Driving();
    this.phase = "off";
    this.ready = false;
    this.padPause = false;
    this.time = 0;
    this.messageUntil = 0;
    this.touch = {};
    this.group = new T.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.vehicle = new T.Group();
    this.group.add(this.vehicle);
    this.art = new T.Group();
    this.art.position.y = -0.58;
    this.vehicle.add(this.art);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 64;
    shadowCanvas.height = 128;
    const sc = shadowCanvas.getContext("2d");
    sc.translate(32,64); sc.scale(32,64);
    const sg = sc.createRadialGradient(0, 0, 0.1, 0, 0, 1);
    sg.addColorStop(0, "#000000cc");
    sg.addColorStop(1, "#00000000");
    sc.fillStyle = sg;
    sc.fillRect(-1, -1, 2, 2);
    const shadow = new T.Mesh(
      new T.PlaneGeometry(5, 11),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(shadowCanvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.48;
    this.vehicle.add(shadow);
    this.wheels = [];
    document.body.insertAdjacentHTML(
      "beforeend",
      `<section id="drive-load" hidden><div class="drive-film-top">WAYNE AEROSPACE <span>CHAPTER II / GROUND OPERATIONS</span></div><div class="drive-film-copy"><div class="edition">OPERATION SILENT BELL · THE FINAL MILE</div><h2>TAKE THE<br>STREETS BACK.</h2><p>The shelters have five minutes of reserve heat.<br>The rogue network is reconnecting. Take the encrypted override through the theatre district and beneath the elevated railway. Gordon is waiting at the cathedral.<br><br>Keep moving when the red strike marker appears. Use EMP to break the attack.</p><div class="drive-load-track"><i id="drive-load-bar"></i></div><p id="drive-load-status">Preparing the Batmobile…</p><button id="drive-launch" disabled>LOADING VEHICLE</button><button id="drive-back">BACK TO CHAPTERS</button><div class="drive-help">W / S · accelerator / brake & reverse<br>A / D · steer · hold right mouse + move · steer · Shift · jet boost<br>Space · handbrake · F / click · EMP<br>Controller: left stick · RT / LT · A boost · X EMP</div></div></section><section id="drive-hud" hidden><header><div>BATMOBILE<small>CHAPTER II / THE FINAL MILE</small></div><div class="drive-clock"><small>NETWORK RECONNECT</small><strong id="drive-time">05:00</strong></div><button id="drive-pause">Ⅱ</button></header><div class="drive-objective"><small>DELIVER THE OVERRIDE</small><h3 id="drive-goal"></h3><p id="drive-progress"></p><p id="drive-turn"></p></div><div id="drive-radio"></div><div id="drive-waypoint"><b>◇</b><span id="drive-waypoint-text"></span></div><div id="drive-map"><canvas aria-label="Batmobile route map" role="img"></canvas><div id="drive-map-target"></div></div><div class="drive-bottom"><div><small>ARMOR <b id="drive-health">100%</b></small><div class="drive-armor"><i id="drive-armor-bar"></i></div><span id="drive-emp">EMP READY</span></div><div class="drive-speed"><b id="drive-speed">0</b><span>KM/H</span></div></div><div id="drive-touch"><div id="drive-stick"><i></i></div><div class="drive-pedals"><button data-drive="brake">BRAKE</button><button data-drive="accel">GAS</button><button data-drive="boost">BOOST</button><button id="drive-touch-emp">EMP</button></div></div><button id="drive-reset">RESET TO ROAD · R</button></section>`,
    );
    document.body.insertAdjacentHTML("beforeend", `<section id="arrival-film" hidden aria-label="Mission complete"><div class="arrival-top">OPERATION SILENT BELL / GOTHAM CATHEDRAL</div><div class="arrival-copy"><small>GCPD / SECURE CHANNEL</small><h2>The city has a tomorrow.</h2><p>Override accepted. Heat restored.<br>Gordon’s people are safe inside.</p><button id="arrival-skip">VIEW MISSION RESULTS →</button></div></section>`);
    $("arrival-skip").onclick = () => this.endArrival();
    document.querySelector('.drive-objective').insertAdjacentHTML('beforeend','<div id="drive-ambush" hidden><strong></strong><span></span></div>');
    document.querySelector('.drive-objective').insertAdjacentHTML('beforeend', '<div id="drive-threat" hidden><strong></strong><span></span><i></i></div><div id="drive-reward" role="status"></div>');
    $("drive-launch").onclick = () => this.start();
    $("drive-back").onclick = () => {
      this.hide();
      this.onExit();
    };
    $("drive-pause").onclick = () => this.pause();
    $("drive-reset").onclick = () => this.resetRoad();
    $("drive-touch-emp").onclick = () => this.emp();
    document.querySelectorAll("[data-drive]").forEach((b) => {
      const k = b.dataset.drive;
      b.onpointerdown = (e) => {
        b.setPointerCapture(e.pointerId);
        this.touch[k] = 1;
      };
      b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => (this.touch[k] = 0);
    });
    const stick = $("drive-stick");
    let active = null;
    const move = (e) => {
      const b = stick.getBoundingClientRect();
      this.touch.steer = clamp(
        (e.clientX - b.left - b.width / 2) / (b.width * 0.4),
        -1,
        1,
      );
      stick.firstElementChild.style.transform = `translateX(${this.touch.steer * 30}px)`;
    };
    stick.onpointerdown = (e) => {
      active = e.pointerId;
      this.touch.steering = true;
      stick.setPointerCapture(active);
      move(e);
    };
    stick.onpointermove = (e) => {
      if (e.pointerId === active) move(e);
    };
    stick.onpointerup = stick.onpointercancel = stick.onlostpointercapture = () => {
      active = null;
      this.touch.steering = false;
      this.touch.steer = 0;
      stick.firstElementChild.style.transform = "";
    };
    this.map = new Minimap(
      $("drive-map").querySelector("canvas"),
      world.buildings,
      $("drive-map-target"),
    );
    this.checkpoints = DRIVE_ROUTE.map((p) => {
      const ring = new T.Mesh(
        new T.TorusGeometry(17, 0.3, 6, 48),
        new T.MeshBasicMaterial({
          color: 0xe8c77e,
          transparent: true,
          opacity: 0.8,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, 0.2, p.z);
      this.group.add(ring);
      return { ...p, mesh: ring, kind: "checkpoint" };
    });
    this.mapMission = {
      relays: [],
      objective: () => this.checkpoints[this.car.checkpoint],
    };
    const head = new T.SpotLight(0xffe3ae, 170, 100, 0.55, 0.65, 1);
    head.position.set(0, 2, -3);
    head.target.position.set(0, 0, -45);
    this.vehicle.add(head, head.target);
    const rim = new T.PointLight(0xadc8e8, 14, 18, 1);
    rim.position.set(-3, 5, 2);
    this.vehicle.add(rim);
    this.exhaust = new T.Mesh(
      new T.ConeGeometry(0.35, 3, 10),
      new T.ShaderMaterial({
        uniforms: { time: { value: 0 }, boost: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `varying vec2 vUv;uniform float time;uniform float boost;
          void main(){float streak=.7+.3*sin(vUv.x*62.+vUv.y*25.-time*42.);
          float taper=pow(1.-vUv.y,1.6);float root=smoothstep(0.,.13,vUv.y);
          vec3 col=mix(vec3(1.,.28,.04),vec3(1.,.83,.48),taper);
          gl_FragColor=vec4(col,root*taper*streak*(.38+boost*.45));}`,
        transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
      }),
    );
    this.exhaust.rotation.x = Math.PI / 2;
    this.exhaust.position.set(0, 1, 5.4);
    this.vehicle.add(this.exhaust);
    this.pulse = new T.Mesh(
      new T.TorusGeometry(1, 0.006, 6, 64),
      new T.MeshBasicMaterial({
        color: 0x94e6ff,
        transparent: true,
        opacity: 0,
      }),
    );
    this.pulse.rotation.x = -Math.PI / 2;
    this.group.add(this.pulse);
    this.pulseLife = 0;
    this.strike = new T.Mesh(
        new T.RingGeometry(7.3, 8, 48),
      new T.MeshBasicMaterial({
        color: 0xff6045,
        transparent: true,
        opacity: 0.7,
        side: T.DoubleSide,
      }),
    );
    this.strike.rotation.x = -Math.PI / 2;
    this.strike.visible = false;
    this.group.add(this.strike);
    this.strikeMarkers = [this.strike, ...[-1, 1].map(() => {
      const marker = this.strike.clone();
      marker.material = this.strike.material.clone();
      this.group.add(marker);
      return marker;
    })];
    this.drones = [-1, 1].map((side) => {
      const d = createEnemy();
      d.scale.setScalar(0.55);
      this.group.add(d);
      return d;
    });
    this.disabled = 0;
    this.attackTimer = 9;
    this.strikeTime = 0;
    this.mines = [];
    this.effects = new GroundEffects(this.group);
    this.streets = new StreetDetail(this.group);
    this.makeStreets();
    this.ambushMines = [-10,0,10].map((offset,i) => {
      const mine = createMine(); mine.position.set(-522.5+offset,.4,-520-i*32);
      mine.userData.ambush = true; mine.visible = false; this.group.add(mine); this.mines.push(mine);
      return mine;
    });
    this.routeScenes = new RouteScenes(this.group);
    this.junctionGuide = new JunctionGuide(this.group);
    this.obstacles = [...this.world.buildings, ...this.streets.colliders];
    this.saveQuaternion = new T.Quaternion();
    this.cameraOffset = new T.Vector3();
    this.look = new T.Vector3();
    this.cameraRig = new GroundCamera();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  }
  makeStreets() {
    const points = [{ x: 0, z: 450 }, ...DRIVE_ROUTE],
      poses = [],
      pools = [],
      paint = [],
      dummy = new T.Object3D();
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        length = Math.hypot(b.x - a.x, b.z - a.z),
        angle = Math.atan2(b.x - a.x, b.z - a.z);
      for (let d = 20; d < length - 25; d += 25) {
        const x = a.x + ((b.x - a.x) * d) / length,
          z = a.z + ((b.z - a.z) * d) / length;
        paint.push([x, z, angle]);
        if (Math.round(d / 25) % 3 === 1) {
          for (const side of [-1, 1])
            poses.push([
              x + Math.cos(angle) * side * 15,
              z - Math.sin(angle) * side * 15,
            ]);
        }
        if (d > 100 && Math.round(d / 25) % 9 === 0) {
          const m = createMine();
          m.position.set(
            x + Math.cos(angle) * (this.mines.length % 2 ? 6 : -6),
            0.35,
            z - Math.sin(angle) * (this.mines.length % 2 ? 6 : -6),
          );
          this.group.add(m);
          this.mines.push(m);
        }
      }
    }
    const poles = new T.InstancedMesh(
        new T.BoxGeometry(0.22, 10, 0.22),
        new T.MeshStandardMaterial({ color: 0x3c5264 }),
        poses.length,
      ),
      lights = new T.InstancedMesh(
        new T.BoxGeometry(1.1, 0.25, 1.1),
        new T.MeshBasicMaterial({ color: 0xffd6a2 }),
        poses.length,
      ),
      stripes = new T.InstancedMesh(
        new T.PlaneGeometry(0.35, 7),
        new T.MeshBasicMaterial({
          color: 0xbfb797,
          transparent: true,
          opacity: 0.4,
        }),
        paint.length,
      );
    poses.forEach(([x, z], i) => {
      dummy.position.set(x, 5, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 10;
      dummy.updateMatrix();
      lights.setMatrixAt(i, dummy.matrix);
    });
    paint.forEach(([x, z, angle], i) => {
      dummy.position.set(x, 0.08, z);
      dummy.rotation.set(-Math.PI / 2, 0, -angle);
      dummy.updateMatrix();
      stripes.setMatrixAt(i, dummy.matrix);
    });
    this.group.add(poles, lights, stripes);
    const roads = new T.InstancedMesh(
        new T.PlaneGeometry(1, 1),
        new T.MeshStandardMaterial({
          color: 0x788594,
          map: this.streets.roadMap,
          bumpMap: this.streets.roadMap, bumpScale: 0.08,
          roughness: 0.32,
          metalness: 0.35,
        }),
        points.length - 1,
      ),
      curbs = new T.InstancedMesh(
        new T.BoxGeometry(1, 1, 1),
        new T.MeshStandardMaterial({ color: 0x72818d, roughness: 0.95 }),
        2 * (points.length - 1),
      );
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        len = Math.hypot(b.x - a.x, b.z - a.z),
        ang = Math.atan2(b.x - a.x, b.z - a.z),
        x = (a.x + b.x) / 2,
        z = (a.z + b.z) / 2;
      dummy.position.set(x, 0.01, z);
      dummy.rotation.set(-Math.PI / 2, 0, -ang);
      dummy.scale.set(36, len + 36, 1);
      dummy.updateMatrix();
      roads.setMatrixAt(i - 1, dummy.matrix);
      for (const side of [-1, 1]) {
        dummy.position.set(
          x + Math.cos(ang) * side * 19,
          0.16,
          z - Math.sin(ang) * side * 19,
        );
        dummy.rotation.set(0, ang, 0);
        dummy.scale.set(2, 0.3, Math.max(1, len - 35));
        dummy.updateMatrix();
        curbs.setMatrixAt((i - 1) * 2 + (side === 1 ? 1 : 0), dummy.matrix);
      }
    }
    this.group.add(roads, curbs);
  }
  async load() {
    if (this.ready) return;
    if (this.loading) return this.loading;
    this.loading = loadPursuitDrone().then(template => {
      this.drones.forEach((d,i)=>installPursuitDrone(d,template,i));
      return new Promise((resolve, reject) =>
      new GLTFLoader().load(
        `${import.meta.env.BASE_URL}batmobile.glb`,
        (g) => {
          const model = g.scene;
          model.updateMatrixWorld(true);
          const bounds = new T.Box3().setFromObject(model),
            size = bounds.getSize(new T.Vector3()),
            center = bounds.getCenter(new T.Vector3());
          const front = model.getObjectByName("Batmobile_FrontLight_0"),
            rear = model.getObjectByName("Batmobile_RearLight_0");
          let heading = model.getObjectByName("Batmobile_body") ? Math.PI : 0;
          if (front && rear) {
            const f = new T.Box3()
                .setFromObject(front)
                .getCenter(new T.Vector3()),
              r = new T.Box3().setFromObject(rear).getCenter(new T.Vector3());
            heading = Math.PI - Math.atan2(f.x - r.x, f.z - r.z);
          }
          model.position.sub(new T.Vector3(center.x, bounds.min.y, center.z));
          const scale = new T.Group();
          scale.add(model);
          scale.scale.setScalar(9 / Math.max(size.x, size.z));
          scale.rotation.y = heading;
          this.art.add(scale);
          model.traverse((o) => {
            if (/^[FB][RL]_Wheel$/.test(o.name))
              this.wheels.push({ mesh: o, rotation: o.rotation.x });
            if (o.isMesh) {
              const materials = Array.isArray(o.material)
                ? o.material
                : [o.material];
              for (const mat of materials) {
                if (mat.name === 'CarPaint') {
                  mat.color.set('#111317'); mat.roughness=.44; mat.metalness=.05;
                } else if (mat.name === 'CarPaintGloss') {
                  mat.color.set('#080d13'); mat.roughness=.22; mat.metalness=.18;
                } else if (mat.name === 'Metal') {
                  mat.color.set('#555c60'); mat.roughness=.53; mat.metalness=.8;
                } else if (mat.name === 'Rims') {
                  mat.color.set('#363b40'); mat.roughness=.44; mat.metalness=.65;
                } else if (mat.name === 'Tire') {
                  mat.color.set('#101113'); mat.roughness=.95; mat.metalness=0;
                } else if (mat.name === 'FrontLight') {
                  mat.emissive.set('#ffd286'); mat.emissiveIntensity=1.3;
                }
              }
            }
          });
          this.ready = true;
          $("drive-load-bar").style.width = "100%";
          $("drive-load-status").textContent =
            "JET TURBINE ONLINE / OVERRIDE SECURED";
          $("drive-launch").disabled = false;
          $("drive-launch").textContent = "ENTER GOTHAM →";
          resolve();
        },
        (e) => {
          $("drive-load-bar").style.width =
            (e.total ? Math.round((e.loaded / e.total) * 100) : 45) + "%";
        },
        (e) => {
          this.loading = null;
          $("drive-load-status").textContent =
            "Vehicle could not load. Return to chapters and retry.";
          reject(e);
        },
      ),
    );
    }).catch(e => { this.loading = null; $("drive-load-status").textContent = "Assets could not load. Return to chapters and retry."; throw e; });
    return this.loading;
  }
  async begin() {
    document.body.classList.add('ground-presentation');
    document.body.classList.remove('ground-arrival');
    this.routeScenes.restorePower(0);
    this.phase = "briefing";
    this.onMode("driveBriefing");
    this.car.reset();
    this.group.visible = true;
    this.vehicle.position.copy(this.car.position);
    this.vehicle.rotation.set(0, 0, 0);
    $("drive-load").hidden = false;
    $("drive-hud").hidden = true;
    $("pause-menu").hidden = true;
    this.audio.start();
    try {
      await this.load();
    } catch (e) {
      console.error("Batmobile load failed", e);
    }
  }
  start() {
    document.body.classList.add('ground-presentation');
    document.body.classList.remove('ground-arrival');
    this.routeScenes.restorePower(0);
    this.audio.stopVoice(); this.audio.radioTimes = {};
    this.audio.radioSeen = new Set(); this.audio.lastRadioEnd = performance.now();
    if (!this.ready) return;
    window.gothamAnalytics?.event("level_start",{level_name:"batmobile"});
    $("arrival-film").hidden = true;
    clearPresentation();
    chapterCard("CHAPTER II / THE FINAL MILE", "Bring Gotham back online");
    this.car.reset();
    this.wheelSpin = 0;
    this.effects.reset();
    this.effectTimer = 0;
    this.shake = 0;
    this.time = 0;
    this.touch = {};
    this.mouse.active = false;
    this.mouse.steering = false;
    this.mouse.x = 0;
    this.disabled = 0;
    this.attackTimer = 9;
    this.strikeTime = 0;
    this.strike.visible = false;
    this.pulseLife = 0;
    this.cancelStrike();
    this.strikeNumber = 0; this.evasions = 0; this.countered = 0;
    this.cleanSections = 0; this.sectionDamaged = false;
    this.sectionDamageStart = this.car.damageTaken;
    this.rewardUntil = 0; $('drive-reward').textContent = '';
    this.ambushState = 'waiting'; this.ambushEnd = -Infinity;
    $('drive-ambush').hidden = true;
    for (const m of this.mines) { m.visible = !m.userData.ambush; m.userData.clearedByEMP = false; }
    this.phase = "play";
    this.onMode("drive");
    this.group.visible = true;
    $("drive-load").hidden = true;
    $("drive-hud").hidden = false;
    $("pause-menu").hidden = true;
    this.vehicle.position.copy(this.car.position);
    this.vehicle.rotation.set(0, 0, 0);
    this.cameraRig.reset(this.car.position, this.car.yaw);
    this.camera.position.copy(this.cameraRig.eye);
    this.look.copy(this.cameraRig.look); this.camera.lookAt(this.look);
    this.camera.fov = 54; this.camera.updateProjectionMatrix();
    this.radio(
      "ALFRED / Take the override to the cathedral. Follow the gold route.",
    );
  }
  hide() {
    document.body.classList.remove('ground-presentation', 'ground-arrival');
    this.audio.stopVoice();
    this.cancelStrike();
    $("arrival-film").hidden = true;
    this.phase = "off";
    this.group.visible = false;
    $("drive-load").hidden = true;
    $("drive-hud").hidden = true;
    this.touch = {};
  }
  pause() {
    if (this.phase === "arrival") { this.endArrival(); return; }
    if (this.phase === "play") {
      this.audio.stopVoice();
      clearPresentation();
      this.phase = "paused";
      this.mouse.steering = false;
      this.mouse.fire = false;
      this.touch = {};
      this.onMode("drivePaused");
      $("pause-title").textContent = "Engine standing by.";
      $("pause-copy").textContent = "Your delivery timer is paused.";
      $("resume").hidden = false;
      $("next-level").hidden = true;
      $("pause-menu").hidden = false;
    } else if (this.phase === "paused") {
      this.phase = "play";
      this.onMode("drive");
      $("pause-menu").hidden = true;
    }
  }
  finish(win) {
    if (this.phase !== "play") return;
    this.audio.stopVoice();
    $("drive-hud").hidden = true;
    this.cancelStrike();
    showResults("batmobile", win, this.car.elapsed, this.car.score, this.car.health, `${this.car.checkpoint} / ${DRIVE_ROUTE.length} checkpoints · ${this.cleanSections} clean sections · ${this.evasions} evasions · ${this.countered} EMP counters`);
    window.gothamAnalytics?.event("level_end",{level_name:"batmobile",success:win,elapsed_seconds:this.car.elapsed,score:this.car.score});
    this.phase = "ended";
    this.onMode("driveEnded");
    $("pause-title").textContent = win
      ? "Gotham is back online."
      : "The override is lost.";
    $("pause-copy").textContent = win
      ? `Gordon has the core. The drones are grounded. ${this.car.score} points · ${Math.floor(this.car.elapsed / 60)}m ${Math.floor(this.car.elapsed % 60)}s. The cathedral is safe. Operation Silent Bell complete.`
      : this.car.health <= 0
        ? "The Batmobile is disabled. Use EMP against mines and marked drone strikes."
        : "The rogue network reconnected. Follow the route and use jet boost on the straights.";
    $("resume").hidden = true;
    $("next-level").hidden = true;
    $("pause-menu").hidden = false;
    if (win) {
      this.car.speed = 0;
      this.touch = {}; this.mouse.steering = false;
      this.vehicle.position.copy(this.car.position);
      this.exhaust.visible = false; this.strike.visible = false;
      this.drones.forEach(d => d.visible = false);
      this.checkpoints.forEach(p => p.mesh.visible = false);
      this.junctionGuide.markers.forEach(m => m.visible = false);
      this.phase = "arrival"; this.onMode("driveArrival"); this.arrivalTime = 0;
      this.arrivalEye = this.camera.position.clone();
      this.arrivalLook = this.look.clone();
      this.arrivalFov = this.camera.fov;
      document.body.classList.add('ground-arrival');
      $("pause-menu").hidden = true; $("arrival-film").hidden = false;
      this.audio.shot(true);
      this.audio.speak("gordon-safe");
      try {
        localStorage.setItem("gotham-ground-complete", "1");
      } catch {}
    }
  }
  endArrival() {
    this.audio.stopVoice();
    if (this.phase !== "arrival") return;
    document.body.classList.remove('ground-arrival');
    this.phase = "ended"; this.onMode("driveEnded");
    $("arrival-film").hidden = true; $("pause-menu").hidden = false;
  }
  radio(text) {
    this.audio.radioMessage(text);
    $("drive-radio").textContent = text;
    this.messageUntil = this.time + 7;
  }
  resetRoad() {
    if (this.phase !== "play") return;
    this.car.recoverToRoute();
    this.sectionDamaged = true; // Recovery cannot manufacture a clean-section bonus.
    this.cancelStrike();
    this.disabled = Math.max(this.disabled, 3);
    this.touch = {};
    this.mouse.steering = false;
    this.mouse.x = 0;
    this.car.invulnerable = 2;
    this.cameraRig.reset(this.car.position, this.car.yaw);
    this.radio("ALFRED / Back on route. The clock is still running.");
  }
  emp() {
    if (this.phase !== "play" || this.car.emp > 0) return;
    const disrupted = this.strikeTime > 0 || this.mines.some(m => m.visible && m.position.distanceTo(this.car.position) < 90);
    this.car.emp = 6;
    this.disabled = 5;
    if (disrupted) this.audio.ambientRadio("alfred-emp");
    if (this.strikeTime > 0) {
      this.countered++;
      this.reward(150, 'STRIKE INTERRUPTED');
    }
    this.cancelStrike();
    this.pulseLife = 1;
    this.pulse.position.copy(this.car.position);
    this.pulse.position.y = 0.3;
    const targets = this.drones.map(d=>d.position);
    for (const m of this.mines)
      if (m.visible && m.position.distanceTo(this.car.position) < 90) { this.effects.emit(m.position,35,true); m.visible = false; m.userData.clearedByEMP = true; }
    this.effects.discharge(this.car.position,targets);
    this.audio.shot(true);
    this.radio(
      "COUNTERMEASURES / EMP discharged. Drones disrupted for five seconds.",
    );
  }
  updateAmbush() {
    const {z} = this.car.position;
    if (this.ambushState === 'waiting' && this.car.checkpoint === 2 && z < -130 && z > -630) {
      this.ambushState = 'active'; this.ambushHealth = this.car.health;
      this.ambushMines.forEach(m => m.visible = true);
      this.cancelStrike();
      this.radio('AMBUSH / Mines under the railway. EMP within 90 metres, or weave through the gaps.');
    }
    const panel = $('drive-ambush');
    if (this.ambushState === 'active') {
      this.attackTimer = Math.max(this.attackTimer, 3); // Give this encounter its own readable beat.
      const remaining = this.ambushMines.filter(m => m.visible);
      if (!remaining.length || z < -630 || this.car.checkpoint > 2) {
        const cleared = this.ambushMines.every(m => m.userData.clearedByEMP);
        const bonus = cleared ? 500 : this.car.health >= this.ambushHealth ? 200 : 0;
        this.car.score += bonus; this.ambushState = 'complete'; this.ambushEnd = this.car.elapsed;
        this.ambushMines.forEach(m => m.visible = false); this.disabled = Math.max(this.disabled, 6);
        panel.querySelector('strong').textContent = cleared ? 'AMBUSH DISARMED · +500' : bonus ? 'CLEAN ESCAPE · +200' : 'AMBUSH SURVIVED';
        panel.querySelector('span').textContent = 'Corridor clear. Continue to the cathedral.';
        this.radio(cleared ? 'COUNTERMEASURES / Minefield disabled. Corridor clear. +500' : 'ROUTE CLEAR / Continue to the cathedral.');
      } else {
        const distance = Math.round(Math.min(...remaining.map(m => m.position.distanceTo(this.car.position))));
        panel.querySelector('strong').textContent = 'RAILWAY AMBUSH · ' + remaining.length + ' MINES';
        panel.querySelector('span').textContent = distance <= 90 ? 'IN EMP RANGE · F / CLICK / TOUCH EMP' : `MINEFIELD ${distance} M · EMP RANGE 90 M`;
      }
    }
    panel.hidden = this.ambushState === 'waiting' || (this.ambushState === 'complete' && this.car.elapsed-this.ambushEnd > 6);
    panel.classList.toggle('cleared', this.ambushState === 'complete');
  }
  reward(points, label) {
    this.car.score += points;
    $('drive-reward').textContent = `${label} · +${points}`;
    this.rewardUntil = this.time + 3;
  }
  cancelStrike() {
    this.strikeTime = 0;
    this.strikeMarkers.forEach(m => m.visible = false);
    this.effects?.target(this.car.position, this.car.position, false);
    $('drive-threat').hidden = true;
  }
  beginStrike() {
    const goal = DRIVE_ROUTE[this.car.checkpoint];
    const distance = Math.hypot(goal.x-this.car.position.x, goal.z-this.car.position.z);
    const previous = DRIVE_ROUTE[this.car.checkpoint-1];
    const leavingCorner = previous && Math.hypot(previous.x-this.car.position.x, previous.z-this.car.position.z) < 90;
    // Keep intersections readable. Barrages belong on long, open stretches.
    if (distance < 160 || leavingCorner || this.car.checkpoint >= 4 || this.ambushState === 'active') return;
    this.strikeNumber++;
    this.barrage = this.car.checkpoint >= 2 && this.strikeNumber % 2 === 0;
    this.strikeDuration = this.barrage ? 3.2 : 2.6;
    this.strikeTime = this.strikeDuration;
    this.attackTimer = this.car.checkpoint < 2 ? 11 : 8;
    const forward = new T.Vector3(-Math.sin(this.car.yaw), 0, -Math.cos(this.car.yaw));
    this.strike.position.copy(this.car.position).addScaledVector(forward, this.car.speed * .6);
    this.strike.position.y = .12;
    const side = new T.Vector3(Math.cos(this.car.yaw), 0, -Math.sin(this.car.yaw));
    this.strikeMarkers.forEach((m,i) => {
      if (i) m.position.copy(this.strike.position).addScaledVector(side, i === 1 ? -10 : 10);
      m.visible = i === 0 || this.barrage;
      m.material.color.setHex(this.barrage ? 0xffaa55 : 0xff6045);
    });
    this.radio(this.barrage ? 'THREAT / Three-point barrage. Clear the marked road or use EMP.' : 'THREAT / Drone strike marked. Keep moving or use EMP.');
  }
  updateStrike(wallDt) {
    const panel = $('drive-threat');
    panel.hidden = this.strikeTime <= 0;
    if (this.strikeTime <= 0) return;
    this.strikeTime = Math.max(0, this.strikeTime - wallDt);
    const markers = this.strikeMarkers.filter(m => m.visible);
    const danger = markers.some(m => this.car.position.distanceTo(m.position) < 8);
    panel.classList.toggle('safe', !danger);
    panel.querySelector('strong').textContent = `${this.barrage ? 'THREE-POINT BARRAGE' : 'DRONE STRIKE'} · ${this.strikeTime.toFixed(1)}s`;
    panel.querySelector('span').textContent = danger ? (this.car.emp <= 0 ? 'IN BLAST ZONE · MOVE OR EMP' : 'IN BLAST ZONE · KEEP MOVING') : 'CLEAR OF BLAST · KEEP CLEAR';
    panel.querySelector('i').style.transform = `scaleX(${this.strikeTime / this.strikeDuration})`;
    markers.forEach(m => m.material.opacity = .65 + Math.sin(this.time * 20) * .2);
    if (this.strikeTime === 0) {
      if (danger) this.car.damage(14); // Overlapping rings still cause just one hit.
      else { this.evasions++; this.reward(this.barrage ? 200 : 100, 'CLEAN EVASION'); }
      markers.forEach(m => this.effects.emit(m.position, this.barrage ? 24 : 70));
      this.audio.explosion();
      this.cancelStrike();
    }
  }
  controls() {
    const k = this.keys,
      pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
    const steer = driveSteering(k, this.mouse, this.touch, pad);
    let accel = k.KeyW || k.ArrowUp || this.touch.accel ? 1 : 0,
      brake = k.KeyS || k.ArrowDown || this.touch.brake ? 1 : 0,
      boost = k.ShiftLeft || this.touch.boost,
      drift = k.Space;
    if (pad) {
      accel = Math.max(accel, pad.buttons[7]?.value || 0);
      brake = Math.max(brake, pad.buttons[6]?.value || 0);
      boost ||= pad.buttons[0]?.pressed;
      drift ||= pad.buttons[1]?.pressed;
      if (pad.buttons[2]?.pressed) this.emp();
      const p = pad.buttons[9]?.pressed;
      if (p && !this.padPause) {
        if (this.phase === "briefing") this.start();
        else this.pause();
      }
      this.padPause = p;
    }
    if (k.KeyF || this.mouse.fire) this.emp();
    return { steer, accel, brake, boost, drift };
  }
  update(dt, wallDt = dt) {
    if (this.phase === "arrival") {
      this.controls(); // Controller menu button can skip, just like Escape.
      if (this.phase !== "arrival") return;
      this.arrivalTime += dt;
      this.time += dt;
      this.streets.update(this.time, this.car.position);
      this.routeScenes.update(this.car.position);
      const progress = Math.min(1, this.arrivalTime / 6);
      const ease = progress * progress * (3 - 2 * progress);
      this.routeScenes.restorePower(Math.min(1, this.arrivalTime / 2.5));
      if (!this.reducedMotion.matches) {
        const eye = this.car.position.clone().add(new T.Vector3(16, 8, 20));
        const look = this.car.position.clone().add(new T.Vector3(0, 4, -8));
        this.camera.position.lerpVectors(this.arrivalEye, eye, ease);
        this.camera.lookAt(this.arrivalLook.clone().lerp(look, ease));
        this.camera.fov = this.arrivalFov + (46-this.arrivalFov)*ease;
        this.camera.updateProjectionMatrix();
      }
      this.world.update(dt, this.car.position, this.time);
      this.audio.update(0, false);
      if (this.arrivalTime >= 7) this.endArrival();
      return;
    }
    const input = this.controls();
    if (this.phase === "paused" || this.phase === "ended") return;
    this.time += dt;
    this.effects.update(dt);
    this.drones.forEach(d=>d.visible=this.phase === "play");
    if (this.phase === "briefing") {
      const angle = 0.65 + Math.sin(this.time * 0.12) * 0.3;
      this.camera.position
        .copy(this.car.position)
        .add(new T.Vector3(Math.sin(angle) * 15, 2.8, -Math.cos(angle) * 15));
      this.camera.lookAt(this.car.position.clone().add(new T.Vector3(0, 1, 0)));
      this.camera.fov = 44;
      this.camera.updateProjectionMatrix();
    }
    if (this.phase === "play") {
      const oldHealth = this.car.health,
        passed = this.car.update(Math.min(wallDt,.25), input, this.obstacles, true, wallDt);
      if (passed) {
        if (!this.sectionDamaged && this.car.damageTaken === this.sectionDamageStart) {
          this.cleanSections++; this.reward(200, 'CLEAN SECTION');
        }
        this.sectionDamaged = false;
        this.sectionDamageStart = this.car.damageTaken;
        this.cancelStrike(); this.attackTimer = Math.max(this.attackTimer, 5);
        this.audio.shot(true);
        this.radio(passed.line);
        if (this.car.done) {
          this.finish(true);
          return;
        }
      }
      for (const m of this.mines) {
        if (m.visible && m.position.distanceTo(this.car.position) < 4) {
          if (this.car.damage(12)) {
            this.effects.emit(m.position,50);
            m.visible = false;
            this.audio.explosion();
          }
        }
      }
      this.updateAmbush();
      this.disabled = Math.max(0, this.disabled - wallDt);
      this.attackTimer -= wallDt;
      this.drones.forEach((d, i) => {
        const a=this.time*.38+i*Math.PI;
        const entry=Math.max(0,1-this.time/5)*100;
        d.position.copy(this.car.position).add(new T.Vector3(Math.sin(a)*11,27+i*5,Math.cos(a)*48-entry).applyAxisAngle(new T.Vector3(0,1,0),this.car.yaw));
        // Fixed-wing aircraft bank through a level orbit, never point nose-down at the car.
        d.rotation.set(0,this.car.yaw+Math.atan2(-11*Math.cos(a),48*Math.sin(a)),Math.sin(a)*.16);
        if(this.disabled>0){d.rotation.z+=Math.sin(this.time*19+i)*.16;d.position.y+=Math.sin(this.time*6)*.7;}
        if(d.userData.lights)d.userData.lights.visible=this.disabled<=0 || Math.sin(this.time*35)>0.6;
      });
      this.effectTimer=(this.effectTimer||0)+dt;
      if(this.effectTimer>.11){
        this.effectTimer=0;
        if(this.disabled>0)this.drones.forEach(d=>this.effects.puff(d.position));
        for(const v of this.streets.vents)if(v.distanceTo(this.car.position)<85)this.effects.puff(v);
        if(Math.abs(this.car.speed)>15){for(const side of [-1,1]){const p=new T.Vector3(side*1.5,.3,3.5).applyAxisAngle(new T.Vector3(0,1,0),this.car.yaw).add(this.car.position);this.effects.puff(p);}}
      }
      this.mines.forEach(m=>{if(m.userData.light)m.userData.light.visible=Math.sin(this.time*5+m.position.z)>.1;});
      this.effects.target(this.drones[0].position,this.strike.position,this.strikeTime>0);
      if (this.attackTimer <= 0 && this.disabled <= 0 && this.car.elapsed > 15 && this.strikeTime <= 0) this.beginStrike();
      this.updateStrike(wallDt);
      $('drive-reward').style.opacity = this.time < this.rewardUntil ? 1 : 0;
      if (this.car.health < oldHealth) {
        this.sectionDamaged = true;
        this.effects.emit(this.car.position,35);
        this.shake = .22;
        document.body.classList.add("hit");
        setTimeout(() => document.body.classList.remove("hit"), 200);
      }
      if (this.car.health <= 0 || this.car.elapsed >= 300) {
        this.finish(false);
        return;
      }
      this.vehicle.position.copy(this.car.position);
      this.vehicle.rotation.y = this.car.yaw;
      this.art.rotation.z =
        this.car.steer * Math.min(Math.abs(this.car.speed) / 45, 1) * 0.035;
      this.art.position.y =
        -0.58 +
        Math.sin(this.time * 30) *
          Math.min(Math.abs(this.car.speed) / 2000, 0.025);
      this.wheelSpin = (this.wheelSpin || 0) + (this.car.speed * dt) / 0.6;
      for (const w of this.wheels)
        w.mesh.rotation.x = w.rotation + this.wheelSpin;
      this.cameraRig.update(dt, this.car, input.boost, this.reducedMotion.matches);
      this.camera.position.copy(this.cameraRig.eye);
      this.look.copy(this.cameraRig.look);
      this.camera.up.set(0, 1, 0);
      this.shake = Math.max(0,(this.shake||0)-dt);
      if (!this.reducedMotion.matches) this.camera.position.x += Math.sin(this.time*75)*this.shake*.35;
      this.camera.lookAt(this.look);
      this.camera.fov += ((54+this.cameraRig.boost*5) - this.camera.fov) * (1-Math.exp(-dt*3));
      this.camera.fov = clamp(this.camera.fov, 48, 70);
      this.camera.updateProjectionMatrix();
      const left = Math.max(0, Math.ceil(300 - this.car.elapsed));
      $("drive-time").textContent =
        `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
      $("drive-speed").textContent = Math.round(Math.abs(this.car.speed) * 3.6);
      $("drive-health").textContent = Math.round(this.car.health) + "%";
      $("drive-armor-bar").style.width = this.car.health + "%";
      $("drive-emp").textContent =
        this.car.emp > 0
          ? `EMP RECHARGING / ${this.car.emp.toFixed(1)}s`
          : "EMP READY / F OR CLICK";
      // Location-specific chatter expires when its stretch is passed; no stale queue.
      if (this.ambushState !== "active" && this.strikeTime <= 0 && this.attackTimer > 5) {
        const {x,z} = this.car.position;
        if (this.car.checkpoint === 1 && x < -100 && x > -420) this.audio.ambientRadio('alfred-theatre');
        else if (this.car.checkpoint === 2 && z < -180 && z > -600) this.audio.ambientRadio('alfred-railway');
        else if (this.car.elapsed > 50 && this.car.checkpoint < 4) this.audio.ambientRadio('gordon-hold');
      }
      const goal = DRIVE_ROUTE[this.car.checkpoint];
      const marker =
        this.checkpoints[this.car.checkpoint].mesh.position.clone();
      marker.y = 5;
      marker.project(this.camera);
      $("drive-waypoint").style.left =
        clamp((marker.x * 0.5 + 0.5) * innerWidth, 80, innerWidth - 80) + "px";
      $("drive-waypoint").style.top =
        clamp((0.5 - marker.y * 0.5) * innerHeight, 110, innerHeight - 140) +
        "px";
      $("drive-waypoint-text").textContent =
        Math.round(
          Math.hypot(
            goal.x - this.car.position.x,
            goal.z - this.car.position.z,
          ),
        ) + " M";
      $("drive-goal").textContent = goal.name;
      $("drive-progress").textContent =
        `ROUTE ${this.car.checkpoint + 1} / ${DRIVE_ROUTE.length} · ${this.car.score.toLocaleString()} PTS`;
      const turnDistance = Math.hypot(goal.x-this.car.position.x, goal.z-this.car.position.z);
      $("drive-turn").classList.toggle("turn-urgent", turnDistance < 130 || this.car.roadContact);
      $("drive-turn").textContent = this.car.roadContact ? "CURB CONTACT · steer back into the lane" :
        routeCue(this.car.position, this.car.yaw, this.car.checkpoint);
      this.map.update(this.car, this.mapMission, [], [], this.time);
    }
    this.checkpoints.forEach((p, i) => {
      p.mesh.visible = i === this.car.checkpoint;
      p.mesh.material.opacity = 0.5 + Math.sin(this.time * 3) * 0.25;
    });
    this.exhaust.visible =
      this.phase === "play" && Math.abs(this.car.speed) > 8 && (input.accel > 0 || input.boost);
    this.exhaust.scale.y = input.boost ? 2 : .65;
    this.exhaust.material.uniforms.time.value = this.time;
    this.exhaust.material.uniforms.boost.value = input.boost ? 1 : 0;
    this.pulseLife = Math.max(0, this.pulseLife - dt);
    this.pulse.visible = this.pulseLife > 0;
    this.pulse.scale.setScalar((1 - this.pulseLife) * 90 + 2);
    this.pulse.material.opacity = this.pulseLife;
    const caption = $('radio-caption');
    const dedicatedThreat = /^THREAT|^AMBUSH|^COUNTERMEASURES|^ROUTE CLEAR/.test($('drive-radio').textContent);
    const showRadio = this.time < this.messageUntil && !(caption && !caption.hidden) &&
      !(dedicatedThreat && (!$('drive-threat').hidden || !$('drive-ambush').hidden));
    $("drive-radio").style.opacity = showRadio ? 1 : 0;
    this.streets.update(this.time, this.car.position);
    this.routeScenes.update(this.car.position);
    this.junctionGuide.update(this.car.checkpoint, this.car.position);
    this.world.update(dt, this.car.position, this.time);
    this.world.moon.position
      .copy(this.camera.position)
      .add(new T.Vector3(500, 900, -2100));
    this.world.moon.scale.set(460, 460, 1);
    this.audio.update(Math.abs(this.car.speed) * 2, this.phase === "play");
  }
}

