# Kessler rooftops: props, surfaces and lighting
All from Poly Haven (https://polyhaven.com), CC0 1.0 Universal (public domain dedication,
https://creativecommons.org/publicdomain/zero/1.0/). Downloaded 5 October 2026 at 1k resolution.
Attribution is not required by CC0; it is given here because the project credits every creator.

## Models (src/models/rooftop-kit.glb)
- exterior_aircon_unit: Monsta3D — https://polyhaven.com/a/exterior_aircon_unit
- modular_airduct_rectangular_01: James Ray Cock — https://polyhaven.com/a/modular_airduct_rectangular_01
- utility_box_02: James Ray Cock — https://polyhaven.com/a/utility_box_02
- security_light: Maximilian Schuster — https://polyhaven.com/a/security_light
- propane_tank: Slinc — https://polyhaven.com/a/propane_tank
- Barrel_01: Jorge Camacho — https://polyhaven.com/a/Barrel_01
- wooden_crate_01: James Ray Cock — https://polyhaven.com/a/wooden_crate_01
- old_military_crate: Jack Mava — https://polyhaven.com/a/old_military_crate
- trashbag: Benny Weimer — https://polyhaven.com/a/trashbag
- ladder_sectioned_01: MP — https://polyhaven.com/a/ladder_sectioned_01
- caged_hanging_light: Ulan Cabanilla — https://polyhaven.com/a/caged_hanging_light

Modifications: selected parts only (the rusted condenser, one duct vent hood, crate set A, one
ladder section), mesh simplification (meshoptimizer), textures resized to 512 px WebP, one shared
GLB with a node per prop. Straight duct runs in game are procedural boxes, not the Poly Haven duct.
28,037 triangles, 1.33 MB after npm run compress.

## Surface textures (src/textures/rooftop/*.webp)
- bitumen: Rob Tuytel — https://polyhaven.com/a/bitumen
- tarred_gravel: Dimitrios Savva — https://polyhaven.com/a/tarred_gravel
- factory_brick: Rob Tuytel — https://polyhaven.com/a/factory_brick
- dark_brick_wall: Dario Barresi, Dimitrios Savva — https://polyhaven.com/a/dark_brick_wall
- rough_concrete: Dimitrios Savva — https://polyhaven.com/a/rough_concrete
- corrugated_iron_02: Jenelle van Heerden, Sergej Majboroda — https://polyhaven.com/a/corrugated_iron_02
- rusty_metal_shutter: Charlotte Baglioni — https://polyhaven.com/a/rusty_metal_shutter
- roof_planks: Rob Tuytel — https://polyhaven.com/a/roof_planks

Diffuse and OpenGL normal maps at 1024 px, roughness at 512 px, WebP.

## Environment
- rooftop_night: Greg Zaal — https://polyhaven.com/a/rooftop_night

1k HDR, used only for reflections on the rooftop block, its props and the characters.

Rebuild: node scripts/fetch-polyhaven.mjs (downloads to ../assets-source/polyhaven), then
node scripts/build-rooftop-kit.mjs and npm run compress rooftop.
