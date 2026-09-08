import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.goto((process.env.GAME_URL||'http://localhost:4173')+'/?test=1');
 await page.waitForFunction(()=>window.__batwing?.ready,{},{timeout:60000});
 await page.evaluate(()=>{
  const g=window.__batwing;g.start();g.spawn();const e=g.enemies[0];
  e.mesh.position.copy(g.flight.position).addScaledVector(g.flight.forward,280);
  g.step(.01);e.ai.cooldown=0;g.step(.01);
 });
 assert.ok(await page.locator('#attack-warning').isVisible());
 await page.screenshot({path:`verification/attack-warning-${mobile?'mobile':'desktop'}.png`});
 const state=await page.evaluate(()=>{
  const g=window.__batwing,e=g.enemies[0];
  for(let i=0;i<200 && e.ai.phase==='warning';i++)g.step(.01);
  const fired=e.ai.phase==='attack' && g.state.shots>0;
  const count=g.enemies.length;g.spawnBomber(g.mission.relays[0]);
  const escort=g.enemies.find(v=>v.kind==='escort');
  const capped=g.enemies.length===count+1;
  escort.guard.hp=0;g.step(.01);
  return {fired,capped,detached:!escort.guard&&escort.kind==='interceptor'};
 });
 assert.deepEqual(state,{fired:true,capped:true,detached:true});
 await page.close();
}
assert.deepEqual(errors,[]);await browser.close();
console.log('PASS: visible desktop/mobile attack warning, warned shot, escort assignment without extra fighters, bomber loss detachment, no page errors');
