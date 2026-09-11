import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'msedge',headless:true});
try {
 for (const mobile of [false,true]) {
  const page = await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4173/?test=1');
  await page.waitForFunction(()=>window.__batwing?.ready);
  await page.click('#start-ground'); await page.waitForFunction(()=>window.__batwing.state.groundReady);
  await page.click('#drive-launch');
  const warning = await page.evaluate(()=>{
   const g=window.__batwing.ground;g.car.checkpoint=1;g.car.position.set(-180,.6,0);g.car.yaw=Math.PI/2;g.cameraRig.reset(g.car.position,g.car.yaw);
   g.updatePursuit(.01);return {phase:g.pursuitState,strike:g.strikeTime};
  });
  assert.deepEqual(warning,{phase:'warning',strike:0});
  await page.click('#drive-pause');
  const timer=await page.evaluate(()=>window.__batwing.ground.pursuitTime);
  await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__batwing.ground.pursuitTime),timer);
  await page.click('#resume');
  await page.evaluate(()=>{const g=window.__batwing.ground;g.updatePursuit(3.1);g.updateStrike(0);});
  assert.match(await page.locator('#drive-threat').innerText(),/INTERCEPTOR STRIKE/);
  await page.screenshot({path:`verification/pursuit-${mobile?'mobile':'desktop'}.png`});
  if(mobile) await page.locator('#drive-touch-emp').tap(); else await page.keyboard.press('f');
  await page.waitForFunction(()=>window.__batwing.ground.pursuitState==='complete');
  assert.equal(await page.evaluate(()=>window.__batwing.ground.car.score),400);
  const outcomes=await page.evaluate(()=>{
   const g=window.__batwing.ground;
   function setup(){g.start();g.car.checkpoint=1;g.car.position.set(-180,.6,0);g.car.yaw=Math.PI/2;g.updatePursuit(.01);}
   setup();g.updatePursuit(3.1);g.car.position.x-=50;g.updateStrike(3);g.updatePursuit(.01);const evade=g.car.score;
   g.updatePursuit(3);const once=g.car.score;
   setup();g.updatePursuit(3.1);g.car.invulnerable=0;g.updateStrike(3);g.updatePursuit(.01);const hit=g.car.score;
   setup();g.resetRoad();g.updatePursuit(3);const reset=g.car.score;
   setup();g.car.position.x=-400;g.updatePursuit(.01);const outrun=g.car.score;
   g.start();return {evade,once,hit,reset,outrun,replay:g.pursuitState};
  });
  assert.deepEqual(outcomes,{evade:350,once:350,hit:0,reset:0,outrun:250,replay:'waiting'});
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS pursuit warning, pause, desktop/mobile EMP, evasion, damage, outrun, recovery and replay');
} finally {await browser.close();}
