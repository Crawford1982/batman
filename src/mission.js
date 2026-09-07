import * as T from "three";
import { RELAY_SITES } from "./districts.js";

export const FLIGHT_DURATION = 600;
export const FINAL_DEFENCE = 90;

export class Mission {
  constructor(scene) {
    this.relays = RELAY_SITES.map((site) => {
      const mesh = new T.Group();
      mesh.position.set(site.x, site.y, site.z);
      const glow = new T.MeshBasicMaterial({
        color: 0xff6855,
        transparent: true,
        opacity: 0.85,
      });
      const core = new T.Mesh(new T.OctahedronGeometry(6), glow);
      const ring = new T.Mesh(new T.TorusGeometry(14, 0.6, 6, 40), glow);
      ring.rotation.x = Math.PI / 2;
      const mast = new T.Mesh(
        new T.CylinderGeometry(0.8, 2, 24, 6),
        new T.MeshStandardMaterial({
          color: 0x617587,
          metalness: 0.7,
          roughness: 0.35,
        }),
      );
      mast.position.y = -15;
      mesh.add(core, ring, mast);
      scene.add(mesh);
      return { ...site, mesh, core, ring, hp: 12, kind: "relay" };
    });
    this.reset();
  }
  reset() {
    this.city = 100;
    this.nextRaid = 12;
    this.phase = "intercept";
    this.finalStarted = null;
    this.finalRaids = 0;
    this.raid = 0;
    this.finalRaid = false;
    for (const r of this.relays) {
      r.hp = 12;
      r.mesh.visible = true;
      r.mesh.position.set(r.x, r.y, r.z);
    }
  }
  get remaining() {
    return this.relays.filter((r) => r.hp > 0);
  }
  get disabled() {
    return 3 - this.remaining.length;
  }
  outcome(elapsed, bombers) {
    if (this.city <= 0 || elapsed >= FLIGHT_DURATION) return 'lost';
    if (this.finalStarted !== null && this.disabled === 3 && this.finalRaids === 3 &&
        elapsed - this.finalStarted >= FINAL_DEFENCE && bombers === 0) return 'won';
    return null;
  }
  update(dt, elapsed, bombers = 0) {
    if (this.disabled === 3 && elapsed >= 60 && this.finalStarted === null) {
      this.phase = 'defend'; this.finalStarted = elapsed; this.nextRaid = 0;
    } else if (this.finalStarted === null) this.phase = elapsed < 60 ? 'intercept' : 'sabotage';
    for (const r of this.remaining) {
      r.core.rotation.y += dt;
      r.ring.rotation.z += dt * 0.4;
    }
    this.nextRaid -= dt;
    if (this.nextRaid <= 0 && bombers < 3) {
      if (this.phase === 'defend') {
        if (this.finalRaids >= 3) return null;
        this.finalRaids++;
        this.nextRaid = 14;
      } else this.nextRaid = this.phase === 'intercept' ? 42 : 65 + this.disabled * 14;
      return RELAY_SITES[this.raid++ % RELAY_SITES.length];
    }
    return null;
  }
  impact() {
    this.city = Math.max(0, this.city - 10);
  }
  objective(position, enemies) {
    const bombers = enemies.filter((e) => e.kind === "bomber");
    if (bombers.length)
      return bombers.reduce((a, b) =>
        a.mesh.position.distanceTo(a.destination) <
        b.mesh.position.distanceTo(b.destination)
          ? a
          : b,
      );
    return (
      this.remaining.sort(
        (a, b) =>
          a.mesh.position.distanceTo(position) -
          b.mesh.position.distanceTo(position),
      )[0] || null
    );
  }
}

export const BRIEFING = [
  {
    title: "THE CITY IS GOING DARK.",
    location: "TRICORNER DOCKS · 23:40",
    speaker: "ALFRED / ENCRYPTED CHANNEL",
    text: "Someone has seized the Wayne defense network. Armed aircraft are moving inland from the docks.",
    target: new T.Vector3(1100, 70, 1000),
    eye: new T.Vector3(690, 220, 1430),
  },
  {
    title: "THE COLD IS THE WEAPON.",
    location: "OLD GOTHAM · EMERGENCY SHELTER",
    speaker: "GORDON / GCPD DISPATCH",
    text: "They are targeting the heating grid. The cathedral is full of families. We need ten minutes at most to get everyone out.",
    target: new T.Vector3(-1100, 110, -1000),
    eye: new T.Vector3(-1280, 215, -670),
  },
  {
    title: "KEEP GOTHAM ALIVE.",
    location: "WAYNE TOWER · NETWORK UPLINK",
    speaker: "ALFRED / MISSION DIRECTIVE",
    text: "Intercept the opening raid. Destroy three red command relays to accelerate the evacuation, then hold off the final attack. Ten minutes is our limit.",
    target: new T.Vector3(-270, 260, -380),
    eye: new T.Vector3(-70, 350, -40),
  },
];
