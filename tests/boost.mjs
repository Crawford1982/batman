import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});
try {
 const p=await b.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);
 await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
 await p.evaluate(()=>{const g=window.__batwing.ground;g.car.speed=40;g.touch.accel=1;g.touch.boost=1;});
 await p.waitForFunction(()=>document.body.classList.contains('jet-boosting'));await p.waitForTimeout(400);
 assert.equal(await p.locator('.boost-streaks').evaluate(e=>getComputedStyle(e).opacity),'1');
 await p.screenshot({path:'verification/boost-mobile.png'});
 await p.click('#drive-pause');await p.waitForFunction(()=>!document.body.classList.contains('jet-boosting'));
 await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.boost-streaks').evaluate(e=>getComputedStyle(e).display),'none');
 console.log('PASS boost visibility, pause cleanup and reduced motion');
}finally{await b.close();}
