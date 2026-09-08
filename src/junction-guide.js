import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DRIVE_ROUTE, ROAD_POINTS } from './driving.js';

// One merged mesh per junction; only nearby active/recent turns are visible.
export class JunctionGuide {
  constructor(parent) {
    const shape = new T.Shape();
    shape.moveTo(-1.1,0);shape.lineTo(-1.1,4);shape.lineTo(-3,4);
    shape.lineTo(0,8);shape.lineTo(3,4);shape.lineTo(1.1,4);shape.lineTo(1.1,0);shape.closePath();
    const base = new T.ShapeGeometry(shape);base.rotateX(-Math.PI/2);
    const mat = new T.MeshBasicMaterial({color:0xe6bf72,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide});
    this.markers = DRIVE_ROUTE.map((goal,i)=>{
      const a=ROAD_POINTS[i], b=DRIVE_ROUTE[i+1] || goal;
      const incoming=new T.Vector3(goal.x-a.x,0,goal.z-a.z).normalize();
      const yaw=Math.atan2(-incoming.x,-incoming.z);
      const outgoing=i+1<DRIVE_ROUTE.length ? Math.atan2(-(b.x-goal.x),-(b.z-goal.z)) : yaw;
      const turn=Math.atan2(Math.sin(outgoing-yaw),Math.cos(outgoing-yaw));
      const pieces=[65,40,15].map((distance,n)=>{
        const geo=base.clone();geo.rotateY(yaw+turn*n/2);
        geo.translate(goal.x-incoming.x*distance,.25,goal.z-incoming.z*distance);
        return geo;
      });
      const mesh=new T.Mesh(mergeGeometries(pieces),mat);pieces.forEach(g=>g.dispose());
      mesh.visible=false;parent.add(mesh);return mesh;
    });
    base.dispose();
  }
  update(checkpoint,position) {
    this.markers.forEach((mesh,i)=>{
      const goal=DRIVE_ROUTE[i];
      const distance=Math.hypot(position.x-goal.x,position.z-goal.z);
      mesh.visible=(i===checkpoint && distance<230)||(i===checkpoint-1 && distance<75);
    });
  }
}
