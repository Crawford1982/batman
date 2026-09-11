import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSystem } from '../src/audio.js';
function fixture(){
 const a=new AudioSystem(), param=()=>({value:0,setTargetAtTime(v){this.value=v;}});
 a.ctx={currentTime:1};a.engine={frequency:param()};a.engGain={gain:param()};
 a.flightScore={gain:param()};a.driveScore={gain:param()};a.melody={gain:param()};
 a.turbine={frequency:param()};a.turbineFilter={frequency:param()};a.turbineGain={gain:param()};
 a.tones=[];a.tone=(...args)=>a.tones.push(args);a.air=()=>{};return a;
}
test('driving score switches buses and adds threat rhythm without affecting turbine',()=>{
 const a=fixture();a.missionMix({driving:true,speed:30});a.update(30,true);
 assert.equal(a.flightScore.gain.value,0);assert.equal(a.driveScore.gain.value,.75);
 assert.ok(a.tones.some(t=>t[5]==='drive'));
 a.ctx.currentTime=1.4;a.tones=[];a.missionMix({driving:true,speed:30,danger:true});a.update(30,true);
 assert.equal(a.driveScore.gain.value,1);assert.ok(a.tones.some(t=>t[5]==='drive'&&t[2]===.16));
 a.ctx.currentTime=2;a.tones=[];a.missionMix();a.update(0,false);
 assert.equal(a.driveScore.gain.value,0);assert.equal(a.flightScore.gain.value,1);
 assert.equal(a.turbineGain.gain.value,0);assert.ok(!a.tones.some(t=>t[5]==='drive'));
});
test('critical clock thins music and scheduling does not pile up after a stall',()=>{
 const a=fixture();a.missionMix({driving:true,remaining:10});assert.equal(a.melody.gain.value,0);
 a.ctx.currentTime=100;a.update(0,true);const n=a.tones.length;a.update(0,true);
 assert.equal(a.tones.length,n);assert.ok(a.nextDrive>100);
});
