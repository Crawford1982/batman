import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Fixed budgets: one draw call for sparks, one for smoke, one for electrical arcs.
export class GroundEffects {
  constructor(parent){
    this.cursor=0;this.smokeCursor=0;this.particles=Array.from({length:256},()=>({life:0,v:new T.Vector3()}));this.smoke=Array.from({length:96},()=>({life:0,v:new T.Vector3()}));
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const c=canvas.getContext('2d'),g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#ffffffff');g.addColorStop(.25,'#ffffffa0');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,32,32);
    const map=new T.CanvasTexture(canvas);
    const cloud=(n,size,color,blend)=>{const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3));geo.setAttribute('color',new T.BufferAttribute(new Float32Array(n*3),3));const mesh=new T.Points(geo,new T.PointsMaterial({map,size,color,transparent:true,depthWrite:false,vertexColors:true,blending:blend}));mesh.frustumCulled=false;parent.add(mesh);return mesh;};
    this.sparks=cloud(256,.55,0xffffff,T.AdditiveBlending);this.clouds=cloud(96,5,0x9ab0c3,T.NormalBlending);this.clouds.material.opacity=.17;
    this.arcGeo=new T.BufferGeometry();this.arcGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(64*6),3));this.arc=new T.LineSegments(this.arcGeo,new T.LineBasicMaterial({color:0xa7eaff,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending}));this.arc.frustumCulled=false;parent.add(this.arc);this.arcLife=0;
    this.flash=new T.PointLight(0x86dfff,0,45,1);parent.add(this.flash);
    this.beam=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xff5438,transparent:true,opacity:.65}));this.beam.frustumCulled=false;this.beam.visible=false;parent.add(this.beam);
  }
  emit(position,count=30,electric=false){const a=this.sparks.geometry.attributes.position,col=this.sparks.geometry.attributes.color;
    for(let i=0;i<count;i++){const index=this.cursor++%this.particles.length,p=this.particles[index];p.life=.35+Math.random()*.8;p.v.set((Math.random()-.5)*20,Math.random()*16,(Math.random()-.5)*20);a.setXYZ(index,position.x,position.y+.3,position.z);col.setXYZ(index,electric?.3:1,electric?.75:.55,electric?1:.14);}
    for(let i=0;i<6;i++)this.puff(position);this.flash.position.copy(position);this.flash.color.setHex(electric?0x87ddff:0xff992c);this.flash.intensity=100;
  }
  puff(position){const i=this.smokeCursor++%this.smoke.length,p=this.smoke[i];p.life=1.8+Math.random();p.v.set((Math.random()-.5)*1.5,1+Math.random()*2,(Math.random()-.5)*1.5);this.clouds.geometry.attributes.position.setXYZ(i,position.x,position.y,position.z);}
  discharge(origin,targets){
    this.arcLife=.45;const a=this.arcGeo.attributes.position;let k=0;
    for(const target of targets.slice(0,4)){
      let prev=new T.Vector3(origin.x,origin.y+1,origin.z);
      for(let i=1;i<=16;i++){const f=i/16,next=new T.Vector3().lerpVectors(origin,target,f);if(i<16)next.add(new T.Vector3((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2));a.setXYZ(k++,prev.x,prev.y,prev.z);a.setXYZ(k++,next.x,next.y,next.z);prev=next;}
      this.emit(target,24,true);
    }
    this.arcGeo.setDrawRange(0,k);a.needsUpdate=true;this.emit(origin,45,true);
  }
  target(from,to,visible){this.beam.visible=visible;if(visible){const a=this.beam.geometry.attributes.position;a.setXYZ(0,from.x,from.y,from.z);a.setXYZ(1,to.x,to.y,to.z);a.needsUpdate=true;}}
  reset(){for(const p of [...this.particles,...this.smoke])p.life=0;this.arcLife=0;this.beam.visible=false;this.flash.intensity=0;}
  update(dt){
    for(const [list,mesh,gravity]of [[this.particles,this.sparks,12],[this.smoke,this.clouds,-.1]]){const a=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;list.forEach((p,i)=>{p.life-=dt;if(p.life<=0){a.setXYZ(i,0,-10000,0);return;}p.v.y-=gravity*dt;a.setXYZ(i,a.getX(i)+p.v.x*dt,a.getY(i)+p.v.y*dt,a.getZ(i)+p.v.z*dt);if(mesh===this.clouds)c.setXYZ(i,Math.min(1,p.life*.6),Math.min(1,p.life*.6),Math.min(1,p.life*.6));});a.needsUpdate=true;c.needsUpdate=true;}
    this.arcLife-=dt;this.arc.visible=this.arcLife>0;this.arc.material.opacity=Math.max(0,this.arcLife*2);this.flash.intensity*=Math.exp(-dt*15);
  }
}

const armor=new T.MeshStandardMaterial({color:0x333e47,metalness:.7,roughness:.38});
const rim=new T.MeshStandardMaterial({color:0x859097,metalness:.7,roughness:.3});
const red=new T.MeshBasicMaterial({color:0xff4835});
const base=new T.CylinderGeometry(1.8,2.2,.42,16),cap=new T.CylinderGeometry(1.25,1.65,.45,12),band=new T.TorusGeometry(1.7,.08,5,32),leg=new T.BoxGeometry(.4,.18,1.2),bolt=new T.CylinderGeometry(.1,.1,.15,6);
export function createMine(){const g=new T.Group();const add=(geo,mat,x,y,z)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m;};add(base,armor,0,0,0);add(cap,rim,0,.4,0);const light=add(band,red,0,.24,0);light.rotation.x=Math.PI/2;g.userData.light=light;
  for(let i=0;i<6;i++){const a=i*Math.PI/3;const l=add(leg,armor,Math.sin(a)*1.85,-.1,Math.cos(a)*1.85);l.rotation.y=a;add(bolt,rim,Math.sin(a)*1.42,.46,Math.cos(a)*1.42);}
  const sensor=add(new T.SphereGeometry(.28,10,8),red,0,.8,0);sensor.scale.y=.5;
  const batches=new Map();g.updateMatrixWorld(true);g.children.forEach(m=>{const geo=m.geometry.clone().applyMatrix4(m.matrix);const list=batches.get(m.material)||[];list.push(geo.toNonIndexed());batches.set(m.material,list);geo.dispose();});g.clear();for(const [mat,list]of batches){const m=new T.Mesh(mergeGeometries(list),mat);g.add(m);if(mat===red)g.userData.light=m;list.forEach(geo=>geo.dispose());}return g;}
