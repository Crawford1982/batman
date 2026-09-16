import test from "node:test";
import assert from "node:assert/strict";
import { AudioSystem } from "../src/audio.js";
import { RADIO_LINES } from "../src/radio-lines.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

function installDom() {
  const nodes = {};
  globalThis.document = {
    baseURI: "http://localhost/",
    getElementById: (id) => nodes[id] ?? null,
    createElement: () => ({
      id: "",
      hidden: true,
      textContent: "",
      setAttribute(k, v) {
        this[k] = v;
      },
    }),
    body: {
      append(el) {
        nodes[el.id] = el;
      },
    },
  };
  return nodes;
}

function fakeCtx() {
  const node = () => ({ connect() {}, disconnect() {} });
  return {
    currentTime: 0,
    decodeAudioData: async () => ({ duration: 2 }),
    createBufferSource: () => ({ ...node(), start() {}, buffer: null, onended: null }),
    createGain: () => ({ ...node(), gain: { value: 1 } }),
    createBiquadFilter: () => ({ ...node(), type: "", frequency: { value: 0 } }),
  };
}

function readyAudio(ctx = null) {
  const a = new AudioSystem();
  if (ctx) {
    a.ctx = ctx;
    a.master = { gain: { setTargetAtTime() {} } };
  }
  return a;
}

const voiceLoad = () =>
  (globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));

test("caption opt-out propagates through radioMessage, speak and the reply", () => {
  const a = readyAudio();
  const calls = [];
  a.speak = (id, onDone, caption) => {
    calls.push([id, caption]);
    onDone?.();
  };
  a.radioMessage("ALFRED / Attack source identified", false);
  assert.deepEqual(calls, [
    ["alfred-relays", false],
    ["batman-air", false],
  ]);
});

test("captions default on and propagate as true to the reply", () => {
  const a = readyAudio();
  const calls = [];
  a.speak = (id, onDone, caption) => {
    calls.push([id, caption]);
    onDone?.();
  };
  a.radioMessage("ALFRED / Attack source identified");
  assert.deepEqual(calls, [
    ["alfred-relays", true],
    ["batman-air", true],
  ]);
});

test("opting out leaves #radio-caption untouched while the voice still plays", async () => {
  const nodes = installDom();
  const a = readyAudio(fakeCtx());
  voiceLoad();
  a.radioMessage("ALFRED / The city is quiet. Get your bearings.", false);
  await tick();
  await tick();
  assert.equal(nodes["radio-caption"], undefined, "no duplicate caption is created");
  assert.equal(a.voiceId, "alfred-patrol", "the recorded line is still spoken");
});

test("default callers still receive the spoken caption", async () => {
  const nodes = installDom();
  const a = readyAudio(fakeCtx());
  voiceLoad();
  a.radioMessage("ALFRED / The city is quiet. Get your bearings.");
  await tick();
  await tick();
  assert.equal(nodes["radio-caption"].hidden, false);
  assert.equal(nodes["radio-caption"].textContent, RADIO_LINES["alfred-patrol"].join(" / "));
});

test("full notice text is what the player reads; the caption wording differs", () => {
  const full = "ALFRED / The city is quiet. Get your bearings.";
  const caption = RADIO_LINES["alfred-patrol"].join(" / ");
  assert.notEqual(full, caption, "opt-out matters because the wordings differ");
  const a = readyAudio();
  let spoken = null;
  a.speak = (id) => {
    spoken = id;
  };
  // This is exactly what notice() in src/main.js does.
  a.radioMessage(full, false);
  assert.equal(spoken, "alfred-patrol", "the audio is still requested");
});

test("mute still claims no caption and never throws", () => {
  const nodes = installDom();
  const a = readyAudio(fakeCtx());
  a.enabled = false;
  assert.equal(a.radioMessage("ALFRED / The city is quiet. Get your bearings.", false), undefined);
  assert.equal(nodes["radio-caption"], undefined);
});
