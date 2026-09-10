import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import {once} from 'node:events';
const b=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
await p.addInitScript(()=>{window.__frames=[];window.requestAnimationFrame=fn=>(window.__frames.push(fn),1);});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://localhost:4173/?test=1');await p.waitForFunction(()=>window.__batwing?.ready,null,{polling:100,timeout:60000});
await p.selectOption('#quality','high');
await p.addStyleTag({content:`#menu,#hud,#drive-hud,#drive-load,#pause-menu,#briefing,#arrival-film,#chapter-card,#radio-caption{display:none!important}#trailer-copy{position:fixed;bottom:70px;left:70px;z-index:99;color:#edf3f7;text-shadow:0 2px 20px #000;pointer-events:none}#trailer-copy small{display:block;color:#e2c583;font:12px Arial;letter-spacing:4px;margin-bottom:13px}#trailer-copy strong{display:block;font:600 58px/1 'Barlow Condensed',sans-serif;letter-spacing:2px}#trailer-shade{position:fixed;inset:0;z-index:98;background:linear-gradient(0deg,#02060bbc,transparent 60%);border-block:24px solid #03070c;pointer-events:none}`});
await p.evaluate(()=>{document.body.insertAdjacentHTML('beforeend','<div id="trailer-shade"></div><div id="trailer-copy"><small></small><strong></strong></div>');window.__clock=performance.now();window.__batwing.ground.audio.mute(true);});
const enc=spawn('ffmpeg',['-v','error','-y','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','trailer/picture.mp4'],{stdio:['pipe','inherit','inherit']});
const done=once(enc,'close');
async function tick(){await p.evaluate(()=>{window.__clock+=1000/24;const q=window.__frames.splice(0);q.forEach(fn=>fn(window.__clock));});}
async function shot(name,seconds,kicker,title,action){
 await p.evaluate(([k,t])=>{const el=document.querySelector('#trailer-copy');el.querySelector('small').textContent=k;el.querySelector('strong').textContent=t;},[kicker,title]);
 for(let i=0;i<seconds*24;i++){
  if(action)await action(i);
  await tick();
  await p.evaluate(op=>document.querySelector('#trailer-copy').style.opacity=op,Math.min(1,(i+1)/12));
  const jpg=await p.screenshot({type:'jpeg',quality:92});
  if(i===seconds*12)fs.writeFileSync(`trailer/${name}.jpg`,jpg);
  if(!enc.stdin.write(jpg))await once(enc.stdin,'drain');
 }
 console.log('Captured',name);
}
try{
await shot('opening',4,'AN UNOFFICIAL BATMAN 1989-INSPIRED GAME','GOTHAM AFTER DARK');
await p.evaluate(()=>{const g=window.__batwing;g.start();g.spawnBomber(g.mission.relays[0]);const e=g.enemies[0];e.mesh.position.copy(g.flight.position).addScaledVector(g.flight.forward,180);e.destination.copy(e.mesh.position).addScaledVector(g.flight.forward,1000);});
await shot('batwing',5,'FLY THE BATWING','TAKE BACK THE SKY',async i=>{if(i===20||i===65)await p.evaluate(()=>window.__batwing.shoot(true));if(i>70&&i%5===0)await p.evaluate(()=>window.__batwing.shoot());});
await p.evaluate(()=>window.__batwing.beginGround());await p.waitForFunction(()=>window.__batwing.state.groundReady,null,{polling:100,timeout:60000});
await p.evaluate(()=>{const g=window.__batwing.ground;g.start();g.car.position.set(-60,.6,0);g.car.yaw=Math.PI/2;g.car.checkpoint=1;g.car.speed=35;g.attackTimer=2;});
await p.keyboard.down('w');for(let i=0;i<24;i++)await tick();
await shot('batmobile',6,'DRIVE THE BATMOBILE','OWN THE NIGHT',async i=>{if(i===65)await p.evaluate(()=>window.__batwing.ground.emp());});
await p.evaluate(()=>{const g=window.__batwing.ground;g.car.position.set(-522.5,.6,-140);g.car.yaw=0;g.car.checkpoint=2;g.car.speed=40;});for(let i=0;i<24;i++)await tick();
await shot('railway',4,'TWO CHAPTERS · DESKTOP & MOBILE','KEEP GOTHAM ALIVE');
await p.keyboard.up('w');await p.evaluate(()=>document.getElementById('exit').click());for(let i=0;i<24;i++)await tick();
await shot('end',3,'PLAY FREE IN YOUR BROWSER','BATMAN1989.CO.UK');
if(errors.length)throw Error(errors.join('\n'));
}finally{enc.stdin.end();await done;await b.close();}
console.log('Finished 22 seconds, 528 frames');
