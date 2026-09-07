import { RELAY_SITES } from "./districts.js";

const SIZE = 420,
  EDGE = 3450;
export function mapPoint(x, z) {
  return [(x / (EDGE * 2) + 0.5) * SIZE, (z / (EDGE * 2) + 0.5) * SIZE];
}
export class Minimap {
  constructor(canvas, buildings, destinationElement) {
    this.canvas = canvas;
    this.destination =
      destinationElement || document.getElementById("map-destination");
    canvas.width = canvas.height = SIZE;
    this.ctx = canvas.getContext("2d");
    this.base = document.createElement("canvas");
    this.base.width = this.base.height = SIZE;
    const c = this.base.getContext("2d");
    c.fillStyle = "#06121e";
    c.fillRect(0, 0, SIZE, SIZE);
    c.fillStyle = "#0b283a";
    const river = mapPoint(575, 0)[0];
    c.fillRect(river, 0, (290 / 6900) * SIZE, SIZE);
    c.fillStyle = "#253b4a";
    for (const b of buildings) {
      const [x, y] = mapPoint(b.x - b.w / 2, b.z - b.d / 2);
      c.fillRect(
        x,
        y,
        Math.max(1, (b.w / 6900) * SIZE),
        Math.max(1, (b.d / 6900) * SIZE),
      );
    }
    c.strokeStyle = "#7da5b355";
    c.lineWidth = 2;
    for (const z of [-780, 900]) {
      const [x, y] = mapPoint(490, z);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(mapPoint(950, z)[0], y);
      c.stroke();
    }
    c.strokeStyle = "#60829855";
    c.lineWidth = 1;
    c.setLineDash([4, 5]);
    c.beginPath();
    c.arc(SIZE / 2, SIZE / 2, (3150 / 6900) * SIZE, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.font = "12px Arial";
    c.textAlign = "center";
    c.fillStyle = "#8ea8b9";
    for (const [label, x, z] of [
      ["OLD GOTHAM", -1850, -1850],
      ["MIDTOWN", 500, -1850],
      ["THE NARROWS", -1800, 1800],
      ["TRICORNER", 1800, 1800],
    ]) {
      c.fillText(label, ...mapPoint(x, z));
    }
    c.font = "bold 15px Arial";
    c.fillStyle = "#c1d2dc";
    c.fillText("N ↑", SIZE / 2, 23);
    c.font = "11px Arial";
    c.textAlign = "left";
    c.fillStyle = "#7895a8";
    c.fillText("1 KM", 20, SIZE - 14);
    c.strokeStyle = "#7895a8";
    c.beginPath();
    c.moveTo(20, SIZE - 32);
    c.lineTo(20 + (1000 / 6900) * SIZE, SIZE - 32);
    c.stroke();
    this.last = 0;
  }
  update(flight, mission, enemies, rings, now) {
    // Navigation does not need to compete with the flight renderer at 60 Hz.
    if (now - this.last < 0.08) return;
    this.last = now;
    const c = this.ctx;
    c.drawImage(this.base, 0, 0);
    const [px, py] = mapPoint(flight.position.x, flight.position.z);
    const objective = mission.objective(flight.position, enemies);
    if (objective) {
      const [x, y] = mapPoint(
        objective.mesh.position.x,
        objective.mesh.position.z,
      );
      c.strokeStyle = "#f4c679";
      c.lineWidth = 2;
      c.setLineDash([5, 5]);
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(x, y);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = "#ffe1a1";
      c.beginPath();
      c.arc(x, y, 12 + Math.sin(now * 3) * 2, 0, Math.PI * 2);
      c.stroke();
      this.destination.textContent =
        (objective.kind === "bomber" ? "INTERCEPT" : objective.name) +
        " · " +
        Math.round(objective.mesh.position.distanceTo(flight.position)) +
        " M";
    } else this.destination.textContent = "DEFEND GOTHAM · WATCH FOR BOMBERS";
    for (const r of rings)
      if (r.visible) {
        const [x, y] = mapPoint(r.position.x, r.position.z);
        c.strokeStyle = "#69d9df";
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.stroke();
      }
    for (let i = 0; i < mission.relays.length; i++) {
      const r = mission.relays[i],
        site = RELAY_SITES[i],
        [x, y] = mapPoint(site.x, site.z);
      c.fillStyle = r.hp > 0 ? "#f07c67" : "#73c6af";
      c.fillRect(x - 4, y - 4, 8, 8);
      c.font = "bold 11px Arial";
      c.textAlign = "center";
      c.fillStyle = "#d4e1e8";
      c.fillText(["WAYNE", "CATHEDRAL", "DOCKS"][i], x, y - 12);
    }
    for (const e of enemies) {
      const [x, y] = mapPoint(e.mesh.position.x, e.mesh.position.z);
      c.fillStyle = e.kind === "bomber" ? "#ffb775" : "#ff7968";
      c.beginPath();
      c.arc(x, y, e.kind === "bomber" ? 5 : 2.5, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.translate(px, py);
    c.rotate(-flight.yaw);
    c.shadowColor = "#c4f4ff";
    c.shadowBlur = 10;
    c.fillStyle = "#f1fbff";
    c.strokeStyle = "#122f40";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(-6, 7);
    c.lineTo(0, 3);
    c.lineTo(6, 7);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
}
