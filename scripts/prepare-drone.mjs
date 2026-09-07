import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { dedup, weld, simplify, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
const source='../general_atomics_mq-1_predator_uav (1).glb';
const b=fs.readFileSync(source), len=b.readUInt32LE(12), j=JSON.parse(b.subarray(20,20+len));
// Preserve the supplied diffuse/normal textures while migrating the legacy material extension.
for(const m of j.materials){const old=m.extensions?.KHR_materials_pbrSpecularGlossiness;if(old){m.pbrMetallicRoughness={baseColorFactor:old.diffuseFactor||[1,1,1,1],metallicFactor:.25,roughnessFactor:.55};if(old.diffuseTexture)m.pbrMetallicRoughness.baseColorTexture=old.diffuseTexture;delete m.extensions.KHR_materials_pbrSpecularGlossiness;} }
j.extensionsUsed=(j.extensionsUsed||[]).filter(e=>e!=='KHR_materials_pbrSpecularGlossiness');
j.extensionsRequired=(j.extensionsRequired||[]).filter(e=>e!=='KHR_materials_pbrSpecularGlossiness');
let json=Buffer.from(JSON.stringify(j));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const tail=b.subarray(20+len),header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+tail.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
const io=new NodeIO(),doc=await io.readBinary(Buffer.concat([header,json,tail]));
await MeshoptSimplifier.ready;
// Redundant UV channels on this export unnecessarily restrict simplification.
for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())for(const a of ['TEXCOORD_1','TEXCOORD_2','TEXCOORD_3'])p.setAttribute(a,null);
await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.18,error:.007}),prune());
await io.write('public/predator.glb',doc);
console.log('Optimized drone triangles',doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0));
fs.writeFileSync('public/DRONE-CREDITS.txt','General Atomics MQ-1 Predator UAV by VTX (https://sketchfab.com/VTX_car)\nSource: https://sketchfab.com/3d-models/general-atomics-mq-1-predator-uav-4ccb9e314d8540caa630ca286fe49d5f\nLicense: CC BY-NC-SA 4.0 — https://creativecommons.org/licenses/by-nc-sa/4.0/\nModified for this game: reduced geometry, converted materials, added game lighting/equipment.\nThis asset and its adaptations remain under CC BY-NC-SA 4.0.\n');
