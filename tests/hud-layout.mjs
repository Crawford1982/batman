import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const [width,height] of [[1280,720],[375,812],[812,375]]) {
    const p=await b.newPage({viewport:{width,height},hasTouch:width<1000,isMobile:width<1000});
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);
    await p.evaluate(()=>{const g=window.__batwing;g.start();g.step(.016,26);});
    await p.waitForTimeout(300);
    const hud=await p.locator('#mission-hud').boundingBox(),map=await p.locator('#radar').boundingBox();
    assert.ok(hud && map);
    assert.ok(hud.x+hud.width<=map.x || map.x+map.width<=hud.x || hud.y+hud.height<=map.y || map.y+map.height<=hud.y,'HUD and minimap overlap');
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await p.screenshot({path:`verification/hud-${process.env.SHOT_STAGE||'after'}-${width}x${height}.png`});
    assert.deepEqual(errors,[]);await p.close();
  }
  console.log('PASS desktop, portrait and landscape HUD bounds; no browser errors');
} finally {await b.close();}
