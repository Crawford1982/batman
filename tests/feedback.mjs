import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});
const p=await b.newPage({viewport:{width:1280,height:800}}), errors=[];
p.on('pageerror',e=>errors.push(e.message));
await p.goto((process.env.GAME_URL || 'http://localhost:4173')+'/?test=1');
await p.waitForFunction(()=>window.__batwing?.ready);
const result=await p.evaluate(()=>{
 const g=window.__batwing;g.start();g.step(.2);
 for(const e of g.enemies)e.mesh.removeFromParent();g.enemies.length=0;
 g.spawnBomber(g.mission.relays[0]);const enemy=g.enemies[0];
 enemy.mesh.position.copy(g.flight.position).addScaledVector(g.flight.forward,150);
 g.step(.016);g.shoot();
 let hit=false;
 for(let i=0;i<80;i++){g.step(.01);if(enemy.hp<9){hit=true;break;}}
 return {hit,hp:enemy.hp,label:document.querySelector('#target-label').textContent,
 width:parseFloat(document.querySelector('#target-armour i').style.width),
 confirmed:document.querySelector('#crosshair').classList.contains('confirmed')};
});
assert.ok(result.hit);assert.ok(result.confirmed);assert.match(result.label,/BOMBER/);
assert.ok(result.width>0&&result.width<100);
await p.screenshot({path:'verification/target-feedback.png'});
await p.evaluate(()=>{const g=window.__batwing;g.start();for(const e of g.enemies)e.mesh.position.set(5000,100,5000);g.flight.yaw=Math.PI;g.step(.01);});
assert.ok(await p.locator('#target-armour').isHidden());
await p.evaluate(()=>window.__batwing.beginGround());
await p.waitForFunction(()=>window.__batwing.state.groundReady);
await p.click('#drive-launch');
await p.evaluate(()=>{
 const g=window.__batwing.ground;g.car.position.set(0,.6,100);g.car.speed=0;
 for(let i=0;i<100;i++)g.update(.05,0);
 g.phase='paused';
});
assert.deepEqual(await p.evaluate(()=>window.__batwing.ground.junctionGuide.markers.map(m=>m.visible)),[true,false,false,false,false,false]);
await p.screenshot({path:'verification/junction-guide.png'});
await p.evaluate(()=>{
 const g=window.__batwing.ground;g.junctionGuide.update(1,{x:0,z:20});
});
assert.ok(await p.evaluate(()=>window.__batwing.ground.junctionGuide.markers[0].visible));
assert.deepEqual(errors,[]);await b.close();
console.log('PASS: actual cannon hit feedback and armour, target loss, nearby junction arrows retained after crossing, no browser errors');
