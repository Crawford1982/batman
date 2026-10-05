import { recordBest } from "./best-times.js";
import { TIME_LIMIT as ROOF_LIMIT } from "./rooftop-mission.js";
const $ = (id) => document.getElementById(id);
let timer;
export function chapterCard(kicker, title) {
  const card = $("chapter-card");
  clearTimeout(timer);
  card.querySelector("small").textContent = kicker;
  card.querySelector("strong").textContent = title;
  card.hidden = false;
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "";
  timer = setTimeout(() => (card.hidden = true), 3800);
}
export function clearPresentation() {
  clearTimeout(timer);
  $("chapter-card").hidden = true;
  $("chapter-results").hidden = true;
}
const TIME_LIMITS = { batwing: 600, batmobile: 300, rooftops: ROOF_LIMIT };
const clock = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
// `operation` overrides the OPERATION line when a win clears only part of the
// operation and the story continues (e.g. the Batmobile clears the grid but a
// rogue carrier survives). Callers that pass nothing keep COMPLETE/INTERRUPTED.
export function showResults(
  chapter,
  win,
  seconds,
  score,
  health,
  detail,
  operation,
  remainingTime,
) {
  clearPresentation();
  let storage;
  try {
    storage = localStorage;
  } catch {}
  const { best, improvement, first } = recordBest(storage, chapter, seconds, score, win);
  const delta =
    improvement === null ? "" : improvement < 1 ? `${improvement.toFixed(1)}s` : clock(improvement);
  const bestText = best
    ? `BEST ${clock(best.time)} / ${best.score.toLocaleString()} PTS${improvement !== null ? ` · NEW BEST · −${delta}` : first ? " · FIRST COMPLETION" : ""}`
    : "Complete this chapter";
  const limit = TIME_LIMITS[chapter];
  const timeText =
    clock(seconds) +
    (win && limit
      ? ` · finished with ${clock(Math.max(0, remainingTime ?? limit - seconds))} remaining`
      : "");
  const panel = $("chapter-results");
  panel.replaceChildren();
  panel.hidden = false;
  for (const [label, value] of [
    [
      "OPERATION",
      operation ||
        (win
          ? chapter === "batcave"
            ? "SOURCE IDENTIFIED"
            : chapter === "batwing"
              ? "SKIES SECURED"
              : "COMPLETE"
          : "INTERRUPTED"),
    ],
    ["TIME", timeText],
    ["SCORE", score.toLocaleString()],
    health === null ? null : ["ARMOR", Math.max(0, Math.round(health)) + "%"],
    ["FIELD REPORT", detail],
    ["PERSONAL BEST", bestText],
  ].filter(Boolean)) {
    const item = document.createElement("div"),
      l = document.createElement("small"),
      v = document.createElement("strong");
    l.textContent = label;
    v.textContent = value;
    item.append(l, v);
    panel.append(item);
  }
}
