import {NodeIO} from '@gltf-transform/core';
import {dedup,weld,simplify,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const io=new NodeIO();const d=await io.read('../assets-source/visnik/car-raw.glb');await MeshoptSimplifier.ready;
await d.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.6,error:.0005}),prune());
d.getRoot().setExtras({author:'visnik',source:'https://blendswap.com/blend/10625',license:'CC-BY-NC-SA-3.0',modifications:'PBR materials, wheel pivots, mesh optimization; 7 September 2026'});
await io.write('public/batmobile.glb',d);let tris=0;for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives())tris+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;console.log({triangles:tris});
