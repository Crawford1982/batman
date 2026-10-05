# Rooftop characters
Source: Quaternius "Animated Human" (low poly, rigged), CC0 1.0, downloaded 5 October 2026.
https://opengameart.org/content/animated-human-low-poly
Archive: `Animated Human by @Quaternius_0.zip`. See LICENSE.txt (copied verbatim from the archive).

Used for the player and TOLLER's crew in Chapter III part two (Kessler rooftops). One model, recoloured at runtime by multiplying its palette texture: near-black for the player, muted work clothes for the guards. The 1989 Batman suit is not modelled; no franchise character likeness was added.

Conversion (scripts/prepare-operative.mjs, no Blender needed): three.js FBXLoader reads `FBX/Animated Human.fbx`, the figure is scaled from centimetres to 1.8 m, GLTFExporter writes glTF, glTF-Transform embeds `Blend/Textures/ClothedLightSkin.png` (32 px palette, nearest filtering) and the licence metadata. Kept clips: Idle, Walk, Run, Jump, Punch (renamed `takedown`), Death (renamed `down`, used for the stunned pose). Dropped: Working and two unnamed scratch actions. FBXLoader trims vertices with more than four bone weights, as glTF requires.

Result after `npm run compress operative`: 1,578 triangles, 41 joints, one 32 px texture, 0.40 MB. One instance for the player and four SkeletonUtils clones for guards share geometry and texture. The model loads only when the rooftop chapter starts; capsule placeholders remain if the download fails.

Rebuild: extract the archive outside the repository to ../assets-source/quaternius-animated-human, then `node scripts/prepare-operative.mjs` and `npm run compress operative`.
