import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});
try {
const p=await b.newPage({viewport:{width:1280,height:800}});
await p.goto('http://localhost:4173/?test=1'); await p.waitForFunction(()=>window.__batwing?.ready);
await p.evaluate(()=>{window.__batwing.start();window.__batwing.finish(false);});
assert.match(await p.locator('#chapter-results').innerText(),/PERSONAL BEST/);
await p.screenshot({path:'verification/chapter-results-desktop.png'});
await p.click('#restart'); assert.ok(await p.locator('#chapter-results').isHidden());
await p.keyboard.press('Escape'); assert.ok(await p.locator('#chapter-card').isHidden());
await p.setViewportSize({width:390,height:844});
await p.waitForFunction(()=>document.querySelector('#game').getBoundingClientRect().width<=390);
await p.evaluate(()=>{window.__batwing.start();window.__batwing.finish(false);});
assert.ok(await p.locator('#restart').isVisible());
assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await p.evaluate(async()=>{
  localStorage.setItem('gotham-best-results',JSON.stringify({batmobile:{time:240,score:100}}));
  const {showResults}=await import('/src/presentation.js');
  showResults('batmobile',true,223,200,90,'6 / 6 checkpoints');
});
assert.match(await p.locator('#chapter-results').innerText(),/NEW BEST · −0:17/);
assert.match(await p.locator('#chapter-results').innerText(),/finished with 1:17 remaining/);
await p.screenshot({path:'verification/chapter-results-mobile.png'});
console.log('PASS scorecard, replay cleanup, pause cleanup, mobile results');
} finally {await b.close();}
