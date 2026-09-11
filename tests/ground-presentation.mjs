import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const mobile of [false,true]) {
    const p=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
    const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto((process.env.GAME_URL||'http://localhost:4173')+'/?test=1');
    await p.waitForFunction(()=>window.__batwing?.ready);await p.click('#start-ground');
    await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
    await p.waitForFunction(()=>{const c=document.getElementById('radio-caption');return c&&!c.hidden;});
    await p.waitForFunction(()=>document.getElementById('drive-radio').style.opacity==='0');
    assert.equal(await p.locator('#drive-radio').evaluate(e=>e.style.opacity),'0');
    await p.evaluate(()=>{
      const g=window.__batwing.ground;g.audio.stopVoice();g.car.position.set(-210,.6,0);
      g.car.yaw=Math.PI/2;g.car.checkpoint=1;g.cameraRig.reset(g.car.position,g.car.yaw);
      g.radio('ALFRED / Keep to the lit corridor.');g.update(.016);
    });
    assert.equal(await p.locator('#drive-radio').evaluate(e=>e.style.opacity),'1');
    await p.waitForTimeout(1000);
    await p.screenshot({path:`verification/premium-drive-${mobile?'mobile':'desktop'}.png`});
    await p.evaluate(()=>{
      const g=window.__batwing.ground;g.phase='play';g.start();
      g.car.position.set(-1100,.6,-890);g.car.yaw=Math.PI/2;g.car.checkpoint=5;
      g.cameraRig.reset(g.car.position,g.car.yaw);g.camera.position.copy(g.cameraRig.eye);g.look.copy(g.cameraRig.look);
      g.update(.016);
      g.update(3);
    });
    assert.ok(await p.evaluate(()=>window.__batwing.ground.routeScenes.shelterGlass.emissiveIntensity>1));
    assert.ok(await p.evaluate(()=>window.__batwing.ground.camera.fov<54));
    await p.waitForTimeout(1000);
    await p.screenshot({path:`verification/premium-arrival-${mobile?'mobile':'desktop'}.png`});
    await p.click('#arrival-skip');await p.click('#restart');
    assert.equal(await p.evaluate(()=>window.__batwing.ground.routeScenes.shelterGlass.emissiveIntensity),.08);
    assert.equal(await p.evaluate(()=>document.body.classList.contains('ground-arrival')),false);
    await p.emulateMedia({reducedMotion:'reduce'});
    const still=await p.evaluate(()=>{
      const g=window.__batwing.ground;g.finish(true);const eye=g.camera.position.clone(),fov=g.camera.fov;g.update(3);
      return eye.equals(g.camera.position)&&fov===g.camera.fov;
    });
    assert.ok(still);assert.deepEqual(errors,[]);await p.close();
  }
  console.log('PASS desktop/mobile single radio, arrival restoration, replay reset and reduced motion');
}finally{await browser.close();}
