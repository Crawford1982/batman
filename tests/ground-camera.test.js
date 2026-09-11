import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { GroundCamera } from '../src/ground-camera.js';

test('chase camera takes the shortest path across yaw wrap',()=>{
  const rig=new GroundCamera(),p=new Vector3();rig.reset(p,Math.PI-.01);
  rig.update(1/60,{position:p,yaw:-Math.PI+.01,steer:0,speed:20},false);
  assert.ok(Math.abs(rig.yaw-Math.PI)<.02);
  assert.ok(rig.eye.z<0);
});
test('camera dampens steering aim and settles consistently at 30 and 60 fps',()=>{
  const run=fps=>{const r=new GroundCamera(),p=new Vector3();r.reset(p);for(let i=0;i<fps*2;i++)r.update(1/fps,{position:p,yaw:.5,steer:1,speed:40},true);return r;};
  assert.ok(run(30).eye.distanceTo(run(60).eye)<.02);
  assert.ok(run(30).look.distanceTo(run(60).look)<.02);
  const r=new GroundCamera(),p=new Vector3();r.reset(p);const before=r.look.clone();
  r.update(1/60,{position:p,yaw:1,steer:1,speed:40},true);
  assert.ok(r.look.distanceTo(before)<4);
});
test('reduced motion removes boost zoom and reset clears camera inertia',()=>{
  const r=new GroundCamera(),p=new Vector3(12,.6,50);r.reset(p);
  r.update(1,{position:p,yaw:1,steer:1,speed:50},true,true);
  assert.equal(r.boost,0);
  r.reset(p);assert.equal(r.steer,0);assert.deepEqual(r.eye.toArray(),[12,4,63]);
});
