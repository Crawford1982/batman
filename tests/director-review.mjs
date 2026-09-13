import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out='verification/director-2026-09-13';fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'msedge',headless:true});
try{const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready);
const gpu=await p.evaluate(()=>{const gl=document.getElementById('game').getContext('webgl2');const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable';});
await p.click('#start');await p.waitForTimeout(1300);await p.screenshot({path:out+'/briefing.png'});await p.click('#skip-briefing');await p.waitForTimeout(3500);await p.screenshot({path:out+'/flight.png'});
await p.keyboard.press('Escape');await p.click('#exit');await p.click('#start-ground');await p.waitForFunction(()=>window.__batwing.state.groundReady);await p.click('#drive-launch');await p.keyboard.down('w');await p.waitForTimeout(2400);await p.keyboard.up('w');await p.waitForTimeout(1400);await p.screenshot({path:out+'/driving.png'});
const samples=[];
for(const [name,x,z,yaw,checkpoint] of [['theatre',-230,0,Math.PI/2,1],['railway',-522.5,-400,0,2],['cathedral',-1030,-890,Math.PI/2,5]]){
await p.evaluate(({x,z,yaw,checkpoint})=>{const g=window.__batwing.ground;g.car.position.set(x,.6,z);g.car.yaw=yaw;g.car.speed=0;g.car.checkpoint=checkpoint;g.car.invulnerable=100;g.cameraRig.reset(g.car.position,yaw);},{x,z,yaw,checkpoint});await p.waitForTimeout(2200);await p.screenshot({path:out+'/'+name+'.png'});samples.push({name,...await p.evaluate(()=>window.__batwing.state)});
}
await p.evaluate(()=>window.__batwing.ground.finish(true));await p.waitForTimeout(3500);await p.screenshot({path:out+'/arrival.png'});
fs.writeFileSync(out+'/evidence.json',JSON.stringify({gpu,samples},null,2));console.log(JSON.stringify({gpu,samples}));
}finally{await b.close();}
