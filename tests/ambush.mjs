import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const mobile of [false,true]){
const p=await b.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
await p.evaluate(()=>{const g=window.__batwing.ground;g.car.checkpoint=2;g.car.position.set(-522.5,.6,-480);g.update(.016);g.camera.position.copy(g.car.position).add({x:0,y:4,z:14});});
assert.equal(await p.evaluate(()=>window.__batwing.ground.ambushState),'active');assert.match(await p.locator('#drive-ambush').innerText(),/IN EMP RANGE/);
await p.screenshot({path:`verification/ambush-${mobile?'mobile':'desktop'}.png`});
// All three are in range at this position; use the actual control.
await p.evaluate(()=>window.__batwing.ground.car.position.z=-505);
if(mobile)await p.locator('#drive-touch-emp').tap();else await p.keyboard.press('f');
await p.waitForFunction(()=>window.__batwing.ground.ambushState==='complete');
assert.equal(await p.evaluate(()=>window.__batwing.ground.car.score),500);
await p.evaluate(()=>window.__batwing.ground.update(.1));assert.equal(await p.evaluate(()=>window.__batwing.ground.car.score),500);
await p.evaluate(()=>{const g=window.__batwing.ground;g.start();});assert.equal(await p.evaluate(()=>window.__batwing.ground.ambushState),'waiting');
assert.equal(await p.evaluate(()=>window.__batwing.ground.ambushMines.some(m=>m.visible)),false);
await p.evaluate(()=>{const g=window.__batwing.ground;g.car.checkpoint=2;g.car.position.set(-510,.6,-400);g.update(.016);g.car.position.z=-640;g.update(.016);});
assert.equal(await p.evaluate(()=>window.__batwing.ground.car.score),200);
assert.deepEqual(errors,[]);await p.close();}
console.log('PASS ambush activation, desktop/mobile EMP, one-time bonus, clean bypass and replay reset');
}finally{await b.close();}
