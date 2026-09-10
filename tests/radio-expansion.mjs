import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');
await p.evaluate(()=>{const g=window.__batwing.ground;g.audio.stopVoice();g.audio.lastRadioEnd=-Infinity;g.car.checkpoint=1;g.car.position.set(-250,.6,0);g.attackTimer=20;g.update(.016);});
await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='alfred-theatre');
assert.equal(await p.evaluate(()=>window.__batwing.ground.audio.ambientRadio('alfred-railway')),false);
await p.evaluate(()=>{const g=window.__batwing.ground;g.audio.stopVoice();g.audio.lastRadioEnd=-Infinity;g.car.checkpoint=2;g.car.position.set(-522.5,.6,-300);g.attackTimer=20;g.update(.016);});
await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='alfred-railway');
assert.equal(await p.evaluate(()=>{const a=window.__batwing.ground.audio;a.stopVoice();a.lastRadioEnd=-Infinity;return a.ambientRadio('alfred-theatre');}),false);
await p.evaluate(()=>window.__batwing.ground.audio.radioMessage('GORDON / Head north'));await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='gordon-north');
await p.evaluate(()=>window.__batwing.ground.audio.radioMessage('ALFRED / Wayne relay disabled'));await p.waitForFunction(()=>window.__batwing.ground.audio.voiceId==='alfred-relay-down');
assert.deepEqual(errors,[]);console.log('PASS location dialogue, overlap prevention, one-shot guard and event mappings');
}finally{await b.close();}
