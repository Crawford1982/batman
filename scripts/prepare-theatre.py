# Requires Pillow. Run after extracting the free Standard archive to assets-source/downtown-standard.
from pathlib import Path
from PIL import Image
import json, shutil
src=Path('../assets-source/downtown-standard/Exports/glTF (Godot)')
out=Path('verification/city-import');out.mkdir(parents=True,exist_ok=True)
for name in ['Building_Medium_2_001','Building_Small_1']:
 d=json.loads((src/(name+'.gltf')).read_text())
 shutil.copy(src/(name+'.gltf'),out);shutil.copy(src/(name+'.bin'),out)
 for t in d['images']:
  im=Image.open(src/t['uri']);size=256 if any(k in t['uri'] for k in ['ORM','interior']) else 512
  im.thumbnail((size,size),Image.Resampling.LANCZOS);im.save(out/t['uri'],optimize=True)
