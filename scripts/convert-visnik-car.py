import bpy, math, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT / "assets-source" / "visnik"
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=str(SOURCE / '89 Batmobile.blend'),use_scripts=False)
def mat(name,col,metal,rough):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
body=mat('CarPaint',(.022,.025,.029),.35,.32)
glass=mat('CarPaintGloss',(.007,.015,.021),.35,.16)
rubber=mat('Tire',(.013,.014,.016),0,.87)
rim=mat('Rims',(.075,.08,.085),.75,.35)
metal=mat('Metal',(.18,.2,.22),.8,.3)
for o in list(bpy.data.objects):
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True);continue
 o.hide_set(False);o.hide_render=False
 o.data.materials.clear();o.data.materials.append(glass if o.name=='cockpit' else rubber if o.name.startswith('Slick') else rim if o.name.startswith(('Rim','Inner_Rim')) else metal if o.name.startswith(('Bolts','Logo')) else body)
 for p in o.data.polygons:p.use_smooth=True
# Preserve the artist's geometry, with wheel assemblies pivoting at their hubs.
for suffix in ['', '01','02','03']:
 tire=bpy.data.objects['Slick'+suffix]
 c=sum((tire.matrix_world @ Vector(v) for v in tire.bound_box),Vector())/8
 name=('F' if c.y<0 else 'B')+('L' if c.x<.52 else 'R')+'_Wheel'
 pivot=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(pivot);pivot.location=c
 bpy.context.view_layer.update()
 for stem in ['Slick','Rim','Inner_Rim','Bolts']:
  o=bpy.data.objects.get(stem+suffix)
  if o:
   world=o.matrix_world.copy();o.parent=pivot;o.matrix_world=world
bpy.ops.export_scene.gltf(filepath=str(SOURCE / 'car-raw.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
