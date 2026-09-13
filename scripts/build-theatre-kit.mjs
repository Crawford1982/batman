import {Document,NodeIO} from '@gltf-transform/core';
import {dedup,prune,weld,simplify,join,flatten,mergeDocuments,unpartition} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import fs from 'node:fs';
await MeshoptSimplifier.ready;
const io=new NodeIO(),combined=new Document();
for(const name of ['Building_Medium_2_001','Building_Small_1']){
 const d=await io.read('verification/city-import/'+name+'.gltf');
 // Interior floors/walls cannot be approached by the player; retain window cards.
 for(const mesh of d.getRoot().listMeshes())for(const p of mesh.listPrimitives())if(/MI_Interior/.test(p.getMaterial()?.getName()||''))p.dispose();
 await d.transform(prune(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.4,error:.002}),flatten(),join(),dedup(),prune());
 d.getRoot().listScenes()[0].setName(name);mergeDocuments(combined,d);
}
await combined.transform(dedup(),prune(),unpartition());
// Put both templates into one scene so one GLB shares every texture.
const scenes=combined.getRoot().listScenes(),scene=combined.createScene('TheatreTemplates');
for(const s of scenes){const root=combined.createNode(s.getName());for(const n of s.listChildren())root.addChild(n);scene.addChild(root);s.dispose();}
combined.getRoot().setDefaultScene(scene);
fs.mkdirSync('public/environment',{recursive:true});await io.write('public/environment/theatre-kit.glb',combined);
const root=combined.getRoot();console.log({bytes:fs.statSync('public/environment/theatre-kit.glb').size,materials:root.listMaterials().length,textures:root.listTextures().length,triangles:root.listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0)});
