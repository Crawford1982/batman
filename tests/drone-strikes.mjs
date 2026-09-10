import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({channel:'msedge',headless:true});
try {
  for (const mobile of [false,true]) {
    const page = await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.env.GAME_URL || 'http://localhost:4173')+'/?test=1');
    await page.waitForFunction(()=>window.__batwing?.ready);
    await page.click('#start-ground');
    await page.waitForFunction(()=>window.__batwing.state.groundReady);
    await page.click('#drive-launch');
    await page.waitForTimeout(3500); // Let the opening title and radio line clear.
    await page.evaluate(()=>{
      const g=window.__batwing.ground;
      g.car.checkpoint=2; g.car.position.set(-522.5,.6,-700);
      g.car.speed=0; g.ambushState='complete'; g.strikeNumber=1;
      g.beginStrike(); g.updateStrike(0);
      g.camera.position.set(-522.5,3.7,-687.5);
      g.camera.lookAt(-522.5,1.7,-717);
    });
    assert.equal(await page.evaluate(()=>window.__batwing.ground.strikeMarkers.filter(m=>m.visible).length),3);
    assert.match(await page.locator('#drive-threat').innerText(),/IN BLAST ZONE/);
    await page.screenshot({path:`verification/strike-${mobile?'mobile':'desktop'}.png`});
    await page.click('#drive-pause');
    const pausedTime = await page.evaluate(()=>window.__batwing.ground.strikeTime);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>window.__batwing.ground.strikeTime),pausedTime);
    await page.click('#resume');
    // Real input must cancel every marker, award once, and respect cooldown.
    if(mobile) await page.locator('#drive-touch-emp').tap(); else await page.keyboard.press('f');
    assert.equal(await page.evaluate(()=>window.__batwing.ground.car.score),150);
    assert.equal(await page.evaluate(()=>window.__batwing.ground.strikeMarkers.some(m=>m.visible)),false);
    await page.evaluate(()=>window.__batwing.ground.emp());
    assert.equal(await page.evaluate(()=>window.__batwing.ground.car.score),150);
    const outcomes=await page.evaluate(()=>{
      const g=window.__batwing.ground;
      g.car.position.set(-522.5,.6,-700);g.beginStrike();
      g.car.position.z-=50;g.updateStrike(4);
      const evade=g.car.score;g.updateStrike(4);
      const once=g.car.score;
      g.car.invulnerable=0;g.beginStrike();g.updateStrike(4);
      const hit=g.car.health;
      g.car.position.set(-522.5,.6,-950);g.beginStrike();
      const corner=g.strikeTime;
      g.start();g.car.damage(6);
      g.car.position.set(0,.6,20);g.update(.016);
      const damagedSection=g.car.score;
      g.start();g.car.position.set(0,.6,20);g.update(.016);
      const cleanSection=g.car.score;
      g.start();
      return {evade,once,hit,corner,damagedSection,cleanSection,reset:g.car.score,counters:g.countered};
    });
    assert.deepEqual(outcomes,{evade:250,once:250,hit:86,corner:0,damagedSection:500,cleanSection:700,reset:0,counters:0});
    assert.deepEqual(errors,[]); await page.close();
  }
  console.log('PASS desktop/mobile barrage, EMP cooldown, evasion, single damage, corner safety, section bonuses and replay');
} finally {await browser.close();}
