# Rooftop characters
Quaternius (https://quaternius.com), CC0 1.0. See LICENSE.txt (Quaternius' own licence files).

- Player: "Superhero Male" full body from Universal Base Characters (Standard, free edition).
  Its body texture is repainted as an original caped suit by scripts/prepare-characters.mjs:
  charcoal over the body's own shading, a cowl with white lenses down to the mouth, black gloves,
  gauntlets and boots (texture triangles driven by the hand and foot bones), a belt band at the
  waist and an original bat silhouette on the chest. Cowl ears and the cape are built in game on
  the Head and spine_03 bones. 12,566 triangles, 65-joint humanoid rig.
- Guards: "Male Peasant" from Modular Character Outfits - Fantasy, which ships without a head.
  The Superhero Male base's head and neck (triangles weighted to those bones), eyes and eyebrows,
  and the "Buzzed" rigged hairstyle are grafted onto the outfit's skin. Recoloured per guard.
  18,328 triangles.
- Animation: 15 clips from Universal Animation Library (Standard): idle, talking idle, walk,
  crouch walk and idle, jog, sprint, jump start/loop/land, punch (takedown), head hit and fall
  (stunned guard), kneeling repair (hacking), interact. The library shares the characters' rig,
  so clips play on both by bone name. Mannequin mesh removed, keyframes resampled.

Source: quaternius.com / quaternius.itch.io. itch.io's download flow could not be scripted, so the
files were taken unmodified from the public mirror github.com/kirbycope/godot-3d-player-controller-v2
(assets/universal_base_characters, assets/modular_character_outfits,
assets/universal_animation_library), which ships Quaternius' licence files beside them; CC0
permits redistribution. No film or game character model is used.

Sizes after npm run compress: vigilante.glb 0.26 MB, crew.glb 0.69 MB, moves.glb 0.84 MB.
Loaded only when the rooftop chapter starts; capsule placeholders remain if a download fails.
Rebuild: node scripts/prepare-characters.mjs, then npm run compress vigilante crew moves.
