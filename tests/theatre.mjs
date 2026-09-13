import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs';
const b=await chromium.launch({channel:'msedge',headless:true});const samples=[];
try{
 for(const variant of ['legacy','new','failed']){
 const p=await b.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(variant==='failed')await p.route('**/environment/theatre-kit.glb',r=>r.abort());
 await p.goto('http://localhost:4173/?test=1'+(variant==='legacy'?'&legacyCity=1':''));await p.waitForFunction(()=>window.__batwing?.ready);
 await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
 if(variant==='new')await p.waitForFunction(()=>window.__batwing.world.theatreBlock.ready);
 if(variant==='failed')await p.waitForFunction(()=>window.__batwing.world.theatreBlock.failed);
 await p.evaluate(()=>{const g=window.__batwing.ground;g.car.position.set(-145,.6,0);g.car.yaw=Math.PI/2;g.car.speed=0;g.car.checkpoint=1;g.cameraRig.reset(g.car.position,g.car.yaw);g.car.invulnerable=100;});
 await p.waitForTimeout(1200);
 const result=await p.evaluate(()=>{const g=window.__batwing,block=g.world.theatreBlock;return {ready:block.ready,legacy:g.ground.streets.chunks.filter(c=>c.userData.theatreReplacement).some(c=>c.visible),safe:!block.ready||block.bounds.every(b=>Math.abs(b.z)-b.d/2>=25),...g.state};});
 assert.equal(result.legacy,variant!=='new');assert.equal(result.safe,true);assert.deepEqual(errors,[]);
 await p.screenshot({path:'verification/theatre-'+variant+'.png'});samples.push({variant,...result});
 if(variant==='new') {await p.evaluate(()=>{const g=window.__batwing;g.start();g.flight.position.set(-210,95,170);});await p.waitForTimeout(1200);await p.screenshot({path:'verification/theatre-air.png'});}
 await p.close();
 }
 fs.writeFileSync('verification/theatre-evidence.json',JSON.stringify(samples,null,2));console.log(samples.map(s=>({variant:s.variant,draws:s.drawCalls,triangles:s.triangles,fps:s.fps})));console.log('PASS asset swap, legacy switch, failed download fallback, safe road bounds, road/air render');
}finally{await b.close();}
