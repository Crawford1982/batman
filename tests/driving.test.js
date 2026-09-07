import { test } from "node:test";
import assert from "node:assert/strict";
import { Driving, DRIVE_ROUTE, carFitsRoad, driveSteering } from "../src/driving.js";
test("car accelerates, brakes, reverses and remains grounded", () => {
  const c = new Driving();
  for (let i = 0; i < 300; i++) c.update(1 / 60, { accel: 1 });
  assert.ok(c.speed > 30);
  assert.equal(c.position.y, 0.6);
  for (let i = 0; i < 300; i++) c.update(1 / 60, { brake: 1 });
  assert.ok(c.speed < 0);
});
test("car steering, boost cap and wall impact", () => {
  const c = new Driving();
  for (let i = 0; i < 600; i++)
    c.update(1 / 60, { accel: 1, steer: 1, boost: true });
  assert.ok(c.yaw < 0);
  assert.ok(c.speed <= 72);
  c.position.set(100, 0.6, 112);
  c.speed = 40;
  c.yaw = 0;
  c.update(0.05, { accel: 1 }, [{ x: 100, z: 100, w: 20, d: 20, h: 100 }], false);
  assert.equal(c.health, 94);
  assert.ok(c.position.z >= 112);
});
test("full car stays inside roads under repeated steering, boost and reverse", () => {
  for (const steer of [-1, -.4, .4, 1]) {
    const c = new Driving();
    for (let i=0;i<2400;i++) {
      c.update(1/60,{steer,accel:i<1800?1:0,brake:i>=1800?1:0,boost:true});
      assert.ok(carFitsRoad(c.position,c.yaw),`escaped at ${c.position.toArray()}`);
    }
  }
});
test("road junctions remain passable and off-road shortcuts are rejected", () => {
  const c = new Driving();c.position.set(0,.6,8);c.yaw=Math.PI/2;
  for(let i=0;i<360;i++)c.update(1/60,{accel:1});
  assert.ok(c.position.x < -100);assert.ok(carFitsRoad(c.position,c.yaw));
  assert.equal(carFitsRoad({x:-200,z:100},0),false);
  assert.equal(carFitsRoad({x:17,z:300},Math.PI/2),false);
});
test("idle cursor and controller drift do not pull the car left", () => {
  const mouse={active:true,x:-.9};
  assert.equal(driveSteering({},mouse,{},null),0);
  assert.equal(driveSteering({},mouse,{}, {axes:[-.12]}),0);
  assert.equal(driveSteering({KeyD:true},mouse,{}, {axes:[-.8]}),1);
  assert.ok(driveSteering({}, {...mouse,steering:true},{},null)<0);
  const c=new Driving();for(let i=0;i<600;i++)c.update(1/60,{accel:1,steer:driveSteering({},mouse,{},null)});
  assert.equal(c.position.x,0);assert.equal(c.yaw,0);
});
test("checkpoint sequence completes and reset clears progress", () => {
  const c = new Driving();
  for (const p of DRIVE_ROUTE) {
    c.position.set(p.x, 0.6, p.z);
    c.update(0.016, {});
  }
  assert.ok(c.done);
  assert.equal(c.score, DRIVE_ROUTE.length * 500);
  c.reset();
  assert.equal(c.checkpoint, 0);
  assert.equal(c.health, 100);
});

test("low frame rates preserve mission time and stable car motion",()=>{
 const a=new Driving(),b=new Driving();
 for(let i=0;i<120;i++)a.update(1/60,{accel:1});
 for(let i=0;i<20;i++)b.update(.1,{accel:1});
 assert.ok(Math.abs(a.elapsed-b.elapsed)<1e-8);
 assert.ok(Math.abs(a.position.z-b.position.z)<.1);
 const before=b.elapsed;b.update(.05,{},[],true,1.5);
 assert.ok(Math.abs(b.elapsed-before-1.5)<1e-8);
 assert.ok(carFitsRoad(b.position,b.yaw));
});


test("road recovery preserves distance, mission time and earned progress", () => {
 const c=new Driving();c.checkpoint=2;c.position.set(-510,.6,-700);c.elapsed=110;c.health=60;c.score=1000;
 c.recoverToRoute();
 assert.equal(c.position.x,-522.5);assert.equal(c.position.z,-700);
 assert.ok(carFitsRoad(c.position,c.yaw));assert.equal(c.elapsed,110);assert.equal(c.health,60);
 assert.equal(c.checkpoint,2);assert.equal(c.score,1000);assert.equal(c.speed,0);
});

test("navigation warns before a junction and keeps the turn instruction after checkpoint crossing", async () => {
 const {routeCue}=await import('../src/driving.js');
 assert.match(routeCue({x:0,z:100},0,0),/LEFT.*BRAKE/);
 assert.match(routeCue({x:0,z:20},0,1),/LEFT NOW/);
 assert.match(routeCue({x:-500,z:0},Math.PI/2,2),/RIGHT NOW/);
});
