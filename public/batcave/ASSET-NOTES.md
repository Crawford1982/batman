# Batcave (Chapter III part one)
The Batcomputer set (CRT monitors and housings, scaffold pipe, reel-to-reel deck, console,
chair, cabinets, grating deck and rails) is original procedural geometry in src/batcave-set.js,
styled after the 1989 film's analog look. No film or third-party model is used for it.

CC0 1.0 assets from Poly Haven (https://polyhaven.com), built into src/models/cave-kit.glb and
src/textures/cave by scripts/build-cave-kit.mjs (sources fetched by scripts/fetch-polyhaven.mjs):

- rock_face_01 (Dario Barresi), rock_face_02 (Dario Barresi, Rico Cilliers): cavern rock walls
  and hanging rocks, simplified to half their triangles.
- hanging_industrial_lamp (Kuutti Siitonen): work lamps over the deck.
- mounted_fluorescent_lights (Ulan Cabanilla): tube fitting above the monitor wall.
- metal_tool_chest (Yann Kervran, John Hutcheson), security_camera_02 (Garrison Gager,
  Yann Kervran): set dressing.
- Textures rock_face_03 (Dario Barresi, Rico Cilliers): cavern shell; metal_plate_02
  (Rob Tuytel): monitor and cabinet housings.

Modified: selected parts, simplified geometry, textures resized to WebP (512 px props, 1024 px
rock), meshopt compression. Sizes: cave-kit.glb 1.72 MB, textures 0.62 MB, loaded when the
Batcave chapter starts; the set renders without them if a download fails.
