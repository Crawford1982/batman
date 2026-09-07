import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
let cached;
export function loadPursuitDrone(){
  if(cached)return cached;
  cached=new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}predator.glb`).then(g=>{
    const model=g.scene;model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());model.position.sub(center);
    model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.multiplyScalar(.68);o.material.side=T.FrontSide;}});
    const root=new T.Group();root.add(model);root.scale.setScalar(15/size.x);root.rotation.y=Math.PI;return root;
  }).catch(e=>{cached=null;throw e;});return cached;
}
export function installPursuitDrone(target,template,index){
  target.clear();target.scale.setScalar(1);target.add(template.clone(true));
  const lights=new T.Group(),mat=new T.MeshBasicMaterial({color:index?0xff583b:0xffb248});
  for(const x of [-7.2,7.2,0]){const m=new T.Mesh(new T.SphereGeometry(x?.13:.3,8,6),mat);m.position.set(x,x?0:-.6,x?0:-2.8);lights.add(m);}
  target.add(lights);target.userData.lights=lights;target.userData.imported=true;
  // Red sensor turret and a black dorsal override receiver identify the hijacked machines.
  const pod=new T.Mesh(new T.SphereGeometry(.5,12,8),new T.MeshStandardMaterial({color:0x27303b,metalness:.6,roughness:.35}));pod.position.set(0,-.5,-2.4);target.add(pod);
  const fin=new T.Mesh(new T.BoxGeometry(.1,.65,.7),pod.material);fin.position.set(0,.55,.2);target.add(fin);
}
