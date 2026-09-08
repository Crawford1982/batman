import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {updateEnemy,ATTACK_WARNING} from '../src/enemy-ai.js';
const player=()=>({position:new Vector3(0,150,0),forward:new Vector3(0,0,-1),speed:65});
const enemy=()=>{const mesh=new Group();mesh.position.set(0,150,-200);return {mesh,hp:2,phase:0,kind:'interceptor'};};
test('interceptors warn before firing, commit their aim and break away',()=>{
 const e=enemy(),p=player();updateEnemy(e,p,.01);e.ai.cooldown=0;
 assert.equal(updateEnemy(e,p,.01),null);assert.equal(e.ai.phase,'warning');
 const aim=e.ai.aim.clone();p.position.x=200;
 for(let i=0;i<15;i++)assert.equal(updateEnemy(e,p,.1),null);
 assert.ok(e.ai.clock<ATTACK_WARNING);assert.deepEqual(e.ai.aim,aim);
 const shot=updateEnemy(e,p,.11);assert.ok(shot);assert.equal(e.ai.phase,'attack');
 assert.ok(shot.x===0,'shot targets committed position, not dodging player');
 let fired=0;for(let i=0;i<55;i++)if(updateEnemy(e,p,.1))fired++;
 assert.equal(fired,0);assert.equal(e.ai.phase,'escape');
 for(let i=0;i<10;i++)updateEnemy(e,p,.1);
 assert.equal(e.ai.phase,'approach');assert.ok(e.mesh.position.toArray().every(Number.isFinite));
});
test('escorts hold formation outside engagement range and detach when bomber is lost',()=>{
 const e=enemy(),p=player(),guard={mesh:new Group(),destination:new Vector3(0,100,-1000),hp:9};
 guard.mesh.position.set(700,180,-500);e.guard=guard;e.kind='escort';
 for(let i=0;i<200;i++)assert.equal(updateEnemy(e,p,.05),null);
 assert.ok(e.mesh.position.distanceTo(guard.mesh.position)<75);
 guard.hp=0;updateEnemy(e,p,.05);assert.equal(e.guard,null);assert.equal(e.kind,'interceptor');
});
