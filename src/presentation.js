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
  let best = null;
  try {
    const key = 'gotham-best-' + chapter;
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Number.isFinite(saved.time) && Number.isFinite(saved.score)) best = saved;
    if (win) { best = {time: Math.min(best?.time ?? Infinity, seconds), score: Math.max(best?.score ?? 0, score)}; localStorage.setItem(key, JSON.stringify(best)); }
  } catch {}
  const panel = $('chapter-results'); panel.replaceChildren(); panel.hidden = false;
  for (const [label, value] of [['OPERATION',win ? 'COMPLETE' : 'INTERRUPTED'],['TIME',clock(seconds)],['SCORE',score.toLocaleString()],['ARMOR',Math.max(0,Math.round(health))+'%'],['FIELD REPORT',detail],['PERSONAL BEST',best ? clock(best.time)+' / '+best.score.toLocaleString()+' PTS' : 'Complete this chapter']]) {
    const item=document.createElement('div'), l=document.createElement('small'), v=document.createElement('strong');
    l.textContent=label; v.textContent=value; item.append(l,v); panel.append(item);
  }
}
