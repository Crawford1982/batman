import { RADIO_LINES } from "./radio-lines.js";
export class AudioSystem {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.next = 0;
    this.step = 0;
    this.voiceBuffers = {};
    this.voiceToken = 0;
    this.voiceSource = null;
    this.voiceId = null;
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
  mix() {
    if (this.ctx) this.master.gain.setTargetAtTime(
      this.enabled ? (this.voiceSource ? .08 : .26) : 0, this.ctx.currentTime, .12);
  }
  mute(v) {
    this.enabled = !v;
    if (v) this.stopVoice();
    this.mix();
  }
  loadVoice(id) {
    if (!this.ctx || !['alfred','gordon','batman',...Object.keys(RADIO_LINES)].includes(id)) return Promise.resolve(null);
    return this.voiceBuffers[id] ||= fetch(new URL(`./voices/${id}.mp3`, document.baseURI))
      .then(r => { if (!r.ok) throw new Error('Voice unavailable'); return r.arrayBuffer(); })
      .then(data => this.ctx.decodeAudioData(data)).catch(() => null);
  }
  preloadVoices() {
    return Promise.all(['alfred','gordon','batman'].map(id => this.loadVoice(id)));
  }
  stopVoice() {
    this.voiceToken++;
    const caption = document.getElementById("radio-caption");
    if (caption) caption.hidden = true;
    if (this.voiceSource) {
      this.voiceSource.onended = null;
      this.voiceSource.stop();
      this.voiceNodes.forEach(node => node.disconnect());
    }
    this.voiceSource = null; this.voiceId = null;
    this.mix();
  }
  async speak(id, onDone = null) {
    this.stopVoice();
    const token = this.voiceToken;
    if (!this.enabled) return;
    this.voiceId = id;
    const buffer = await this.loadVoice(id);
    // Skips, mute, and later lines invalidate pending downloads.
    if (!buffer || token !== this.voiceToken || !this.enabled) {
      if (token === this.voiceToken) this.voiceId = null;
      return;
    }
    const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
    const radio = this.ctx.createBiquadFilter();
    source.buffer = buffer; radio.type = 'highpass'; radio.frequency.value = 130;
    gain.gain.value = .85;
    source.connect(radio); radio.connect(gain); gain.connect(this.ctx.destination);
    const nodes = [source,radio,gain];
    this.voiceSource = source; this.voiceNodes = nodes; this.voiceId = id;
    source.onended = () => {
      nodes.forEach(node => node.disconnect());
      if (this.voiceSource === source) {
        this.voiceSource = null; this.voiceId = null; this.mix();
        const caption = document.getElementById('radio-caption'); if (caption) caption.hidden = true;
        if (token === this.voiceToken) onDone?.();
      }
    };
    if (RADIO_LINES[id]) {
      let caption = document.getElementById('radio-caption');
      if (!caption) { caption = document.createElement('div'); caption.id = 'radio-caption'; caption.setAttribute('aria-live','polite'); document.body.append(caption); }
      caption.textContent = RADIO_LINES[id].join(' / '); caption.hidden = false;
    }
    this.mix(); source.start();
  }
  radioMessage(text) {
    let id, reply;
    if (text.includes('The city is quiet')) id = 'alfred-patrol';
    else if (text.includes('Attack source identified')) { id = 'alfred-relays'; reply = 'batman-air'; }
    else if (text.includes('Final evacuation')) id = 'gordon-final';
    else if (text.includes('Shelter hit')) id = 'gordon-hit';
    else if (text.includes('Bomber inbound')) id = 'gordon-inbound';
    else if (text.includes('Take the override')) { id = 'alfred-drive'; reply = 'batman-drive'; }
    else if (text.includes('Turn left')) id = 'alfred-left';
    if (!id || !this.enabled) return;
    const now = performance.now();
    this.radioTimes ||= {};
    if (now - (this.radioTimes[id] ?? -Infinity) < 15000) return;
    // Repeated raids wait for the current transmission rather than cutting it off.
    if (id === 'gordon-inbound' && this.voiceId) return;
    this.radioTimes[id] = now;
    this.speak(id, reply ? () => this.speak(reply) : null);
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
  hit() {
    if (!this.ctx || this.ctx.currentTime < (this.nextHit || 0)) return;
    const t = this.ctx.currentTime;
    this.nextHit = t + .09;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(1050, t);
    o.frequency.exponentialRampToValueAtTime(650, t + .055);
    g.gain.setValueAtTime(.025, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + .06);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .07);
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
