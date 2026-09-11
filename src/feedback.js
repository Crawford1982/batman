import { Vector3 } from "three";
import { RADIO_LINES } from "./radio-lines.js";

export class FeedbackQueue {
  constructor() { this.reset(); }
  reset() { this.items = []; this.lastReaction = -Infinity; this.hitAt = -Infinity; this.amount = 0; }
  hit(amount, now) {
    this.hitAt = now; this.amount = Math.min(1, Math.max(0, amount) / 20);
    if (now - this.lastReaction < 8000) return false;
    this.lastReaction = now; return true;
  }
  reward(text, position, now) {
    this.items = this.items.filter(item => now - item.at < 1200);
    if (this.items.length === 4) this.items.shift();
    this.items.push({ text, position, at: now });
  }
}

export class PlayerFeedback {
  constructor(audio) {
    this.audio = audio; this.queue = new FeedbackQueue();
    this.point = new Vector3(); this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.edge = document.createElement("div"); this.edge.id = "damage-feedback";
    this.edge.setAttribute("aria-hidden", "true"); document.body.append(this.edge);
    this.nodes = Array.from({ length: 4 }, () => {
      const node = document.createElement("div"); node.className = "floating-reward";
      node.hidden = true; document.body.append(node); return node;
    });
  }
  reset() { this.queue.reset(); this.edge.classList.remove("active"); this.nodes.forEach(n => n.hidden = true); }
  hit(amount, chapter) {
    const react = this.queue.hit(amount, performance.now());
    this.edge.classList.add("active");
    const id = chapter === "batmobile" ? "batman-drive" : "batman-air";
    if (react && !this.audio.voiceId && RADIO_LINES[id]) this.audio.speak(id);
  }
  reward(text, position) { this.queue.reward(text, position.clone(), performance.now()); }
  update(camera, active) {
    const now = performance.now(), age = now - this.queue.hitAt;
    this.edge.classList.toggle("active", active && age < 150);
    if (active && age < 300 && !this.motion.matches) {
      const amplitude = this.queue.amount * .22 * (1 - age / 300);
      camera.position.x += Math.sin(age * .09) * amplitude;
      camera.position.y += Math.cos(age * .11) * amplitude * .5;
      camera.updateMatrixWorld();
    }
    this.queue.items = this.queue.items.filter(item => now - item.at < 1200);
    this.nodes.forEach((node, i) => {
      const item = this.queue.items[i]; node.hidden = !active || !item;
      if (node.hidden) return;
      this.point.copy(item.position).project(camera);
      if (this.point.z < -1 || this.point.z > 1) { node.hidden = true; return; }
      const progress = (now - item.at) / 1200;
      node.textContent = item.text;
      node.style.left = `${Math.max(80, Math.min(innerWidth - 80, (this.point.x + 1) * innerWidth / 2))}px`;
      node.style.top = `${Math.max(90, Math.min(innerHeight - 90, (1 - this.point.y) * innerHeight / 2)) - i * 22}px`;
      node.style.transform = `translate(-50%, ${this.motion.matches ? 0 : -progress * 35}px)`;
      node.style.opacity = String(Math.min(1, (1 - progress) * 3));
    });
  }
}
