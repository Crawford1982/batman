import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const mobile of [false,true]){
 const p=await b.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);await p.click('#start');await p.click('#skip-briefing');
 await p.waitForFunction(()=>window.__batwing.ground.audio.voiceSource && window.__batwing.ground.audio.voiceId==='alfred-patrol');
 assert.match(await p.locator('#radio-caption').innerText(),/ALFRED/);
 await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>window.__batwing.ground.audio.voiceId),null);assert.ok(await p.locator('#radio-caption').isHidden());
 const lengths=await p.evaluate(async()=>{const {RADIO_LINES}=await import('/src/radio-lines.js');const a=window.__batwing.ground.audio;return Promise.all(Object.keys(RADIO_LINES).map(async id=>(await a.loadVoice(id))?.duration));});assert.ok(lengths.every(d=>d>1&&d<7));assert.equal(lengths.length,10);
 await p.click('#resume');await p.evaluate(()=>{const a=window.__batwing.ground.audio;a.radioMessage('ALFRED / Attack source identified');});
 await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='batman-air');
 await p.evaluate(()=>window.__batwing.ground.audio.mute(true));assert.equal(await p.evaluate(()=>window.__batwing.ground.audio.voiceId),null);
 await p.evaluate(()=>{const a=window.__batwing.ground.audio;a.mute(false);window.__batwing.beginGround();});await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
 await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='batman-drive');
 await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>window.__batwing.ground.audio.voiceId),null);
 assert.deepEqual(errors,[]);await p.close();}
 console.log('PASS 10 decoded clips, flight/ground triggers and Batman replies, captions, pause and mute, desktop/mobile');
}finally{await b.close();}
