import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Driving, DRIVE_ROUTE, driveSteering } from "./driving.js";
import { createEnemy } from "./enemy.js";
import { Minimap } from "./minimap.js";
import { clamp } from "./flight.js";
import "./ground.css";
import { StreetDetail } from "./street-detail.js";
import { GroundEffects, createMine } from "./ground-effects.js";
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
      `<section id="drive-load" hidden><div class="drive-film-top">WAYNE AEROSPACE <span>CHAPTER II / GROUND OPERATIONS</span></div><div class="drive-film-copy"><div class="edition">OPERATION SILENT BELL · THE FINAL MILE</div><h2>TAKE THE<br>STREETS BACK.</h2><p>The shelters are safe. The network is not.<br>Deliver the physical override to Gordon at the cathedral before the rogue drones reconnect.</p><div class="drive-load-track"><i id="drive-load-bar"></i></div><p id="drive-load-status">Preparing the Batmobile…</p><button id="drive-launch" disabled>LOADING VEHICLE</button><button id="drive-back">BACK TO CHAPTERS</button><div class="drive-help">W / S · accelerator / brake & reverse<br>A / D · steer · hold right mouse + move · steer · Shift · jet boost<br>Space · handbrake · F / click · EMP<br>Controller: left stick · RT / LT · A boost · X EMP</div></div></section><section id="drive-hud" hidden><header><div>BATMOBILE<small>CHAPTER II / THE FINAL MILE</small></div><div class="drive-clock"><small>NETWORK RECONNECT</small><strong id="drive-time">06:00</strong></div><button id="drive-pause">Ⅱ</button></header><div class="drive-objective"><small>DELIVER THE OVERRIDE</small><h3 id="drive-goal"></h3><p id="drive-progress"></p><p id="drive-turn"></p></div><div id="drive-radio"></div><div id="drive-waypoint"><b>◇</b><span id="drive-waypoint-text"></span></div><div id="drive-map"><canvas aria-label="Batmobile route map" role="img"></canvas><div id="drive-map-target"></div></div><div class="drive-bottom"><div><small>ARMOR <b id="drive-health">100%</b></small><div class="drive-armor"><i id="drive-armor-bar"></i></div><span id="drive-emp">EMP READY</span></div><div class="drive-speed"><b id="drive-speed">0</b><span>KM/H</span></div></div><div id="drive-touch"><div id="drive-stick"><i></i></div><div class="drive-pedals"><button data-drive="brake">BRAKE</button><button data-drive="accel">GAS</button><button data-drive="boost">BOOST</button><button id="drive-touch-emp">EMP</button></div></div><button id="drive-reset">RESET TO ROAD · R</button></section>`,
    );
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
      b.onpointerup = b.onpointercancel = () => (this.touch[k] = 0);
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
    stick.onpointerup = stick.onpointercancel = () => {
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
    const rim = new T.PointLight(0xb8c9da, 9, 22, 1);
    rim.position.set(0, 6, 1);
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
      new T.RingGeometry(5.3, 6, 48),
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
    this.obstacles = [...this.world.buildings, ...this.streets.colliders];
    this.saveQuaternion = new T.Quaternion();
    this.cameraOffset = new T.Vector3();
    this.look = new T.Vector3();
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
    if (!this.ready) return;
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
    for (const m of this.mines) m.visible = true;
    this.phase = "play";
    this.onMode("drive");
    this.group.visible = true;
    $("drive-load").hidden = true;
    $("drive-hud").hidden = false;
    $("pause-menu").hidden = true;
    this.vehicle.position.copy(this.car.position);
    this.vehicle.rotation.set(0, 0, 0);
    this.camera.position.copy(this.car.position).add(new T.Vector3(0, 5, 14));
    this.radio(
      "ALFRED / Take the override to the cathedral. Follow the gold route.",
    );
  }
  hide() {
    this.phase = "off";
    this.group.visible = false;
    $("drive-load").hidden = true;
    $("drive-hud").hidden = true;
    this.touch = {};
  }
  pause() {
    if (this.phase === "play") {
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
    this.phase = "ended";
    this.onMode("driveEnded");
    $("pause-title").textContent = win
      ? "Gotham is back online."
      : "The override is lost.";
    $("pause-copy").textContent = win
      ? `Gordon has the core. The drones are grounded. ${this.car.score} points · ${Math.floor(this.car.elapsed / 60)}m ${Math.floor(this.car.elapsed % 60)}s. Both chapters complete.`
      : this.car.health <= 0
        ? "The Batmobile is disabled. Use EMP against mines and marked drone strikes."
        : "The rogue network reconnected. Follow the route and use jet boost on the straights.";
    $("resume").hidden = true;
    $("next-level").hidden = true;
    $("pause-menu").hidden = false;
    if (win) {
      this.audio.explosion();
      this.pulseLife = 2;
      try {
        localStorage.setItem("gotham-ground-complete", "1");
      } catch {}
    }
  }
  radio(text) {
    $("drive-radio").textContent = text;
    this.messageUntil = this.time + 7;
  }
  resetRoad() {
    if (this.phase !== "play") return;
    const prev = this.car.checkpoint
        ? DRIVE_ROUTE[this.car.checkpoint - 1]
        : { x: 0, z: 450 },
      next = DRIVE_ROUTE[this.car.checkpoint];
    this.car.position.set(prev.x, 0.6, prev.z);
    this.car.yaw = Math.atan2(-(next.x - prev.x), -(next.z - prev.z));
    this.car.speed = 0;
    this.car.steer = 0;
    this.mouse.steering = false;
    this.mouse.x = 0;
    this.car.invulnerable = 2;
    this.radio("ALFRED / Back on route. The clock is still running.");
  }
  emp() {
    if (this.phase !== "play" || this.car.emp > 0) return;
    this.car.emp = 6;
    this.disabled = 5;
    this.strikeTime = 0;
    this.strike.visible = false;
    this.pulseLife = 1;
    this.pulse.position.copy(this.car.position);
    this.pulse.position.y = 0.3;
    const targets = this.drones.map(d=>d.position);
    for (const m of this.mines)
      if (m.visible && m.position.distanceTo(this.car.position) < 90) { this.effects.emit(m.position,35,true); m.visible = false; }
    this.effects.discharge(this.car.position,targets);
    this.audio.shot(true);
    this.radio(
      "COUNTERMEASURES / EMP discharged. Drones disrupted for five seconds.",
    );
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
  update(dt) {
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
        passed = this.car.update(dt, input, this.obstacles);
      if (passed) {
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
      this.disabled = Math.max(0, this.disabled - dt);
      this.attackTimer -= dt;
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
      if (this.attackTimer <= 0 && this.disabled <= 0) {
        this.attackTimer = 9;
        this.strikeTime = 1.8;
        this.strike.position
          .copy(this.car.position)
          .add(
            new T.Vector3(
              -Math.sin(this.car.yaw) * this.car.speed * 0.6,
              0,
              -Math.cos(this.car.yaw) * this.car.speed * 0.6,
            ),
          );
        this.strike.position.y = 0.12;
        this.strike.visible = true;
        this.radio("THREAT / Drone strike marked. Keep moving or use EMP.");
      }
      if (this.strikeTime > 0) {
        this.strikeTime -= dt;
        this.strike.material.opacity = 0.45 + Math.sin(this.time * 20) * 0.3;
        if (this.strikeTime <= 0) {
          if (this.car.position.distanceTo(this.strike.position) < 8)
            this.car.damage(14);
          this.effects.emit(this.strike.position,70);
          this.audio.explosion();
          this.strike.visible = false;
        }
      }
      if (this.car.health < oldHealth) {
        this.effects.emit(this.car.position,35);
        this.shake = .22;
        document.body.classList.add("hit");
        setTimeout(() => document.body.classList.remove("hit"), 200);
      }
      if (this.car.health <= 0 || this.car.elapsed >= 360) {
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
      this.cameraOffset
        .set(0, 2.9, input.boost ? 16 : 13)
        .applyAxisAngle(new T.Vector3(0, 1, 0), this.car.yaw)
        .add(this.car.position);
      this.camera.position.lerp(this.cameraOffset, 1 - Math.exp(-dt * 6));
      this.look
        .set(0, 1, -15)
        .applyAxisAngle(new T.Vector3(0, 1, 0), this.car.yaw)
        .add(this.car.position);
      this.camera.up.set(0, 1, 0);
      this.shake = Math.max(0,(this.shake||0)-dt);
      this.camera.position.x += Math.sin(this.time*75)*this.shake*.35;
      this.camera.lookAt(this.look);
      this.camera.fov += ((input.boost ? 62 : 54) - this.camera.fov) * dt * 2;
      this.camera.fov = clamp(this.camera.fov, 48, 70);
      this.camera.updateProjectionMatrix();
      const left = Math.max(0, Math.ceil(360 - this.car.elapsed));
      $("drive-time").textContent =
        `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
      $("drive-speed").textContent = Math.round(Math.abs(this.car.speed) * 3.6);
      $("drive-health").textContent = Math.round(this.car.health) + "%";
      $("drive-armor-bar").style.width = this.car.health + "%";
      $("drive-emp").textContent =
        this.car.emp > 0
          ? `EMP RECHARGING / ${this.car.emp.toFixed(1)}s`
          : "EMP READY / F OR CLICK";
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
        `ROUTE ${this.car.checkpoint + 1} / ${DRIVE_ROUTE.length} · ${Math.round(Math.hypot(goal.x - this.car.position.x, goal.z - this.car.position.z))} M`;
      $("drive-turn").textContent = this.car.roadContact ? "CURB CONTACT · steer back into the lane" :
        Math.abs(this.car.speed) < 1
          ? "W / GAS to accelerate · follow the route"
          : "Gold markers guide you through the junctions";
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
    $("drive-radio").style.opacity = this.time < this.messageUntil ? 1 : 0;
    this.streets.update(this.time, this.car.position);
    this.world.update(dt, this.car.position, this.time);
    this.world.moon.position
      .copy(this.camera.position)
      .add(new T.Vector3(500, 900, -2100));
    this.world.moon.scale.set(460, 460, 1);
    this.audio.update(Math.abs(this.car.speed) * 2, this.phase === "play");
  }
}

