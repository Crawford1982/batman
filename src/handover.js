import * as T from 'three';
import './handover.css';

export class ChapterHandover {
  constructor({ground, camera, player, flight, world, audio, prepare, complete, exit}) {
    Object.assign(this,{ground,camera,player,flight,world,audio,prepare,complete,exit});
    document.body.insertAdjacentHTML('beforeend',`<section id="chapter-handover" hidden aria-label="Chapter transition"><div class="handover-shade"></div><div class="handover-copy"><small>OPERATION SILENT BELL / CONTINUED</small><h2>THE SKIES ARE CLEAR.</h2><p role="status">The override is secured. Gotham still needs you.</p></div><div class="handover-actions"><button id="handover-skip">SKIP TO DRIVING →</button><button id="handover-retry" hidden>RETRY VEHICLE LOAD</button><button id="handover-exit">BACK TO MENU</button></div></section>`);
    this.panel=document.getElementById('chapter-handover');
    this.title=this.panel.querySelector('h2');this.copy=this.panel.querySelector('p');
    this.shade=this.panel.querySelector('.handover-shade');
    document.getElementById('handover-skip').onclick=()=>this.skip();
    document.getElementById('handover-retry').onclick=()=>this.load();
    document.getElementById('handover-exit').onclick=()=>{this.cancel();exit();};
    this.token=0;this.active=false;
  }
  start() {
    this.cancel();this.active=true;this.time=0;this.revealed=false;this.skipRequested=false;this.padPressed=false;
    document.body.classList.add('handover-active');
    this.panel.hidden=false;this.title.textContent='THE SKIES ARE CLEAR.';
    this.copy.textContent='The override is secured. Gotham still needs you.';
    this.shade.style.opacity='0';this.audio.stopVoice();this.load();
  }
  async load() {
    const token=++this.token;this.failed=false;
    document.getElementById('handover-retry').hidden=true;
    this.copy.textContent=this.revealed?'Preparing the Batmobile…':'The override is secured. Gotham still needs you.';
    try {await this.ground.load();if(token!==this.token||!this.active)return;this.copy.textContent='Deliver the override to Gordon at the cathedral.';}
    catch {if(token!==this.token||!this.active)return;this.failed=true;this.copy.textContent='Vehicle download interrupted. Retry when you’re ready.';document.getElementById('handover-retry').hidden=false;}
  }
  reveal() {
    if(this.revealed)return;
    this.revealed=true;this.prepare();this.title.textContent='TAKE THE STREETS BACK.';
    this.copy.textContent=this.failed?'Vehicle download interrupted. Retry when you’re ready.':this.ground.ready?'Deliver the override to Gordon at the cathedral.':'Preparing the Batmobile…';
    this.audio.speak('alfred-drive');
  }
  skip() {if(!this.active)return;this.skipRequested=true;this.time=Math.max(this.time,8);this.reveal();this.audio.stopVoice();this.update(0);}
  cancel() {this.token++;this.active=false;this.panel.hidden=true;document.body.classList.remove('handover-active');}
  update(dt) {
    if(!this.active||document.hidden)return;
    this.time+=dt;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(this.time>=2)this.reveal();
    if(!this.revealed){
      if(!reduced)this.player.position.addScaledVector(this.flight.forward,dt*35);
      this.world.update(dt,this.player.position,this.time);
      this.shade.style.opacity=String(Math.max(0,(this.time-1.2)/.8));
    } else {
      const p=this.ground.car.position;
      const angle=.65+(reduced?0:Math.min(1,(this.time-2)/5)*.35);
      this.camera.position.copy(p).add(new T.Vector3(Math.sin(angle)*15,2.8,-Math.cos(angle)*15));
      this.camera.up.set(0,1,0);this.camera.lookAt(p.clone().add(new T.Vector3(0,1,0)));
      this.camera.fov=44;this.camera.updateProjectionMatrix();
      this.world.update(dt,p,this.time);this.ground.streets.update(this.time,p);this.ground.routeScenes.update(p);
      this.shade.style.opacity=this.ground.ready?String(Math.max(0,1-(this.time-2)/.8)):'1';
    }
    this.audio.update(0,false);
    if(this.time>=8&&this.ground.ready&&!this.failed){this.cancel();this.complete();}
  }
}
