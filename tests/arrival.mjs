import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
await p.evaluate(()=>{const g=window.__batwing.ground;for(const goal of g.checkpoints){g.car.position.set(goal.x,.6,goal.z);g.car.speed=0;g.update(.016);}g.update(6);});
assert.equal(await p.evaluate(()=>window.__batwing.ground.phase),'arrival');
await p.screenshot({path:'verification/cathedral-arrival.png'});
const time=await p.evaluate(()=>window.__batwing.ground.car.elapsed);
await p.evaluate(()=>window.__batwing.ground.update(8));
assert.equal(await p.evaluate(()=>window.__batwing.ground.car.elapsed),time);
assert.ok(await p.locator('#pause-menu').isVisible());assert.ok(await p.locator('#arrival-film').isHidden());
assert.deepEqual(errors,[]);console.log('PASS arrival framing, frozen timer, automatic results and no runtime errors');
}finally{await b.close();}

