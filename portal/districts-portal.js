// Portal version of districts.js with IP-free location names
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const RELAY_SITES = [
  { name: "VANGUARD TOWER", district: "MIDTOWN", x: -270, y: 352, z: -380 },
  {
    name: "CATHEDRAL SHELTER",
    district: "OLD QUARTER",
    x: -1100,
    y: 214,
    z: -1000,
  },
  {
    name: "RIVERSIDE SUBSTATION",
    district: "RIVERSIDE DOCKS",
    x: 1420,
    y: 124,
    z: 1050,
  },
];

// Kessler Cold Storage (Chapter III rooftops) is a built block in The Narrows.
// KESSLER_ORIGIN maps the rooftop mission's local metres into the city; its
// Kessler roof centre lands on the headquarters trace's transmitter (cave-puzzles
// ORIGIN). Random towers overlapping the block are dropped after generation.
export const KESSLER_ORIGIN = { x: -1252, z: 806 };
export const KESSLER_BOUNDS = { minX: -1270, maxX: -1098, minZ: 778, maxZ: 868 };

export function overlapsKessler(b) {
  const k = KESSLER_BOUNDS;
  return (
    b.x + b.w / 2 > k.minX - 6 &&
    b.x - b.w / 2 < k.maxX + 6 &&
    b.z + b.d / 2 > k.minZ - 6 &&
    b.z - b.d / 2 < k.maxZ + 6
  );
}

export function districtAt(x, z) {
  if (x > 850 && z > 300) return "RIVERSIDE DOCKS";
  if (x < -650 && z < -350) return "OLD QUARTER";
  if (x < -650 && z > 350) return "THE NARROWS";
  if (Math.abs(x - 720) < 160) return "CENTRAL RIVER";
  return "MIDTOWN";
}

export function reservedPlot(x, z) {
  return (
    Math.abs(x - 720) < 145 ||
    (x > 870 && x < 1230 && z > 530 && z < 1330) ||
    (Math.abs(x + 1100) < 160 && Math.abs(z + 1000) < 180) ||
    (Math.abs(x - 1420) < 190 && Math.abs(z - 1050) < 170) ||
    (Math.abs(x + 270) < 85 && Math.abs(z + 380) < 80)
  );
}

// Rest of the file remains the same - importing from original
export * from "../src/districts.js";
