import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await p.goto((process.env.GAME_URL||'http://localhost:4173')+'/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
// Reproduce the reported fault with a cursor parked on the left of the game canvas.
await p.mouse.move(120,500);await p.keyboard.down('w');await p.waitForFunction(()=>window.__batwing.state.groundPosition[2]<425);await p.keyboard.up('w');
assert.equal(await p.evaluate(()=>window.__batwing.ground.car.position.x),0);
assert.equal(await p.evaluate(()=>window.__batwing.ground.car.yaw),0);
await p.mouse.move(700,500);await p.mouse.down({button:'right'});await p.mouse.move(920,500);await p.keyboard.down('w');await p.waitForFunction(()=>window.__batwing.ground.car.yaw<-.1);await p.mouse.up({button:'right'});await p.keyboard.up('w');
assert.equal(await p.evaluate(()=>window.__batwing.ground.controls().steer),0);
const result=await p.evaluate(()=>{const g=window.__batwing.ground;g.car.position.set(13,.6,300);g.car.yaw=-Math.PI/2;g.car.speed=70;g.car.invulnerable=100;g.keys.KeyW=true;g.keys.ShiftLeft=true;let max=0;for(let i=0;i<300;i++){g.update(1/60);max=Math.max(max,g.car.position.x);}g.keys.KeyW=false;g.keys.ShiftLeft=false;return {max,contact:g.car.roadContact,position:g.car.position.toArray()};});
assert.ok(result.max<=13.5+.001,JSON.stringify(result));assert.ok(result.contact);
await p.screenshot({path:'verification/road-boundary.png'});
await p.keyboard.press('r');assert.equal(await p.evaluate(()=>window.__batwing.ground.controls().steer),0);
assert.deepEqual(errors,[]);console.log('PASS: idle cursor straight driving, deliberate mouse steering/release, boosted curb collision, reset, no errors',result);await browser.close();
