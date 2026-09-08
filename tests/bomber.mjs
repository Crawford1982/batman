import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const mobile of [false,true]){
const p=await b.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);
await p.evaluate(()=>{const g=window.__batwing;g.start();g.step(.016,26);const e=g.enemies.find(e=>e.kind==='bomber');e.mesh.position.copy(g.flight.position).addScaledVector(g.flight.forward,100);e.destination.copy(e.mesh.position).addScaledVector(g.flight.forward,240);g.step(.016);});
assert.ok(await p.locator('#bomber-threat').isVisible());assert.match(await p.locator('#bomber-eta').innerText(),/FINAL APPROACH/);
assert.equal(await p.evaluate(()=>window.__batwing.enemies.find(e=>e.kind==='bomber').mesh.userData.aircraftClass),'heavy-bomber');
await p.screenshot({path:`verification/bomber-${mobile?'mobile':'desktop'}.png`});
await p.evaluate(()=>{const g=window.__batwing;for(const e of g.enemies)e.mesh.removeFromParent();g.enemies.length=0;g.step(.016);});assert.ok(await p.locator('#bomber-threat').isHidden());
assert.deepEqual(errors,[]);await p.close();}
console.log('PASS heavy bomber, mobile/desktop countdown, final approach warning and cleared-target cleanup');
}finally{await b.close();}
