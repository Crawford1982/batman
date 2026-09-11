import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const mobile of [false,true]){
  const p=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  let held;
  await p.route('**/batmobile.glb',route=>{if(mobile)held=route;else return route.abort();});
  await p.goto((process.env.GAME_URL||'http://localhost:4173')+'/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);
  await p.click('#start');await p.click('#skip-briefing');
  await p.evaluate(()=>window.__batwing.finish(true));
  await p.waitForFunction(()=>window.__batwing.handover.active);
  if(mobile){
    await p.waitForTimeout(1000);
    await p.locator('#handover-skip').tap();
    assert.equal(await p.evaluate(()=>window.__batwing.ground.car.elapsed),0);
    assert.ok(await p.locator('#chapter-handover').isVisible());
    while(!held)await p.waitForTimeout(100);
    await held.continue();
  }else{
    await p.waitForSelector('#handover-retry:visible');
    assert.match(await p.locator('#chapter-handover p').innerText(),/interrupted/);
    await p.unroute('**/batmobile.glb');await p.click('#handover-retry');
  }
  await p.waitForFunction(()=>window.__batwing.ground.ready);
  if(!mobile){
    await p.waitForFunction(()=>window.__batwing.handover.revealed);
    await p.screenshot({path:'verification/handover-desktop.png'});
  }
  await p.waitForFunction(()=>window.__batwing.state.mode==='drive',null,{timeout:30000});
  assert.ok(await p.locator('#drive-load').isHidden());
  assert.ok(await p.locator('#chapter-handover').isHidden());
  // Replay with cached assets must play the connection again; Escape skips it.
  await p.evaluate(()=>{window.__batwing.ground.hide();window.__batwing.finish(true);});
  await p.keyboard.press('Escape');
  await p.waitForFunction(()=>window.__batwing.state.mode==='drive');
  // Cancelled connections cannot later launch the car.
  await p.evaluate(()=>{window.__batwing.ground.hide();window.__batwing.finish(true);});
  await p.click('#handover-exit');
  await p.evaluate(()=>window.__batwing.handover.update(20));
  assert.equal(await p.evaluate(()=>window.__batwing.state.mode),'menu');
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS desktop/mobile automatic handover, slow-load skip, real download failure/retry, replay and exit cancellation');
}finally{await browser.close();}
