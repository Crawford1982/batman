import test from "node:test";
import assert from "node:assert/strict";
import { recordBest } from "../src/best-times.js";
const memory = () => {
  const data = new Map();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
};
test("best times preserve score, distinguish ties and ignore failed runs", () => {
  const s = memory();
  assert.equal(recordBest(s,"batwing",240,100,true).first,true);
  assert.equal(recordBest(s,"batwing",223,80,true).improvement,17);
  assert.equal(recordBest(s,"batwing",223,110,true).improvement,null);
  assert.deepEqual(recordBest(s,"batwing",1,999,false).best,{time:223,score:110});
  recordBest(s,"batmobile",100,200,true); assert.equal(s.data.size,1);
  assert.equal(recordBest(s,"batwing",999,0,false).best.time,223);
});
test("legacy migration, corrupt storage and blocked private storage are safe", () => {
  const s=memory();s.setItem('gotham-best-batmobile',JSON.stringify({time:150,score:500}));
  assert.equal(recordBest(s,'batmobile',140,200,true).improvement,10);
  s.setItem('gotham-best-results','bad json');
  assert.equal(recordBest(s,'batwing',10,10,true).best.time,10);
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(recordBest(blocked,'batwing',100,100,true).best.time,100);
  assert.equal(recordBest(blocked,'batwing',NaN,100,true).best,null);
});
