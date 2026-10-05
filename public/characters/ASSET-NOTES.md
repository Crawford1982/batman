# Rooftop characters
Quaternius (https://quaternius.com), CC0 1.0. See LICENSE.txt (Quaternius' own licence files).

- Player: "Male Ranger" from Modular Character Outfits - Fantasy (Standard, free edition).
  Hooded outfit recoloured charcoal at runtime. 26,982 triangles, 65-joint humanoid rig.
- Guards: "Male Peasant" from the same pack, recoloured as dark workwear per guard. 12,894 triangles.
- Animation: 15 clips from Universal Animation Library (Standard): idle, talking idle, walk,
  crouch walk and idle, jog, sprint, jump start/loop/land, punch (takedown), head hit and fall
  (stunned guard), kneeling repair (hacking), interact. The library shares the outfits' rig,
  so clips play on both by bone name. Mannequin mesh removed, keyframes resampled.

Source: quaternius.com / quaternius.itch.io. itch.io's download flow could not be scripted, so the
files were taken unmodified from the public mirror github.com/kirbycope/godot-3d-player-controller-v2
(assets/modular_character_outfits, assets/universal_animation_library), which ships Quaternius'
licence files beside them; CC0 permits redistribution. The 1989 Batman suit is not modelled.

Sizes after npm run compress: vigilante.glb 0.70 MB, crew.glb 0.44 MB, moves.glb 0.84 MB.
Loaded only when the rooftop chapter starts; capsule placeholders remain if a download fails.
Rebuild: node scripts/prepare-characters.mjs, then npm run compress vigilante crew moves.
