const KEY = "gotham-best-results";
const valid = value => value && Number.isFinite(value.time) && value.time >= 0 && Number.isFinite(value.score) && value.score >= 0;

export function recordBest(storage, chapter, seconds, score, win) {
  let records = {};
  try {
    const saved = JSON.parse(storage?.getItem(KEY));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) records = saved;
  } catch {}
  if (!["batwing", "batmobile"].includes(chapter)) return { best: null, improvement: null };
  let previous = valid(records[chapter]) ? records[chapter] : null;
  if (!previous) {
    try {
      const legacy = JSON.parse(storage?.getItem("gotham-best-" + chapter));
      if (valid(legacy)) previous = legacy;
    } catch {}
  }
  const completed = win && Number.isFinite(seconds) && seconds >= 0 && Number.isFinite(score) && score >= 0;
  const improvement = completed && previous && seconds < previous.time ? previous.time - seconds : null;
  const best = completed ? { time: Math.min(previous?.time ?? Infinity, seconds), score: Math.max(previous?.score ?? 0, score) } : previous;
  if (best) {
    records[chapter] = best;
    try { storage?.setItem(KEY, JSON.stringify(records)); } catch {}
  }
  return { best, improvement, first: completed && !previous };
}
