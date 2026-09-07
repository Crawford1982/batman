import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto((process.env.GAME_URL||'http://localhost:4173')+'/?test=1');
await page.waitForFunction(()=>window.__batwing?.ready);await page.click('#start-ground');await page.waitForFunction(()=>window.__batwing.state.groundReady);
await page.click('#drive-launch');
const check=await page.evaluate(()=>{const g=window.__batwing.ground;const route=[{x:0,z:450},...g.checkpoints];const blocked=[];for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=Math.hypot(b.x-a.x,b.z-a.z);for(let d=0;d<=len;d+=5){const x=a.x+(b.x-a.x)*d/len,z=a.z+(b.z-a.z)*d/len;for(const o of g.streets.colliders)if(Math.abs(x-o.x)<o.w/2+2&&Math.abs(z-o.z)<o.d/2+2)blocked.push([i,x,z]);}}return {blocked,imported:g.drones.every(d=>d.userData.imported),chunks:g.streets.chunks.length};});
assert.equal(check.blocked.length,0,'New buildings must leave the route clear');assert.ok(check.imported);
await page.keyboard.down('w');await page.waitForFunction(()=>window.__batwing.state.groundPosition[2]<420);await page.keyboard.up('w');
await page.screenshot({path:'verification/visual-midtown.png'});
const samples=[];
for(const [name,x,z,yaw,checkpoint] of [['railway',-522.5,-295,0,2],['old-gotham',-650,-997.5,Math.PI/2,3],['cathedral',-1030,-890,Math.PI/2,5]]){
  await page.evaluate(({x,z,yaw,checkpoint})=>{const g=window.__batwing.ground;g.car.position.set(x,.6,z);g.car.yaw=yaw;g.car.speed=0;g.car.checkpoint=checkpoint;g.car.invulnerable=10;},{x,z,yaw,checkpoint});
  await page.waitForTimeout(1600);await page.screenshot({path:`verification/visual-${name}.png`});
  samples.push({name,...await page.evaluate(()=>window.__batwing.state)});
}
await page.evaluate(()=>{const g=window.__batwing.ground;g.car.position.set(0,.6,350);g.car.yaw=0;g.car.checkpoint=0;g.car.emp=0;g.time=8;});
await page.waitForTimeout(1200);await page.keyboard.press('f');await page.screenshot({path:'verification/visual-emp.png'});
assert.ok(await page.evaluate(()=>window.__batwing.ground.disabled>0));
// Inspect the actual imported enemy from a close gameplay-camera position.
await page.evaluate(()=>{const g=window.__batwing.ground;g.phase='paused';const p=g.drones[0].position;g.camera.position.copy(p).add({x:11,y:5,z:12});g.camera.lookAt(p);});
await page.screenshot({path:'verification/visual-drone.png'});
assert.deepEqual(errors,[]);console.log(JSON.stringify({check,samples,errors},null,2));await browser.close();
