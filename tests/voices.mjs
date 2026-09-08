import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
for(const mobile of [false,true]) {
 const p=await b.newPage({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.GAME_URL||'http://localhost:4173')+'/?test=1');
 await p.waitForFunction(()=>window.__batwing?.ready);
 await p.locator('#start').click();
 await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='alfred');
 await p.waitForTimeout(350);
 assert.ok(await p.evaluate(()=>window.__batwing.ground.audio.master.gain.value<.13),'music ducks under dialogue');
 const durations=await p.evaluate(async()=> (await window.__batwing.ground.audio.preloadVoices()).map(buffer=>buffer?.duration));
 assert.ok(durations.every(d=>d>5&&d<8.5));
 await p.evaluate(()=>window.__batwing.step(9));
 await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='gordon');
 assert.match(await p.locator('#brief-speaker').textContent(),/GORDON/);
 await p.evaluate(()=>window.__batwing.step(9));
 await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='batman');
 assert.match(await p.locator('#brief-speaker').textContent(),/BATMAN/);
 await p.locator('#skip-briefing').click();
 assert.equal(await p.evaluate(()=>window.__batwing.ground.audio.voiceId),null);
 assert.equal(await p.evaluate(()=>window.__batwing.state.mode),'play');
 await p.waitForTimeout(400);
 assert.ok(await p.evaluate(()=>window.__batwing.ground.audio.master.gain.value>.23),'music returns after skipping');
 const cancelled=await p.evaluate(async()=>{
  const audio=window.__batwing.ground.audio;
  const original=audio.loadVoice.bind(audio);let resolve;
  audio.loadVoice=()=>new Promise(r=>resolve=r);
  const pending=audio.speak('alfred');audio.stopVoice();
  resolve(await original('alfred'));await pending;audio.loadVoice=original;
  return audio.voiceSource===null;
 });
 assert.ok(cancelled,'skipping prevents late-loaded speech');
 await p.evaluate(async()=>{
  const a=window.__batwing.ground.audio;await a.speak('alfred');a.mute(true);await a.speak('gordon');
 });
 assert.equal(await p.evaluate(()=>window.__batwing.ground.audio.voiceId),null);
 console.log(mobile?'MOBILE':'DESKTOP',durations);
 await p.close();
}
assert.deepEqual(errors,[]);await b.close();
console.log('PASS: all MP3s decode, three voices follow captions, skip/mute cancel speech, pending download cancellation, desktop/mobile, no page errors');
