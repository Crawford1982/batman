import { RELAY_SITES, districtAt } from "./districts.js";

const TAU = Math.PI * 2;
const deg = (r) => (r * 180) / Math.PI;
export const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// The hijack transmitter. Every receiver bearing, the revealed district and the
// final deduction are derived from this one point and the Chapter I relay sites.
export const ORIGIN = { x: -1180, z: 820 };
export const LOCK_DEGREES = 2.5;
const SIGNAL_WIDTH_DEGREES = 14;
const START_OFFSETS = [72, -118, 151];

export const RECEIVERS = RELAY_SITES.map((site, i) => {
  const truth = Math.atan2(ORIGIN.z - site.z, ORIGIN.x - site.x);
  return {
    name: site.name,
    x: site.x,
    z: site.z,
    truth,
    start: truth + (START_OFFSETS[i] * Math.PI) / 180,
  };
});

export function bearingError(receiver, angle) {
  return Math.abs(deg(wrapAngle(angle - receiver.truth)));
}
export function signalStrength(receiver, angle) {
  const e = bearingError(receiver, angle) / SIGNAL_WIDTH_DEGREES;
  return Math.exp(-e * e);
}
export function isLocked(receiver, angle) {
  return bearingError(receiver, angle) <= LOCK_DEGREES;
}
export function originDistrict() {
  return districtAt(ORIGIN.x, ORIGIN.z);
}

// Carrier wave: the player matches frequency and phase of the intercepted signal.
export const CARRIER = { frequency: 3.6, phase: 2.2 };
export const WAVE_START = { frequency: 1.6, phase: 0 };
export const FREQUENCY_RANGE = [1, 6];
const FREQUENCY_TOLERANCE = 0.08;
const PHASE_TOLERANCE = 0.16;

export const carrierSample = (x, frequency, phase) => Math.sin(x * frequency + phase);
export function waveMatch(frequency, phase) {
  let error = 0;
  const samples = 96;
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * TAU;
    const d =
      carrierSample(x, frequency, phase) - carrierSample(x, CARRIER.frequency, CARRIER.phase);
    error += d * d;
  }
  return Math.max(0, 1 - error / samples / 2);
}
export function waveLocked(frequency, phase) {
  return (
    Math.abs(frequency - CARRIER.frequency) <= FREQUENCY_TOLERANCE &&
    Math.abs(wrapAngle(phase - CARRIER.phase)) <= PHASE_TOLERANCE
  );
}

export const CLUES = [
  "60 Hz COMPRESSOR HUM UNDER THE CARRIER · INDUSTRIAL REFRIGERATION",
  "BURSTS SYNC TO THE GOTHAM RIVER TIDE TABLE · TRANSMITTER AT THE WATERLINE",
];
export const SUSPECTS = [
  {
    id: "foundry",
    name: "OLD BELL FOUNDRY",
    detail: "Disused since 1961. Inland. No power on the meter.",
    refrigeration: false,
    waterfront: false,
  },
  {
    id: "rink",
    name: "FLATS ICE RINK",
    detail: "Ammonia chillers run all winter. Six blocks from the river.",
    refrigeration: true,
    waterfront: false,
  },
  {
    id: "ferry",
    name: "PIER 7 FERRY TERMINAL",
    detail: "Closed for the evacuation. On the water. Heated waiting hall.",
    refrigeration: false,
    waterfront: true,
  },
  {
    id: "kessler",
    name: "KESSLER COLD STORAGE",
    detail: "Leased last month through a shell company. Loading dock on the river.",
    refrigeration: true,
    waterfront: true,
  },
];
export const fitsClues = (suspect) => suspect.refrigeration && suspect.waterfront;
export function rejection(suspect) {
  if (!suspect.refrigeration && !suspect.waterfront)
    return "No compressors and no waterline. The hum and the tide timing both rule it out.";
  if (!suspect.refrigeration) return "On the water, sir, but nothing there could make that hum.";
  return "The chillers fit, sir. The tide timing does not. It is too far inland.";
}

export const WRONG_PENALTY_SECONDS = 20;
export function caveScore(seconds, mistakes) {
  const base = Math.max(500, Math.round(3000 - seconds * 10));
  return Math.max(0, base - mistakes * 400) + (mistakes === 0 ? 500 : 0);
}
