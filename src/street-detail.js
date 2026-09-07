import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DRIVE_ROUTE } from './driving.js';

// Street architecture is merged by material in 140 m cells. Only nearby cells render.
export class StreetDetail {
  constructor(parent) {
    this.chunks = []; this.colliders = []; this.beams = []; this.vents = [];
    const texture = (w,h,draw) => { const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t; };
    let seed=1989; const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    const masonry=texture(256,256,(c,w,h)=>{
      c.fillStyle='#535354';c.fillRect(0,0,w,h);
      for(let y=0;y<h;y+=16) for(let x=-32;x<w;x+=64){const v=62+random()*28;c.fillStyle=`rgb(${v},${v*.97},${v*.93})`;c.fillRect(x+(y%32?32:0)+1,y+1,62,14);}
      for(let i=0;i<5000;i++){c.fillStyle=random()>.5?'#ffffff09':'#00000012';c.fillRect(random()*w,random()*h,2,2);}
    }); masonry.wrapS=masonry.wrapT=T.RepeatWrapping;masonry.repeat.set(2,3);
    const windowMap=texture(128,256,(c,w,h)=>{
      c.fillStyle='#070f18';c.fillRect(0,0,w,h);const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#d7b66c');g.addColorStop(.5,'#756d57');g.addColorStop(1,'#1c3549');c.fillStyle=g;c.fillRect(8,8,112,240);
      c.fillStyle='#17212b';for(let x=0;x<w;x+=32)c.fillRect(x,0,5,h);for(let y=0;y<h;y+=64)c.fillRect(0,y,w,5);c.fillStyle='#171e2499';c.fillRect(8,10,110,45);
    });
    this.roadMap=texture(512,512,(c,w,h)=>{
      c.fillStyle='#252a30';c.fillRect(0,0,w,h);
      for(let i=0;i<60000;i++){const v=25+random()*38;c.fillStyle=`rgb(${v},${v+2},${v+5})`;c.fillRect(random()*w,random()*h,1+random()*2,1);}
      c.strokeStyle='#080d1280';c.lineWidth=2;for(let i=0;i<8;i++){c.beginPath();let x=random()*w,y=random()*h;c.moveTo(x,y);for(let j=0;j<8;j++){x+=(random()-.5)*35;y+=random()*25;c.lineTo(x,y);}c.stroke();}
    });this.roadMap.wrapS=this.roadMap.wrapT=T.RepeatWrapping;this.roadMap.repeat.set(3,55);this.roadMap.anisotropy=4;
    const mat={
      stone:new T.MeshStandardMaterial({map:masonry,color:0x83909d,roughness:.82}),
      trim:new T.MeshStandardMaterial({color:0x87919a,roughness:.68,metalness:.22}),
      iron:new T.MeshStandardMaterial({color:0x23313b,roughness:.5,metalness:.65}),
      glass:new T.MeshStandardMaterial({map:windowMap,emissiveMap:windowMap,emissive:0xffdaa0,emissiveIntensity:.55,roughness:.24,metalness:.4}),
      gold:new T.MeshBasicMaterial({color:0xf9c883}),
      snow:new T.MeshStandardMaterial({color:0x869ba9,roughness:1}),
      red:new T.MeshBasicMaterial({color:0xfe4935}),
      blue:new T.MeshBasicMaterial({color:0x79cce7}),
    };
    const glow=texture(64,128,(c,w,h)=>{c.translate(w/2,h/2);c.scale(w/2,h/2);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'#ffddad65');g.addColorStop(.3,'#f9ba6425');g.addColorStop(1,'#f9ba6400');c.fillStyle=g;c.fillRect(-1,-1,2,2);});
    const poolMat=new T.MeshBasicMaterial({map:glow,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
    const points=[{x:0,z:450},...DRIVE_ROUTE];
    for(let section=0;section<points.length-1;section++) {
      const a=points[section],b=points[section+1],length=Math.hypot(b.x-a.x,b.z-a.z), angle=Math.atan2(b.x-a.x,b.z-a.z);
      const old=section>=2;
      for(let start=0;start<length;start+=140){
        const center=Math.min(start+70,length),root=new T.Group();
        root.position.set(a.x+Math.sin(angle)*center,0,a.z+Math.cos(angle)*center);root.rotation.y=angle;parent.add(root);
        const parts={}; const poolParts=[];
        const add=(key,geo,x,y,z,rx=0,ry=0,rz=0)=>{geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(1,1,1)));(parts[key]??=[]).push(geo.toNonIndexed());geo.dispose();};
        const box=(key,x,y,z,w,h,d)=>add(key,new T.BoxGeometry(w,h,d),x,y,z);
        const end=Math.min(start+140,length);
        for(let t=start+18;t<end-8;t+=32){
          if(t<28||t>length-32)continue;
          const z=t-center;
          for(const side of [-1,1]){
            const height=old?19+random()*15:29+random()*23;
            // Open gaps between frontages retain alley views into the skyline.
            box('stone',side*32,height/2,z,12,height,27);
            const wx=root.position.x+Math.cos(angle)*side*32+Math.sin(angle)*z,wz=root.position.z-Math.sin(angle)*side*32+Math.cos(angle)*z;
            this.colliders.push({x:wx,z:wz,w:Math.abs(Math.cos(angle))*12+Math.abs(Math.sin(angle))*27,d:Math.abs(Math.sin(angle))*12+Math.abs(Math.cos(angle))*27,h:height});
            box('stone',side*23,.24,z,10,.48,30);
            for(const y of [5.7,height-1,height+.2])box('trim',side*25.7,y,z,1.5,.5,28.5);
            box('snow',side*32,height+.45,z,13,.25,28);
            for(const dz of [-12,-4,4,12]){
              box('trim',side*25.7,height/2,z+dz,.9,height,.7);
              if(old){add('iron',new T.ConeGeometry(.7,3,4),side*25.7,height+1.8,z+dz);}
            }
            for(let y=8;y<height-2;y+=4.8)for(const dz of [-8,0,8]){
              box(random()>.2?'glass':'iron',side*25.92,y,z+dz,.18,3.3,4.8);
              box('trim',side*25.5,y-1.9,z+dz,1.1,.32,5.5);
            }
            // Recessed ground-floor doors, piers and glowing display windows.
            for(const dz of [-8,0,8]){box('glass',side*25.85,2.5,z+dz,.2,3.8,5.5);box('iron',side*25.5,4.8,z+dz,1.8,.4,6.5);box('trim',side*25.4,.6,z+dz,1.2,.3,6);if(old)add('trim',new T.TorusGeometry(2.75,.18,5,16,Math.PI),side*25.25,3,z+dz,0,Math.PI/2);}
            if(old){box('iron',side*25.0,11,z,2.5,.2,24);for(const zz of [-10,-5,0,5,10])box('iron',side*23.8,12,z+zz,.12,2,.12);box('iron',side*23.8,13,z,.14,.14,24);}
            // Drain, bollards, snow banks and utility cabinet.
            for(let zz=-2;zz<=2;zz+=.5)box('iron',side*17.7,.07,z+zz,1.4,.06,.16);
            for(const dz of [-12,12]){add('iron',new T.CylinderGeometry(.17,.24,1.35,6),side*20,.9,z+dz);box('gold',side*20,1.35,z+dz,.3,.13,.3);}
            box('snow',side*19.4,.4,z+6,1.2,.2,7);
            if(t%3<1.5){box('iron',side*24,1.15,z+12,1.2,1.8,1);box('trim',side*23.3,1.15,z+12,.1,.7,.7);}
            const pool=new T.PlaneGeometry(12,22);pool.rotateX(-Math.PI/2);pool.translate(side*12,.1,z);poolParts.push(pool);
            if(side===1&&Math.floor(t/32)%3===0){const vent=new T.Vector3(side*18,.2,z).applyMatrix4(root.updateMatrixWorld(true)||root.matrixWorld);this.vents.push(vent);}
          }
        }
        // At most one readable sign per cell: graphic identity, not visual noise.
        const label=section===0?'GOTHAM • CENTRAL':section===1?'MONARCH THEATRE':section===2?(start<500?'TRIGATE WORKS':'OLD GOTHAM'): 'CATHEDRAL DISTRICT';
        const signMap=texture(512,128,(c,w,h)=>{c.fillStyle=old?'#171e22':'#151b27';c.fillRect(0,0,w,h);c.strokeStyle='#c6aa70';c.lineWidth=4;c.strokeRect(8,8,w-16,h-16);c.fillStyle='#f3d398';c.textAlign='center';c.font='bold 30px Georgia';c.fillText(label,w/2,62);c.font='13px sans-serif';c.fillText(old?'GOTHAM CITY  /  EST. 1840':'NIGHT SERVICE  •  SHELTER ROUTE',w/2,96);});
        const sign=new T.Mesh(new T.PlaneGeometry(16,4),new T.MeshBasicMaterial({map:signMap}));sign.position.set(-25.2,6.1,0);sign.rotation.y=Math.PI/2;root.add(sign);
        for(const [key,list]of Object.entries(parts)){const merged=mergeGeometries(list);root.add(new T.Mesh(merged,mat[key]));for(const g of list)g.dispose();}
        if(poolParts.length){root.add(new T.Mesh(mergeGeometries(poolParts),poolMat));poolParts.forEach(g=>g.dispose());}
        this.chunks.push(root);
      }
    }
    // Three uninterrupted set pieces: steel viaduct, theatre gateway, cathedral searchlights.
    this.landmarks=new T.Group();parent.add(this.landmarks);
    const landmarkBox=(x,y,z,w,h,d,material=mat.iron)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);this.landmarks.add(m);return m;};
    for(const z of [-340,-430]){
      landmarkBox(-522.5,19,z,62,1.3,12);for(const side of [-1,1]){landmarkBox(-522.5+side*22,9,z,1.5,18,2);landmarkBox(-522.5+side*22,1,z,3,2,4,mat.stone);}
      for(let x=-548,i=0;x<-495;x+=4,i++){const beam=landmarkBox(x,21,z,5.7,.35,.35);beam.rotation.z=(i%2?1:-1)*Math.PI/4;}landmarkBox(-522.5,23,z,62,.4,.4);
      landmarkBox(-522.5,18.25,z,39,.14,.25,mat.gold);
    }
    // Traffic signals are off the driveable carriageway; only the arm crosses overhead.
    for(const [x,z]of [[0,38],[-475,0],[-522.5,-950]]){
      landmarkBox(x+16,6,z,.25,12,.25);landmarkBox(x+7,12,z,18,.25,.25);
      for(const dx of [0,7]){landmarkBox(x+dx,11,z,1.1,2.2,.6);for(let i=0;i<3;i++){const l=new T.Mesh(new T.SphereGeometry(.22,8,6),i===0?mat.red:mat.iron);l.position.set(x+dx,11.65-i*.65,z+.35);this.landmarks.add(l);}}
    }
    for(const x of [-1140,-1060]){
      const beam=new T.Mesh(new T.ConeGeometry(22,190,12,1,true),new T.MeshBasicMaterial({color:0x91bdde,transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}));
      const pivot=new T.Group();pivot.position.set(x,0,-910);beam.position.y=95;beam.rotation.z=Math.PI;pivot.add(beam);this.landmarks.add(pivot);this.beams.push(pivot);
      landmarkBox(x,1,-910,3,2,3,mat.iron);
    }
    const batches=new Map();for(const m of [...this.landmarks.children]){if(!m.isMesh)continue;m.updateMatrix();const geo=m.geometry.clone().applyMatrix4(m.matrix).toNonIndexed();const list=batches.get(m.material)||[];list.push(geo);batches.set(m.material,list);this.landmarks.remove(m);m.geometry.dispose();}for(const [material,list]of batches){this.landmarks.add(new T.Mesh(mergeGeometries(list),material));list.forEach(g=>g.dispose());}
  }
  update(t,pos){for(const c of this.chunks)c.visible=Math.hypot(c.position.x-pos.x,c.position.z-pos.z)<330;this.beams.forEach((b,i)=>{b.rotation.z=Math.sin(t*.27+i*2)*.28;b.rotation.x=Math.sin(t*.19+i)*.2;});}
}
