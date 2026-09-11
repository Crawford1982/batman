import { recordBest } from "./best-times.js";
const $ = id => document.getElementById(id);
let timer;
export function chapterCard(kicker, title) {
  const card = $('chapter-card'); clearTimeout(timer);
  card.querySelector('small').textContent = kicker;
  card.querySelector('strong').textContent = title;
  card.hidden = false;
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  timer = setTimeout(() => card.hidden = true, 3800);
}
export function clearPresentation() {
  clearTimeout(timer); $('chapter-card').hidden = true; $('chapter-results').hidden = true;
}
const clock = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export function showResults(chapter, win, seconds, score, health, detail) {
  clearPresentation();
  let storage;
  try { storage = localStorage; } catch {}
  const { best, improvement, first } = recordBest(storage, chapter, seconds, score, win);
  const delta = improvement === null ? "" : improvement < 1 ? `${improvement.toFixed(1)}s` : clock(improvement);
  const bestText = best ? `BEST ${clock(best.time)} / ${best.score.toLocaleString()} PTS${improvement !== null ? ` · NEW BEST · −${delta}` : first ? " · FIRST COMPLETION" : ""}` : "Complete this chapter";
  const timeText = clock(seconds) + (win ? ` · finished with ${clock(Math.max(0, (chapter === "batmobile" ? 300 : 600) - seconds))} remaining` : "");
  const panel = $('chapter-results'); panel.replaceChildren(); panel.hidden = false;
  for (const [label, value] of [['OPERATION',win ? 'COMPLETE' : 'INTERRUPTED'],['TIME',timeText],['SCORE',score.toLocaleString()],['ARMOR',Math.max(0,Math.round(health))+'%'],['FIELD REPORT',detail],['PERSONAL BEST',bestText]]) {
    const item=document.createElement('div'), l=document.createElement('small'), v=document.createElement('strong');
    l.textContent=label; v.textContent=value; item.append(l,v); panel.append(item);
  }
}
