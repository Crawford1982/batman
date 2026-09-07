export class AudioSystem {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.next = 0;
    this.step = 0;
  }
  start() {
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      this.ctx = new A();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.26 : 0;
      this.master.connect(this.ctx.destination);
      this.engine = this.ctx.createOscillator();
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 45;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 130;
      this.engGain = this.ctx.createGain();
      this.engGain.gain.value = 0.06;
      this.engine.connect(filter);
      filter.connect(this.engGain);
      this.engGain.connect(this.master);
      this.engine.start();
      this.next = this.ctx.currentTime;
    }
    this.ctx.resume();
  }
  mute(v) {
    this.enabled = !v;
    if (this.ctx)
      this.master.gain.setTargetAtTime(v ? 0 : 0.26, this.ctx.currentTime, 0.1);
  }
  tone(freq, at, len, gain = 0.1, type = "sine") {
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g);
    g.connect(this.master);
    o.start(at);
    o.stop(at + len + 0.1);
  }
  update(speed, playing) {
    if (!this.ctx) return;
    this.engine.frequency.setTargetAtTime(
      30 + speed * 0.65,
      this.ctx.currentTime,
      0.2,
    );
    this.engGain.gain.setTargetAtTime(
      playing ? 0.055 : 0.008,
      this.ctx.currentTime,
      0.3,
    );
    if (this.ctx.currentTime >= this.next) {
      const notes = [73.416, 87.307, 110, 103.826, 65.406, 87.307, 98, 73.416],
        n = notes[Math.floor(this.step / 4) % 8];
      this.tone(n, this.ctx.currentTime, 3.8, 0.11, "triangle");
      this.tone(n * 2.002, this.ctx.currentTime, 4.4, 0.025);
      if (this.step % 2 === 0)
        this.tone(n * 4, this.ctx.currentTime, 0.9, 0.026);
      this.next = this.ctx.currentTime + 0.9;
      this.step++;
    }
  }
  shot(missile = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(missile ? 170 : 700, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(t + 0.22);
  }
  explosion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime,
      n = this.ctx.sampleRate * 0.6,
      b = this.ctx.createBuffer(1, n, this.ctx.sampleRate),
      a = b.getChannelData(0);
    for (let i = 0; i < n; i++)
      a[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const s = this.ctx.createBufferSource(),
      f = this.ctx.createBiquadFilter();
    s.buffer = b;
    f.type = "lowpass";
    f.frequency.value = 650;
    s.connect(f);
    f.connect(this.master);
    s.start(t);
  }
}
