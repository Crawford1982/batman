import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small, locally culled sets, merged by material rather than one draw per detail.
export class RouteScenes {
  constructor(parent) {
    this.sets=[];
    const stone=new T.MeshStandardMaterial({color:0x26303b,roughness:.72});
    const trim=new T.MeshStandardMaterial({color:0x776747,metalness:.5,roughness:.38});
    const warm=new T.MeshBasicMaterial({color:0xffce83});
    const red=new T.MeshStandardMaterial({color:0x341416,roughness:.68});
    const glass=new T.MeshStandardMaterial({color:0x17232c,emissive:0xd19745,emissiveIntensity:.48,metalness:.3,roughness:.23});
    const set=(x,z)=>{const g=new T.Group();g.position.set(x,0,z);parent.add(g);this.sets.push(g);return g;};
    const boxes=(g,list)=>{const batches=new Map();for(const [x,y,z,w,h,d,mat]of list){const geo=new T.BoxGeometry(w,h,d);geo.translate(x,y,z);const a=batches.get(mat)||[];a.push(geo);batches.set(mat,a);}for(const [mat,a]of batches){g.add(new T.Mesh(mergeGeometries(a),mat));a.forEach(v=>v.dispose());}};
    const sign=(g,text,sub,x,y,z,w,h)=>{const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#111820';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#bc9556';ctx.lineWidth=5;ctx.strokeRect(10,10,1004,236);ctx.textAlign='center';ctx.fillStyle='#ffe4aa';ctx.font='60px Georgia';ctx.fillText(text,512,116);ctx.font='22px sans-serif';ctx.fillStyle='#c7b79d';ctx.fillText(sub,512,185);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}));mesh.position.set(x,y,z);g.add(mesh);};
    const theatre=set(-250,-26),a=[];
    a.push([0,15,-1,58,22,2,stone],[0,7,3,52,1,9,red],[0,6.4,3,52,.18,9,trim]);
    for(const x of [-26,-18,18,26]){a.push([x,15,.3,1.5,22,2,trim],[x,27,.3,3,1,3,trim]);}
    for(const x of [-12,-6,0,6,12])a.push([x,3,-.1,4.7,5.5,.3,glass]);
    for(let x=-24;x<=24;x+=1.5){a.push([x,6.1,7,.19,.2,.2,warm],[x,7.6,7,.19,.2,.2,warm]);}
    for(const x of [-22,22])a.push([x,17,.4,4,12,.3,red],[x,23.5,.6,4,.16,.3,warm]);
    boxes(theatre,a);sign(theatre,'MONARCH','TONIGHT’S PERFORMANCE CANCELLED  /  SHELTER OPEN',0,11,1.2,43,6);
    const lamp=new T.PointLight(0xffb965,40,48,1.4);lamp.position.set(0,7,8);theatre.add(lamp);
    const rail=set(-522.5,-340),r=[];
    for(const x of [-21,21])for(let y=2;y<17;y+=2)r.push([x,y,6.1,1.6,.55,.15,y%4?warm:stone]);
    for(const x of [-20,0,20]){r.push([x,22,0,18,5,7,stone],[x,24.6,0,18,.25,7.3,trim]);for(let k=-6;k<=6;k+=3)r.push([x+k,22.6,3.6,2,1.8,.12,glass]);}
    boxes(rail,r);sign(rail,'GOTHAM TRANSIT','ELEVATED LINE  /  SERVICE SUSPENDED',0,16.1,6.2,29,3);
    const arrival=set(-1100,-913),c=[];
    for(const x of [-12,12]){c.push([x,5,-2,3,10,3,stone],[x,10.1,-2,4,.4,4,trim],[x,6,0,1.2,4,.2,warm]);}
    c.push([0,5,-3,19,10,2,stone],[0,4,-1.8,11,7,.3,glass]);boxes(arrival,c);
    sign(arrival,'GOTHAM EMERGENCY COMMAND','DELIVER THE OVERRIDE  /  GORDON IS WAITING',0,11,0,31,4);
    const flood=new T.SpotLight(0xffd5a0,350,70,.8,.7,1.3);flood.position.set(0,15,0);flood.target.position.set(0,0,23);arrival.add(flood,flood.target);
  }
  update(position){for(const g of this.sets)g.visible=g.position.distanceTo(position)<430;}
}
